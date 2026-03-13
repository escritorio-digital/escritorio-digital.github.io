export type LocalWebSite = {
    id: string;
    name: string;
    profileName?: string;
    indexPath?: string;
    createdAt: number;
    updatedAt: number;
    fileCount: number;
    totalBytes: number;
};

export type LocalWebStoredFile = {
    key: string;
    siteId: string;
    path: string;
    blob: Blob;
    size: number;
    type: string;
    profileName?: string;
};

export type LocalWebStats = {
    siteCount: number;
    totalBytes: number;
};

const DB_NAME = 'escritorio-digital-sites';
const DB_VERSION = 1;
const STORE_SITES = 'sites';
const STORE_FILES = 'files';
export const ACTIVE_PROFILE_STORAGE_KEY = 'active-profile-name';
export const DEFAULT_LOCAL_WEB_PROFILE_NAME = 'Escritorio Principal';

let dbPromise: Promise<IDBDatabase> | null = null;

const openDb = (): Promise<IDBDatabase> => {
    if (!dbPromise) {
        dbPromise = new Promise((resolve, reject) => {
            const request = window.indexedDB.open(DB_NAME, DB_VERSION);
            request.onupgradeneeded = () => {
                const db = request.result;
                if (!db.objectStoreNames.contains(STORE_SITES)) {
                    db.createObjectStore(STORE_SITES, { keyPath: 'id' });
                }
                if (!db.objectStoreNames.contains(STORE_FILES)) {
                    const store = db.createObjectStore(STORE_FILES, { keyPath: 'key' });
                    store.createIndex('siteId', 'siteId', { unique: false });
                }
            };
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }
    return dbPromise;
};

const withStore = async <T,>(
    storeName: string,
    mode: IDBTransactionMode,
    action: (store: IDBObjectStore) => IDBRequest<T>
): Promise<T> => {
    const db = await openDb();
    return new Promise<T>((resolve, reject) => {
        const tx = db.transaction(storeName, mode);
        const store = tx.objectStore(storeName);
        const request = action(store);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
};

export const readActiveProfileName = (): string => {
    const stored = window.localStorage.getItem(ACTIVE_PROFILE_STORAGE_KEY);
    if (!stored) return DEFAULT_LOCAL_WEB_PROFILE_NAME;
    try {
        const parsed = JSON.parse(stored);
        return typeof parsed === 'string' && parsed.trim() ? parsed : stored;
    } catch {
        return stored;
    }
};

const assignProfileToSites = async (profileName: string, sites: LocalWebSite[]) => {
    const sitesToUpdate = sites.filter((site) => !site.profileName);
    if (sitesToUpdate.length === 0) return;
    await withStore(STORE_SITES, 'readwrite', (store) => {
        sitesToUpdate.forEach((site) => {
            store.put({ ...site, profileName });
        });
        return store.getAll();
    });
};

export const readAllLocalWebSites = async (): Promise<LocalWebSite[]> => {
    const result = await withStore<LocalWebSite[]>(STORE_SITES, 'readonly', (store) => store.getAll());
    return result ?? [];
};

export const readAllLocalWebFiles = async (): Promise<LocalWebStoredFile[]> => {
    const result = await withStore<LocalWebStoredFile[]>(STORE_FILES, 'readonly', (store) => store.getAll());
    return result ?? [];
};

export const getAllLocalWebSites = async (profileName: string): Promise<LocalWebSite[]> => {
    const sites = await readAllLocalWebSites();
    if (sites.some((site) => !site.profileName)) {
        await assignProfileToSites(profileName, sites);
        return sites
            .map((site) => ({ ...site, profileName: site.profileName ?? profileName }))
            .filter((site) => site.profileName === profileName);
    }
    return sites.filter((site) => site.profileName === profileName);
};

export const saveLocalWebSite = async (site: LocalWebSite): Promise<void> => {
    await withStore(STORE_SITES, 'readwrite', (store) => store.put(site));
};

export const saveLocalWebSites = async (sites: LocalWebSite[]): Promise<void> => {
    if (sites.length === 0) return;
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE_SITES, 'readwrite');
        const store = tx.objectStore(STORE_SITES);
        sites.forEach((site) => store.put(site));
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
    });
};

export const deleteLocalWebSite = async (siteId: string): Promise<void> => {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
        const tx = db.transaction([STORE_SITES, STORE_FILES], 'readwrite');
        tx.objectStore(STORE_SITES).delete(siteId);
        const fileStore = tx.objectStore(STORE_FILES);
        const index = fileStore.index('siteId');
        const request = index.getAllKeys(IDBKeyRange.only(siteId));
        request.onsuccess = () => {
            const keys = request.result as string[];
            keys.forEach((key) => fileStore.delete(key));
        };
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
    });
};

export const getLocalWebFilesForSite = async (siteId: string): Promise<LocalWebStoredFile[]> => {
    const db = await openDb();
    return new Promise<LocalWebStoredFile[]>((resolve, reject) => {
        const tx = db.transaction(STORE_FILES, 'readonly');
        const store = tx.objectStore(STORE_FILES);
        const index = store.index('siteId');
        const request = index.getAll(IDBKeyRange.only(siteId));
        request.onsuccess = () => resolve((request.result as LocalWebStoredFile[]) ?? []);
        request.onerror = () => reject(request.error);
    });
};

export const saveLocalWebFiles = async (files: LocalWebStoredFile[]): Promise<void> => {
    if (files.length === 0) return;
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE_FILES, 'readwrite');
        const store = tx.objectStore(STORE_FILES);
        files.forEach((file) => store.put(file));
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
    });
};

export const clearLocalWebData = async (): Promise<void> => {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
        const tx = db.transaction([STORE_SITES, STORE_FILES], 'readwrite');
        tx.objectStore(STORE_SITES).clear();
        tx.objectStore(STORE_FILES).clear();
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
    });
};

export const getLocalWebStats = async (profileNames?: string[]): Promise<LocalWebStats> => {
    const sites = await readAllLocalWebSites();
    const files = await readAllLocalWebFiles();
    const selectedSites = profileNames && profileNames.length > 0
        ? sites.filter((site) => !site.profileName || profileNames.includes(site.profileName))
        : sites;
    const selectedSiteIds = new Set(selectedSites.map((site) => site.id));
    const bytesFromSites = selectedSites.reduce((sum, site) => sum + (site.totalBytes || 0), 0);
    const bytesFromFiles = files
        .filter((file) => selectedSiteIds.has(file.siteId))
        .reduce((sum, file) => sum + (file.size || 0), 0);
    return {
        siteCount: selectedSites.length,
        totalBytes: bytesFromFiles > 0 ? bytesFromFiles : bytesFromSites,
    };
};

export const cloneLocalWebData = async (sourceProfileName: string, targetProfileName: string): Promise<void> => {
    const sites = await readAllLocalWebSites();
    const files = await readAllLocalWebFiles();
    const now = Date.now();
    const sourceSites = sites.filter((site) => site.profileName === sourceProfileName || !site.profileName);
    if (sourceSites.length === 0) return;

    const idMap = new Map<string, string>();
    const clonedSites = sourceSites.map((site) => {
        const newId = crypto.randomUUID();
        idMap.set(site.id, newId);
        return {
            ...site,
            id: newId,
            profileName: targetProfileName,
            createdAt: now,
            updatedAt: now,
        };
    });

    const clonedFiles = files
        .filter((file) => idMap.has(file.siteId))
        .map((file) => ({
            ...file,
            key: `${idMap.get(file.siteId) as string}::${file.path}`,
            siteId: idMap.get(file.siteId) as string,
            profileName: targetProfileName,
        }));

    const normalizedSourceSites = sourceSites
        .filter((site) => !site.profileName)
        .map((site) => ({ ...site, profileName: sourceProfileName }));

    await saveLocalWebSites([...normalizedSourceSites, ...clonedSites]);
    await saveLocalWebFiles(clonedFiles);
};
