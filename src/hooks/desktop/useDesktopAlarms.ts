import { useCallback, useEffect, useRef, useState } from 'react';
import { getStoredAlarms, setStoredAlarms, subscribeAlarmStore, type AlarmItem } from '../../utils/alarmStore';

type UseDesktopAlarmsResult = {
    alarmItems: AlarmItem[];
    activeAlarmAlerts: AlarmItem[];
};

export function useDesktopAlarms(): UseDesktopAlarmsResult {
    const [alarmItems, setAlarmItems] = useState<AlarmItem[]>(() => getStoredAlarms());
    const alarmAudioRef = useRef<HTMLAudioElement | null>(null);
    const activeAlarmAlerts = alarmItems.filter((alarm) => alarm.triggered);

    useEffect(() => subscribeAlarmStore(setAlarmItems), []);

    useEffect(() => {
        const interval = window.setInterval(() => {
            const alarms = getStoredAlarms();
            if (alarms.length === 0) return;
            const now = Date.now();
            let updated = false;
            const next = alarms.map((alarm) => {
                if (!alarm.triggered && alarm.targetTime <= now) {
                    updated = true;
                    return { ...alarm, triggered: true };
                }
                return alarm;
            });
            if (updated) setStoredAlarms(next);
        }, 1000);
        return () => window.clearInterval(interval);
    }, []);

    const startAlarmSound = useCallback(() => {
        if (!alarmAudioRef.current) {
            alarmAudioRef.current = new Audio('/sounds/alarm-clock-elapsed.oga');
            alarmAudioRef.current.loop = true;
            alarmAudioRef.current.volume = 0.9;
        }
        if (!alarmAudioRef.current.paused) return;
        alarmAudioRef.current.play().catch(() => undefined);
    }, []);

    const stopAlarmSound = useCallback(() => {
        if (!alarmAudioRef.current) return;
        alarmAudioRef.current.pause();
        alarmAudioRef.current.currentTime = 0;
    }, []);

    useEffect(() => {
        const shouldSound = alarmItems.some((alarm) => alarm.triggered && alarm.soundEnabled);
        if (shouldSound) {
            startAlarmSound();
        } else {
            stopAlarmSound();
        }
    }, [alarmItems, startAlarmSound, stopAlarmSound]);

    useEffect(() => () => stopAlarmSound(), [stopAlarmSound]);

    return {
        alarmItems,
        activeAlarmAlerts,
    };
}
