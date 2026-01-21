export type FileManagerEntryType = 'file' | 'folder';

export type FileManagerEntry = {
    id: string;
    type: FileManagerEntryType;
    name: string;
    parentId: string;
    createdAt: number;
    updatedAt: number;
    trashedAt?: number | null;
    blob?: Blob;
    size?: number;
    mime?: string;
    sourceWidgetId?: string;
    sourceWidgetTitleKey?: string;
};

export type StorageEstimate = {
    usage: number | null;
    quota: number | null;
};

const DB_NAME = 'escritorio-digital-files';
const DB_VERSION = 1;
const STORE_ENTRIES = 'entries';
const ROOT_ID = 'root';

let dbPromise: Promise<IDBDatabase> | null = null;

const createId = (): string => {
    if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
        return crypto.randomUUID();
    }
    return `id-${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

const openDb = (): Promise<IDBDatabase> => {
    if (!dbPromise) {
        dbPromise = new Promise((resolve, reject) => {
            const request = window.indexedDB.open(DB_NAME, DB_VERSION);
            request.onupgradeneeded = () => {
                const db = request.result;
                if (!db.objectStoreNames.contains(STORE_ENTRIES)) {
                    const store = db.createObjectStore(STORE_ENTRIES, { keyPath: 'id' });
                    store.createIndex('parentId', 'parentId', { unique: false });
                    store.createIndex('trashedAt', 'trashedAt', { unique: false });
                }
            };
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }
    return dbPromise;
};

export const clearFileManagerData = async (): Promise<void> => {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE_ENTRIES, 'readwrite');
        const store = tx.objectStore(STORE_ENTRIES);
        const request = store.clear();
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
};

const withStore = async <T,>(
    mode: IDBTransactionMode,
    action: (store: IDBObjectStore) => IDBRequest<T>
): Promise<T> => {
    const db = await openDb();
    return new Promise<T>((resolve, reject) => {
        const tx = db.transaction(STORE_ENTRIES, mode);
        const store = tx.objectStore(STORE_ENTRIES);
        const request = action(store);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
};

const ensureRoot = async (): Promise<void> => {
    const existing = await withStore<FileManagerEntry | undefined>('readonly', (store) => store.get(ROOT_ID));
    if (existing) return;
    const now = Date.now();
    const root: FileManagerEntry = {
        id: ROOT_ID,
        type: 'folder',
        name: 'root',
        parentId: '',
        createdAt: now,
        updatedAt: now,
        trashedAt: null,
    };
    await withStore('readwrite', (store) => store.put(root));
};

export const getAllEntries = async (): Promise<FileManagerEntry[]> => {
    await ensureRoot();
    const result = await withStore<FileManagerEntry[]>('readonly', (store) => store.getAll());
    return result ?? [];
};

export const listEntriesByParent = async (parentId: string, includeTrashed = false): Promise<FileManagerEntry[]> => {
    await ensureRoot();
    const db = await openDb();
    return new Promise<FileManagerEntry[]>((resolve, reject) => {
        const tx = db.transaction(STORE_ENTRIES, 'readonly');
        const store = tx.objectStore(STORE_ENTRIES);
        const index = store.index('parentId');
        const request = index.getAll(IDBKeyRange.only(parentId));
        request.onsuccess = () => {
            const entries = (request.result as FileManagerEntry[]) ?? [];
            resolve(includeTrashed ? entries : entries.filter((entry) => !entry.trashedAt));
        };
        request.onerror = () => reject(request.error);
    });
};

export const getEntry = async (entryId: string): Promise<FileManagerEntry | null> => {
    await ensureRoot();
    const entry = await withStore<FileManagerEntry | undefined>('readonly', (store) => store.get(entryId));
    return entry ?? null;
};

export const createFolder = async (name: string, parentId: string): Promise<FileManagerEntry> => {
    await ensureRoot();
    const now = Date.now();
    const entry: FileManagerEntry = {
        id: createId(),
        type: 'folder',
        name,
        parentId,
        createdAt: now,
        updatedAt: now,
        trashedAt: null,
    };
    await withStore('readwrite', (store) => store.put(entry));
    return entry;
};

export const saveFileEntry = async (params: {
    name: string;
    parentId: string;
    blob: Blob;
    mime?: string;
    sourceWidgetId?: string;
    sourceWidgetTitleKey?: string;
}): Promise<FileManagerEntry> => {
    await ensureRoot();
    const now = Date.now();
    const entry: FileManagerEntry = {
        id: createId(),
        type: 'file',
        name: params.name,
        parentId: params.parentId,
        createdAt: now,
        updatedAt: now,
        trashedAt: null,
        blob: params.blob,
        size: params.blob.size,
        mime: params.mime ?? params.blob.type,
        sourceWidgetId: params.sourceWidgetId,
        sourceWidgetTitleKey: params.sourceWidgetTitleKey,
    };
    await withStore('readwrite', (store) => store.put(entry));
    return entry;
};

export const renameEntry = async (entryId: string, name: string): Promise<void> => {
    await ensureRoot();
    const entry = await withStore<FileManagerEntry | undefined>('readonly', (store) => store.get(entryId));
    if (!entry) return;
    const updated: FileManagerEntry = {
        ...entry,
        name,
        updatedAt: Date.now(),
    };
    await withStore('readwrite', (store) => store.put(updated));
};

const collectDescendantIds = (entries: FileManagerEntry[], rootId: string): string[] => {
    const ids: string[] = [];
    const queue = [rootId];
    const byParent = new Map<string, FileManagerEntry[]>();
    entries.forEach((entry) => {
        if (!byParent.has(entry.parentId)) {
            byParent.set(entry.parentId, []);
        }
        byParent.get(entry.parentId)!.push(entry);
    });
    while (queue.length > 0) {
        const current = queue.shift() as string;
        const children = byParent.get(current) ?? [];
        children.forEach((child) => {
            ids.push(child.id);
            if (child.type === 'folder') {
                queue.push(child.id);
            }
        });
    }
    return ids;
};

export const moveEntryToTrash = async (entryId: string, trashedAt = Date.now()): Promise<void> => {
    await ensureRoot();
    const entries = await getAllEntries();
    const entry = entries.find((item) => item.id === entryId);
    if (!entry) return;
    const ids = [entryId, ...collectDescendantIds(entries, entryId)];
    const now = Date.now();
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE_ENTRIES, 'readwrite');
        const store = tx.objectStore(STORE_ENTRIES);
        ids.forEach((id) => {
            const target = entries.find((item) => item.id === id);
            if (!target) return;
            store.put({ ...target, trashedAt, updatedAt: now });
        });
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
    });
};

export const restoreEntryFromTrash = async (entryId: string): Promise<void> => {
    await ensureRoot();
    const entries = await getAllEntries();
    const entry = entries.find((item) => item.id === entryId);
    if (!entry) return;
    const ids = [entryId, ...collectDescendantIds(entries, entryId)];
    const now = Date.now();
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE_ENTRIES, 'readwrite');
        const store = tx.objectStore(STORE_ENTRIES);
        ids.forEach((id) => {
            const target = entries.find((item) => item.id === id);
            if (!target) return;
            store.put({ ...target, trashedAt: null, updatedAt: now });
        });
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
    });
};

export const moveEntries = async (entryIds: string[], newParentId: string): Promise<void> => {
    await ensureRoot();
    if (entryIds.length === 0) return;
    const entries = await getAllEntries();
    const byId = new Map(entries.map((entry) => [entry.id, entry]));
    const now = Date.now();
    const isDescendant = (candidateId: string, ancestorId: string) => {
        let current = byId.get(candidateId);
        while (current) {
            if (current.parentId === ancestorId) return true;
            current = byId.get(current.parentId);
        }
        return false;
    };
    const validIds = entryIds.filter((id) => {
        const entry = byId.get(id);
        if (!entry) return false;
        if (entry.id === ROOT_ID) return false;
        if (entry.trashedAt) return false;
        if (entry.parentId === newParentId) return false;
        if (entry.id === newParentId) return false;
        if (entry.type === 'folder' && isDescendant(newParentId, entry.id)) return false;
        return true;
    });
    if (validIds.length === 0) return;
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE_ENTRIES, 'readwrite');
        const store = tx.objectStore(STORE_ENTRIES);
        validIds.forEach((id) => {
            const entry = byId.get(id);
            if (!entry) return;
            store.put({ ...entry, parentId: newParentId, updatedAt: now });
        });
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
    });
};

export const copyEntries = async (entryIds: string[], newParentId: string): Promise<void> => {
    await ensureRoot();
    if (entryIds.length === 0) return;
    const entries = await getAllEntries();
    const byId = new Map(entries.map((entry) => [entry.id, entry]));
    const roots = entryIds
        .map((id) => byId.get(id))
        .filter((entry): entry is FileManagerEntry => Boolean(entry))
        .filter((entry) => entry.id !== ROOT_ID && !entry.trashedAt);
    if (roots.length === 0) return;

    const idsToCopy = new Set<string>();
    roots.forEach((entry) => {
        idsToCopy.add(entry.id);
        collectDescendantIds(entries, entry.id).forEach((id) => idsToCopy.add(id));
    });

    const idMap = new Map<string, string>();
    idsToCopy.forEach((id) => idMap.set(id, createId()));

    const now = Date.now();
    const clones: FileManagerEntry[] = [];
    idsToCopy.forEach((id) => {
        const entry = byId.get(id);
        if (!entry) return;
        const newId = idMap.get(id) as string;
        const parentId = roots.some((root) => root.id === id)
            ? newParentId
            : idMap.get(entry.parentId) ?? entry.parentId;
        clones.push({
            ...entry,
            id: newId,
            parentId,
            createdAt: now,
            updatedAt: now,
            trashedAt: null,
        });
    });

    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE_ENTRIES, 'readwrite');
        const store = tx.objectStore(STORE_ENTRIES);
        clones.forEach((entry) => {
            store.put({
                ...entry,
                size: entry.size ?? (entry.blob ? entry.blob.size : undefined),
                mime: entry.mime ?? (entry.blob ? entry.blob.type : undefined),
            });
        });
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
    });
};

export const deleteEntryPermanently = async (entryId: string): Promise<void> => {
    await ensureRoot();
    const entries = await getAllEntries();
    const entry = entries.find((item) => item.id === entryId);
    if (!entry) return;
    const ids = [entryId, ...collectDescendantIds(entries, entryId)];
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE_ENTRIES, 'readwrite');
        const store = tx.objectStore(STORE_ENTRIES);
        ids.forEach((id) => store.delete(id));
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
    });
};

export const listTrashedEntries = async (): Promise<FileManagerEntry[]> => {
    await ensureRoot();
    const entries = await getAllEntries();
    return entries.filter((entry) => entry.trashedAt);
};

export const purgeExpiredTrash = async (ttlMs: number): Promise<void> => {
    await ensureRoot();
    const entries = await getAllEntries();
    const now = Date.now();
    const expired = entries.filter((entry) => entry.trashedAt && now - entry.trashedAt > ttlMs);
    if (expired.length === 0) return;
    const ids = new Set<string>();
    expired.forEach((entry) => {
        ids.add(entry.id);
        collectDescendantIds(entries, entry.id).forEach((id) => ids.add(id));
    });
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE_ENTRIES, 'readwrite');
        const store = tx.objectStore(STORE_ENTRIES);
        ids.forEach((id) => store.delete(id));
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
    });
};

export const estimateStorage = async (): Promise<StorageEstimate> => {
    if (navigator.storage?.estimate) {
        const estimate = await navigator.storage.estimate();
        return {
            usage: typeof estimate.usage === 'number' ? estimate.usage : null,
            quota: typeof estimate.quota === 'number' ? estimate.quota : null,
        };
    }
    return { usage: null, quota: null };
};

export const FILE_MANAGER_ROOT_ID = ROOT_ID;
