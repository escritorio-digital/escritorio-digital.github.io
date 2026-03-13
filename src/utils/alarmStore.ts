import { notifyAlarmStoreUpdated, onDesktopEvent } from './desktopEvents';

export type AlarmMode = 'time' | 'countdown';

export type AlarmItem = {
    id: string;
    label: string;
    targetTime: number;
    createdAt: number;
    soundEnabled: boolean;
    triggered: boolean;
    mode: AlarmMode;
};

const STORAGE_KEY = 'alarm-widget-alarms';
const createId = (): string => {
    if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
        return crypto.randomUUID();
    }
    return `alarm-${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

export const getStoredAlarms = (): AlarmItem[] => {
    try {
        const raw = window.localStorage.getItem(STORAGE_KEY);
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) return [];
        return parsed.filter((item) => item && typeof item === 'object') as AlarmItem[];
    } catch (error) {
        console.error(error);
        return [];
    }
};

export const setStoredAlarms = (alarms: AlarmItem[]): void => {
    try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(alarms));
        notifyAlarmStoreUpdated(alarms);
    } catch (error) {
        console.error(error);
    }
};

export const updateStoredAlarms = (updater: (alarms: AlarmItem[]) => AlarmItem[]): AlarmItem[] => {
    const next = updater(getStoredAlarms());
    setStoredAlarms(next);
    return next;
};

export const subscribeAlarmStore = (handler: (alarms: AlarmItem[]) => void): (() => void) => {
    return onDesktopEvent('alarm-store-updated', (detail) => {
        if (Array.isArray(detail)) {
            handler(detail);
            return;
        }
        handler(getStoredAlarms());
    });
};

export const createAlarmItem = (params: Omit<AlarmItem, 'id' | 'createdAt' | 'triggered'>): AlarmItem => ({
    id: createId(),
    createdAt: Date.now(),
    triggered: false,
    ...params,
});
