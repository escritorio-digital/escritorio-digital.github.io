import { useState, useEffect, useRef } from 'react';
import type { FC } from 'react'; // <-- CORRECCIÓN 2: Importación de tipo
import { useTranslation } from 'react-i18next';
import { Play, Pause, RotateCw } from 'lucide-react';
import type { WidgetConfig } from '../../../types';
import { withBaseUrl } from '../../../utils/assetPaths';

export const TimerWidget: FC = () => {
    const { t } = useTranslation();
    const [minutesInput, setMinutesInput] = useState(5);
    const [secondsInput, setSecondsInput] = useState(0);
    const [totalDuration, setTotalDuration] = useState(300);
    const [remainingSeconds, setRemainingSeconds] = useState(300);
    const [isActive, setIsActive] = useState(false);
    const displayRef = useRef<HTMLDivElement>(null);
    const [timeFontSize, setTimeFontSize] = useState(48);
    const lastFontSizeRef = useRef(48);

    useEffect(() => {
        // CORRECCIÓN 3: Dejamos que TypeScript infiera el tipo correcto para 'interval'
        let interval: ReturnType<typeof setInterval> | undefined = undefined;
        
        if (isActive && remainingSeconds > 0) {
            interval = setInterval(() => {
                setRemainingSeconds(secs => secs - 1);
            }, 1000);
        } else if (remainingSeconds === 0 && isActive) {
            setIsActive(false);
        }
        return () => clearInterval(interval);
    }, [isActive, remainingSeconds]);

    const handleTimeChange = () => {
        const total = (minutesInput * 60) + secondsInput;
        setTotalDuration(total);
        if (!isActive) {
            setRemainingSeconds(total);
        }
    };

    useEffect(handleTimeChange, [minutesInput, secondsInput]);

    useEffect(() => {
        const container = displayRef.current;
        if (!container) return;

        const updateSize = () => {
            const { width, height } = container.getBoundingClientRect();
            const nextSize = Math.max(32, Math.min(width * 0.3, height * 0.7));
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

    const toggleTimer = () => {
        if (totalDuration <= 0) return;
        if (remainingSeconds === 0) {
           handleReset();
        }
        setIsActive(!isActive);
    };

    const handleReset = () => {
        setIsActive(false);
        setRemainingSeconds(totalDuration);
    };

    const formatTime = (timeInSeconds: number) => {
        const mins = Math.floor(timeInSeconds / 60);
        const secs = timeInSeconds % 60;
        return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    };

    return (
        <div className="flex flex-col items-center justify-center h-full text-text-dark p-4 overflow-hidden">
            <div className="flex-1 w-full flex items-center justify-center" ref={displayRef}>
                <div
                    className="font-bold font-mono leading-none"
                    style={{
                        fontSize: `${timeFontSize}px`,
                        color: 'var(--color-text-light)',
                        textShadow: '0 2px 8px rgba(0, 0, 0, 0.55)',
                        WebkitTextStroke: '1px rgba(0, 0, 0, 0.45)',
                    }}
                >
                    {remainingSeconds === 0 && !isActive ? t('widgets.timer.finished') : formatTime(remainingSeconds)}
                </div>
            </div>
            
            <div className="flex items-center gap-2 mb-4">
                <input 
                    type="number" 
                    className="w-20 text-center bg-custom-bg border-2 border-accent rounded p-1"
                    value={minutesInput}
                    onChange={e => setMinutesInput(Math.max(0, parseInt(e.target.value) || 0))}
                    disabled={isActive}
                />
                <span className="text-2xl font-bold">:</span>
                <input 
                    type="number" 
                    className="w-20 text-center bg-custom-bg border-2 border-accent rounded p-1"
                    value={secondsInput}
                    onChange={e => setSecondsInput(Math.max(0, Math.min(59, parseInt(e.target.value) || 0)))}
                    disabled={isActive}
                />
            </div>

            <div className="flex gap-4">
                <button onClick={toggleTimer} className="p-3 bg-accent rounded-full hover:bg-[#8ec9c9]">
                    {isActive ? <Pause size={24} /> : <Play size={24} />}
                </button>
                <button onClick={handleReset} className="p-3 bg-custom-bg border-2 border-accent rounded-full hover:bg-accent/50">
                    <RotateCw size={24} />
                </button>
            </div>
        </div>
    );
};

export const widgetConfig: Omit<WidgetConfig, 'component'> = {
    id: 'timer',
    title: 'widgets.timer.title',
    icon: (() => {
      const WidgetIcon: React.FC = () => {
        const { t } = useTranslation();
        return <img src={withBaseUrl('icons/Timer.png')} alt={t('widgets.timer.title')} width={52} height={52} />;
      };
      return <WidgetIcon />;
    })(),
    defaultSize: { width: 300, height: 300 },
};
