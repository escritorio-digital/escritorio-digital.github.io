import {
    FILE_MANAGER_ROOT_ID,
    clearFileManagerData,
    createFolder,
    getAllEntries,
    getEntry,
    listEntriesByParent,
    moveEntryToTrash,
    replaceAllEntries,
    saveFileEntry,
    type FileManagerEntry,
} from '../utils/fileManagerDb';

export type { FileManagerEntry };

export type FileManagerEntryMeta = {
    id: string;
    type: 'file' | 'folder';
    name: string;
    parentId: string;
    createdAt: number;
    updatedAt: number;
    trashedAt?: number | null;
    size?: number;
    mime?: string;
    sourceWidgetId?: string;
    sourceWidgetTitleKey?: string;
    hasBlob: boolean;
};

export type FileManagerArchive = {
    entries: FileManagerEntryMeta[];
    files: Array<{ id: string; blob: Blob }>;
};

export type FileManagerStats = {
    entryCount: number;
    totalBytes: number;
};

export {
    FILE_MANAGER_ROOT_ID,
    clearFileManagerData,
    createFolder,
    getAllEntries,
    getEntry,
    listEntriesByParent,
    moveEntryToTrash,
    saveFileEntry,
};

export const getFileManagerStats = async (): Promise<FileManagerStats> => {
    const entries = await getAllEntries();
    return {
        entryCount: entries.filter((entry) => entry.id !== FILE_MANAGER_ROOT_ID).length,
        totalBytes: entries
            .filter((entry) => entry.type === 'file')
            .reduce((sum, entry) => sum + (entry.size || 0), 0),
    };
};

export const exportFileManagerArchive = async (): Promise<FileManagerArchive> => {
    const entries = await getAllEntries();
    return {
        entries: entries.map((entry) => ({
            id: entry.id,
            type: entry.type,
            name: entry.name,
            parentId: entry.parentId,
            createdAt: entry.createdAt,
            updatedAt: entry.updatedAt,
            trashedAt: entry.trashedAt,
            size: entry.size,
            mime: entry.mime,
            sourceWidgetId: entry.sourceWidgetId,
            sourceWidgetTitleKey: entry.sourceWidgetTitleKey,
            hasBlob: Boolean(entry.blob),
        })),
        files: entries
            .filter((entry) => entry.blob)
            .map((entry) => ({ id: entry.id, blob: entry.blob as Blob })),
    };
};

export const importFileManagerArchive = async (payload: FileManagerArchive): Promise<void> => {
    const fileMap = new Map(payload.files.map((file) => [file.id, file.blob]));
    const entries: FileManagerEntry[] = payload.entries.map((entry) => {
        const blob = entry.hasBlob ? fileMap.get(entry.id) : undefined;
        return {
            id: entry.id,
            type: entry.type,
            name: entry.name,
            parentId: entry.parentId,
            createdAt: entry.createdAt,
            updatedAt: entry.updatedAt,
            trashedAt: entry.trashedAt,
            blob,
            size: entry.size ?? (blob ? blob.size : undefined),
            mime: entry.mime ?? (blob ? blob.type : undefined),
            sourceWidgetId: entry.sourceWidgetId,
            sourceWidgetTitleKey: entry.sourceWidgetTitleKey,
        };
    });
    await replaceAllEntries(entries);
};
