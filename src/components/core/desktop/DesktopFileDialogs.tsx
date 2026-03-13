import { Home } from 'lucide-react';
import { FILE_MANAGER_ROOT_ID, type FileManagerEntry } from '../../../utils/fileManagerDb';
import type { OpenDialogResult } from '../../../utils/openDialog';
import type { SaveDialogResult } from '../../../utils/saveDialog';

type DesktopFileDialogsProps = {
    t: (key: string, options?: Record<string, unknown>) => string;
    saveDialogState: { isOpen: boolean; sourceWidgetId?: string };
    saveDialogFilterWidget: boolean;
    saveDialogFolderId: string;
    saveDialogFilename: string;
    saveDialogEntries: FileManagerEntry[];
    saveDialogSelectedEntryId: string | null;
    saveDialogBreadcrumb: FileManagerEntry[];
    saveDialogWidgetLabel: string;
    openDialogState: { isOpen: boolean; options: { accept?: string; multiple?: boolean; sourceWidgetId?: string } };
    openDialogFilterWidget: boolean;
    openDialogEntries: FileManagerEntry[];
    openDialogSelectedIds: string[];
    openDialogBreadcrumb: FileManagerEntry[];
    openDialogWidgetLabel: string;
    openDialogInputRef: React.RefObject<HTMLInputElement | null>;
    renderDialogEntryIcon: (entry: FileManagerEntry) => React.ReactNode;
    formatFileSize: (size?: number) => string;
    normalizeFilename: (name: string) => string;
    getSaveDialogFilename: () => string;
    setSaveDialogFilterWidget: (value: boolean) => void;
    setSaveDialogFolderId: (value: string) => void;
    setSaveDialogFilename: (value: string) => void;
    setSaveDialogSelectedEntryId: (value: string | null) => void;
    setOpenDialogFilterWidget: (value: boolean) => void;
    setOpenDialogFolderId: (value: string) => void;
    setOpenDialogSelectedIds: React.Dispatch<React.SetStateAction<string[]>>;
    closeSaveDialog: (result: SaveDialogResult) => void;
    closeOpenDialog: (result: OpenDialogResult | null) => void;
    onCreateFolder: (parentId: string) => Promise<void>;
};

export function DesktopFileDialogs({
    t,
    saveDialogState,
    saveDialogFilterWidget,
    saveDialogFolderId,
    saveDialogFilename,
    saveDialogEntries,
    saveDialogSelectedEntryId,
    saveDialogBreadcrumb,
    saveDialogWidgetLabel,
    openDialogState,
    openDialogFilterWidget,
    openDialogEntries,
    openDialogSelectedIds,
    openDialogBreadcrumb,
    openDialogWidgetLabel,
    openDialogInputRef,
    renderDialogEntryIcon,
    formatFileSize,
    normalizeFilename,
    getSaveDialogFilename,
    setSaveDialogFilterWidget,
    setSaveDialogFolderId,
    setSaveDialogFilename,
    setSaveDialogSelectedEntryId,
    setOpenDialogFilterWidget,
    setOpenDialogFolderId,
    setOpenDialogSelectedIds,
    closeSaveDialog,
    closeOpenDialog,
    onCreateFolder,
}: DesktopFileDialogsProps) {
    return (
        <>
            {saveDialogState.isOpen && (
                <div
                    className="fixed inset-0 z-[10002] flex items-center justify-center bg-black/60"
                    onClick={() => closeSaveDialog(null)}
                >
                    <div
                        className="w-full max-w-md rounded-2xl border border-gray-200 bg-white px-6 py-5 text-text-dark shadow-2xl"
                        onClick={(event) => event.stopPropagation()}
                        role="dialog"
                        aria-modal="true"
                    >
                        <h3 className="text-lg font-semibold">{t('save_dialog.title')}</h3>
                        <p className="mt-2 text-sm text-gray-600">{t('save_dialog.description')}</p>
                        <div className="mt-4 rounded-xl border border-gray-200 bg-gray-50/80 p-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <div className="text-sm font-semibold text-gray-700">{t('save_dialog.file_manager')}</div>
                                    <div className="mt-1 flex flex-wrap items-center gap-1 text-xs text-gray-600">
                                        <button
                                            type="button"
                                            className="inline-flex items-center gap-1 rounded-full border border-gray-200 bg-white/90 px-2 py-1 hover:bg-white"
                                            onClick={() => setSaveDialogFolderId(FILE_MANAGER_ROOT_ID)}
                                            title={t('open_dialog.root_folder')}
                                            aria-label={t('open_dialog.root_folder')}
                                        >
                                            <Home size={12} />
                                        </button>
                                        {saveDialogBreadcrumb.map((entry) => (
                                            <button
                                                key={entry.id}
                                                type="button"
                                                className="inline-flex items-center gap-1 rounded-full border border-gray-200 bg-white/90 px-2 py-1 hover:bg-white"
                                                onClick={() => setSaveDialogFolderId(entry.id)}
                                                title={entry.name}
                                            >
                                                <span className="truncate">{entry.name}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    className="rounded-full border border-gray-300 bg-white px-3 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-100"
                                    onClick={() => void onCreateFolder(saveDialogFolderId)}
                                >
                                    {t('save_dialog.new_folder')}
                                </button>
                            </div>
                            <div className="mt-3 max-h-48 overflow-y-auto rounded-lg border border-gray-200 bg-white p-2">
                                {saveDialogEntries.length === 0 ? (
                                    <div className="text-xs text-gray-500">{t('save_dialog.no_files')}</div>
                                ) : (
                                    <ul className="space-y-1">
                                        {saveDialogEntries.map((entry) => {
                                            const isSelected = saveDialogSelectedEntryId === entry.id;
                                            return (
                                                <li key={entry.id}>
                                                    <button
                                                        type="button"
                                                        className={`flex w-full items-center justify-between rounded-md px-2 py-1 text-left text-sm transition ${
                                                            isSelected ? 'bg-accent/25 ring-1 ring-accent/40' : 'hover:bg-gray-100'
                                                        }`}
                                                        onClick={() => {
                                                            setSaveDialogSelectedEntryId(entry.id);
                                                            if (entry.type === 'folder') {
                                                                setSaveDialogFolderId(entry.id);
                                                                return;
                                                            }
                                                            setSaveDialogFilename(entry.name);
                                                        }}
                                                        title={entry.name}
                                                    >
                                                        <span className="flex min-w-0 items-center gap-2">
                                                            {renderDialogEntryIcon(entry)}
                                                            <span className="truncate">{entry.name}</span>
                                                        </span>
                                                        {entry.type === 'file' ? (
                                                            <span className="text-xs text-gray-400">
                                                                {formatFileSize(entry.size)}
                                                            </span>
                                                        ) : null}
                                                    </button>
                                                </li>
                                            );
                                        })}
                                    </ul>
                                )}
                            </div>
                        </div>
                        {saveDialogState.sourceWidgetId && (
                            <label className="mt-3 flex items-center gap-2 text-xs text-gray-600">
                                <input
                                    type="checkbox"
                                    checked={saveDialogFilterWidget}
                                    onChange={(event) => setSaveDialogFilterWidget(event.target.checked)}
                                    className="h-3.5 w-3.5"
                                />
                                {t('save_dialog.filter_widget', { widget: saveDialogWidgetLabel || saveDialogState.sourceWidgetId })}
                            </label>
                        )}
                        <div className="mt-4">
                            <label className="text-sm font-semibold text-gray-700" htmlFor="save-filename-input">
                                {t('save_dialog.filename_label')}
                            </label>
                            <input
                                id="save-filename-input"
                                type="text"
                                className="mt-2 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-gray-400 focus:outline-none"
                                value={saveDialogFilename}
                                onChange={(event) => setSaveDialogFilename(event.target.value)}
                                onBlur={() => {
                                    const normalized = normalizeFilename(saveDialogFilename);
                                    if (normalized && normalized !== saveDialogFilename) {
                                        setSaveDialogFilename(normalized);
                                    }
                                }}
                            />
                            <p className="mt-2 text-xs text-gray-500">{t('save_dialog.replace_hint')}</p>
                        </div>
                        <div className="mt-6 flex flex-wrap justify-end gap-2">
                            <button
                                type="button"
                                className="rounded-full border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-100"
                                onClick={() => closeSaveDialog(null)}
                            >
                                {t('save_dialog.cancel')}
                            </button>
                            <button
                                type="button"
                                className="rounded-full border border-gray-300 bg-gray-100 px-4 py-2 text-sm font-semibold text-gray-800 hover:bg-gray-200"
                                onClick={() => closeSaveDialog({ destination: 'download', filename: getSaveDialogFilename() })}
                            >
                                {t('save_dialog.save_in_device')}
                            </button>
                            <button
                                type="button"
                                className="rounded-full bg-accent px-4 py-2 text-sm font-semibold text-text-dark shadow-sm hover:opacity-90"
                                onClick={() => closeSaveDialog({
                                    destination: 'file-manager',
                                    parentId: saveDialogFolderId,
                                    filename: getSaveDialogFilename(),
                                })}
                            >
                                {t('save_dialog.save_in_manager')}
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {openDialogState.isOpen && (
                <div
                    className="fixed inset-0 z-[10002] flex items-center justify-center bg-black/60"
                    onClick={() => closeOpenDialog(null)}
                >
                    <div
                        className="w-full max-w-3xl rounded-2xl border border-gray-200 bg-white px-6 py-5 text-text-dark shadow-2xl"
                        onClick={(event) => event.stopPropagation()}
                        role="dialog"
                        aria-modal="true"
                    >
                        <h3 className="text-lg font-semibold">{t('open_dialog.title')}</h3>
                        <p className="mt-2 text-sm text-gray-600">{t('open_dialog.description')}</p>
                        <div className="mt-4 grid gap-4 md:grid-cols-[2fr_1fr]">
                            <div className="space-y-3">
                                <div className="rounded-xl border border-gray-200 bg-gray-50/80 p-4">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <div className="text-sm font-semibold text-gray-700">{t('open_dialog.file_manager')}</div>
                                            <div className="mt-1 flex flex-wrap items-center gap-1 text-xs text-gray-600">
                                                <button
                                                    type="button"
                                                    className="inline-flex items-center gap-1 rounded-full border border-gray-200 bg-white/90 px-2 py-1 hover:bg-white"
                                                    onClick={() => setOpenDialogFolderId(FILE_MANAGER_ROOT_ID)}
                                                    title={t('open_dialog.root_folder')}
                                                    aria-label={t('open_dialog.root_folder')}
                                                >
                                                    <Home size={12} />
                                                </button>
                                                {openDialogBreadcrumb.map((entry) => (
                                                    <button
                                                        key={entry.id}
                                                        type="button"
                                                        className="inline-flex items-center gap-1 rounded-full border border-gray-200 bg-white/90 px-2 py-1 hover:bg-white"
                                                        onClick={() => setOpenDialogFolderId(entry.id)}
                                                        title={entry.name}
                                                    >
                                                        <span className="truncate">{entry.name}</span>
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="mt-3 max-h-64 overflow-y-auto rounded-lg border border-gray-200 bg-white p-2">
                                        {openDialogEntries.length === 0 ? (
                                            <div className="text-sm text-gray-500">{t('open_dialog.empty_folder')}</div>
                                        ) : (
                                            <ul className="space-y-2">
                                                {openDialogEntries.map((entry) => {
                                                    const isSelected = openDialogSelectedIds.includes(entry.id);
                                                    return (
                                                        <li key={entry.id}>
                                                            <button
                                                                type="button"
                                                                className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition ${
                                                                    isSelected ? 'bg-accent/30 ring-1 ring-accent/50' : 'hover:bg-gray-100'
                                                                }`}
                                                                onClick={() => {
                                                                    if (entry.type === 'folder') {
                                                                        setOpenDialogFolderId(entry.id);
                                                                        return;
                                                                    }
                                                                    if (openDialogState.options.multiple) {
                                                                        setOpenDialogSelectedIds((prev) =>
                                                                            prev.includes(entry.id)
                                                                                ? prev.filter((id) => id !== entry.id)
                                                                                : [...prev, entry.id]
                                                                        );
                                                                    } else {
                                                                        setOpenDialogSelectedIds([entry.id]);
                                                                    }
                                                                }}
                                                                onDoubleClick={() => {
                                                                    if (entry.type === 'folder') {
                                                                        setOpenDialogFolderId(entry.id);
                                                                        return;
                                                                    }
                                                                    closeOpenDialog({ source: 'file-manager', entryIds: [entry.id] });
                                                                }}
                                                            >
                                                                <span className="flex min-w-0 items-center gap-2">
                                                                    {renderDialogEntryIcon(entry)}
                                                                    <span className="truncate">{entry.name}</span>
                                                                </span>
                                                                {entry.type === 'file' && (
                                                                    <span className="text-xs text-gray-400">
                                                                        {formatFileSize(entry.size)}
                                                                    </span>
                                                                )}
                                                            </button>
                                                        </li>
                                                    );
                                                })}
                                            </ul>
                                        )}
                                    </div>
                                </div>
                                {openDialogState.options.sourceWidgetId && (
                                    <label className="flex items-center gap-2 text-xs text-gray-600">
                                        <input
                                            type="checkbox"
                                            checked={openDialogFilterWidget}
                                            onChange={(event) => setOpenDialogFilterWidget(event.target.checked)}
                                            className="h-3.5 w-3.5"
                                        />
                                        {t('open_dialog.filter_widget', { widget: openDialogWidgetLabel || openDialogState.options.sourceWidgetId })}
                                    </label>
                                )}
                            </div>
                            <div className="rounded-xl border border-gray-200 bg-gray-50/80 p-4">
                                <div className="text-sm font-semibold text-gray-700">{t('open_dialog.local')}</div>
                                <p className="mt-2 text-xs text-gray-500">{t('open_dialog.local_hint')}</p>
                                <button
                                    type="button"
                                    className="mt-4 w-full rounded-full border border-gray-300 bg-gray-100 px-3 py-2 text-sm font-semibold text-gray-800 hover:bg-gray-200"
                                    onClick={() => openDialogInputRef.current?.click()}
                                >
                                    {t('open_dialog.choose_local')}
                                </button>
                                <input
                                    ref={openDialogInputRef}
                                    type="file"
                                    className="hidden"
                                    accept={openDialogState.options.accept}
                                    multiple={openDialogState.options.multiple}
                                    onChange={(event) => {
                                        const files = event.target.files ? Array.from(event.target.files) : [];
                                        event.target.value = '';
                                        if (files.length === 0) return;
                                        closeOpenDialog({ source: 'local', files });
                                    }}
                                />
                            </div>
                        </div>
                        <div className="mt-6 flex flex-wrap justify-end gap-2">
                            <button
                                type="button"
                                className="rounded-full border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-100"
                                onClick={() => closeOpenDialog(null)}
                            >
                                {t('open_dialog.cancel')}
                            </button>
                            <button
                                type="button"
                                className="rounded-full bg-accent px-4 py-2 text-sm font-semibold text-text-dark shadow-sm hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                                onClick={() => closeOpenDialog({ source: 'file-manager', entryIds: openDialogSelectedIds })}
                                disabled={openDialogSelectedIds.length === 0}
                            >
                                {openDialogState.options.multiple ? t('open_dialog.open_selected') : t('open_dialog.open_file')}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
