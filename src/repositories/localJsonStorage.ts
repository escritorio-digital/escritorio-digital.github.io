export const readLocalJson = <T,>(key: string): T | null => {
    try {
        const raw = window.localStorage.getItem(key);
        if (!raw) return null;
        return JSON.parse(raw) as T;
    } catch {
        return null;
    }
};

export const writeLocalJson = (key: string, value: unknown): boolean => {
    try {
        window.localStorage.setItem(key, JSON.stringify(value));
        return true;
    } catch {
        return false;
    }
};

export const removeLocalJson = (key: string): void => {
    try {
        window.localStorage.removeItem(key);
    } catch {
        // ignore storage errors
    }
};
