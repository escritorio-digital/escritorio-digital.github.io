import { useState, useEffect, useRef } from 'react';
import type { FC } from 'react';
import { useTranslation } from 'react-i18next';
import type { WidgetConfig } from '../../../types';
import { Play, Pause, RotateCcw, Flag } from 'lucide-react';
import './Stopwatch.css';
import { withBaseUrl } from '../../../utils/assetPaths';

// Función para formatear el tiempo de milisegundos a MM:SS.ms
const formatTime = (time: number) => {
  const minutes = Math.floor(time / 60000).toString().padStart(2, '0');
  const seconds = Math.floor((time / 1000) % 60).toString().padStart(2, '0');
  const milliseconds = Math.floor((time / 10) % 100).toString().padStart(2, '0');
  return `${minutes}:${seconds}.${milliseconds}`;
};

// El componente principal del Cronómetro
export const StopwatchWidget: FC = () => {
  const { t } = useTranslation();
  const [time, setTime] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const [laps, setLaps] = useState<number[]>([]);
  const intervalRef = useRef<number | null>(null);
  const displayRef = useRef<HTMLDivElement>(null);
  const [timeFontSize, setTimeFontSize] = useState(48);
  const lastFontSizeRef = useRef(48);

  useEffect(() => {
    if (isActive) {
      const startTime = Date.now() - time;
      intervalRef.current = window.setInterval(() => {
        setTime(Date.now() - startTime);
      }, 10); // Actualiza cada 10ms para mayor precisión
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    }
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isActive, time]);

  useEffect(() => {
    const container = displayRef.current;
    if (!container) return;

    const updateSize = () => {
      const { width, height } = container.getBoundingClientRect();
      const nextSize = Math.max(28, Math.min(width * 0.18, height * 0.5));
      const roundedSize = Math.floor(nextSize);
      if (roundedSize !== lastFontSizeRef.current) {
        lastFontSizeRef.current = roundedSize;
        setTimeFontSize(roundedSize);
      }
    };

    updateSize();
    const resizeObserver = new ResizeObserver(updateSize);
    resizeObserver.observe(container);
    return () => resizeObserver.disconnect();
  }, []);

  const handleStartStop = () => {
    setIsActive(!isActive);
  };

  const handleReset = () => {
    setIsActive(false);
    setTime(0);
    setLaps([]);
  };

  const handleLap = () => {
    if (isActive) {
      setLaps([time, ...laps]);
    }
  };

  return (
    <div className="stopwatch-widget">
      <div className="time-display-container" ref={displayRef}>
        <span className="time-display-main" style={{ fontSize: `${timeFontSize}px` }}>
          {formatTime(time)}
        </span>
      </div>

      <div className="controls-container">
        <button onClick={handleReset} className="control-button reset">
          <RotateCcw size={20} />
          <span>{t('widgets.stopwatch.reset')}</span>
        </button>
        <button onClick={handleStartStop} className={`control-button start-stop ${isActive ? 'active' : ''}`}>
          {isActive ? <Pause size={24} /> : <Play size={24} />}
          <span>{isActive ? t('widgets.stopwatch.pause') : t('widgets.stopwatch.start')}</span>
        </button>
        <button onClick={handleLap} disabled={!isActive && time === 0} className="control-button lap">
          <Flag size={20} />
          <span>{t('widgets.stopwatch.lap')}</span>
        </button>
      </div>
      
      <div className="laps-container">
        <ul className="laps-list">
          {laps.map((lap, index) => (
            <li key={index} className="lap-item">
              <span>{t('widgets.stopwatch.lap')} {laps.length - index}</span>
              <span>{formatTime(lap)}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

const WidgetIcon: FC = () => {
  const { t } = useTranslation();
  return <img src={withBaseUrl('icons/Stopwatch.png')} alt={t('widgets.stopwatch.title')} width={52} height={52} />;
}

export const widgetConfig: Omit<WidgetConfig, 'component'> = {
  id: 'stopwatch',
  title: 'widgets.stopwatch.title',
  icon: <WidgetIcon />,
  defaultSize: { width: 320, height: 450 },
};
