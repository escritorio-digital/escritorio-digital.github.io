import { FolderOpen, Image, Maximize2, Minimize2, Pin, PinOff, PlusSquare, Settings, Users, X } from 'lucide-react';
import type { ActiveWidget } from '../../../types';
import type { DesktopContextMenuState } from '../../../hooks/desktop/useDesktopContextMenu';

type DesktopContextMenuProps = {
    contextMenu: DesktopContextMenuState;
    contextMenuRef: React.RefObject<HTMLDivElement | null>;
    contextWindow: ActiveWidget | null;
    contextWidgetId: string | null;
    contextIsPinned: boolean;
    showFavoriteAction: boolean;
    showWindowActions: boolean;
    hasOpenWidgets: boolean;
    isToolbarHidden: boolean;
    showDateTime: boolean;
    showSystemStats: boolean;
    showProfileMenu: boolean;
    t: (key: string) => string;
    setContextMenu: React.Dispatch<React.SetStateAction<DesktopContextMenuState>>;
    setPinnedWidgets: React.Dispatch<React.SetStateAction<string[]>>;
    setToolbarHidden: React.Dispatch<React.SetStateAction<boolean>>;
    onOpenFileManager: () => void;
    onOpenSettingsTab: (tab: 'general' | 'profiles' | 'widgets' | 'theme') => void;
    onToggleMinimize: (instanceId: string) => void;
    onToggleMaximize: (instanceId: string) => void;
    onRequestCloseWidget: (instanceId: string) => void;
    onToggleDateTime: () => void;
    onToggleSystemStats: () => void;
    onToggleProfileMenu: () => void;
    onMinimizeAllWindows: () => void;
    onResetLayout: () => void;
};

export function DesktopContextMenu({
    contextMenu,
    contextMenuRef,
    contextWindow,
    contextWidgetId,
    contextIsPinned,
    showFavoriteAction,
    showWindowActions,
    hasOpenWidgets,
    isToolbarHidden,
    showDateTime,
    showSystemStats,
    showProfileMenu,
    t,
    setContextMenu,
    setPinnedWidgets,
    setToolbarHidden,
    onOpenFileManager,
    onOpenSettingsTab,
    onToggleMinimize,
    onToggleMaximize,
    onRequestCloseWidget,
    onToggleDateTime,
    onToggleSystemStats,
    onToggleProfileMenu,
    onMinimizeAllWindows,
    onResetLayout,
}: DesktopContextMenuProps) {
    if (!contextMenu.isOpen) return null;

    return (
        <div
            ref={contextMenuRef}
            className="fixed z-[10000] min-w-[220px] bg-white/95 backdrop-blur-md rounded-lg shadow-xl border border-gray-200 py-2 text-sm text-text-dark"
            style={{ left: contextMenu.x, top: contextMenu.y }}
        >
            {contextMenu.source === 'file-manager-icon' ? (
                <button
                    className="w-full text-left px-4 py-2 hover:bg-gray-100 flex items-center gap-2"
                    onClick={() => {
                        onOpenFileManager();
                        setContextMenu((prev) => ({ ...prev, isOpen: false, widgetId: null, windowInstanceId: null }));
                    }}
                >
                    <FolderOpen size={16} />
                    {t('context_menu.open')}
                </button>
            ) : contextMenu.windowInstanceId && contextWindow ? (
                <>
                    {showFavoriteAction && (
                        <button
                            className="w-full text-left px-4 py-2 hover:bg-gray-100 flex items-center gap-2"
                            onClick={() => {
                                if (!contextWidgetId) return;
                                if (contextIsPinned) {
                                    setPinnedWidgets((prev) => prev.filter((id) => id !== contextWidgetId));
                                } else {
                                    setPinnedWidgets((prev) => (prev.includes(contextWidgetId) ? prev : [...prev, contextWidgetId]));
                                }
                                setContextMenu((prev) => ({ ...prev, isOpen: false, widgetId: null, windowInstanceId: null }));
                            }}
                        >
                            {contextIsPinned ? <PinOff size={16} /> : <Pin size={16} />}
                            {contextIsPinned ? t('toolbar.remove_widget') : t('toolbar.add_widget')}
                        </button>
                    )}
                    <button
                        className="w-full text-left px-4 py-2 hover:bg-gray-100 flex items-center gap-2"
                        onClick={() => {
                            onToggleMinimize(contextWindow.instanceId);
                            setContextMenu((prev) => ({ ...prev, isOpen: false, windowInstanceId: null }));
                        }}
                    >
                        <Minimize2 size={16} />
                        {t('context_menu.minimize_window')}
                    </button>
                    <button
                        className="w-full text-left px-4 py-2 hover:bg-gray-100 flex items-center gap-2"
                        onClick={() => {
                            onToggleMaximize(contextWindow.instanceId);
                            setContextMenu((prev) => ({ ...prev, isOpen: false, windowInstanceId: null }));
                        }}
                    >
                        {contextWindow.isMaximized ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
                        {contextWindow.isMaximized ? t('context_menu.restore_window') : t('context_menu.maximize_window')}
                    </button>
                    <button
                        className="w-full text-left px-4 py-2 hover:bg-gray-100 flex items-center gap-2"
                        onClick={() => {
                            onRequestCloseWidget(contextWindow.instanceId);
                            setContextMenu((prev) => ({ ...prev, isOpen: false, windowInstanceId: null }));
                        }}
                    >
                        <X size={16} />
                        {t('context_menu.close_window')}
                    </button>
                </>
            ) : (
                <>
                    {showFavoriteAction && (
                        <button
                            className="w-full text-left px-4 py-2 hover:bg-gray-100 flex items-center gap-2"
                            onClick={() => {
                                if (!contextWidgetId) return;
                                if (contextIsPinned) {
                                    setPinnedWidgets((prev) => prev.filter((id) => id !== contextWidgetId));
                                } else {
                                    setPinnedWidgets((prev) => (prev.includes(contextWidgetId) ? prev : [...prev, contextWidgetId]));
                                }
                                setContextMenu((prev) => ({ ...prev, isOpen: false, widgetId: null, windowInstanceId: null }));
                            }}
                        >
                            {contextIsPinned ? <PinOff size={16} /> : <Pin size={16} />}
                            {contextIsPinned ? t('toolbar.remove_widget') : t('toolbar.add_widget')}
                        </button>
                    )}
                    <button
                        className="w-full text-left px-4 py-2 hover:bg-gray-100 flex items-center gap-2"
                        onClick={() => onOpenSettingsTab('widgets')}
                    >
                        <PlusSquare size={16} />
                        {t('context_menu.new_widget')}
                    </button>
                    {showWindowActions && <div className="my-1 border-t border-gray-200" />}
                    <button
                        className="w-full text-left px-4 py-2 hover:bg-gray-100 flex items-center gap-2"
                        onClick={() => onOpenSettingsTab('profiles')}
                    >
                        <Users size={16} />
                        {t('context_menu.manage_profiles')}
                    </button>
                    <button
                        className="w-full text-left px-4 py-2 hover:bg-gray-100 flex items-center gap-2"
                        onClick={() => onOpenSettingsTab('general')}
                    >
                        <Settings size={16} />
                        {t('context_menu.settings')}
                    </button>
                    <button
                        className="w-full text-left px-4 py-2 hover:bg-gray-100 flex items-center gap-2"
                        onClick={() => onOpenSettingsTab('theme')}
                    >
                        <Image size={16} />
                        {t('context_menu.change_background')}
                    </button>
                    <div className="my-1 border-t border-gray-200" />
                    <button
                        className="w-full text-left px-4 py-2 hover:bg-gray-100 flex items-center justify-between gap-3"
                        onClick={() => {
                            setToolbarHidden(!isToolbarHidden);
                            setContextMenu((prev) => ({ ...prev, isOpen: false }));
                        }}
                    >
                        <span>{isToolbarHidden ? t('context_menu.show_toolbar') : t('context_menu.hide_toolbar')}</span>
                        <span className={`h-4 w-4 rounded border ${!isToolbarHidden ? 'bg-accent border-accent' : 'border-gray-400'}`} />
                    </button>
                    <button
                        className="w-full text-left px-4 py-2 hover:bg-gray-100 flex items-center justify-between gap-3"
                        onClick={() => {
                            onToggleDateTime();
                            setContextMenu((prev) => ({ ...prev, isOpen: false }));
                        }}
                    >
                        <span>{showDateTime ? t('context_menu.hide_datetime') : t('context_menu.show_datetime')}</span>
                        <span className={`h-4 w-4 rounded border ${showDateTime ? 'bg-accent border-accent' : 'border-gray-400'}`} />
                    </button>
                    <button
                        className="w-full text-left px-4 py-2 hover:bg-gray-100 flex items-center justify-between gap-3"
                        onClick={() => {
                            onToggleSystemStats();
                            setContextMenu((prev) => ({ ...prev, isOpen: false }));
                        }}
                    >
                        <span>{showSystemStats ? t('context_menu.hide_system_stats') : t('context_menu.show_system_stats')}</span>
                        <span className={`h-4 w-4 rounded border ${showSystemStats ? 'bg-accent border-accent' : 'border-gray-400'}`} />
                    </button>
                    <button
                        className="w-full text-left px-4 py-2 hover:bg-gray-100 flex items-center justify-between gap-3"
                        onClick={() => {
                            onToggleProfileMenu();
                            setContextMenu((prev) => ({ ...prev, isOpen: false }));
                        }}
                    >
                        <span>{showProfileMenu ? t('context_menu.hide_profile_menu') : t('context_menu.show_profile_menu')}</span>
                        <span className={`h-4 w-4 rounded border ${showProfileMenu ? 'bg-accent border-accent' : 'border-gray-400'}`} />
                    </button>
                    {hasOpenWidgets && (
                        <>
                            <div className="my-1 border-t border-gray-200" />
                            <button
                                className="w-full text-left px-4 py-2 hover:bg-gray-100 flex items-center gap-2"
                                onClick={() => {
                                    onMinimizeAllWindows();
                                    setContextMenu((prev) => ({ ...prev, isOpen: false }));
                                }}
                            >
                                <Minimize2 size={16} />
                                {t('context_menu.minimize_windows')}
                            </button>
                            {contextMenu.windowInstanceId && (
                                <button
                                    className="w-full text-left px-4 py-2 hover:bg-gray-100 flex items-center gap-2"
                                    onClick={() => {
                                        onRequestCloseWidget(contextMenu.windowInstanceId as string);
                                        setContextMenu((prev) => ({ ...prev, isOpen: false, windowInstanceId: null }));
                                    }}
                                >
                                    <X size={16} />
                                    {t('context_menu.close_window')}
                                </button>
                            )}
                            <button
                                className="w-full text-left px-4 py-2 hover:bg-gray-100 flex items-center gap-2"
                                onClick={onResetLayout}
                            >
                                <X size={16} />
                                {t('context_menu.reset_layout')}
                            </button>
                        </>
                    )}
                </>
            )}
        </div>
    );
}
