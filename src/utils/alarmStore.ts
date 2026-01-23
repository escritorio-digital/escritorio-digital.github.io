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
const EVENT_NAME = 'alarm-store-updated';

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
        window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: alarms }));
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
    const listener = (event: Event) => {
        if (event instanceof CustomEvent && Array.isArray(event.detail)) {
            handler(event.detail);
            return;
        }
        handler(getStoredAlarms());
    };
    window.addEventListener(EVENT_NAME, listener as EventListener);
    return () => window.removeEventListener(EVENT_NAME, listener as EventListener);
};

export const createAlarmItem = (params: Omit<AlarmItem, 'id' | 'createdAt' | 'triggered'>): AlarmItem => ({
    id: createId(),
    createdAt: Date.now(),
    triggered: false,
    ...params,
});
