import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { FC } from 'react';
import { useTranslation } from 'react-i18next';
import { Folder, File, Trash2, UploadCloud, FolderPlus, ArrowUp, Download, Copy, Scissors, ClipboardPaste, XCircle } from 'lucide-react';
import { useLocalStorage } from '../../../hooks/useLocalStorage';
import { withBaseUrl } from '../../../utils/assetPaths';
import {
    FILE_MANAGER_ROOT_ID,
    copyEntries,
    createFolder,
    deleteEntryPermanently,
    estimateStorage,
    getAllEntries,
    getEntry,
    listEntriesByParent,
    listTrashedEntries,
    moveEntryToTrash,
    moveEntries,
    purgeExpiredTrash,
    restoreEntryFromTrash,
    saveFileEntry,
    type FileManagerEntry,
    type StorageEstimate,
} from '../../../utils/fileManagerDb';
import './FileManagerWidget.css';

const DEFAULT_TRASH_HOURS = 1;
const TRASH_TTL_OPTIONS = [1, 6, 12, 24];

const formatBytes = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    const units = ['KB', 'MB', 'GB', 'TB'];
    let value = bytes / 1024;
    let unitIndex = 0;
    while (value >= 1024 && unitIndex < units.length - 1) {
        value /= 1024;
        unitIndex += 1;
    }
    return `${value.toFixed(value >= 10 ? 0 : 1)} ${units[unitIndex]}`;
};

export const FileManagerWidget: FC = () => {
    const { t } = useTranslation();
    const [currentFolderId, setCurrentFolderId] = useState(FILE_MANAGER_ROOT_ID);
    const [entries, setEntries] = useState<FileManagerEntry[]>([]);
    const [isTrashView, setIsTrashView] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [storageEstimate, setStorageEstimate] = useState<StorageEstimate>({ usage: null, quota: null });
    const [trashTtlHours, setTrashTtlHours] = useLocalStorage<number>('file-manager-trash-ttl-hours', DEFAULT_TRASH_HOURS);
    const [selectedEntryIds, setSelectedEntryIds] = useState<string[]>([]);
    const [lastSelectedIndex, setLastSelectedIndex] = useState<number | null>(null);
    const [dragOverFolderId, setDragOverFolderId] = useState<string | null>(null);
    const [clipboard, setClipboard] = useState<{ mode: 'copy' | 'cut'; entryIds: string[] } | null>(null);
    const [contextMenu, setContextMenu] = useState<{
        isOpen: boolean;
        x: number;
        y: number;
        targetFolderId: string;
    }>({ isOpen: false, x: 0, y: 0, targetFolderId: FILE_MANAGER_ROOT_ID });
    const fileInputRef = useRef<HTMLInputElement>(null);
    const contextMenuRef = useRef<HTMLDivElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    const refreshEntries = useCallback(async () => {
        setIsLoading(true);
        try {
            if (isTrashView) {
                const trashed = await listTrashedEntries();
                setEntries(trashed);
            } else {
                const children = await listEntriesByParent(currentFolderId);
                setEntries(children);
            }
        } finally {
            setIsLoading(false);
        }
    }, [currentFolderId, isTrashView]);

    useEffect(() => {
        refreshEntries();
        setSelectedEntryIds([]);
        setLastSelectedIndex(null);
    }, [refreshEntries]);

    useEffect(() => {
        if (!contextMenu.isOpen) return;
        const handleClick = (event: Event) => {
            if (contextMenuRef.current?.contains(event.target as Node)) return;
            setContextMenu((prev) => ({ ...prev, isOpen: false }));
        };
        const handleKey = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                setContextMenu((prev) => ({ ...prev, isOpen: false }));
            }
        };
        window.addEventListener('mousedown', handleClick);
        window.addEventListener('keydown', handleKey);
        window.addEventListener('scroll', handleClick, true);
        return () => {
            window.removeEventListener('mousedown', handleClick);
            window.removeEventListener('keydown', handleKey);
            window.removeEventListener('scroll', handleClick, true);
        };
    }, [contextMenu.isOpen]);

    useEffect(() => {
        const handler = () => refreshEntries();
        window.addEventListener('file-manager-refresh', handler);
        return () => window.removeEventListener('file-manager-refresh', handler);
    }, [refreshEntries]);

    useEffect(() => {
        const ttlMs = Math.max(1, trashTtlHours) * 60 * 60 * 1000;
        purgeExpiredTrash(ttlMs).then(() => refreshEntries());
    }, [refreshEntries, trashTtlHours]);

    useEffect(() => {
        let isMounted = true;
        estimateStorage().then((estimate) => {
            if (isMounted) setStorageEstimate(estimate);
        });
        return () => {
            isMounted = false;
        };
    }, [entries.length]);

    const breadcrumb = useMemo(() => {
        const build = async () => {
            const all = await getAllEntries();
            const byId = new Map(all.map((entry) => [entry.id, entry]));
            const path: FileManagerEntry[] = [];
            let current = byId.get(currentFolderId);
            while (current && current.id !== FILE_MANAGER_ROOT_ID) {
                path.unshift(current);
                current = byId.get(current.parentId);
            }
            return path;
        };
        return build();
    }, [currentFolderId]);

    const sortedEntries = useMemo(() => {
        const items = [...entries];
        items.sort((a, b) => {
            if (a.type !== b.type) {
                return a.type === 'folder' ? -1 : 1;
            }
            return a.name.localeCompare(b.name);
        });
        return items;
    }, [entries]);

    const usagePercent = useMemo(() => {
        if (storageEstimate.usage == null || storageEstimate.quota == null) return null;
        return Math.min(100, Math.round((storageEstimate.usage / storageEstimate.quota) * 100));
    }, [storageEstimate.quota, storageEstimate.usage]);

    const handleNewFolder = async () => {
        const name = window.prompt(t('widgets.file_manager.new_folder_prompt'));
        if (!name) return;
        const trimmed = name.trim();
        if (!trimmed) return;
        await createFolder(trimmed, currentFolderId);
        refreshEntries();
    };

    const handleFilesSelected = async (files: FileList | null) => {
        if (isTrashView) return;
        if (!files || files.length === 0) return;
        const tasks = Array.from(files).map((file) => (
            saveFileEntry({
                name: file.name,
                parentId: currentFolderId,
                blob: file,
                mime: file.type,
            })
        ));
        await Promise.all(tasks);
        refreshEntries();
    };

    const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
        event.preventDefault();
        if (isTrashView) return;
        setDragOverFolderId(null);
        const custom = event.dataTransfer.getData('application/x-ed-file-manager');
        if (custom) {
            try {
                const ids = JSON.parse(custom) as string[];
                moveEntries(ids, currentFolderId).then(refreshEntries);
            } catch {
                // ignore invalid payloads
            }
            return;
        }
        handleFilesSelected(event.dataTransfer.files);
    };

    const handleOpenEntry = async (entry: FileManagerEntry) => {
        if (isTrashView) return;
        if (entry.type === 'folder') {
            setCurrentFolderId(entry.id);
            return;
        }
        const widgetId = entry.sourceWidgetId || 'file-opener';
        window.dispatchEvent(new CustomEvent('file-manager-open', { detail: { widgetId, entryId: entry.id } }));
    };

    const handleDeleteEntry = async (entry: FileManagerEntry) => {
        await moveEntryToTrash(entry.id);
        refreshEntries();
    };

    const handleRestoreEntry = async (entry: FileManagerEntry) => {
        await restoreEntryFromTrash(entry.id);
        refreshEntries();
    };

    const handleDeletePermanent = async (entry: FileManagerEntry) => {
        if (!window.confirm(t('widgets.file_manager.delete_confirm'))) return;
        await deleteEntryPermanently(entry.id);
        refreshEntries();
    };

    const handleEmptyTrash = async () => {
        if (!window.confirm(t('widgets.file_manager.empty_trash_confirm'))) return;
        const trashed = await listTrashedEntries();
        if (trashed.length === 0) return;
        await Promise.all(trashed.map((entry) => deleteEntryPermanently(entry.id)));
        refreshEntries();
    };

    const handleDownload = async (entry: FileManagerEntry) => {
        if (!entry.blob) return;
        const url = URL.createObjectURL(entry.blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = entry.name;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    const handleNavigateUp = async () => {
        if (currentFolderId === FILE_MANAGER_ROOT_ID) return;
        const current = await getEntry(currentFolderId);
        if (!current) return;
        setCurrentFolderId(current.parentId);
    };

    const handleSelectEntry = (entryId: string, index: number, event: React.MouseEvent) => {
        if (isTrashView) return;
        const isMeta = event.metaKey || event.ctrlKey;
        if (event.shiftKey && lastSelectedIndex !== null) {
            const start = Math.min(lastSelectedIndex, index);
            const end = Math.max(lastSelectedIndex, index);
            const rangeIds = sortedEntries.slice(start, end + 1).map((entry) => entry.id);
            setSelectedEntryIds((prev) => (isMeta ? Array.from(new Set([...prev, ...rangeIds])) : rangeIds));
        } else if (isMeta) {
            setSelectedEntryIds((prev) =>
                prev.includes(entryId) ? prev.filter((id) => id !== entryId) : [...prev, entryId]
            );
        } else {
            setSelectedEntryIds([entryId]);
        }
        setLastSelectedIndex(index);
    };

    const handleDragStart = (entry: FileManagerEntry, event: React.DragEvent<HTMLButtonElement>) => {
        if (isTrashView) return;
        const ids = selectedEntryIds.includes(entry.id) ? selectedEntryIds : [entry.id];
        event.dataTransfer.setData('application/x-ed-file-manager', JSON.stringify(ids));
        event.dataTransfer.effectAllowed = 'move';
    };

    const handleDropOnFolder = async (targetFolderId: string, event: React.DragEvent) => {
        if (isTrashView) return;
        event.preventDefault();
        event.stopPropagation();
        setDragOverFolderId(null);
        const raw = event.dataTransfer.getData('application/x-ed-file-manager');
        if (!raw) return;
        try {
            const ids = JSON.parse(raw) as string[];
            const filtered = ids.filter((id) => id !== targetFolderId);
            if (filtered.length === 0) return;
            await moveEntries(filtered, targetFolderId);
            refreshEntries();
        } catch {
            // ignore invalid payloads
        }
    };

    const handleContextMenu = (event: React.MouseEvent, entry?: FileManagerEntry, index?: number) => {
        if (isTrashView) return;
        event.preventDefault();
        event.stopPropagation();
        const rect = containerRef.current?.getBoundingClientRect();
        const x = rect ? event.clientX - rect.left : event.clientX;
        const y = rect ? event.clientY - rect.top : event.clientY;
        if (entry && index != null) {
            if (!selectedEntryIds.includes(entry.id)) {
                setSelectedEntryIds([entry.id]);
                setLastSelectedIndex(index);
            }
            setContextMenu({
                isOpen: true,
                x,
                y,
                targetFolderId: entry.type === 'folder' ? entry.id : currentFolderId,
            });
            return;
        }
        setContextMenu({
            isOpen: true,
            x,
            y,
            targetFolderId: currentFolderId,
        });
    };

    const handlePaste = async (targetFolderId: string) => {
        if (!clipboard) return;
        if (clipboard.mode === 'copy') {
            await copyEntries(clipboard.entryIds, targetFolderId);
        } else {
            await moveEntries(clipboard.entryIds, targetFolderId);
            setClipboard(null);
        }
        refreshEntries();
    };

    const handleMoveSelectionToTrash = async () => {
        if (selectedEntryIds.length === 0) return;
        await Promise.all(selectedEntryIds.map((id) => moveEntryToTrash(id)));
        refreshEntries();
        setSelectedEntryIds([]);
        setLastSelectedIndex(null);
    };

    const handleDeleteSelectionPermanent = async () => {
        if (selectedEntryIds.length === 0) return;
        if (!window.confirm(t('widgets.file_manager.delete_confirm'))) return;
        await Promise.all(selectedEntryIds.map((id) => deleteEntryPermanently(id)));
        refreshEntries();
        setSelectedEntryIds([]);
        setLastSelectedIndex(null);
    };

    return (
        <div
            ref={containerRef}
            className="file-manager-widget"
            onDragOver={(event) => event.preventDefault()}
            onDrop={handleDrop}
        >
            <div className="file-manager-toolbar">
                <button
                    className="file-manager-button"
                    onClick={handleNavigateUp}
                    disabled={currentFolderId === FILE_MANAGER_ROOT_ID || isTrashView}
                    title={t('widgets.file_manager.up')}
                >
                    <ArrowUp size={16} />
                </button>
                <div className="file-manager-breadcrumbs">
                    <BreadcrumbTrail breadcrumb={breadcrumb} onNavigate={setCurrentFolderId} disabled={isTrashView} />
                </div>
                <div className="file-manager-spacer" />
                <button className="file-manager-button" onClick={handleNewFolder} disabled={isTrashView}>
                    <FolderPlus size={16} />
                    {t('widgets.file_manager.new_folder')}
                </button>
                <button
                    className="file-manager-button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isTrashView}
                >
                    <UploadCloud size={16} />
                    {t('widgets.file_manager.upload')}
                </button>
                <button className="file-manager-button" onClick={() => setIsTrashView((prev) => !prev)}>
                    <Trash2 size={16} />
                    {isTrashView ? t('widgets.file_manager.exit_trash') : t('widgets.file_manager.open_trash')}
                </button>
                <button
                    className="file-manager-icon-only"
                    onClick={() => window.dispatchEvent(new CustomEvent('open-widget', { detail: { widgetId: 'local-web' } }))}
                    title={t('widgets.local_web.tooltip')}
                    aria-label={t('widgets.local_web.tooltip')}
                >
                    <img
                        src={withBaseUrl('icons/LocalWeb.png')}
                        alt=""
                        className="h-5 w-5"
                    />
                </button>
                {isTrashView && (
                    <button className="file-manager-button" onClick={handleEmptyTrash}>
                        <Trash2 size={16} />
                        {t('widgets.file_manager.empty_trash_button')}
                    </button>
                )}
            </div>

            <div className="file-manager-usage">
                <div className="file-manager-usage-bar">
                    <div
                        className="file-manager-usage-fill"
                        style={{ width: usagePercent ? `${usagePercent}%` : '0%' }}
                    />
                </div>
                <span className="file-manager-usage-text">
                    {storageEstimate.usage != null && storageEstimate.quota != null
                        ? t('widgets.file_manager.storage_usage', {
                            used: formatBytes(storageEstimate.usage),
                            total: formatBytes(storageEstimate.quota),
                            percent: usagePercent ?? 0,
                        })
                        : t('widgets.file_manager.storage_unknown')}
                </span>
                {isTrashView && (
                    <div className="file-manager-trash-settings">
                        <label htmlFor="trash-ttl">{t('widgets.file_manager.trash_ttl')}</label>
                        <select
                            id="trash-ttl"
                            value={trashTtlHours}
                            onChange={(event) => setTrashTtlHours(Number(event.target.value))}
                        >
                            {TRASH_TTL_OPTIONS.map((hours) => (
                                <option key={hours} value={hours}>
                                    {t('widgets.file_manager.trash_option', { hours })}
                                </option>
                            ))}
                        </select>
                    </div>
                )}
            </div>

            <div
                className="file-manager-list"
                onClick={(event) => {
                    if (event.target === event.currentTarget) {
                        setSelectedEntryIds([]);
                        setLastSelectedIndex(null);
                    }
                }}
                onContextMenu={(event) => handleContextMenu(event)}
            >
                {isLoading ? (
                    <div className="file-manager-empty">{t('loading')}</div>
                ) : sortedEntries.length === 0 ? (
                    <div className="file-manager-empty">
                        {isTrashView ? t('widgets.file_manager.empty_trash') : t('widgets.file_manager.empty_folder')}
                    </div>
                ) : (
                    sortedEntries.map((entry, index) => (
                        <div key={entry.id} className="file-manager-row">
                            <button
                                className={`file-manager-entry${selectedEntryIds.includes(entry.id) ? ' selected' : ''}${dragOverFolderId === entry.id ? ' drag-over' : ''}`}
                                onClick={(event) => handleSelectEntry(entry.id, index, event)}
                                onDoubleClick={() => handleOpenEntry(entry)}
                                draggable={!isTrashView}
                                onDragStart={(event) => handleDragStart(entry, event)}
                                onDragOver={(event) => {
                                    if (entry.type !== 'folder' || isTrashView) return;
                                    event.preventDefault();
                                    setDragOverFolderId(entry.id);
                                }}
                                onDragLeave={() => {
                                    if (dragOverFolderId === entry.id) {
                                        setDragOverFolderId(null);
                                    }
                                }}
                                onDrop={(event) => {
                                    if (entry.type !== 'folder' || isTrashView) return;
                                    handleDropOnFolder(entry.id, event);
                                }}
                                onContextMenu={(event) => handleContextMenu(event, entry, index)}
                            >
                                {entry.type === 'folder' ? <Folder size={18} /> : <File size={18} />}
                                <span className="file-manager-entry-name">{entry.name}</span>
                                {entry.type === 'file' && entry.size != null && (
                                    <span className="file-manager-entry-size">{formatBytes(entry.size)}</span>
                                )}
                                {entry.sourceWidgetId && (
                                    <span className="file-manager-entry-source">
                                        {t('widgets.file_manager.saved_from', {
                                            widget: entry.sourceWidgetTitleKey ? t(entry.sourceWidgetTitleKey) : entry.sourceWidgetId,
                                        })}
                                    </span>
                                )}
                            </button>
                            <div className="file-manager-actions">
                                {entry.type === 'file' && !isTrashView && (
                                    <button
                                        className="file-manager-icon-button"
                                        onClick={() => handleDownload(entry)}
                                        title={t('widgets.file_manager.download')}
                                    >
                                        <Download size={16} />
                                    </button>
                                )}
                                {isTrashView ? (
                                    <>
                                        <button
                                            className="file-manager-icon-button"
                                            onClick={() => handleRestoreEntry(entry)}
                                            title={t('widgets.file_manager.restore')}
                                        >
                                            {t('widgets.file_manager.restore')}
                                        </button>
                                        <button
                                            className="file-manager-icon-button danger"
                                            onClick={() => handleDeletePermanent(entry)}
                                            title={t('widgets.file_manager.delete_permanent')}
                                        >
                                            {t('widgets.file_manager.delete_permanent')}
                                        </button>
                                    </>
                                ) : (
                                    <button
                                        className="file-manager-icon-button danger"
                                        onClick={() => handleDeleteEntry(entry)}
                                        title={t('widgets.file_manager.move_to_trash')}
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                )}
                            </div>
                        </div>
                    ))
                )}
            </div>

            <input
                type="file"
                ref={fileInputRef}
                onChange={(event) => handleFilesSelected(event.target.files)}
                multiple
                className="hidden"
            />
            {contextMenu.isOpen && (
                <div
                    ref={contextMenuRef}
                    className="file-manager-context-menu"
                    style={{ left: contextMenu.x, top: contextMenu.y }}
                >
                    <button
                        className="file-manager-context-item"
                        onClick={() => {
                            setClipboard({ mode: 'copy', entryIds: selectedEntryIds });
                            setContextMenu((prev) => ({ ...prev, isOpen: false }));
                        }}
                        disabled={selectedEntryIds.length === 0}
                    >
                        <Copy size={14} />
                        {t('widgets.file_manager.copy')}
                    </button>
                    <button
                        className="file-manager-context-item"
                        onClick={() => {
                            setClipboard({ mode: 'cut', entryIds: selectedEntryIds });
                            setContextMenu((prev) => ({ ...prev, isOpen: false }));
                        }}
                        disabled={selectedEntryIds.length === 0}
                    >
                        <Scissors size={14} />
                        {t('widgets.file_manager.cut')}
                    </button>
                    <button
                        className="file-manager-context-item"
                        onClick={() => {
                            handlePaste(contextMenu.targetFolderId);
                            setContextMenu((prev) => ({ ...prev, isOpen: false }));
                        }}
                        disabled={!clipboard || clipboard.entryIds.length === 0}
                    >
                        <ClipboardPaste size={14} />
                        {t('widgets.file_manager.paste')}
                    </button>
                    <div className="file-manager-context-separator" />
                    <button
                        className="file-manager-context-item"
                        onClick={() => {
                            handleMoveSelectionToTrash();
                            setContextMenu((prev) => ({ ...prev, isOpen: false }));
                        }}
                        disabled={selectedEntryIds.length === 0}
                    >
                        <Trash2 size={14} className="text-gray-600" />
                        {t('widgets.file_manager.move_to_trash')}
                    </button>
                    <button
                        className="file-manager-context-item danger"
                        onClick={() => {
                            handleDeleteSelectionPermanent();
                            setContextMenu((prev) => ({ ...prev, isOpen: false }));
                        }}
                        disabled={selectedEntryIds.length === 0}
                    >
                        <XCircle size={14} />
                        {t('widgets.file_manager.delete_permanent')}
                    </button>
                </div>
            )}
        </div>
    );
};

const BreadcrumbTrail: FC<{
    breadcrumb: Promise<FileManagerEntry[]>;
    onNavigate: (id: string) => void;
    disabled?: boolean;
}> = ({ breadcrumb, onNavigate, disabled }) => {
    const [path, setPath] = useState<FileManagerEntry[]>([]);
    useEffect(() => {
        let mounted = true;
        breadcrumb.then((items) => {
            if (mounted) setPath(items);
        });
        return () => {
            mounted = false;
        };
    }, [breadcrumb]);

    if (path.length === 0) return null;

    return (
        <>
            {path.map((entry) => (
                <button
                    key={entry.id}
                    className="file-manager-breadcrumb"
                    onClick={() => onNavigate(entry.id)}
                    disabled={disabled}
                >
                    / {entry.name}
                </button>
            ))}
        </>
    );
};

export { widgetConfig } from './widgetConfig';
