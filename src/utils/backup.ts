import type { ProfileCollection } from '../types';
import { strFromU8, strToU8, unzipSync, Zip, ZipDeflate } from 'fflate';
import {
  exportWidgetDataEntries,
  clearLocalWebData as clearLocalWebRepositoryData,
  cloneLocalWebData as cloneLocalWebRepositoryData,
  importWidgetDataEntries,
  getLocalWebStats as getLocalWebRepositoryStats,
  importFileManagerArchive,
  exportFileManagerArchive,
  getFileManagerStats as getFileManagerRepositoryStats,
  readAllLocalWebFiles,
  readAllLocalWebSites,
  saveLocalWebFiles,
  saveLocalWebSites,
  type FileManagerArchive,
  type FileManagerEntryMeta,
  type FileManagerStats,
  type LocalWebSite,
  type LocalWebStats,
  type LocalWebStoredFile,
  type WidgetDataEntry,
} from '../repositories';

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
  'alarm-widget-alarms',
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
  return exportWidgetDataEntries(keys);
};

export const importWidgetData = async (entries: Record<string, WidgetDataEntry>): Promise<void> => {
  await importWidgetDataEntries(entries);
};

export const exportLocalWebData = async (
  profileNames?: string[],
  fallbackProfileName?: string
): Promise<LocalWebBackup> => {
  const sites = await readAllLocalWebSites();
  const files = await readAllLocalWebFiles();

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
  return { sites: resolvedSites, files: encodedFiles };
};

export const exportLocalWebRecords = async (
  profileNames?: string[],
  fallbackProfileName?: string
): Promise<LocalWebArchive> => {
  const sites = await readAllLocalWebSites();
  const files = await readAllLocalWebFiles();

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
  return { sites: resolvedSites, files: selectedFiles };
};

export const getLocalWebStats = async (
  profileNames?: string[],
  _fallbackProfileName?: string
): Promise<LocalWebStats> => {
  void _fallbackProfileName;
  return getLocalWebRepositoryStats(profileNames);
};

export const getFileManagerStats = async (): Promise<FileManagerStats> => {
  return getFileManagerRepositoryStats();
};

export const clearLocalWebData = async (): Promise<void> => {
  await clearLocalWebRepositoryData();
};

export const exportFileManagerRecords = async (): Promise<FileManagerArchive> => {
  return exportFileManagerArchive();
};

export const importFileManagerRecords = async (payload: FileManagerArchive): Promise<void> => {
  await importFileManagerArchive(payload);
};

export const importLocalWebData = async (
  payload: LocalWebBackup,
  options?: { profileNameMap?: Map<string, string>; fallbackProfileName?: string }
): Promise<void> => {
  const sites = payload.sites.map((site) => {
    const mappedName = site.profileName && options?.profileNameMap?.get(site.profileName);
    const profileName = mappedName ?? site.profileName ?? options?.fallbackProfileName;
    return { ...site, profileName };
  });
  const files: LocalWebStoredFile[] = payload.files.map((file) => {
    const mappedName = file.profileName && options?.profileNameMap?.get(file.profileName);
    const profileName = mappedName ?? file.profileName ?? options?.fallbackProfileName;
    const buffer = base64ToArrayBuffer(file.dataBase64);
    const blob = new Blob([buffer], { type: file.type });
    return {
      key: file.key,
      siteId: file.siteId,
      path: file.path,
      blob,
      size: file.size,
      type: file.type,
      profileName,
    };
  });
  await saveLocalWebSites(sites);
  await saveLocalWebFiles(files);
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
  if (options?.signal?.aborted) {
    throw new Error('abort');
  }
  await saveLocalWebSites(payload.sites.map((site) => {
    const mappedName = site.profileName && options?.profileNameMap?.get(site.profileName);
    const profileName = mappedName ?? site.profileName ?? options?.fallbackProfileName;
    return { ...site, profileName };
  }));

  const total = payload.files.length;
  const batchSize = 50;
  let current = 0;
  for (let i = 0; i < payload.files.length; i += batchSize) {
    if (options?.signal?.aborted) {
      throw new Error('abort');
    }
    const batch = payload.files.slice(i, i + batchSize);
    await saveLocalWebFiles(batch.map((file) => {
      const mappedName = file.profileName && options?.profileNameMap?.get(file.profileName);
      const profileName = mappedName ?? file.profileName ?? options?.fallbackProfileName;
      return {
        key: file.key,
        siteId: file.siteId,
        path: file.path,
        blob: file.blob,
        size: file.size,
        type: file.type,
        profileName,
      };
    }));
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
  fileManagerRecords?: FileManagerArchive,
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

        const totalFileEntries = (localWebRecords?.files.length ?? 0) + (fileManagerRecords?.files.length ?? 0);
        let totalProcessed = 0;
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
          for (const file of localWebRecords.files) {
            if (signal?.aborted) {
              reject(new Error('abort'));
              return;
            }
            const buffer = await file.blob.arrayBuffer();
            addEntry(`localWeb/files/${file.key}`, new Uint8Array(buffer));
            totalProcessed += 1;
            if (onProgress && totalFileEntries > 0) onProgress(totalProcessed, totalFileEntries);
            if (yieldControl) await yieldControl();
          }
        }

        if (fileManagerRecords) {
          addEntry('fileManager/meta.json', strToU8(JSON.stringify({ entries: fileManagerRecords.entries })));
          for (const file of fileManagerRecords.files) {
            if (signal?.aborted) {
              reject(new Error('abort'));
              return;
            }
            const buffer = await file.blob.arrayBuffer();
            addEntry(`fileManager/files/${file.id}`, new Uint8Array(buffer));
            totalProcessed += 1;
            if (onProgress && totalFileEntries > 0) onProgress(totalProcessed, totalFileEntries);
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

export const parseBackupArchive = (buffer: ArrayBuffer): {
  payload: BackupPayload;
  localWeb?: LocalWebArchive;
  fileManager?: FileManagerArchive;
} => {
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
  const localWeb = (() => {
    if (!metaEntry) return undefined;
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
      sites: localMeta.sites ?? [],
      files,
    };
  })();

  const fileManager = (() => {
    const fmMetaEntry = entries['fileManager/meta.json'];
    if (!fmMetaEntry) return undefined;
    const parsed = JSON.parse(strFromU8(fmMetaEntry)) as { entries: FileManagerEntryMeta[] };
    const files: Array<{ id: string; blob: Blob }> = [];
    parsed.entries.forEach((entry) => {
      if (!entry.hasBlob) return;
      const fileEntry = entries[`fileManager/files/${entry.id}`];
      if (!fileEntry) return;
      files.push({ id: entry.id, blob: new Blob([fileEntry], { type: entry.mime || '' }) });
    });
    return { entries: parsed.entries ?? [], files };
  })();

  return { payload, localWeb, fileManager };
};

export const cloneLocalWebData = async (sourceProfileName: string, targetProfileName: string): Promise<void> => {
  await cloneLocalWebRepositoryData(sourceProfileName, targetProfileName);
};
