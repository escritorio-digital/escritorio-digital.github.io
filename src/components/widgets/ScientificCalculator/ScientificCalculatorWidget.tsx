import { useState, useEffect, useRef, useLayoutEffect } from 'react';
import type { FC } from 'react';
import { useTranslation } from 'react-i18next';
import './ScientificCalculatorWidget.css';

// Layouts de botones (sin cambios)
const basicLayout = [
  '7', '8', '9', '÷', '4', '5', '6', '×', '1', '2', '3', '−', '0', '.', '+', 'Ans', '='
];
const standardLayout = [
  '(', ')', '√', '÷', '7', '8', '9', '×', '4', '5', '6', '−', '1', '2', '3', '+', '0', '.', 'empty_slot', '^', 'Ans', '='
];
const scientificLayout = [
  'rad/deg', 'x!',  '(',      ')',      '÷',
  'sin',     'cos', 'tan',    'π',      '×',
  'log',     'ln',  'EE',     'Ans',    '−',
  '7',       '8',   '9',      '√',      '+',
  '4',       '5',   '6',      '^',
  '1',       '2',   '3',      '%',
  '0',       '.',              '='
];

const operators = ['=', '+', '−', '×', '÷', '^', '%'];
const numbers = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '.'];

export const ScientificCalculatorWidget: FC = () => {
  const { t, ready } = useTranslation();
  const [display, setDisplay] = useState('0');
  const [expression, setExpression] = useState('');
  const [isRadians, setIsRadians] = useState(true);
  const [mode, setMode] = useState<'Basic' | 'Standard' | 'Scientific'>('Scientific');
  const [history, setHistory] = useState<string[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [lastAnswer, setLastAnswer] = useState('0');

  // Referencias para el autoajuste
  const displayRef = useRef<HTMLDivElement>(null);
  const roRef = useRef<ResizeObserver | null>(null);

  // --- Autoajuste por tamaño de fuente (sustituye el antiguo scaleX) ---
  const MAX_FONT_PX = 64;   // tamaño máximo de la pantalla
  const MIN_FONT_PX = 16;   // tamaño mínimo permitido
  const STEP = 1;

  const fitDisplay = () => {
    const node = displayRef.current;
    if (!node) return;

    // 1) fija tamaño máximo y mide
    let size = MAX_FONT_PX;
    node.style.fontSize = `${size}px`;

    // 2) reduce hasta que quepa
    //    usamos while simple: el texto de una calculadora es corto, el coste es despreciable
    while (node.scrollWidth > node.clientWidth && size > MIN_FONT_PX) {
      size -= STEP;
      node.style.fontSize = `${size}px`;
    }

    // 3) si sobra mucho espacio, intenta crecer un poco
    while (node.scrollWidth <= node.clientWidth && size + STEP <= MAX_FONT_PX) {
      const test = size + STEP;
      node.style.fontSize = `${test}px`;
      if (node.scrollWidth > node.clientWidth) {
        node.style.fontSize = `${size}px`;
        break;
      }
      size = test;
    }
  };

  // Ajusta cuando cambia el contenido visible
  useLayoutEffect(() => {
    fitDisplay();
  }, [display, mode, showHistory]);

  // Observa cambios de tamaño del contenedor
  useEffect(() => {
    const node = displayRef.current;
    if (!node) return;

    roRef.current?.disconnect();
    roRef.current = new ResizeObserver(() => fitDisplay());
    roRef.current.observe(node);

    const onResize = () => fitDisplay();
    window.addEventListener('resize', onResize);

    return () => {
      roRef.current?.disconnect();
      window.removeEventListener('resize', onResize);
    };
  }, []);

  const evaluateExpression = (expr: string): string => {
    try {
      let evalExpr = expr
        .replace(/×/g, '*')
        .replace(/÷/g, '/')
        .replace(/−/g, '-')
        .replace(/\^/g, '**')
        .replace(/%/g, '*0.01')
        .replace(/π/g, 'Math.PI')
        .replace(/Ans/g, lastAnswer);

      evalExpr = evalExpr.replace(/(sin|cos|tan)\(([^)]+)\)/g, (_, func, value) => {
        const number = evaluateExpression(value);
        return isRadians
          ? `Math.${func}(${number})`
          : `Math.${func}(${number} * Math.PI / 180)`;
      });
      evalExpr = evalExpr.replace(/√\(([^)]+)\)/g, (_, value) => `Math.sqrt(${evaluateExpression(value)})`);
      evalExpr = evalExpr.replace(/log\(([^)]+)\)/g, (_, value) => `Math.log10(${evaluateExpression(value)})`);
      evalExpr = evalExpr.replace(/ln\(([^)]+)\)/g, (_, value) => `Math.log(${evaluateExpression(value)})`);

      evalExpr = evalExpr.replace(/(\d+(?:\.\d+)?)!/g, (_, numStr) => {
        if (numStr.includes('.')) return 'Error';
        let n = parseInt(numStr);
        if (n > 20) return 'Infinity';
        if (n < 0) return 'Error';
        if (n === 0) return '1';
        let result = 1;
        for (let i = 2; i <= n; i++) result *= i;
        return result.toString();
      });

      const result = new Function('return ' + evalExpr)();

      if (result === 0) return '0';
      if (Math.abs(result) > 1e12 || (Math.abs(result) < 1e-9 && result !== 0)) {
        return result.toExponential(9);
      }
      return String(parseFloat(result.toFixed(10)));
    } catch {
      return 'Error';
    }
  };

  const handleBackspace = () => {
    display.length > 1
      ? (setDisplay(display.slice(0, -1)), setExpression(expression.slice(0, -1)))
      : (setDisplay('0'), setExpression(''));
  };
  const handleClear = () => { setDisplay('0'); setExpression(''); };

  const handleButtonClick = (btn: string) => {
    if (btn === 'rad/deg') { setIsRadians(!isRadians); return; }
    if (btn === '=') {
      const finalExpression = expression || display;
      const result = evaluateExpression(finalExpression);
      setDisplay(result);
      setExpression(finalExpression + '=');
      setLastAnswer(result);
      const historyEntry = `${finalExpression} = ${result}`;
      setHistory(prev => [historyEntry, ...prev].slice(0, 20));
    } else if (['Ans', 'EE', 'π'].includes(btn)) {
      handleInput(btn);
    } else if (['sin', 'cos', 'tan', 'log', 'ln', '√'].includes(btn)) {
      handleFunction(btn);
    } else if (btn === 'x!') {
      setExpression(prev => prev + '!');
      setDisplay(prev => prev + '!');
    } else {
      handleInput(btn);
    }
  };

  const handleInput = (btn: string) => {
    if (display === 'Error' || (expression.includes('=') && !operators.includes(btn))) {
      setDisplay(btn);
      setExpression(btn);
      return;
    }
    const lastCharIsOperator = operators.includes(expression.slice(-1));
    if (operators.includes(btn) && lastCharIsOperator) return;

    if (display === '0' && btn !== '.') {
      setDisplay(btn);
    } else {
      if (lastCharIsOperator || expression.endsWith('(')) setDisplay(btn);
      else setDisplay(prev => prev + btn);
    }

    if (expression.includes('=')) setExpression(btn);
    else setExpression(prev => prev + btn);
  };

  const handleFunction = (func: string) => {
    const newExpression = func + '(';
    if (display === 'Error' || expression.includes('=') || display === '0') {
      setDisplay(newExpression);
      setExpression(newExpression);
    } else {
      setDisplay(prev => prev + newExpression);
      setExpression(prev => prev + newExpression);
    }
  };

  const currentLayout =
    mode === 'Basic' ? basicLayout :
    mode === 'Standard' ? standardLayout : scientificLayout;

  const gridClass = mode === 'Scientific' ? 'grid-cols-5' : 'grid-cols-4';

  // Si las traducciones no están listas, mostrar un loader simple
  if (!ready) {
    return <div className="flex items-center justify-center h-full">{t('loading')}</div>;
  }

  return (
    <div className="scientific-calculator">
      <div className="top-bar">
        <div className="mode-selector">
          <button className={`mode-button ${mode === 'Basic' ? 'mode-active' : ''}`} onClick={() => setMode('Basic')}>{t('widgets.scientific_calculator.basic')}</button>
          <button className={`mode-button ${mode === 'Standard' ? 'mode-active' : ''}`} onClick={() => setMode('Standard')}>{t('widgets.scientific_calculator.standard')}</button>
          <button className={`mode-button ${mode === 'Scientific' ? 'mode-active' : ''}`} onClick={() => setMode('Scientific')}>{t('widgets.scientific_calculator.scientific')}</button>
        </div>

        {mode === 'Scientific' && (<span className="angle-mode-indicator">{isRadians ? 'RAD' : 'DEG'}</span>)}

        <button className={`mode-button history-toggle ${showHistory ? 'mode-active' : ''}`} onClick={() => setShowHistory(!showHistory)}>{t('widgets.scientific_calculator.history')}</button>
      </div>

      {showHistory && (
        <div className="history-panel">
          {history.length === 0
            ? <p className="history-empty">{t('widgets.scientific_calculator.no_history')}</p>
            : history.map((item, index) => <p key={index} className="history-entry">{item}</p>)}
        </div>
      )}

      <div className="display-area">
        <div className="expression">{expression.replace(/\*/g, '×').replace(/-/g, '−')}</div>
        <div ref={displayRef} className="main-display">{display}</div>
      </div>

      <div className="top-controls">
        <button onClick={handleBackspace} className="calc-button control">←</button>
        <button onClick={handleClear} className="calc-button ac">AC</button>
      </div>

      <div className={`buttons-grid ${gridClass}`}>
        {currentLayout.map((btn, index) => {
          if (btn === 'empty_slot') {
            return <div key={`${mode}-empty-${index}`} className="calc-button number"></div>;
          }
          const isOperator = operators.includes(btn);
          const isNumber = numbers.includes(btn);
          let buttonClass = 'function';
          if (btn === '=') buttonClass = 'equals';
          else if (isOperator) buttonClass = 'operator';
          else if (isNumber) buttonClass = 'number';

          let spanClass = '';
          if (mode === 'Basic') {
            if (btn === '.') spanClass = 'col-span-2';
            if (btn === 'Ans') spanClass = 'col-span-3';
          } else if (mode === 'Standard') {
            if (btn === 'Ans') spanClass = 'col-span-3';
          } else if (mode === 'Scientific') {
            if (btn === '6' || btn === '3') spanClass = 'col-span-2';
            if (btn === '.') spanClass = 'col-span-2';
            if (btn === '=') spanClass = 'col-span-2';
          }

          return (
            <button
              key={`${mode}-${btn}-${index}`}
              onClick={() => handleButtonClick(btn)}
              className={`calc-button ${buttonClass} ${spanClass}`}
            >
              {btn}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export { widgetConfig } from './widgetConfig';
