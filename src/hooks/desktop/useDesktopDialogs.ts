import { useCallback, useEffect, useRef, useState } from 'react';
import type { Dispatch, RefObject, SetStateAction } from 'react';
import { FILE_MANAGER_ROOT_ID, getAllEntries, listEntriesByParent, type FileManagerEntry } from '../../repositories/fileManagerRepository';
import { onDesktopEvent } from '../../utils/desktopEvents';
import type { OpenDialogOptions, OpenDialogResult } from '../../utils/openDialog';
import type { SaveDialogResult } from '../../utils/saveDialog';

type SaveDialogState = {
    isOpen: boolean;
    sourceWidgetId?: string;
};

type OpenDialogState = {
    isOpen: boolean;
    options: OpenDialogOptions;
};

type UseDesktopDialogsParams = {
    t: (key: string) => string;
};

type UseDesktopDialogsResult = {
    saveDialogState: SaveDialogState;
    saveDialogFilterWidget: boolean;
    saveDialogFolderId: string;
    saveDialogFilename: string;
    saveDialogSuggestedFilename: string;
    saveDialogEntries: FileManagerEntry[];
    saveDialogSelectedEntryId: string | null;
    saveDialogBreadcrumb: FileManagerEntry[];
    openDialogState: OpenDialogState;
    openDialogFilterWidget: boolean;
    openDialogFolderId: string;
    openDialogEntries: FileManagerEntry[];
    openDialogSelectedIds: string[];
    openDialogBreadcrumb: FileManagerEntry[];
    openDialogInputRef: RefObject<HTMLInputElement | null>;
    setSaveDialogFilterWidget: Dispatch<SetStateAction<boolean>>;
    setSaveDialogFolderId: Dispatch<SetStateAction<string>>;
    setSaveDialogFilename: Dispatch<SetStateAction<string>>;
    setSaveDialogSelectedEntryId: Dispatch<SetStateAction<string | null>>;
    setOpenDialogFilterWidget: Dispatch<SetStateAction<boolean>>;
    setOpenDialogFolderId: Dispatch<SetStateAction<string>>;
    setOpenDialogSelectedIds: Dispatch<SetStateAction<string[]>>;
    closeSaveDialog: (result: SaveDialogResult) => void;
    closeOpenDialog: (result: OpenDialogResult | null) => void;
    normalizeFilename: (name: string) => string;
    getSaveDialogFilename: () => string;
};

export function useDesktopDialogs({ t }: UseDesktopDialogsParams): UseDesktopDialogsResult {
    const [saveDialogState, setSaveDialogState] = useState<SaveDialogState>({ isOpen: false });
    const [saveDialogFilterWidget, setSaveDialogFilterWidget] = useState(false);
    const saveDialogResolverRef = useRef<((result: SaveDialogResult) => void) | null>(null);
    const [saveDialogFolderId, setSaveDialogFolderId] = useState(FILE_MANAGER_ROOT_ID);
    const [saveDialogFilename, setSaveDialogFilename] = useState('');
    const [saveDialogSuggestedFilename, setSaveDialogSuggestedFilename] = useState('');
    const [saveDialogEntries, setSaveDialogEntries] = useState<FileManagerEntry[]>([]);
    const [saveDialogSelectedEntryId, setSaveDialogSelectedEntryId] = useState<string | null>(null);
    const [saveDialogBreadcrumb, setSaveDialogBreadcrumb] = useState<FileManagerEntry[]>([]);
    const [openDialogState, setOpenDialogState] = useState<OpenDialogState>({ isOpen: false, options: {} });
    const [openDialogFilterWidget, setOpenDialogFilterWidget] = useState(false);
    const openDialogResolverRef = useRef<((result: OpenDialogResult | null) => void) | null>(null);
    const [openDialogFolderId, setOpenDialogFolderId] = useState(FILE_MANAGER_ROOT_ID);
    const [openDialogEntries, setOpenDialogEntries] = useState<FileManagerEntry[]>([]);
    const [openDialogSelectedIds, setOpenDialogSelectedIds] = useState<string[]>([]);
    const openDialogInputRef = useRef<HTMLInputElement>(null);
    const [openDialogBreadcrumb, setOpenDialogBreadcrumb] = useState<FileManagerEntry[]>([]);

    const closeSaveDialog = useCallback((result: SaveDialogResult) => {
        const resolver = saveDialogResolverRef.current;
        saveDialogResolverRef.current = null;
        setSaveDialogState({ isOpen: false });
        setSaveDialogFilterWidget(false);
        if (resolver) resolver(result);
    }, []);

    useEffect(() => {
        if (!saveDialogState.isOpen) return;
        let isMounted = true;
        const loadFolders = async () => {
            const entries = await getAllEntries();
            const folders = entries.filter((entry) => entry.type === 'folder');
            const ids = new Set(folders.map((entry) => entry.id));
            if (isMounted && !ids.has(saveDialogFolderId) && saveDialogFolderId !== FILE_MANAGER_ROOT_ID) {
                setSaveDialogFolderId(FILE_MANAGER_ROOT_ID);
            }
        };
        loadFolders();
        return () => {
            isMounted = false;
        };
    }, [saveDialogFolderId, saveDialogState.isOpen]);

    useEffect(() => {
        if (!saveDialogState.isOpen) return;
        let isMounted = true;
        const loadEntries = async () => {
            const entries = await listEntriesByParent(saveDialogFolderId);
            const allEntries = await getAllEntries();
            const folders = allEntries.filter((entry) => entry.type === 'folder');
            const byId = new Map(folders.map((entry) => [entry.id, entry]));
            const current = byId.get(saveDialogFolderId);
            const pathFor = (entry: FileManagerEntry): FileManagerEntry[] => {
                const path: FileManagerEntry[] = [];
                let cursor: FileManagerEntry | undefined = entry;
                while (cursor && cursor.id !== FILE_MANAGER_ROOT_ID) {
                    path.unshift(cursor);
                    cursor = byId.get(cursor.parentId);
                }
                return path;
            };
            const filtered = entries.filter((entry) => {
                if (entry.type === 'folder') return true;
                if (!saveDialogFilterWidget || !saveDialogState.sourceWidgetId) return true;
                return entry.sourceWidgetId === saveDialogState.sourceWidgetId;
            });
            const sorted = [...filtered].sort((a, b) => {
                if (a.type !== b.type) return a.type === 'folder' ? -1 : 1;
                return a.name.localeCompare(b.name);
            });
            if (isMounted) {
                setSaveDialogEntries(sorted);
                setSaveDialogSelectedEntryId(null);
                setSaveDialogBreadcrumb(current ? pathFor(current) : []);
            }
        };
        loadEntries();
        return () => {
            isMounted = false;
        };
    }, [saveDialogFilterWidget, saveDialogFolderId, saveDialogState.isOpen, saveDialogState.sourceWidgetId]);

    useEffect(() => {
        if (!openDialogState.isOpen) return;
        let isMounted = true;
        const loadEntries = async () => {
            const entries = await listEntriesByParent(openDialogFolderId);
            const allEntries = await getAllEntries();
            const folders = allEntries.filter((entry) => entry.type === 'folder');
            const byId = new Map(folders.map((entry) => [entry.id, entry]));
            const current = byId.get(openDialogFolderId);
            const pathFor = (entry: FileManagerEntry): FileManagerEntry[] => {
                const path: FileManagerEntry[] = [];
                let cursor: FileManagerEntry | undefined = entry;
                while (cursor && cursor.id !== FILE_MANAGER_ROOT_ID) {
                    path.unshift(cursor);
                    cursor = byId.get(cursor.parentId);
                }
                return path;
            };
            const acceptRules = (openDialogState.options.accept || '')
                .split(',')
                .map((rule) => rule.trim().toLowerCase())
                .filter(Boolean);
            const matchesAcceptRule = (entry: FileManagerEntry): boolean => {
                if (acceptRules.length === 0) return true;
                const name = entry.name.toLowerCase();
                const extensionIndex = name.lastIndexOf('.');
                const extension = extensionIndex >= 0 ? name.slice(extensionIndex) : '';
                const mime = entry.mime ? entry.mime.toLowerCase() : '';
                return acceptRules.some((rule) => {
                    if (rule === '*/*') return true;
                    if (rule.startsWith('.')) return extension === rule;
                    if (rule.endsWith('/*')) return mime.startsWith(rule.slice(0, -1));
                    if (rule.includes('/')) return mime === rule;
                    return false;
                });
            };
            const filtered = entries.filter((entry) => {
                if (entry.type === 'folder') return true;
                if (openDialogFilterWidget) {
                    if (!matchesAcceptRule(entry)) return false;
                    if (!openDialogState.options.sourceWidgetId) return true;
                    return entry.sourceWidgetId === openDialogState.options.sourceWidgetId;
                }
                return true;
            });
            const sorted = [...filtered].sort((a, b) => {
                if (a.type !== b.type) return a.type === 'folder' ? -1 : 1;
                return a.name.localeCompare(b.name);
            });
            if (isMounted) {
                setOpenDialogEntries(sorted);
                setOpenDialogSelectedIds([]);
                setOpenDialogBreadcrumb(current ? pathFor(current) : []);
            }
        };
        loadEntries();
        return () => {
            isMounted = false;
        };
    }, [
        openDialogFilterWidget,
        openDialogFolderId,
        openDialogState.isOpen,
        openDialogState.options.accept,
        openDialogState.options.sourceWidgetId,
    ]);

    const normalizeFilename = useCallback((name: string) => {
        const trimmed = name.trim();
        if (!trimmed) return '';
        let normalized = trimmed.replace(/[\\/:*?"<>|]/g, '-');
        normalized = Array.from(normalized)
            .filter((char) => char >= ' ' || char === '\u007f')
            .join('');
        normalized = normalized.replace(/\s+/g, ' ');
        normalized = normalized.replace(/^\.+/, '').replace(/\.+$/, '');
        return normalized.trim();
    }, []);

    const getSaveDialogFilename = useCallback(() => {
        const normalized = normalizeFilename(saveDialogFilename);
        if (normalized) return normalized;
        return normalizeFilename(saveDialogSuggestedFilename)
            || normalizeFilename(t('save_dialog.default_filename'))
            || 'archivo';
    }, [normalizeFilename, saveDialogFilename, saveDialogSuggestedFilename, t]);

    const closeOpenDialog = useCallback((result: OpenDialogResult | null) => {
        const resolver = openDialogResolverRef.current;
        openDialogResolverRef.current = null;
        setOpenDialogFilterWidget(false);
        setOpenDialogState((prev) => ({ ...prev, isOpen: false }));
        if (resolver) resolver(result);
    }, []);

    useEffect(() => {
        return onDesktopEvent('save-dialog-request', (detail) => {
            if (!detail?.resolve) return;
            if (saveDialogResolverRef.current) {
                saveDialogResolverRef.current(null);
            }
            saveDialogResolverRef.current = detail.resolve;
            const suggested = detail.suggestedFilename?.trim() || t('save_dialog.default_filename');
            setSaveDialogSuggestedFilename(suggested);
            setSaveDialogFilename(suggested);
            setSaveDialogFilterWidget(Boolean(detail.sourceWidgetId));
            setSaveDialogState({ isOpen: true, sourceWidgetId: detail.sourceWidgetId });
        });
    }, [t]);

    useEffect(() => {
        return onDesktopEvent('open-dialog-request', (detail) => {
            if (!detail?.resolve) return;
            if (openDialogResolverRef.current) {
                openDialogResolverRef.current(null);
            }
            openDialogResolverRef.current = detail.resolve;
            setOpenDialogSelectedIds([]);
            setOpenDialogFolderId(FILE_MANAGER_ROOT_ID);
            setOpenDialogFilterWidget(Boolean(detail.options?.sourceWidgetId));
            setOpenDialogState({ isOpen: true, options: detail.options ?? {} });
        });
    }, []);

    return {
        saveDialogState,
        saveDialogFilterWidget,
        saveDialogFolderId,
        saveDialogFilename,
        saveDialogSuggestedFilename,
        saveDialogEntries,
        saveDialogSelectedEntryId,
        saveDialogBreadcrumb,
        openDialogState,
        openDialogFilterWidget,
        openDialogFolderId,
        openDialogEntries,
        openDialogSelectedIds,
        openDialogBreadcrumb,
        openDialogInputRef,
        setSaveDialogFilterWidget,
        setSaveDialogFolderId,
        setSaveDialogFilename,
        setSaveDialogSelectedEntryId,
        setOpenDialogFilterWidget,
        setOpenDialogFolderId,
        setOpenDialogSelectedIds,
        closeSaveDialog,
        closeOpenDialog,
        normalizeFilename,
        getSaveDialogFilename,
    };
}
