import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { FC } from 'react';
import { useTranslation } from 'react-i18next';
import './ScientificCalculatorWidget.css';

type ScientificCalculatorWidgetProps = {
    instanceId?: string;
    windowStyle?: 'default' | 'overlay' | 'floating';
};

type Mode = 'basic' | 'standard' | 'scientific';

type ButtonKind = 'digit' | 'operator' | 'function' | 'control' | 'equals' | 'constant' | 'toggle';

type ButtonDef = {
    label: string;
    value: string;
    kind: ButtonKind;
    span?: number;
};

type Token = {
    type: 'number' | 'operator' | 'function' | 'paren' | 'constant' | 'variable' | 'postfix';
    value: string;
};

type AngleMode = 'rad' | 'deg';

type OperatorInfo = {
    prec: number;
    assoc: 'left' | 'right';
    arity: 1 | 2;
};

const OPERATORS: Record<string, OperatorInfo> = {
    '+': { prec: 1, assoc: 'left', arity: 2 },
    '-': { prec: 1, assoc: 'left', arity: 2 },
    '*': { prec: 2, assoc: 'left', arity: 2 },
    '/': { prec: 2, assoc: 'left', arity: 2 },
    '^': { prec: 3, assoc: 'right', arity: 2 },
    neg: { prec: 4, assoc: 'right', arity: 1 },
    '!': { prec: 5, assoc: 'left', arity: 1 },
    '%': { prec: 5, assoc: 'left', arity: 1 },
};

const BASIC_LAYOUT: ButtonDef[] = [
    { label: 'C', value: 'clear', kind: 'control' },
    { label: '⌫', value: 'backspace', kind: 'control' },
    { label: '%', value: '%', kind: 'operator' },
    { label: '÷', value: '/', kind: 'operator' },
    { label: '7', value: '7', kind: 'digit' },
    { label: '8', value: '8', kind: 'digit' },
    { label: '9', value: '9', kind: 'digit' },
    { label: '×', value: '*', kind: 'operator' },
    { label: '4', value: '4', kind: 'digit' },
    { label: '5', value: '5', kind: 'digit' },
    { label: '6', value: '6', kind: 'digit' },
    { label: '−', value: '-', kind: 'operator' },
    { label: '1', value: '1', kind: 'digit' },
    { label: '2', value: '2', kind: 'digit' },
    { label: '3', value: '3', kind: 'digit' },
    { label: '+', value: '+', kind: 'operator' },
    { label: '0', value: '0', kind: 'digit', span: 2 },
    { label: '.', value: '.', kind: 'digit' },
    { label: '=', value: '=', kind: 'equals' },
];

const STANDARD_LAYOUT: ButtonDef[] = [
    { label: 'C', value: 'clear', kind: 'control' },
    { label: '⌫', value: 'backspace', kind: 'control' },
    { label: '(', value: '(', kind: 'operator' },
    { label: ')', value: ')', kind: 'operator' },
    { label: '√', value: 'sqrt', kind: 'function' },
    { label: '^', value: '^', kind: 'operator' },
    { label: '%', value: '%', kind: 'operator' },
    { label: '÷', value: '/', kind: 'operator' },
    { label: '7', value: '7', kind: 'digit' },
    { label: '8', value: '8', kind: 'digit' },
    { label: '9', value: '9', kind: 'digit' },
    { label: '×', value: '*', kind: 'operator' },
    { label: '4', value: '4', kind: 'digit' },
    { label: '5', value: '5', kind: 'digit' },
    { label: '6', value: '6', kind: 'digit' },
    { label: '−', value: '-', kind: 'operator' },
    { label: '1', value: '1', kind: 'digit' },
    { label: '2', value: '2', kind: 'digit' },
    { label: '3', value: '3', kind: 'digit' },
    { label: '+', value: '+', kind: 'operator' },
    { label: 'Ans', value: 'Ans', kind: 'constant' },
    { label: '0', value: '0', kind: 'digit' },
    { label: '.', value: '.', kind: 'digit' },
    { label: '=', value: '=', kind: 'equals' },
];

const SCIENTIFIC_LAYOUT: ButtonDef[] = [
    { label: 'RAD', value: 'angle', kind: 'toggle' },
    { label: 'sin', value: 'sin', kind: 'function' },
    { label: 'cos', value: 'cos', kind: 'function' },
    { label: 'tan', value: 'tan', kind: 'function' },
    { label: 'π', value: 'pi', kind: 'constant' },
    { label: 'C', value: 'clear', kind: 'control' },
    { label: '⌫', value: 'backspace', kind: 'control' },
    { label: 'log', value: 'log', kind: 'function' },
    { label: 'ln', value: 'ln', kind: 'function' },
    { label: '√', value: 'sqrt', kind: 'function' },
    { label: '7', value: '7', kind: 'digit' },
    { label: '8', value: '8', kind: 'digit' },
    { label: '9', value: '9', kind: 'digit' },
    { label: '÷', value: '/', kind: 'operator' },
    { label: '^', value: '^', kind: 'operator' },
    { label: '4', value: '4', kind: 'digit' },
    { label: '5', value: '5', kind: 'digit' },
    { label: '6', value: '6', kind: 'digit' },
    { label: '×', value: '*', kind: 'operator' },
    { label: '%', value: '%', kind: 'operator' },
    { label: '1', value: '1', kind: 'digit' },
    { label: '2', value: '2', kind: 'digit' },
    { label: '3', value: '3', kind: 'digit' },
    { label: '−', value: '-', kind: 'operator' },
    { label: 'x!', value: '!', kind: 'operator' },
    { label: '0', value: '0', kind: 'digit' },
    { label: '.', value: '.', kind: 'digit' },
    { label: 'Ans', value: 'Ans', kind: 'constant' },
    { label: '+', value: '+', kind: 'operator' },
    { label: '=', value: '=', kind: 'equals' },
];

const formatExpression = (value: string) => {
    return value
        .replace(/sqrt\(/g, '√(')
        .replace(/pi/g, 'π')
        .replace(/Ans/g, 'Ans')
        .replace(/\*/g, '×')
        .replace(/\//g, '÷')
        .replace(/-/g, '−');
};

const normalizeExpression = (value: string) => {
    return value
        .replace(/×/g, '*')
        .replace(/÷/g, '/')
        .replace(/−/g, '-');
};

const tokenize = (expression: string): Token[] => {
    const tokens: Token[] = [];
    let index = 0;
    const input = normalizeExpression(expression);

    while (index < input.length) {
        const char = input[index];
        if (char === ' ') {
            index += 1;
            continue;
        }
        if (/[0-9.]/.test(char)) {
            const match = input.slice(index).match(/^((\d+(\.\d*)?)|(\.\d+))([eE][+-]?\d+)?/);
            if (!match) throw new Error('Invalid number');
            tokens.push({ type: 'number', value: match[0] });
            index += match[0].length;
            continue;
        }
        if (/[a-zA-Z]/.test(char)) {
            const match = input.slice(index).match(/^[a-zA-Z]+/);
            if (!match) throw new Error('Invalid identifier');
            const ident = match[0].toLowerCase();
            if (['sin', 'cos', 'tan', 'log', 'ln', 'sqrt'].includes(ident)) {
                tokens.push({ type: 'function', value: ident });
            } else if (ident === 'pi') {
                tokens.push({ type: 'constant', value: 'pi' });
            } else if (ident === 'ans') {
                tokens.push({ type: 'variable', value: 'ans' });
            } else {
                throw new Error('Unknown identifier');
            }
            index += match[0].length;
            continue;
        }
        if (char === 'π') {
            tokens.push({ type: 'constant', value: 'pi' });
            index += 1;
            continue;
        }
        if (char === '(' || char === ')') {
            tokens.push({ type: 'paren', value: char });
            index += 1;
            continue;
        }
        if (['+', '-', '*', '/', '^'].includes(char)) {
            tokens.push({ type: 'operator', value: char });
            index += 1;
            continue;
        }
        if (char === '!' || char === '%') {
            tokens.push({ type: 'postfix', value: char });
            index += 1;
            continue;
        }
        throw new Error('Invalid character');
    }

    return tokens;
};

const toRpn = (tokens: Token[]): Token[] => {
    const output: Token[] = [];
    const stack: Token[] = [];
    let previous: Token | null = null;

    tokens.forEach((token) => {
        if (token.type === 'operator' && token.value === '-') {
            const needsUnary =
                !previous ||
                (previous.type === 'operator') ||
                (previous.type === 'paren' && previous.value === '(') ||
                previous.type === 'function';
            if (needsUnary) {
                token = { type: 'operator', value: 'neg' };
            }
        }

        if (token.type === 'number' || token.type === 'constant' || token.type === 'variable') {
            output.push(token);
        } else if (token.type === 'function') {
            stack.push(token);
        } else if (token.type === 'postfix') {
            output.push(token);
        } else if (token.type === 'operator') {
            const current = OPERATORS[token.value];
            if (!current) throw new Error('Unknown operator');
            while (stack.length > 0) {
                const top = stack[stack.length - 1];
                if (top.type !== 'operator') break;
                const topInfo = OPERATORS[top.value];
                if (!topInfo) break;
                const higherPrec = topInfo.prec > current.prec;
                const equalPrec = topInfo.prec === current.prec && current.assoc === 'left';
                if (higherPrec || equalPrec) {
                    output.push(stack.pop() as Token);
                } else {
                    break;
                }
            }
            stack.push(token);
        } else if (token.type === 'paren') {
            if (token.value === '(') {
                stack.push(token);
            } else {
                while (stack.length > 0 && stack[stack.length - 1].value !== '(') {
                    output.push(stack.pop() as Token);
                }
                if (stack.length === 0) throw new Error('Mismatched parentheses');
                stack.pop();
                if (stack.length > 0 && stack[stack.length - 1].type === 'function') {
                    output.push(stack.pop() as Token);
                }
            }
        }

        previous = token;
    });

    while (stack.length > 0) {
        const token = stack.pop() as Token;
        if (token.type === 'paren') throw new Error('Mismatched parentheses');
        output.push(token);
    }

    return output;
};

const factorial = (value: number) => {
    if (!Number.isFinite(value) || value < 0 || Math.floor(value) !== value) return NaN;
    if (value > 170) return Infinity;
    let result = 1;
    for (let i = 2; i <= value; i += 1) result *= i;
    return result;
};

const evalRpn = (tokens: Token[], angleMode: AngleMode, lastAnswer: number) => {
    const stack: number[] = [];

    tokens.forEach((token) => {
        if (token.type === 'number') {
            stack.push(Number(token.value));
            return;
        }
        if (token.type === 'constant') {
            stack.push(Math.PI);
            return;
        }
        if (token.type === 'variable') {
            stack.push(lastAnswer);
            return;
        }
        if (token.type === 'function') {
            const value = stack.pop();
            if (value === undefined) throw new Error('Missing argument');
            const input = angleMode === 'deg' && ['sin', 'cos', 'tan'].includes(token.value)
                ? value * Math.PI / 180
                : value;
            if (token.value === 'sin') stack.push(Math.sin(input));
            if (token.value === 'cos') stack.push(Math.cos(input));
            if (token.value === 'tan') stack.push(Math.tan(input));
            if (token.value === 'log') stack.push(Math.log10(value));
            if (token.value === 'ln') stack.push(Math.log(value));
            if (token.value === 'sqrt') stack.push(Math.sqrt(value));
            return;
        }
        if (token.type === 'postfix') {
            const value = stack.pop();
            if (value === undefined) throw new Error('Missing argument');
            if (token.value === '!') stack.push(factorial(value));
            if (token.value === '%') stack.push(value / 100);
            return;
        }
        if (token.type === 'operator') {
            const info = OPERATORS[token.value];
            if (!info) throw new Error('Unknown operator');
            if (info.arity === 1) {
                const value = stack.pop();
                if (value === undefined) throw new Error('Missing argument');
                stack.push(-value);
                return;
            }
            const right = stack.pop();
            const left = stack.pop();
            if (left === undefined || right === undefined) throw new Error('Missing argument');
            if (token.value === '+') stack.push(left + right);
            if (token.value === '-') stack.push(left - right);
            if (token.value === '*') stack.push(left * right);
            if (token.value === '/') stack.push(left / right);
            if (token.value === '^') stack.push(left ** right);
        }
    });

    if (stack.length !== 1) throw new Error('Invalid expression');
    return stack[0];
};

const formatResult = (value: number) => {
    if (!Number.isFinite(value)) return 'Error';
    const abs = Math.abs(value);
    if (abs !== 0 && (abs >= 1e12 || abs < 1e-9)) {
        return value.toExponential(8);
    }
    return Number.parseFloat(value.toFixed(10)).toString();
};

const isOperatorChar = (value: string) => ['+', '-', '*', '/', '^'].includes(value);

const removeLastToken = (value: string) => {
    const removals: Array<[string, number]> = [
        ['Ans', 3],
        ['sqrt(', 5],
        ['sin(', 4],
        ['cos(', 4],
        ['tan(', 4],
        ['log(', 4],
        ['ln(', 3],
        ['pi', 2],
    ];
    for (const [token, size] of removals) {
        if (value.endsWith(token)) return value.slice(0, -size);
    }
    return value.slice(0, -1);
};

export const ScientificCalculatorWidget: FC<ScientificCalculatorWidgetProps> = ({
    instanceId,
    windowStyle,
}) => {
    const { t, ready } = useTranslation();
    const [mode, setMode] = useState<Mode>('scientific');
    const [angleMode, setAngleMode] = useState<AngleMode>('deg');
    const [expression, setExpression] = useState('');
    const [preview, setPreview] = useState('');
    const [display, setDisplay] = useState('0');
    const [lastAnswer, setLastAnswer] = useState(0);
    const [lastInputWasEval, setLastInputWasEval] = useState(false);
    const wrapperRef = useRef<HTMLDivElement>(null);
    const isFloating = windowStyle === 'floating';

    useLayoutEffect(() => {
        const node = wrapperRef.current;
        if (!node) return;
        const baseWidth = 360;
        const baseHeight = 520;
        const updateScale = () => {
            const rect = node.getBoundingClientRect();
            const scale = Math.min(rect.width / baseWidth, rect.height / baseHeight);
            const clamped = Math.max(0.85, Math.min(1.35, scale));
            node.style.setProperty('--calc-scale', clamped.toFixed(3));
        };
        updateScale();
        const observer = new ResizeObserver(updateScale);
        observer.observe(node);
        return () => observer.disconnect();
    }, []);

    const currentLayout = useMemo(() => {
        if (mode === 'basic') return BASIC_LAYOUT;
        if (mode === 'standard') return STANDARD_LAYOUT;
        return SCIENTIFIC_LAYOUT;
    }, [mode]);

    const updateExpression = (next: string) => {
        setExpression(next);
        setPreview(next ? formatExpression(next) : '');
    };

    const setExpressionOnly = (next: string) => {
        setExpression(next);
    };

    const insertImplicitMultiply = (next: string) => {
        if (!expression) return next;
        const lastChar = expression.slice(-1);
        if (/[0-9)]/.test(lastChar) || expression.endsWith('pi') || expression.endsWith('Ans') || lastChar === '!') {
            return `*${next}`;
        }
        return next;
    };

    const handleNumber = (value: string) => {
        if (value === '.' && display.includes('.')) return;
        const needsLeadingZero =
            value === '.' &&
            (expression === '' || isOperatorChar(expression.slice(-1)) || expression.endsWith('('));
        const numberToken = needsLeadingZero ? '0.' : value;
        if (lastInputWasEval) {
            updateExpression(numberToken);
            setDisplay(numberToken);
            setLastInputWasEval(false);
            return;
        }
        const needsImplicit = /\)$/.test(expression) || expression.endsWith('pi') || expression.endsWith('Ans') || expression.endsWith('!');
        const prefix = needsImplicit ? '*' : '';
        if (display === '0' && value !== '.') {
            setDisplay(value);
        } else if (isOperatorChar(expression.slice(-1)) || expression.endsWith('(')) {
            setDisplay(numberToken);
        } else {
            setDisplay((prev) => (value === '.' && prev === '' ? '0.' : prev + value));
        }
        updateExpression(expression + prefix + numberToken);
    };

    const handleOperator = (value: string) => {
        if (value === 'clear') {
            updateExpression('');
            setDisplay('0');
            setPreview('');
            setLastInputWasEval(false);
            return;
        }
        if (value === 'backspace') {
            if (!expression) return;
            const nextExpression = removeLastToken(expression);
            updateExpression(nextExpression);
            if (nextExpression.endsWith('pi')) {
                setDisplay('π');
                return;
            }
            if (nextExpression.endsWith('Ans')) {
                setDisplay('Ans');
                return;
            }
            const lastNumberMatch = nextExpression.match(/(\d+(?:\.\d+)?)(?!.*\d)/);
            setDisplay(lastNumberMatch ? lastNumberMatch[1] : '0');
            return;
        }
        if (value === '=') {
            const target = expression || display;
            try {
                const tokens = tokenize(target);
                const rpn = toRpn(tokens);
                const result = evalRpn(rpn, angleMode, lastAnswer);
                const formatted = formatResult(result);
                setDisplay(formatted);
                setPreview(`${formatExpression(target)} =`);
                setExpressionOnly(formatted === 'Error' ? '' : formatted);
                setLastAnswer(formatted === 'Error' ? lastAnswer : result);
                setLastInputWasEval(true);
            } catch {
                setDisplay('Error');
                setPreview(`${formatExpression(target)} =`);
                setLastInputWasEval(true);
            }
            return;
        }
        if (value === 'angle') {
            setAngleMode((prev) => (prev === 'rad' ? 'deg' : 'rad'));
            return;
        }
        if (value === 'sqrt' || ['sin', 'cos', 'tan', 'log', 'ln'].includes(value)) {
            const token = value === 'sqrt' ? 'sqrt(' : `${value}(`;
            const next = insertImplicitMultiply(token);
            updateExpression(expression + next);
            setDisplay(token);
            setLastInputWasEval(false);
            return;
        }
        if (value === 'pi') {
            const next = insertImplicitMultiply('pi');
            updateExpression(expression + next);
            setDisplay('π');
            setLastInputWasEval(false);
            return;
        }
        if (value === 'Ans') {
            const next = insertImplicitMultiply('Ans');
            updateExpression(expression + next);
            setDisplay('Ans');
            setLastInputWasEval(false);
            return;
        }
        if (value === '!' || value === '%') {
            updateExpression(expression + value);
            setLastInputWasEval(false);
            return;
        }
        if (isOperatorChar(value) || value === '(' || value === ')') {
            if (lastInputWasEval) {
                updateExpression(display + value);
                setLastInputWasEval(false);
                return;
            }
            if (!expression && value !== '-') return;
            if (value === '(') {
                const next = insertImplicitMultiply('(');
                updateExpression(expression + next);
                return;
            }
            if (isOperatorChar(expression.slice(-1)) && isOperatorChar(value)) {
                updateExpression(expression.slice(0, -1) + value);
                return;
            }
            updateExpression(expression + value);
            return;
        }
    };

    const handleButtonPress = (button: ButtonDef) => {
        if (button.kind === 'digit') {
            handleNumber(button.value);
            return;
        }
        if (button.kind === 'equals') {
            handleOperator('=');
            return;
        }
        if (button.kind === 'toggle') {
            handleOperator('angle');
            return;
        }
        handleOperator(button.value);
    };

    const handleToggleFloating = () => {
        if (!instanceId) return;
        window.dispatchEvent(
            new CustomEvent('widget-toggle-floating', {
                detail: { instanceId, enable: !isFloating },
            })
        );
    };

    const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
        if (event.ctrlKey || event.metaKey || event.altKey) return;
        const { key } = event;

        if (/^\d$/.test(key)) {
            event.preventDefault();
            handleNumber(key);
            return;
        }
        if (key === '.' || key === ',') {
            event.preventDefault();
            handleNumber('.');
            return;
        }
        if (key === '+' || key === '-' || key === '*' || key === '/') {
            event.preventDefault();
            handleOperator(key);
            return;
        }
        if (key === 'x' || key === 'X') {
            event.preventDefault();
            handleOperator('*');
            return;
        }
        if (key === 'Enter' || key === '=') {
            event.preventDefault();
            handleOperator('=');
            return;
        }
        if (key === 'Backspace') {
            event.preventDefault();
            handleOperator('backspace');
            return;
        }
        if (key === 'Delete') {
            event.preventDefault();
            handleOperator('clear');
        }
    };

    if (!ready) {
        return <div className="calc-loading">{t('loading')}</div>;
    }

    return (
        <div
            className={`scientific-calculator${isFloating ? ' is-floating' : ''}`}
            ref={wrapperRef}
            tabIndex={0}
            onKeyDown={handleKeyDown}
            onPointerDown={() => wrapperRef.current?.focus()}
        >
            <div className="calc-surface">
                <div className="calc-top">
                    <div className="calc-tabs">
                        <button
                            className={`calc-tab ${mode === 'basic' ? 'is-active' : ''}`}
                            onClick={() => setMode('basic')}
                            type="button"
                        >
                            {t('widgets.scientific_calculator.basic')}
                        </button>
                        <button
                            className={`calc-tab ${mode === 'standard' ? 'is-active' : ''}`}
                            onClick={() => setMode('standard')}
                            type="button"
                        >
                            {t('widgets.scientific_calculator.standard')}
                        </button>
                        <button
                            className={`calc-tab ${mode === 'scientific' ? 'is-active' : ''}`}
                            onClick={() => setMode('scientific')}
                            type="button"
                        >
                            {t('widgets.scientific_calculator.scientific')}
                        </button>
                    </div>
                    <div className="calc-angle">
                        {mode === 'scientific' && (
                            <span className="calc-angle-pill">{angleMode.toUpperCase()}</span>
                        )}
                        <button
                            type="button"
                            className={`calc-floating-toggle${isFloating ? ' is-active' : ''}`}
                            onClick={handleToggleFloating}
                            aria-label={isFloating ? t('widgets.scientific_calculator.floating_off') : t('widgets.scientific_calculator.floating_on')}
                            title={isFloating ? t('widgets.scientific_calculator.floating_off') : t('widgets.scientific_calculator.floating_on')}
                        >
                            {isFloating ? t('widgets.scientific_calculator.floating_off') : t('widgets.scientific_calculator.floating_on')}
                        </button>
                    </div>
                </div>

                <div className="calc-display">
                    <div className="calc-expression">{preview || ' '}</div>
                    <div className="calc-result">{display}</div>
                </div>

                <div className={`calc-grid calc-grid--${mode}`}>
                    {currentLayout.map((button, index) => (
                        <button
                            key={`${button.label}-${index}`}
                            type="button"
                            onClick={() => handleButtonPress(button)}
                            className={`calc-key calc-key--${button.kind}`}
                            style={button.span ? { gridColumn: `span ${button.span} / span ${button.span}` } : undefined}
                        >
                            {button.kind === 'toggle' ? angleMode.toUpperCase() : button.label}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
};

export { widgetConfig } from './widgetConfig';
