import type { ProfileCollection } from '../types';
import { getFromIndexedDb, removeFromIndexedDb, setInIndexedDb } from './storage';
import { strFromU8, strToU8, unzipSync, Zip, ZipDeflate } from 'fflate';

const IDB_MARKER = '__indexed_db__';
const IDB_THRESHOLD_BYTES = 200_000;

const BACKUP_VERSION = 1;

export const WIDGET_DATA_KEYS = [
  'work-list-tasks',
  'spinner-options',
  'notepad-content-html',
  'image-carousel-images',
  'tictactoe-players',
  'tictactoe-score',
  'global-clocks-selection',
  'attendance-records',
  'traffic-light-state',
  'scoreboard-players',
  'toolbar-hidden',
  'i18nextLng',
  'profile-order',
  'widgets-view-mode',
];

type BackupMeta = {
  app: string;
  version: number;
  createdAt: string;
};

type WidgetDataEntry = {
  storage: 'localStorage' | 'indexedDb';
  value: string;
};

type LocalWebSite = {
  id: string;
  name: string;
  profileName?: string;
  createdAt: number;
  updatedAt: number;
  fileCount: number;
  totalBytes: number;
};

type LocalWebFile = {
  key: string;
  siteId: string;
  path: string;
  type: string;
  size: number;
  profileName?: string;
  dataBase64: string;
};

type LocalWebBackup = {
  sites: LocalWebSite[];
  files: LocalWebFile[];
};

type LocalWebFileMeta = {
  key: string;
  siteId: string;
  path: string;
  type: string;
  size: number;
  profileName?: string;
};

export type LocalWebRecord = {
  key: string;
  siteId: string;
  path: string;
  type: string;
  size: number;
  profileName?: string;
  blob: Blob;
};

export type LocalWebArchive = {
  sites: LocalWebSite[];
  files: LocalWebRecord[];
};

export type BackupPayload = {
  meta: BackupMeta;
  data: {
    profiles?: ProfileCollection;
    activeProfileName?: string;
    widgetData?: Record<string, WidgetDataEntry>;
    localWeb?: LocalWebBackup;
  };
};

export type LocalWebStats = {
  siteCount: number;
  totalBytes: number;
};

const LOCAL_WEB_DB_NAME = 'escritorio-digital-sites';
const LOCAL_WEB_DB_VERSION = 1;
const LOCAL_WEB_SITES = 'sites';
const LOCAL_WEB_FILES = 'files';

let localWebDbPromise: Promise<IDBDatabase> | null = null;

const openLocalWebDb = (): Promise<IDBDatabase> => {
  if (!localWebDbPromise) {
    localWebDbPromise = new Promise((resolve, reject) => {
      const request = window.indexedDB.open(LOCAL_WEB_DB_NAME, LOCAL_WEB_DB_VERSION);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(LOCAL_WEB_SITES)) {
          db.createObjectStore(LOCAL_WEB_SITES, { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains(LOCAL_WEB_FILES)) {
          const store = db.createObjectStore(LOCAL_WEB_FILES, { keyPath: 'key' });
          store.createIndex('siteId', 'siteId', { unique: false });
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }
  return localWebDbPromise;
};

const arrayBufferToBase64 = (buffer: ArrayBuffer): string => {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary);
};

const base64ToArrayBuffer = (value: string): ArrayBuffer => {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
};

export const exportWidgetData = async (keys: string[]): Promise<Record<string, WidgetDataEntry>> => {
  const result: Record<string, WidgetDataEntry> = {};
  for (const key of keys) {
    const item = window.localStorage.getItem(key);
    if (!item) continue;
    if (item === IDB_MARKER) {
      const value = await getFromIndexedDb(key);
      if (value == null) continue;
      result[key] = { storage: 'indexedDb', value };
    } else {
      result[key] = { storage: 'localStorage', value: item };
    }
  }
  return result;
};

export const importWidgetData = async (entries: Record<string, WidgetDataEntry>): Promise<void> => {
  for (const [key, entry] of Object.entries(entries)) {
    if (entry.storage === 'indexedDb') {
      await setInIndexedDb(key, entry.value);
      window.localStorage.setItem(key, IDB_MARKER);
      continue;
    }
    if (entry.value.length > IDB_THRESHOLD_BYTES) {
      await setInIndexedDb(key, entry.value);
      window.localStorage.setItem(key, IDB_MARKER);
      continue;
    }
    window.localStorage.setItem(key, entry.value);
    await removeFromIndexedDb(key);
  }
};

export const exportLocalWebData = async (
  profileNames?: string[],
  fallbackProfileName?: string
): Promise<LocalWebBackup> => {
  const db = await openLocalWebDb();
  return new Promise<LocalWebBackup>((resolve, reject) => {
    const tx = db.transaction([LOCAL_WEB_SITES, LOCAL_WEB_FILES], 'readonly');
    const sitesRequest = tx.objectStore(LOCAL_WEB_SITES).getAll();
    const filesRequest = tx.objectStore(LOCAL_WEB_FILES).getAll();
    tx.oncomplete = async () => {
      const sites = (sitesRequest.result as LocalWebSite[]) ?? [];
      const files = (filesRequest.result as Array<{ key: string; siteId: string; path: string; blob: Blob; size: number; type: string; profileName?: string }>) ?? [];

      // Filter sites: include those without profileName OR those with profileName in selection
      const filteredSites = profileNames && profileNames.length > 0
        ? sites.filter((site) => !site.profileName || profileNames.includes(site.profileName))
        : sites;

      // Assign fallback profile to sites without one for export
      const resolvedSites = filteredSites.map((site) => ({
        ...site,
        profileName: site.profileName ?? fallbackProfileName,
      }));

      const selectedSiteIds = new Set(resolvedSites.map((site) => site.id));
      const encodedFiles: LocalWebFile[] = [];
      for (const file of files.filter((item) => selectedSiteIds.has(item.siteId))) {
        const buffer = await file.blob.arrayBuffer();
        encodedFiles.push({
          key: file.key,
          siteId: file.siteId,
          path: file.path,
          type: file.type,
          size: file.size,
          profileName: file.profileName ?? fallbackProfileName,
          dataBase64: arrayBufferToBase64(buffer),
        });
      }
      resolve({ sites: resolvedSites, files: encodedFiles });
    };
    tx.onerror = () => reject(tx.error);
  });
};

export const exportLocalWebRecords = async (
  profileNames?: string[],
  fallbackProfileName?: string
): Promise<LocalWebArchive> => {
  const db = await openLocalWebDb();
  return new Promise<LocalWebArchive>((resolve, reject) => {
    const tx = db.transaction([LOCAL_WEB_SITES, LOCAL_WEB_FILES], 'readonly');
    const sitesRequest = tx.objectStore(LOCAL_WEB_SITES).getAll();
    const filesRequest = tx.objectStore(LOCAL_WEB_FILES).getAll();
    tx.oncomplete = () => {
      const sites = (sitesRequest.result as LocalWebSite[]) ?? [];
      const files = (filesRequest.result as LocalWebRecord[]) ?? [];

      // Filter sites: include those without profileName OR those with profileName in selection
      const filteredSites = profileNames && profileNames.length > 0
        ? sites.filter((site) => !site.profileName || profileNames.includes(site.profileName))
        : sites;

      // Assign fallback profile to sites without one for export
      const resolvedSites = filteredSites.map((site) => ({
        ...site,
        profileName: site.profileName ?? fallbackProfileName,
      }));

      const selectedSiteIds = new Set(resolvedSites.map((site) => site.id));
      const selectedFiles = files.filter((file) => selectedSiteIds.has(file.siteId)).map((file) => ({
        ...file,
        profileName: file.profileName ?? fallbackProfileName,
      }));
      resolve({ sites: resolvedSites, files: selectedFiles });
    };
    tx.onerror = () => reject(tx.error);
  });
};

export const getLocalWebStats = async (profileNames?: string[], _fallbackProfileName?: string): Promise<LocalWebStats> => {
  const db = await openLocalWebDb();
  return new Promise<LocalWebStats>((resolve, reject) => {
    const tx = db.transaction(LOCAL_WEB_SITES, 'readonly');
    const request = tx.objectStore(LOCAL_WEB_SITES).getAll();
    request.onsuccess = () => {
      const sites = (request.result as LocalWebSite[]) ?? [];

      // Sites without profileName are considered available for all profiles
      // Sites with profileName are only available if their profile is in the selection
      const selectedSites = profileNames && profileNames.length > 0
        ? sites.filter((site) => !site.profileName || profileNames.includes(site.profileName))
        : sites;

      resolve({
        siteCount: selectedSites.length,
        totalBytes: selectedSites.reduce((sum, site) => sum + (site.totalBytes || 0), 0),
      });
    };
    request.onerror = () => reject(request.error);
  });
};

export const clearLocalWebData = async (): Promise<void> => {
  const db = await openLocalWebDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction([LOCAL_WEB_SITES, LOCAL_WEB_FILES], 'readwrite');
    tx.objectStore(LOCAL_WEB_SITES).clear();
    tx.objectStore(LOCAL_WEB_FILES).clear();
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
};

export const importLocalWebData = async (
  payload: LocalWebBackup,
  options?: { profileNameMap?: Map<string, string>; fallbackProfileName?: string }
): Promise<void> => {
  const db = await openLocalWebDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction([LOCAL_WEB_SITES, LOCAL_WEB_FILES], 'readwrite');
    const siteStore = tx.objectStore(LOCAL_WEB_SITES);
    const fileStore = tx.objectStore(LOCAL_WEB_FILES);
    payload.sites.forEach((site) => {
      const mappedName = site.profileName && options?.profileNameMap?.get(site.profileName);
      const profileName = mappedName ?? site.profileName ?? options?.fallbackProfileName;
      siteStore.put({ ...site, profileName });
    });
    payload.files.forEach((file) => {
      const mappedName = file.profileName && options?.profileNameMap?.get(file.profileName);
      const profileName = mappedName ?? file.profileName ?? options?.fallbackProfileName;
      const buffer = base64ToArrayBuffer(file.dataBase64);
      const blob = new Blob([buffer], { type: file.type });
      fileStore.put({
        key: file.key,
        siteId: file.siteId,
        path: file.path,
        blob,
        size: file.size,
        type: file.type,
        profileName,
      });
    });
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
};

export const importLocalWebRecords = async (
  payload: LocalWebArchive,
  options?: {
    onProgress?: (current: number, total: number) => void;
    signal?: AbortSignal;
    yieldControl?: () => Promise<void>;
    profileNameMap?: Map<string, string>;
    fallbackProfileName?: string;
  }
): Promise<void> => {
  const db = await openLocalWebDb();
  if (options?.signal?.aborted) {
    throw new Error('abort');
  }
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(LOCAL_WEB_SITES, 'readwrite');
    const siteStore = tx.objectStore(LOCAL_WEB_SITES);
    payload.sites.forEach((site) => {
      const mappedName = site.profileName && options?.profileNameMap?.get(site.profileName);
      const profileName = mappedName ?? site.profileName ?? options?.fallbackProfileName;
      siteStore.put({ ...site, profileName });
    });
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });

  const total = payload.files.length;
  const batchSize = 50;
  let current = 0;
  for (let i = 0; i < payload.files.length; i += batchSize) {
    if (options?.signal?.aborted) {
      throw new Error('abort');
    }
    const batch = payload.files.slice(i, i + batchSize);
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(LOCAL_WEB_FILES, 'readwrite');
      const fileStore = tx.objectStore(LOCAL_WEB_FILES);
      batch.forEach((file) => {
        const mappedName = file.profileName && options?.profileNameMap?.get(file.profileName);
        const profileName = mappedName ?? file.profileName ?? options?.fallbackProfileName;
        fileStore.put({
          key: file.key,
          siteId: file.siteId,
          path: file.path,
          blob: file.blob,
          size: file.size,
          type: file.type,
          profileName,
        });
      });
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    current += batch.length;
    if (options?.onProgress) options.onProgress(current, total);
    if (options?.yieldControl) await options.yieldControl();
  }
};

export const buildBackupPayload = (data: BackupPayload['data']): BackupPayload => ({
  meta: {
    app: 'Escritorio Digital',
    version: BACKUP_VERSION,
    createdAt: new Date().toISOString(),
  },
  data,
});

export const isValidBackupPayload = (value: unknown): value is BackupPayload => {
  if (!value || typeof value !== 'object') return false;
  const payload = value as BackupPayload;
  if (!payload.meta || !payload.data) return false;
  if (typeof payload.meta.app !== 'string') return false;
  if (typeof payload.meta.version !== 'number') return false;
  if (typeof payload.meta.createdAt !== 'string') return false;
  if (typeof payload.data !== 'object') return false;
  return true;
};

export const isZipBuffer = (buffer: ArrayBuffer): boolean => {
  const bytes = new Uint8Array(buffer);
  return bytes.length >= 4 && bytes[0] === 0x50 && bytes[1] === 0x4b && bytes[2] === 0x03 && bytes[3] === 0x04;
};

export const buildBackupArchive = async (
  data: BackupPayload['data'],
  localWebRecords?: LocalWebArchive,
  onProgress?: (current: number, total: number) => void,
  yieldControl?: () => Promise<void>,
  signal?: AbortSignal
): Promise<Uint8Array> => {
  const payload = buildBackupPayload(data);
  const chunks: Uint8Array[] = [];
  await new Promise<void>((resolve, reject) => {
    const zip = new Zip((error, chunk, final) => {
      if (error) {
        reject(error);
        return;
      }
      if (chunk) chunks.push(chunk);
      if (final) resolve();
    });

    const addEntry = (name: string, data: Uint8Array) => {
      const entry = new ZipDeflate(name, { level: 6 });
      zip.add(entry);
      entry.push(data, true);
    };

    (async () => {
      try {
        addEntry('manifest.json', strToU8(JSON.stringify(payload)));

        if (localWebRecords) {
          const filesMeta: LocalWebFileMeta[] = localWebRecords.files.map((file) => ({
            key: file.key,
            siteId: file.siteId,
            path: file.path,
            type: file.type,
            size: file.size,
            profileName: file.profileName,
          }));
          addEntry('localWeb/meta.json', strToU8(JSON.stringify({ sites: localWebRecords.sites, files: filesMeta })));
          const total = localWebRecords.files.length;
          let current = 0;
          for (const file of localWebRecords.files) {
            if (signal?.aborted) {
              reject(new Error('abort'));
              return;
            }
            const buffer = await file.blob.arrayBuffer();
            addEntry(`localWeb/files/${file.key}`, new Uint8Array(buffer));
            current += 1;
            if (onProgress) onProgress(current, total);
            if (yieldControl) await yieldControl();
          }
        }

        zip.end();
      } catch (error) {
        reject(error);
      }
    })();
  });

  const totalSize = chunks.reduce((sum, part) => sum + part.length, 0);
  const result = new Uint8Array(totalSize);
  let offset = 0;
  chunks.forEach((part) => {
    result.set(part, offset);
    offset += part.length;
  });
  return result;
};

export const parseBackupArchive = (buffer: ArrayBuffer): { payload: BackupPayload; localWeb?: LocalWebArchive } => {
  const entries = unzipSync(new Uint8Array(buffer));
  const manifest = entries['manifest.json'];
  if (!manifest) {
    throw new Error('missing manifest');
  }
  const payload = JSON.parse(strFromU8(manifest)) as BackupPayload;
  if (!isValidBackupPayload(payload)) {
    throw new Error('invalid payload');
  }
  const metaEntry = entries['localWeb/meta.json'];
  if (!metaEntry) {
    return { payload };
  }
  const localMeta = JSON.parse(strFromU8(metaEntry)) as { sites: LocalWebSite[]; files: LocalWebFileMeta[] };
  const files: LocalWebRecord[] = [];
  localMeta.files.forEach((file) => {
    const entry = entries[`localWeb/files/${file.key}`];
    if (!entry) return;
    files.push({
      ...file,
      profileName: file.profileName,
      blob: new Blob([entry], { type: file.type }),
    });
  });
  return {
    payload,
    localWeb: {
      sites: localMeta.sites ?? [],
      files,
    },
  };
};

export const cloneLocalWebData = async (sourceProfileName: string, targetProfileName: string): Promise<void> => {
  const db = await openLocalWebDb();
  const { sites, files } = await new Promise<{ sites: LocalWebSite[]; files: LocalWebRecord[] }>((resolve, reject) => {
    const tx = db.transaction([LOCAL_WEB_SITES, LOCAL_WEB_FILES], 'readonly');
    const sitesRequest = tx.objectStore(LOCAL_WEB_SITES).getAll();
    const filesRequest = tx.objectStore(LOCAL_WEB_FILES).getAll();
    tx.oncomplete = () => {
      resolve({
        sites: (sitesRequest.result as LocalWebSite[]) ?? [],
        files: (filesRequest.result as LocalWebRecord[]) ?? [],
      });
    };
    tx.onerror = () => reject(tx.error);
  });

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
    .map((file) => {
      const newSiteId = idMap.get(file.siteId) as string;
      return {
        ...file,
        key: `${newSiteId}::${file.path}`,
        siteId: newSiteId,
        profileName: targetProfileName,
      };
    });

  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction([LOCAL_WEB_SITES, LOCAL_WEB_FILES], 'readwrite');
    const siteStore = tx.objectStore(LOCAL_WEB_SITES);
    const fileStore = tx.objectStore(LOCAL_WEB_FILES);
    sourceSites.forEach((site) => {
      if (!site.profileName) {
        siteStore.put({ ...site, profileName: sourceProfileName });
      }
    });
    clonedSites.forEach((site) => siteStore.put(site));
    clonedFiles.forEach((file) => {
      fileStore.put({
        key: file.key,
        siteId: file.siteId,
        path: file.path,
        blob: file.blob,
        size: file.size,
        type: file.type,
        profileName: file.profileName,
      });
    });
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
};
