import React, { useState, useEffect, useRef } from 'react';
import type { FC } from 'react';
import { useTranslation } from 'react-i18next';
import { Dices, Info, Volume2, VolumeX } from 'lucide-react';
import './Dice.css';
import { WidgetToolbar } from '../../core/WidgetToolbar';

// ... (Interfaz DieState sin cambios)
interface DieState {
  id: number;
  value: number;
  isRolling: boolean;
}

export const DiceWidget: FC = () => {
  const { t } = useTranslation();
  const [numDice, setNumDice] = useState(2);
  const [numFaces, setNumFaces] = useState(6);
  const [dice, setDice] = useState<DieState[]>([]);
  const [total, setTotal] = useState(0);
  const [isRolling, setIsRolling] = useState(false);
  const [rollDurationMs, setRollDurationMs] = useState(1500);
  const [isSoundMuted, setIsSoundMuted] = useState(() => {
    try {
      return localStorage.getItem('dice-sound-muted') === 'true';
    } catch {
      return false;
    }
  });
  
  // 1. Inicializa la referencia como null
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [dieSizing, setDieSizing] = useState<{ size: number; dot: number; flat: number } | null>(null);
  const rollIntervalRef = useRef<number | null>(null);

  // 2. Crea el objeto de Audio solo en el lado del cliente (en el navegador)
  useEffect(() => {
    audioRef.current = new Audio('/sounds/dice-142528.mp3');
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return undefined;
    const updateSize = () => {
      const styles = getComputedStyle(container);
      const paddingX = (parseFloat(styles.paddingLeft) || 0) + (parseFloat(styles.paddingRight) || 0);
      const paddingY = (parseFloat(styles.paddingTop) || 0) + (parseFloat(styles.paddingBottom) || 0);
      const width = container.clientWidth - paddingX;
      const height = container.clientHeight - paddingY;
      if (width <= 0 || height <= 0) return;
      const gap = 16;
      let bestSize = 0;
      for (let cols = 1; cols <= numDice; cols += 1) {
        const rows = Math.ceil(numDice / cols);
        const maxWidth = (width - gap * (cols - 1)) / cols;
        const maxHeight = (height - gap * (rows - 1)) / rows;
        const size = Math.min(maxWidth, maxHeight);
        if (size > bestSize) bestSize = size;
      }
      const size = Math.max(56, Math.min(200, Math.floor(bestSize)));
      const dot = Math.max(8, Math.floor(size * 0.18));
      const flat = Math.max(18, Math.floor(size * 0.42));
      setDieSizing({ size, dot, flat });
    };
    updateSize();
    const observer = new ResizeObserver(updateSize);
    observer.observe(container);
    return () => observer.disconnect();
  }, [numDice]);

  useEffect(() => () => {
    if (rollIntervalRef.current) {
      window.clearInterval(rollIntervalRef.current);
      rollIntervalRef.current = null;
    }
  }, []);

  const randomValue = () => Math.floor(Math.random() * numFaces) + 1;

  const rollDice = () => {
    // Aseguramos que el audio esté listo y no se esté reproduciendo
    if (isRolling || !audioRef.current) return;
    
    setIsRolling(true);

    let durationMs = 1500;
    if (audioRef.current && Number.isFinite(audioRef.current.duration) && audioRef.current.duration > 0) {
      durationMs = Math.round(audioRef.current.duration * 1000);
    }
    setRollDurationMs(durationMs);
    if (!isSoundMuted) {
      // Reproduce el sonido
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(error => {
          // Opcional: Maneja errores si la reproducción falla por alguna razón
          console.error("Error al reproducir el audio:", error);
      });
    }

    const rollingDice = Array.from({ length: numDice }, (_, i) => ({
      id: i,
      value: randomValue(),
      isRolling: true,
    }));
    setDice(rollingDice);
    setTotal(0);

    setTimeout(() => {
      if (rollIntervalRef.current) {
        window.clearInterval(rollIntervalRef.current);
        rollIntervalRef.current = null;
      }
      let finalTotal = 0;
      const finalDice = Array.from({ length: numDice }, (_, i) => {
        const value = randomValue();
        finalTotal += value;
        return { id: i, value, isRolling: false };
      });
      setDice(finalDice);
      setTotal(finalTotal);
      setIsRolling(false);
    }, durationMs);

    if (numFaces !== 6) {
      if (rollIntervalRef.current) {
        window.clearInterval(rollIntervalRef.current);
      }
      rollIntervalRef.current = window.setInterval(() => {
        setDice((prev) => prev.map((d) => ({ ...d, value: randomValue(), isRolling: true })));
      }, 90);
    }
  };
  
  // 3. Hemos eliminado el useEffect que llamaba a rollDice() al inicio.

  // ... (El resto del componente: handleNumDiceChange, el componente Die y el JSX se mantienen exactamente igual)
  const handleNumDiceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (isRolling) return;
    const value = parseInt(e.target.value, 10);
    if (value > 0 && value <= 10) {
        setNumDice(value);
    }
  };

  const Die: FC<{ value: number; isRolling: boolean }> = ({ value, isRolling }) => {
    const face = (num: number) => (
        <div className={`face face-${num}`}>
        {Array.from({ length: num }).map((_, i) => <span key={i} className="dot" />)}
        </div>
    );
    if (numFaces !== 6) {
      return (
        <div className="die-flat">
          <span>{value}</span>
        </div>
      );
    }
    return (
        <div className="die-scene">
        <div className={`die-3d ${isRolling ? 'rolling' : `show-${value}`}`}>
            {face(1)}
            {face(2)}
            {face(3)}
            {face(4)}
            {face(5)}
            {face(6)}
        </div>
        </div>
    );
  };

  return (
    <div className="dice-widget">
        <WidgetToolbar>
            <div className="dice-toolbar-group">
                <div className="dice-selector">
                    <label htmlFor="num-dice-input">{t('widgets.dice.num_dice_short')}</label>
                    <input
                        id="num-dice-input"
                        type="number"
                        value={numDice}
                        onChange={handleNumDiceChange}
                        min="1"
                        max="10"
                        disabled={isRolling}
                    />
                </div>
                <div className="dice-selector">
                    <label htmlFor="num-faces-input">{t('widgets.dice.num_faces_short')}</label>
                    <select
                        id="num-faces-input"
                        value={numFaces}
                        onChange={(event) => {
                          if (isRolling) return;
                          const value = parseInt(event.target.value, 10);
                          if (value >= 2 && value <= 20) {
                            setNumFaces(value);
                          }
                        }}
                        disabled={isRolling}
                    >
                        {Array.from({ length: 19 }, (_, index) => {
                          const value = index + 2;
                          return (
                            <option key={value} value={value}>
                              {value}
                            </option>
                          );
                        })}
                    </select>
                </div>
            </div>
            <button
                type="button"
                className="dice-toolbar-action"
                onClick={rollDice}
                disabled={isRolling}
                title={isRolling ? t('widgets.dice.rolling') : t('widgets.dice.roll_dice')}
                aria-label={isRolling ? t('widgets.dice.rolling') : t('widgets.dice.roll_dice')}
            >
                <Dices size={16} />
                <span>{isRolling ? t('widgets.dice.rolling') : t('widgets.dice.roll_dice')}</span>
            </button>
            <button
                type="button"
                className="dice-toolbar-button"
                onClick={() => {
                  setIsSoundMuted((prev) => {
                    const next = !prev;
                    try {
                      localStorage.setItem('dice-sound-muted', next ? 'true' : 'false');
                    } catch {
                      // ignore storage errors
                    }
                    return next;
                  });
                }}
                title={isSoundMuted ? t('widgets.dice.sound_on') : t('widgets.dice.sound_off')}
                aria-label={isSoundMuted ? t('widgets.dice.sound_on') : t('widgets.dice.sound_off')}
            >
                {isSoundMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
            </button>
        </WidgetToolbar>

        <div
            ref={containerRef}
            className="dice-container"
            style={dieSizing ? ({
              ['--die-size' as string]: `${dieSizing.size}px`,
              ['--dot-size' as string]: `${dieSizing.dot}px`,
              ['--flat-font-size' as string]: `${dieSizing.flat}px`,
              ['--roll-duration' as string]: `${rollDurationMs}ms`,
            } as React.CSSProperties) : ({ ['--roll-duration' as string]: `${rollDurationMs}ms` } as React.CSSProperties)}
        >
            {dice.map(d => <Die key={d.id} value={d.value} isRolling={d.isRolling} />)}
        </div>

        <div className={`total ${!isRolling && total > 0 ? '' : 'total--hidden'}`}>
            {t('widgets.dice.total')} <span>{total}</span>
        </div>

        <a
            href="https://pixabay.com/users/u_qpfzpydtro-29496424/?utm_source=link-attribution&utm_medium=referral"
            target="_blank"
            rel="noopener noreferrer"
            className="attribution-button"
            title="Sound Effect by u_qpfzpydtro from Pixabay"
            onClick={e => e.stopPropagation()}
        >
            <Info size={12} />
        </a>
    </div>
  );
};

// ... (La configuración del widget no cambia)

export { widgetConfig } from './widgetConfig';
