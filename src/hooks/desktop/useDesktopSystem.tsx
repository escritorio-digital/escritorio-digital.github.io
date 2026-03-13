import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode, RefObject } from 'react';
import type { AlarmItem } from '../../utils/alarmStore';

type StorageEstimateState = {
    usage: number | null;
    quota: number | null;
};

type ViewportSize = {
    width: number;
    height: number;
};

type UseDesktopSystemParams = {
    language: string;
    showDateTime: boolean;
    alarmItems: AlarmItem[];
};

type UseDesktopSystemResult = {
    now: Date;
    storageEstimate: StorageEstimateState;
    screenSize: ViewportSize;
    windowSize: ViewportSize;
    clockRef: RefObject<HTMLDivElement | null>;
    clockBottom: number | null;
    formattedDate: string;
    formattedTime: string;
    isFullscreen: boolean;
    renderClockTime: (time: string) => ReactNode[];
    toggleFullscreen: () => Promise<void>;
};

export function useDesktopSystem({
    language,
    showDateTime,
    alarmItems,
}: UseDesktopSystemParams): UseDesktopSystemResult {
    const [isFullscreen, setIsFullscreen] = useState(!!document.fullscreenElement);
    const [now, setNow] = useState(new Date());
    const [storageEstimate, setStorageEstimate] = useState<StorageEstimateState>({
        usage: null,
        quota: null,
    });
    const [screenSize, setScreenSize] = useState<ViewportSize>({
        width: window.screen.width,
        height: window.screen.height,
    });
    const [windowSize, setWindowSize] = useState<ViewportSize>({
        width: window.innerWidth,
        height: window.innerHeight,
    });
    const clockRef = useRef<HTMLDivElement>(null);
    const [clockBottom, setClockBottom] = useState<number | null>(null);

    const formattedDate = useMemo(() => new Intl.DateTimeFormat(language, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
    }).format(now), [language, now]);
    const formattedTime = useMemo(() => new Intl.DateTimeFormat(language, {
        hour: '2-digit',
        minute: '2-digit',
    }).format(now), [language, now]);
    const isClockColonOn = now.getSeconds() % 2 === 0;
    const activeAlarms = alarmItems.filter((alarm) => !alarm.triggered).sort((a, b) => a.targetTime - b.targetTime);
    const ringingAlarmCount = alarmItems.filter((alarm) => alarm.triggered).length;

    const renderClockTime = useCallback((time: string) => {
        const parts = time.split(':');
        if (parts.length < 2) return [time];
        return parts.flatMap((part, index) => {
            const chunk = <span key={`time-part-${index}`}>{part}</span>;
            if (index === 0) return [chunk];
            return [
                <span
                    key={`time-colon-${index}`}
                    className={`desktop-clock-colon${isClockColonOn ? ' is-on' : ''}`}
                >
                    :
                </span>,
                chunk,
            ];
        });
    }, [isClockColonOn]);

    useEffect(() => {
        const intervalId = window.setInterval(() => setNow(new Date()), 1000);
        return () => window.clearInterval(intervalId);
    }, []);

    useEffect(() => {
        if (!showDateTime) {
            setClockBottom(null);
            return;
        }
        const updateClockBottom = () => {
            const node = clockRef.current;
            if (!node) return;
            const rect = node.getBoundingClientRect();
            setClockBottom(rect.bottom);
        };
        const rafId = window.requestAnimationFrame(updateClockBottom);
        window.addEventListener('resize', updateClockBottom);
        return () => {
            window.cancelAnimationFrame(rafId);
            window.removeEventListener('resize', updateClockBottom);
        };
    }, [showDateTime, formattedDate, formattedTime, language, activeAlarms.length, ringingAlarmCount]);

    useEffect(() => {
        const updateStorage = async () => {
            if (!navigator.storage?.estimate) {
                setStorageEstimate({ usage: null, quota: null });
                return;
            }
            const estimate = await navigator.storage.estimate();
            setStorageEstimate({
                usage: typeof estimate.usage === 'number' ? estimate.usage : null,
                quota: typeof estimate.quota === 'number' ? estimate.quota : null,
            });
        };
        updateStorage();
        const intervalId = window.setInterval(updateStorage, 30000);
        const handleStorageUsageChange = () => updateStorage();
        window.addEventListener('storage-usage-changed', handleStorageUsageChange);
        return () => {
            window.clearInterval(intervalId);
            window.removeEventListener('storage-usage-changed', handleStorageUsageChange);
        };
    }, []);

    useEffect(() => {
        const updateViewportSizes = () => {
            setScreenSize({ width: window.screen.width, height: window.screen.height });
            setWindowSize({ width: window.innerWidth, height: window.innerHeight });
        };
        updateViewportSizes();
        window.addEventListener('resize', updateViewportSizes);
        return () => window.removeEventListener('resize', updateViewportSizes);
    }, []);

    useEffect(() => {
        const handleFullscreenChange = () => {
            setIsFullscreen(!!document.fullscreenElement);
        };
        document.addEventListener('fullscreenchange', handleFullscreenChange);
        return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
    }, []);

    const toggleFullscreen = useCallback(async () => {
        try {
            if (!document.fullscreenElement) {
                await document.documentElement.requestFullscreen();
            } else {
                await document.exitFullscreen();
            }
        } catch (error) {
            console.warn('No se pudo cambiar a pantalla completa.', error);
        }
    }, []);

    return {
        now,
        storageEstimate,
        screenSize,
        windowSize,
        clockRef,
        clockBottom,
        formattedDate,
        formattedTime,
        isFullscreen,
        renderClockTime,
        toggleFullscreen,
    };
}
