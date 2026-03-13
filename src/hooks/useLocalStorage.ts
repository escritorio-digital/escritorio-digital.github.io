import { useCallback, useEffect, useRef, useState } from 'react';

const LOCAL_STORAGE_CHANGE_EVENT = 'local-storage-change';

const readStoredItem = (key: string): string | null => {
    try {
        return window.localStorage.getItem(key);
    } catch (error) {
        console.error(error);
        return null;
    }
};

const parseStoredValue = <T,>(item: string | null, initialValue: T): T => {
    try {
        return item ? JSON.parse(item) as T : initialValue;
    } catch (error) {
        console.error(error);
        return initialValue;
    }
};

const emitLocalStorageChange = (key: string, value: string, sourceId: string) => {
    window.dispatchEvent(new CustomEvent<{ key: string; value: string; sourceId: string }>(LOCAL_STORAGE_CHANGE_EVENT, {
        detail: { key, value, sourceId },
    }));
};

export function useLocalStorage<T>(key: string, initialValue: T): [T, (value: T | ((val: T) => T)) => void] {
    const [storedValue, setStoredValue] = useState<T>(() => parseStoredValue(readStoredItem(key), initialValue));
    const storedValueRef = useRef(storedValue);
    const initialValueRef = useRef(initialValue);
    const serializedValueRef = useRef<string | null>(readStoredItem(key));
    const sourceIdRef = useRef(
        typeof crypto !== 'undefined' && 'randomUUID' in crypto
            ? crypto.randomUUID()
            : `use-local-storage-${Math.random().toString(16).slice(2)}`
    );

    useEffect(() => {
        storedValueRef.current = storedValue;
    }, [storedValue]);

    useEffect(() => {
        initialValueRef.current = initialValue;
    }, [initialValue]);

    useEffect(() => {
        const nextRawValue = readStoredItem(key);
        serializedValueRef.current = nextRawValue;
        setStoredValue(parseStoredValue(nextRawValue, initialValueRef.current));
    }, [key]);

    useEffect(() => {
        const syncValue = (rawValue: string | null) => {
            if (serializedValueRef.current === rawValue) return;
            serializedValueRef.current = rawValue;
            setStoredValue(parseStoredValue(rawValue, initialValueRef.current));
        };

        const handleStorage = (event: StorageEvent) => {
            if (event.storageArea !== window.localStorage) return;
            if (event.key !== null && event.key !== key) return;
            syncValue(event.newValue);
        };

        const handleLocalChange = (event: Event) => {
            const detail = (event as CustomEvent<{ key?: string; value?: string; sourceId?: string }>).detail;
            if (detail?.key !== key) return;
            if (detail.sourceId === sourceIdRef.current) return;
            syncValue(detail.value ?? null);
        };

        window.addEventListener('storage', handleStorage);
        window.addEventListener(LOCAL_STORAGE_CHANGE_EVENT, handleLocalChange as EventListener);
        return () => {
            window.removeEventListener('storage', handleStorage);
            window.removeEventListener(LOCAL_STORAGE_CHANGE_EVENT, handleLocalChange as EventListener);
        };
    }, [key]);

    const setValue = useCallback((value: T | ((val: T) => T)) => {
        try {
            const valueToStore = value instanceof Function ? value(storedValueRef.current) : value;
            const serializedValue = JSON.stringify(valueToStore);
            if (serializedValueRef.current === serializedValue) return;
            storedValueRef.current = valueToStore;
            serializedValueRef.current = serializedValue;
            window.localStorage.setItem(key, serializedValue);
            setStoredValue(valueToStore);
            emitLocalStorageChange(key, serializedValue, sourceIdRef.current);
        } catch (error) {
            console.error(error);
        }
    }, [key]);

    return [storedValue, setValue];
}
