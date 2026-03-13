import { getFromIndexedDb, removeFromIndexedDb, setInIndexedDb } from '../utils/storage';

export const INDEXED_DB_MARKER = '__indexed_db__';
const IDB_THRESHOLD_BYTES = 200_000;

export type WidgetDataStorage = 'localStorage' | 'indexedDb';

export type WidgetDataEntry = {
    storage: WidgetDataStorage;
    value: string;
};

export const readWidgetDataEntry = async (key: string): Promise<WidgetDataEntry | null> => {
    const item = window.localStorage.getItem(key);
    if (!item) return null;
    if (item === INDEXED_DB_MARKER) {
        const value = await getFromIndexedDb(key);
        if (value == null) return null;
        return { storage: 'indexedDb', value };
    }
    return { storage: 'localStorage', value: item };
};

export const hasStoredWidgetData = (keys: string[]): boolean => {
    return keys.some((key) => Boolean(window.localStorage.getItem(key)));
};

export const exportWidgetDataEntries = async (keys: string[]): Promise<Record<string, WidgetDataEntry>> => {
    const result: Record<string, WidgetDataEntry> = {};
    for (const key of keys) {
        const entry = await readWidgetDataEntry(key);
        if (entry) {
            result[key] = entry;
        }
    }
    return result;
};

export const importWidgetDataEntries = async (entries: Record<string, WidgetDataEntry>): Promise<void> => {
    for (const [key, entry] of Object.entries(entries)) {
        if (entry.storage === 'indexedDb' || entry.value.length > IDB_THRESHOLD_BYTES) {
            await setInIndexedDb(key, entry.value);
            window.localStorage.setItem(key, INDEXED_DB_MARKER);
            continue;
        }
        window.localStorage.setItem(key, entry.value);
        await removeFromIndexedDb(key);
    }
};

export const clearWidgetDataKeys = async (keys: string[]): Promise<void> => {
    keys.forEach((key) => window.localStorage.removeItem(key));
    await Promise.all(keys.map((key) => removeFromIndexedDb(key)));
};

export const estimateWidgetDataSize = async (keys: string[]): Promise<number> => {
    let total = 0;
    for (const key of keys) {
        const entry = await readWidgetDataEntry(key);
        if (!entry) continue;
        total += new Blob([entry.value]).size;
    }
    return total;
};
