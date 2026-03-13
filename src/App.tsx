// src/App.tsx

import { Suspense, lazy, useState, useEffect, useRef, useCallback, cloneElement, isValidElement } from 'react';
import { useTranslation } from 'react-i18next';
import { Rnd } from 'react-rnd';
import { WIDGET_REGISTRY } from './components/widgets';
import { useLocalStorage } from './hooks/useLocalStorage';
import { WidgetWindow } from './components/core/WidgetWindow';
import { Toolbar } from './components/core/Toolbar';
import { DesktopContextMenu } from './components/core/desktop/DesktopContextMenu';
import { DesktopFileDialogs } from './components/core/desktop/DesktopFileDialogs';
import { DesktopStatusOverlays } from './components/core/desktop/DesktopStatusOverlays';
import { DesktopUnsavedChangesModal } from './components/core/desktop/DesktopUnsavedChangesModal';
import { StartMenu } from './components/core/StartMenu';
import { ThemeProvider, defaultTheme, type Theme } from './context/ThemeContext';
import type { ActiveWidget, DesktopProfile, ProfileCollection } from './types';
import { Image, Folder, File, Music, Film } from 'lucide-react';
import { defaultWallpaperValue, isWallpaperValueValid } from './utils/wallpapers';
import { withBaseUrl } from './utils/assetPaths';
import { getWidgetHelpText } from './utils/widgetHelp';
import { createFolder, type FileManagerEntry } from './repositories/fileManagerRepository';
import { updateStoredAlarms } from './utils/alarmStore';
import { notifyActiveProfileChange, notifyProfilesUpdated, onDesktopEvent } from './utils/desktopEvents';
import { useDesktopAlarms } from './hooks/desktop/useDesktopAlarms';
import { useDesktopContextMenu } from './hooks/desktop/useDesktopContextMenu';
import { useDesktopDialogs } from './hooks/desktop/useDesktopDialogs';
import { useDesktopSystem } from './hooks/desktop/useDesktopSystem';
import { useDesktopWindows } from './hooks/desktop/useDesktopWindows';
// --- ¡AQUÍ ESTÁ EL CAMBIO! Importamos el nuevo componente ---
import { ProfileSwitcher } from './components/core/ProfileSwitcher';

const SettingsModal = lazy(async () => import('./components/core/SettingsModal').then((mod) => ({ default: mod.SettingsModal })));
const CreditsModal = lazy(async () => import('./components/core/CreditsModal').then((mod) => ({ default: mod.CreditsModal })));
const AboutModal = lazy(async () => import('./components/core/AboutModal').then((mod) => ({ default: mod.AboutModal })));

const formatFileSize = (size?: number) => {
    if (size === undefined || size === null) return '';
    if (size < 1024) return `${size} B`;
    const units = ['KB', 'MB', 'GB', 'TB'];
    let value = size / 1024;
    let unitIndex = 0;
    while (value >= 1024 && unitIndex < units.length - 1) {
        value /= 1024;
        unitIndex += 1;
    }
    const rounded = value >= 10 ? Math.round(value) : Math.round(value * 10) / 10;
    return `${rounded} ${units[unitIndex]}`;
};

const formatRemainingTime = (ms: number): string => {
    const totalSeconds = Math.max(0, Math.floor(ms / 1000));
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    if (hours > 0) {
        return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    }
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
};

const POPUP_WIDGET_IDS = new Set([
    'directo-vota',
    'directo-escala',
    'directo-nube',
    'directo-ideas',
    'directo-muro',
    'directo-ticket',
    'qplay',
    'scientific-calculator',
    'calendar',
    'unit-converter',
    'attendance',
    'work-list',
    'stopwatch',
    'metronome',
    'global-clocks',
    'boardlive',
    'wikipedia-search',
    'scoreboard',
    'random-spinner',
    'traffic-light',
    'memory-game',
    'sliding-puzzle',
    'tic-tac-toe',
    'alarm',
    'alarm-display',
]);

// --- Componente Hijo que Renderiza la UI ---
const DesktopUI: React.FC<{
    profiles: ProfileCollection;
    setProfiles: React.Dispatch<React.SetStateAction<ProfileCollection>>;
    activeProfileName: string;
    setActiveProfileName: (name: string) => void;
    profileOrder: string[];
    setProfileOrder: React.Dispatch<React.SetStateAction<string[]>>;
}> = ({ profiles, setProfiles, activeProfileName, setActiveProfileName, profileOrder, setProfileOrder }) => {
    const { t, i18n } = useTranslation();
    const activeProfile = profiles[activeProfileName] || Object.values(profiles)[0];
    const showDateTime = activeProfile.theme?.showDateTime ?? true;
    const showSystemStats = activeProfile.theme?.showSystemStats ?? false;
    const showProfileMenu = activeProfile.theme?.showProfileMenu ?? true;
    const getWidgetLabel = useCallback((widgetId?: string) => {
        if (!widgetId) return '';
        const config = WIDGET_REGISTRY[widgetId];
        return config ? t(config.title) : widgetId;
    }, [t]);

    const setActiveWidgets = useCallback((updater: React.SetStateAction<ActiveWidget[]>) => {
        setProfiles((prev) => {
            const profile = prev[activeProfileName] || activeProfile;
            if (!profile) return prev;
            const nextWidgets = typeof updater === 'function' ? updater(profile.activeWidgets) : updater;
            if (nextWidgets === profile.activeWidgets) return prev;
            return {
                ...prev,
                [activeProfileName]: { ...profile, activeWidgets: nextWidgets },
            };
        });
    }, [activeProfile, activeProfileName, setProfiles]);

    const setPinnedWidgets = useCallback((updater: React.SetStateAction<string[]>) => {
        setProfiles((prev) => {
            const profile = prev[activeProfileName] || activeProfile;
            if (!profile) return prev;
            const nextPinned = typeof updater === 'function' ? updater(profile.pinnedWidgets) : updater;
            if (nextPinned === profile.pinnedWidgets) return prev;
            return {
                ...prev,
                [activeProfileName]: { ...profile, pinnedWidgets: nextPinned },
            };
        });
    }, [activeProfile, activeProfileName, setProfiles]);

    const renderDialogEntryIcon = useCallback((entry: FileManagerEntry) => {
        if (entry.type === 'folder') {
            return <Folder size={16} className="text-gray-500" />;
        }
        const widgetConfig = entry.sourceWidgetId ? WIDGET_REGISTRY[entry.sourceWidgetId] : undefined;
        if (widgetConfig?.icon) {
            if (typeof widgetConfig.icon === 'string') {
                return <img src={withBaseUrl(widgetConfig.icon)} alt="" className="h-4 w-4" />;
            }
            if (isValidElement(widgetConfig.icon)) {
                const existingClassName = (widgetConfig.icon.props as { className?: string }).className ?? '';
                const className = `${existingClassName} h-4 w-4`.trim();
                const prevStyle = (widgetConfig.icon.props as { style?: Record<string, number | string> }).style;
                const nextProps = {
                    className,
                    width: 16,
                    height: 16,
                    style: { ...(prevStyle ?? {}), width: 16, height: 16 },
                };
                return cloneElement(widgetConfig.icon, nextProps);
            }
            return <span className="h-4 w-4">{widgetConfig.icon}</span>;
        }
        if (entry.mime?.startsWith('image/')) return <Image size={16} className="text-gray-500" />;
        if (entry.mime?.startsWith('audio/')) return <Music size={16} className="text-gray-500" />;
        if (entry.mime?.startsWith('video/')) return <Film size={16} className="text-gray-500" />;
        return <File size={16} className="text-gray-500" />;
    }, []);

    const saveWidgetSettings = useCallback((widgetId: string, settings: { zoom: number; toolbarPinned: boolean }) => {
        setProfiles((prev) => {
            const profile = prev[activeProfileName] || activeProfile;
            if (!profile) return prev;
            const nextPreferences = {
                ...(profile.widgetPreferences ?? {}),
                [widgetId]: {
                    ...profile.widgetPreferences?.[widgetId],
                    ...settings,
                },
            };
            const nextWidgets = profile.activeWidgets.map((w) =>
                w.widgetId === widgetId ? { ...w, zoom: settings.zoom, toolbarPinned: settings.toolbarPinned } : w
            );
            return {
                ...prev,
                [activeProfileName]: { ...profile, widgetPreferences: nextPreferences, activeWidgets: nextWidgets },
            };
        });
    }, [activeProfile, activeProfileName, setProfiles]);

    const toggleWidgetFloating = useCallback((instanceId: string, enable?: boolean) => {
        setProfiles((prev) => {
            const profile = prev[activeProfileName] || activeProfile;
            if (!profile) return prev;
            const target = profile.activeWidgets.find((widget) => widget.instanceId === instanceId);
            if (!target) return prev;
            const nextEnable = typeof enable === 'boolean' ? enable : target.windowStyleOverride !== 'floating';
            const nextWidgets = profile.activeWidgets.map((widget) => {
                if (widget.instanceId !== instanceId) return widget;
                let nextWidget = { ...widget, windowStyleOverride: nextEnable ? ('floating' as const) : undefined };
                if (nextEnable && widget.isMaximized) {
                    nextWidget = {
                        ...nextWidget,
                        isMaximized: false,
                        position: widget.previousPosition ?? widget.position,
                        size: widget.previousSize ?? widget.size,
                    };
                }
                return nextWidget;
            });
            const nextPreferences = {
                ...(profile.widgetPreferences ?? {}),
                [target.widgetId]: {
                    ...profile.widgetPreferences?.[target.widgetId],
                    floating: nextEnable,
                },
            };
            return {
                ...prev,
                [activeProfileName]: { ...profile, activeWidgets: nextWidgets, widgetPreferences: nextPreferences },
            };
        });
    }, [activeProfile, activeProfileName, setProfiles]);

    const toggleDateTime = useCallback(() => {
        const nextShowDateTime = !showDateTime;
        const newProfileData: DesktopProfile = {
            ...activeProfile,
            theme: { ...activeProfile.theme, showDateTime: nextShowDateTime },
        };
        setProfiles(prev => ({ ...prev, [activeProfileName]: newProfileData }));
    }, [activeProfile, activeProfileName, setProfiles, showDateTime]);

    const toggleSystemStats = useCallback(() => {
        const nextShowSystemStats = !showSystemStats;
        const newProfileData: DesktopProfile = {
            ...activeProfile,
            theme: { ...activeProfile.theme, showSystemStats: nextShowSystemStats },
        };
        setProfiles(prev => ({ ...prev, [activeProfileName]: newProfileData }));
    }, [activeProfile, activeProfileName, setProfiles, showSystemStats]);

    const toggleProfileMenu = useCallback(() => {
        const nextShowProfileMenu = !showProfileMenu;
        const newProfileData: DesktopProfile = {
            ...activeProfile,
            theme: { ...activeProfile.theme, showProfileMenu: nextShowProfileMenu },
        };
        setProfiles(prev => ({ ...prev, [activeProfileName]: newProfileData }));
    }, [activeProfile, activeProfileName, setProfiles, showProfileMenu]);

    const [isSettingsOpen, setSettingsOpen] = useState(false);
    const [isCreditsOpen, setIsCreditsOpen] = useState(false);
    const [isAboutOpen, setIsAboutOpen] = useState(false);
    const [themeModalRequestId, setThemeModalRequestId] = useState(0);
    const startButtonRef = useRef<HTMLButtonElement>(null);
    const [isStartMenuOpen, setIsStartMenuOpen] = useState(false);
    const [startMenuAnchor, setStartMenuAnchor] = useState<DOMRect | null>(null);
    const [settingsInitialTab, setSettingsInitialTab] = useState<'general' | 'profiles' | 'widgets' | 'theme'>('general');
    const [isToolbarHidden, setToolbarHidden] = useLocalStorage<boolean>('toolbar-hidden', false);
    const [isToolbarPeek, setToolbarPeek] = useState(false);
    const [fileManagerIconPosition, setFileManagerIconPosition] = useLocalStorage<{ x: number; y: number }>(
        'file-manager-icon-position',
        { x: 16, y: 32 }
    );
    const fileManagerIconSize = { width: 120, height: 110 };
    const [isFileManagerIconSelected, setFileManagerIconSelected] = useState(false);
    const fileManagerIconRef = useRef<HTMLDivElement>(null);
    const fileManagerPressTimerRef = useRef<number | null>(null);
    const fileManagerPressStartRef = useRef<{ x: number; y: number } | null>(null);
    const fileManagerLongPressTriggeredRef = useRef(false);
    const { alarmItems, activeAlarmAlerts } = useDesktopAlarms();
    const {
        saveDialogState,
        saveDialogFilterWidget,
        saveDialogFolderId,
        saveDialogFilename,
        saveDialogEntries,
        saveDialogSelectedEntryId,
        saveDialogBreadcrumb,
        openDialogState,
        openDialogFilterWidget,
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
    } = useDesktopDialogs({ t });
    const openDialogWidgetLabel = getWidgetLabel(openDialogState.options.sourceWidgetId);
    const saveDialogWidgetLabel = getWidgetLabel(saveDialogState.sourceWidgetId);

    useEffect(() => {
        if (fileManagerIconPosition.y >= 32) return;
        setFileManagerIconPosition((prev) => ({ ...prev, y: 32 }));
    }, [fileManagerIconPosition.y, setFileManagerIconPosition]);

    useEffect(() => {
        const handlePointerDown = (event: MouseEvent) => {
            if (!fileManagerIconRef.current) return;
            if (fileManagerIconRef.current.contains(event.target as Node)) return;
            setFileManagerIconSelected(false);
        };
        window.addEventListener('mousedown', handlePointerDown);
        return () => window.removeEventListener('mousedown', handlePointerDown);
    }, []);

    const clearFileManagerPressTimer = useCallback(() => {
        if (fileManagerPressTimerRef.current !== null) {
            window.clearTimeout(fileManagerPressTimerRef.current);
        }
        fileManagerPressTimerRef.current = null;
        fileManagerPressStartRef.current = null;
    }, []);

    const [showStorageWarning, setShowStorageWarning] = useState(false);

    useEffect(() => {
        const names = Object.keys(profiles);
        setProfileOrder((prev) => {
            const ordered = prev.filter((name) => names.includes(name));
            names.forEach((name) => {
                if (!ordered.includes(name)) ordered.push(name);
            });
            if (ordered.length === prev.length && ordered.every((name, idx) => name === prev[idx])) {
                return prev;
            }
            return ordered;
        });
    }, [profiles, setProfileOrder]);
    const {
        activeWindowId,
        pendingCloseWidgetId,
        pendingCloseInstanceId,
        addWidget,
        focusWidget,
        requestCloseWidget,
        requestCloseAll,
        cancelPendingClose,
        discardPendingClose,
        savePendingClose,
        toggleMinimize,
        toggleMaximize,
        handleTaskClick,
        minimizeAllWindows,
    } = useDesktopWindows({
        activeWidgets: activeProfile.activeWidgets,
        widgetPreferences: activeProfile.widgetPreferences,
        activeProfileName,
        popupWidgetIds: POPUP_WIDGET_IDS,
        setActiveWidgets,
        toggleWidgetFloating,
    });
    const {
        contextMenu,
        setContextMenu,
        contextMenuRef,
        handleContextMenu,
        handleTaskContextMenu,
        handleWindowContextMenu,
    } = useDesktopContextMenu({
        activeWidgets: activeProfile.activeWidgets,
    });

    useEffect(() => {
        const handleStorageWarning = () => {
            setShowStorageWarning(true);
        };
        window.addEventListener('storage-quota-exceeded', handleStorageWarning);
        return () => window.removeEventListener('storage-quota-exceeded', handleStorageWarning);
    }, []);

    const openSettingsTab = (tab: 'general' | 'profiles' | 'widgets' | 'theme') => {
        setSettingsInitialTab(tab);
        setSettingsOpen(true);
        setContextMenu(prev => ({ ...prev, isOpen: false }));
    };

    const openThemeModal = () => {
        setSettingsInitialTab('theme');
        setSettingsOpen(true);
        setThemeModalRequestId((prev) => prev + 1);
    };

    const toggleStartMenu = (anchorRect: DOMRect) => {
        setStartMenuAnchor(anchorRect);
        setIsStartMenuOpen((prev) => !prev);
    };

    const resetLayout = () => {
        requestCloseAll();
        setContextMenu(prev => ({ ...prev, isOpen: false }));
    };

    const {
        now,
        storageEstimate,
        screenSize,
        windowSize,
        clockRef,
        clockBottom,
        formattedDate,
        formattedTime,
        isFullscreen,
        renderClockTime,
        toggleFullscreen,
    } = useDesktopSystem({
        language: i18n.language,
        showDateTime,
        alarmItems,
    });
    const activeAlarms = alarmItems.filter((alarm) => !alarm.triggered).sort((a, b) => a.targetTime - b.targetTime);
    const ringingAlarmCount = alarmItems.filter((alarm) => alarm.triggered).length;

    const formatBytes = (value: number | null, gbDecimals = 2) => {
        if (value == null || !Number.isFinite(value)) return t('system_stats.not_available');
        if (value < 1024) return `${value} B`;
        const kb = value / 1024;
        if (kb < 1024) return `${kb.toFixed(1)} KB`;
        const mb = kb / 1024;
        if (mb < 1024) return `${mb.toFixed(1)} MB`;
        const gb = mb / 1024;
        return `${gb.toFixed(gbDecimals)} GB`;
    };

    const getGbRounded = (value: number | null) => {
        if (value == null || !Number.isFinite(value)) return null;
        const gb = value / (1024 ** 3);
        return gb.toFixed(2);
    };

    const hasOpenWidgets = activeProfile.activeWidgets.length > 0;
    const storageUsed = storageEstimate.usage;
    const storageQuota = storageEstimate.quota;
    const storageFree = storageUsed != null && storageQuota != null ? Math.max(0, storageQuota - storageUsed) : null;
    const navigatorWithMemory = navigator as Navigator & { deviceMemory?: number };
    const memoryGb = typeof navigatorWithMemory.deviceMemory === 'number' ? navigatorWithMemory.deviceMemory : null;
    const cpuCores = typeof navigator.hardwareConcurrency === 'number' ? navigator.hardwareConcurrency : null;
    const storageQuotaRounded = getGbRounded(storageQuota);
    const storageFreeRounded = getGbRounded(storageFree);
    const showStorageRows = storageUsed != null && storageQuota != null;
    const showStorageFree = showStorageRows && storageQuotaRounded !== storageFreeRounded;
    const statsRows: Array<{ label: string; value: string }> = [];
    const contextWidgetId = contextMenu.widgetId
        ?? (contextMenu.windowInstanceId
            ? activeProfile.activeWidgets.find(widget => widget.instanceId === contextMenu.windowInstanceId)?.widgetId
            : null);
    const contextIsPinned = contextWidgetId ? activeProfile.pinnedWidgets.includes(contextWidgetId) : false;
    const contextWindow = contextMenu.windowInstanceId
        ? activeProfile.activeWidgets.find(widget => widget.instanceId === contextMenu.windowInstanceId) ?? null
        : null;
    const showFavoriteAction = Boolean(contextWidgetId);
    const showWindowActions = Boolean(contextMenu.windowInstanceId) || hasOpenWidgets;
    if (showStorageRows) {
        statsRows.push({
            label: t('system_stats.storage_used'),
            value: `${formatBytes(storageUsed, 2)} / ${formatBytes(storageQuota, 2)}`,
        });
        if (showStorageFree) {
            statsRows.push({
                label: t('system_stats.storage_free'),
                value: formatBytes(storageFree, 2),
            });
        }
    }
    if (memoryGb != null) {
        statsRows.push({
            label: t('system_stats.memory'),
            value: t('system_stats.memory_value', { value: memoryGb }),
        });
    }
    if (cpuCores != null) {
        statsRows.push({
            label: t('system_stats.cpu'),
            value: t('system_stats.cpu_value', { value: cpuCores }),
        });
    }
    statsRows.push({
        label: t('system_stats.screen'),
        value: t('system_stats.screen_value', { width: screenSize.width, height: screenSize.height }),
    });
    statsRows.push({
        label: t('system_stats.window'),
        value: t('system_stats.window_value', { width: windowSize.width, height: windowSize.height }),
    });

    return (
        <div className="w-screen h-screen overflow-hidden" onContextMenu={(event) => handleContextMenu(event)}>
            <DesktopStatusOverlays
                showDateTime={showDateTime}
                showSystemStats={showSystemStats}
                clockRef={clockRef}
                formattedDate={formattedDate}
                formattedTime={formattedTime}
                renderClockTime={renderClockTime}
                activeAlarms={activeAlarms}
                ringingAlarmCount={ringingAlarmCount}
                now={now}
                formatRemainingTime={formatRemainingTime}
                isFullscreen={isFullscreen}
                onToggleFullscreen={toggleFullscreen}
                onFullscreenContextMenu={(event) => handleContextMenu(event, undefined, true)}
                fullscreenEnterLabel={t('desktop.fullscreen_enter')}
                fullscreenExitLabel={t('desktop.fullscreen_exit')}
                clockBottom={clockBottom}
                statsRows={statsRows}
                getDefaultAlarmLabel={() => t('widgets.alarm.default_label')}
                getTriggeredAlarmLabel={(count) => t('widgets.alarm.clock_triggered', { count })}
            />
            {activeProfile.activeWidgets.map(widget => {
                const config = WIDGET_REGISTRY[widget.widgetId];
                if (!config) {
                    return null;
                }
                const Component = config.component;
                const isPinned = activeProfile.pinnedWidgets.includes(widget.widgetId);
                const isActiveWindow = widget.instanceId === activeWindowId;
                const helpText = getWidgetHelpText(widget.widgetId, t);
                const widgetDefaults = activeProfile.widgetPreferences?.[widget.widgetId];
                const defaultToolbarPinned = !POPUP_WIDGET_IDS.has(widget.widgetId);
                const savedZoom = widgetDefaults?.zoom ?? 1;
                const savedToolbarPinned = widgetDefaults?.toolbarPinned ?? defaultToolbarPinned;
                const zoomLevel = widget.zoom ?? widgetDefaults?.zoom ?? 1;
                const toolbarPinned = widget.toolbarPinned ?? widgetDefaults?.toolbarPinned ?? true;
                const windowStyle = widget.windowStyleOverride ?? config.windowStyle;
                const baseTitle = t(config.title);
                const windowTitle = widget.titleOverride
                    ? `${t(config.title)} — ${widget.titleOverride}`
                    : t(config.title);
                return (
                    <WidgetWindow
                        key={widget.instanceId}
                        id={widget.instanceId}
                        title={windowTitle}
                        menuTitle={baseTitle}
                        icon={config.icon}
                        windowStyle={windowStyle}
                        helpText={helpText}
                        zoomLevel={zoomLevel}
                        toolbarPinned={toolbarPinned}
                        position={widget.position}
                        size={widget.size}
                        zIndex={widget.zIndex}
                        isMinimized={widget.isMinimized}
                        isMaximized={widget.isMaximized}
                        onToggleMinimize={() => toggleMinimize(widget.instanceId)}
                        onToggleMaximize={() => toggleMaximize(widget.instanceId)}
                        onClose={() => requestCloseWidget(widget.instanceId)}
                        onFocus={() => focusWidget(widget.instanceId)}
                        onDragStop={(_e, d) => {
                            setActiveWidgets(prev => prev.map(w => (w.instanceId === widget.instanceId ? { ...w, position: { x: d.x, y: d.y } } : w)));
                        }}
                        onResizeStop={(_e, _direction, ref, _delta, position) => {
                            const nextWidth = Number.parseFloat(ref.style.width);
                            const nextHeight = Number.parseFloat(ref.style.height);
                            setActiveWidgets((prev) => prev.map((w) => (
                                w.instanceId === widget.instanceId
                                    ? {
                                        ...w,
                                        size: {
                                            width: Number.isFinite(nextWidth) ? nextWidth : w.size.width,
                                            height: Number.isFinite(nextHeight) ? nextHeight : w.size.height,
                                        },
                                        position,
                                    }
                                    : w
                            )));
                        }}
                        onOpenContextMenu={(event) => handleWindowContextMenu(event, widget.widgetId, widget.instanceId)}
                        isPinned={isPinned}
                        isActive={isActiveWindow}
                        onTogglePin={() => {
                            setPinnedWidgets((prev) => (
                                prev.includes(widget.widgetId)
                                    ? prev.filter((id) => id !== widget.widgetId)
                                    : [...prev, widget.widgetId]
                            ));
                        }}
                        pinLabel={t('toolbar.add_widget')}
                        unpinLabel={t('toolbar.remove_widget')}
                        helpLabel={t('desktop.window_help')}
                        windowMenuLabel={t('desktop.window_menu')}
                        minimizeLabel={t('desktop.window_minimize')}
                        maximizeLabel={t('desktop.window_maximize')}
                        restoreLabel={t('desktop.window_restore')}
                        closeLabel={t('desktop.window_close')}
                        zoomInLabel={t('desktop.window_zoom_in')}
                        zoomOutLabel={t('desktop.window_zoom_out')}
                        zoomResetLabel={t('desktop.window_zoom_reset')}
                        zoomEditHint={t('desktop.window_zoom_edit_hint')}
                        enterFullscreenLabel={t('desktop.fullscreen_enter')}
                        exitFullscreenLabel={t('desktop.fullscreen_exit')}
                        toolbarHideLabel={t('desktop.toolbar_hide')}
                        toolbarPinLabel={t('desktop.toolbar_pin')}
                        toolbarRevealHint={t('desktop.toolbar_reveal_hint')}
                        toolSettingsLabel={t('desktop.tool_settings')}
                        toolSettingsDescription={t('desktop.tool_settings_description')}
                        toolSettingsSaveLabel={t('desktop.tool_settings_save')}
                        toolSettingsSavedLabel={t('desktop.tool_settings_saved')}
                        toolSettingsSavedZoom={savedZoom}
                        toolSettingsSavedToolbarPinned={savedToolbarPinned}
                        onZoomChange={(nextZoom) => {
                            setActiveWidgets((prev) => prev.map((w) => (
                                w.instanceId === widget.instanceId ? { ...w, zoom: nextZoom } : w
                            )));
                        }}
                        onZoomReset={() => {
                            setActiveWidgets((prev) => prev.map((w) => (
                                w.instanceId === widget.instanceId ? { ...w, zoom: 1 } : w
                            )));
                        }}
                        onToolbarPinnedChange={(nextValue) => {
                            setActiveWidgets((prev) => prev.map((w) => (
                                w.instanceId === widget.instanceId ? { ...w, toolbarPinned: nextValue } : w
                            )));
                        }}
                        onSaveToolSettings={(settings) => {
                            saveWidgetSettings(widget.widgetId, settings);
                        }}
                    >
                        <Suspense
                            fallback={
                                <div className="flex items-center justify-center h-full text-sm text-gray-500">
                                    {t('loading')}
                                </div>
                            }
                        >
                            <Component instanceId={widget.instanceId} windowStyle={windowStyle} />
                        </Suspense>
                    </WidgetWindow>
                );
            })}
            {isToolbarHidden && (
                <div
                    className="fixed bottom-0 left-0 right-0 h-2 z-[10000]"
                    onMouseEnter={() => setToolbarPeek(true)}
                />
            )}
            <Toolbar
                pinnedWidgets={activeProfile.pinnedWidgets}
                onWidgetClick={addWidget}
                onWidgetsClick={() => openSettingsTab('widgets')}
                onOpenContextMenu={(event, widgetId, force) => handleContextMenu(event, widgetId, force)}
                onReorderPinned={(orderedIds) => setPinnedWidgets(orderedIds)}
                openWidgets={activeProfile.activeWidgets}
                onTaskClick={handleTaskClick}
                onTaskContextMenu={handleTaskContextMenu}
                isHidden={isToolbarHidden}
                isPeeking={isToolbarPeek}
                onMouseLeave={() => {
                    if (isToolbarHidden) setToolbarPeek(false);
                }}
                startButtonRef={startButtonRef}
            />
            <Rnd
                bounds="window"
                position={fileManagerIconPosition}
                size={fileManagerIconSize}
                enableResizing={false}
                onDragStart={() => {
                    clearFileManagerPressTimer();
                    fileManagerLongPressTriggeredRef.current = false;
                    fileManagerPressStartRef.current = null;
                }}
                onDragStop={(_, data) => {
                    clearFileManagerPressTimer();
                    setFileManagerIconPosition({ x: data.x, y: data.y });
                }}
                dragHandleClassName="file-manager-desktop-icon"
                className="z-[1]"
            >
                <div
                    ref={fileManagerIconRef}
                    role="button"
                    tabIndex={0}
                    onClick={() => {
                        if (fileManagerLongPressTriggeredRef.current) {
                            fileManagerLongPressTriggeredRef.current = false;
                            return;
                        }
                        setFileManagerIconSelected(true);
                    }}
                    onDoubleClick={() => {
                        setFileManagerIconSelected(false);
                        addWidget('file-manager');
                    }}
                    onContextMenu={(event) => {
                        event.preventDefault();
                        setFileManagerIconSelected(true);
                        setContextMenu({
                            isOpen: true,
                            x: event.clientX,
                            y: event.clientY,
                            widgetId: 'file-manager',
                            windowInstanceId: null,
                            source: 'file-manager-icon',
                        });
                    }}
                    onPointerDown={(event) => {
                        setFileManagerIconSelected(true);
                        if (event.pointerType === 'touch' || event.pointerType === 'pen') {
                            clearFileManagerPressTimer();
                            fileManagerPressStartRef.current = { x: event.clientX, y: event.clientY };
                            fileManagerLongPressTriggeredRef.current = false;
                            fileManagerPressTimerRef.current = window.setTimeout(() => {
                                fileManagerLongPressTriggeredRef.current = true;
                                setFileManagerIconSelected(false);
                                addWidget('file-manager');
                            }, 500);
                        }
                    }}
                    onPointerMove={(event) => {
                        if (!fileManagerPressStartRef.current) return;
                        const dx = event.clientX - fileManagerPressStartRef.current.x;
                        const dy = event.clientY - fileManagerPressStartRef.current.y;
                        if (Math.hypot(dx, dy) > 8) {
                            clearFileManagerPressTimer();
                        }
                    }}
                    onPointerUp={() => {
                        clearFileManagerPressTimer();
                    }}
                    onPointerCancel={() => {
                        clearFileManagerPressTimer();
                    }}
                    onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault();
                            addWidget('file-manager');
                        }
                    }}
                    className={`file-manager-desktop-icon flex h-full w-full flex-col items-center justify-center gap-1 bg-transparent text-text-dark select-none cursor-default touch-none ${isFileManagerIconSelected ? 'rounded-lg bg-white/40 ring-2 ring-accent/70' : ''}`}
                    title={t('widgets.file_manager.title')}
                    aria-label={t('widgets.file_manager.title')}
                >
                    <img
                        src={withBaseUrl('icons/archivos.png')}
                        alt={t('widgets.file_manager.title')}
                        width={56}
                        height={56}
                    />
                    <span className="text-[11px] font-semibold bg-white/70 px-2 py-0.5 rounded-md shadow-sm backdrop-blur-sm whitespace-nowrap">
                        {t('widgets.file_manager.title')}
                    </span>
                </div>
            </Rnd>
            <button
                ref={startButtonRef}
                onClick={(event) => toggleStartMenu(event.currentTarget.getBoundingClientRect())}
                onContextMenu={(event) => handleContextMenu(event, undefined, true)}
                className={`fixed bottom-4 left-4 z-[10001] flex items-center gap-2 px-5 py-2.5 rounded-full shadow-lg border border-black/10 backdrop-blur-md transition ${isStartMenuOpen ? 'bg-accent text-text-dark' : 'bg-white/90 text-text-dark hover:bg-white'}`}
                title={t('toolbar.start')}
                aria-label={t('toolbar.start')}
            >
                <img src={withBaseUrl('escritorio-digital.png')} alt={t('toolbar.start')} width="24" height="24" />
                <span className="text-sm font-semibold">{t('toolbar.start')}</span>
            </button>
            <StartMenu
                isOpen={isStartMenuOpen}
                onClose={() => setIsStartMenuOpen(false)}
                onAddWidget={addWidget}
                onOpenSettingsTab={openSettingsTab}
                onOpenThemeModal={openThemeModal}
                onOpenAbout={() => setIsAboutOpen(true)}
                onOpenCredits={() => setIsCreditsOpen(true)}
                onRemoveFavorite={(widgetId) =>
                    setPinnedWidgets((prev) => prev.filter((id) => id !== widgetId))
                }
                onReorderFavorites={(orderedIds) => setPinnedWidgets(orderedIds)}
                onClearFavorites={() => setPinnedWidgets([])}
                onAddFavorite={(widgetId) =>
                    setPinnedWidgets((prev) => (prev.includes(widgetId) ? prev : [...prev, widgetId]))
                }
                pinnedWidgets={activeProfile.pinnedWidgets}
                anchorRect={startMenuAnchor}
                anchorRef={startButtonRef}
            />
            <DesktopFileDialogs
                t={t}
                saveDialogState={saveDialogState}
                saveDialogFilterWidget={saveDialogFilterWidget}
                saveDialogFolderId={saveDialogFolderId}
                saveDialogFilename={saveDialogFilename}
                saveDialogEntries={saveDialogEntries}
                saveDialogSelectedEntryId={saveDialogSelectedEntryId}
                saveDialogBreadcrumb={saveDialogBreadcrumb}
                saveDialogWidgetLabel={saveDialogWidgetLabel}
                openDialogState={openDialogState}
                openDialogFilterWidget={openDialogFilterWidget}
                openDialogEntries={openDialogEntries}
                openDialogSelectedIds={openDialogSelectedIds}
                openDialogBreadcrumb={openDialogBreadcrumb}
                openDialogWidgetLabel={openDialogWidgetLabel}
                openDialogInputRef={openDialogInputRef}
                renderDialogEntryIcon={renderDialogEntryIcon}
                formatFileSize={formatFileSize}
                normalizeFilename={normalizeFilename}
                getSaveDialogFilename={getSaveDialogFilename}
                setSaveDialogFilterWidget={setSaveDialogFilterWidget}
                setSaveDialogFolderId={setSaveDialogFolderId}
                setSaveDialogFilename={setSaveDialogFilename}
                setSaveDialogSelectedEntryId={setSaveDialogSelectedEntryId}
                setOpenDialogFilterWidget={setOpenDialogFilterWidget}
                setOpenDialogFolderId={setOpenDialogFolderId}
                setOpenDialogSelectedIds={setOpenDialogSelectedIds}
                closeSaveDialog={closeSaveDialog}
                closeOpenDialog={closeOpenDialog}
                onCreateFolder={async (parentId) => {
                    const name = window.prompt(t('widgets.file_manager.new_folder_prompt'));
                    if (!name) return;
                    const trimmed = name.trim();
                    if (!trimmed) return;
                    const folder = await createFolder(trimmed, parentId);
                    setSaveDialogFolderId(folder.id);
                }}
            />
            <DesktopUnsavedChangesModal
                isOpen={Boolean(pendingCloseInstanceId && pendingCloseWidgetId)}
                widgetLabel={pendingCloseWidgetId ?? ''}
                title={t('unsaved_modal.title')}
                message={t('unsaved_modal.message', {
                    widget: pendingCloseWidgetId && WIDGET_REGISTRY[pendingCloseWidgetId]
                        ? t(WIDGET_REGISTRY[pendingCloseWidgetId].title)
                        : t('unsaved_modal.unknown_widget'),
                })}
                cancelLabel={t('unsaved_modal.cancel')}
                discardLabel={t('unsaved_modal.discard')}
                saveLabel={t('unsaved_modal.save')}
                onCancel={cancelPendingClose}
                onDiscard={discardPendingClose}
                onSave={savePendingClose}
            />
            <Suspense fallback={null}>
                <AboutModal
                    isOpen={isAboutOpen}
                    onClose={() => setIsAboutOpen(false)}
                />
                <SettingsModal
                    isOpen={isSettingsOpen}
                    onClose={() => setSettingsOpen(false)}
                    initialTab={settingsInitialTab}
                    themeModalRequestId={themeModalRequestId}
                    pinnedWidgets={activeProfile.pinnedWidgets}
                    setPinnedWidgets={setPinnedWidgets}
                    profiles={profiles}
                    setProfiles={setProfiles}
                    activeProfileName={activeProfileName}
                    setActiveProfileName={setActiveProfileName}
                    profileOrder={profileOrder}
                    setProfileOrder={setProfileOrder}
                />
                <CreditsModal
                    isOpen={isCreditsOpen}
                    onClose={() => setIsCreditsOpen(false)}
                />
            </Suspense>
            
            {/* --- ¡AQUÍ ESTÁ EL CAMBIO! Añadimos el nuevo componente a la interfaz --- */}
            {showProfileMenu && (
                <ProfileSwitcher
                  profiles={profiles}
                  activeProfileName={activeProfileName}
                  setActiveProfileName={setActiveProfileName}
                  setProfiles={setProfiles}
                  onManageProfiles={() => openSettingsTab('profiles')}
                  onOpenContextMenu={(event) => handleContextMenu(event, undefined, true)}
                  profileOrder={profileOrder}
                />
            )}

            {showStorageWarning && (
                <div className="fixed top-4 right-4 z-[10002] max-w-sm bg-white/95 backdrop-blur-md border border-amber-200 shadow-xl rounded-lg p-4 text-sm text-text-dark">
                    <p className="font-semibold text-amber-700">{t('storage_warning.title')}</p>
                    <p className="mt-1 text-gray-700">{t('storage_warning.body')}</p>
                    <div className="mt-3 flex gap-2">
                        <button
                            className="px-3 py-1.5 rounded-md bg-amber-500 text-white hover:bg-amber-600 transition"
                            onClick={() => openSettingsTab('general')}
                        >
                            {t('storage_warning.open_settings')}
                        </button>
                        <button
                            className="px-3 py-1.5 rounded-md border border-gray-300 text-gray-700 hover:bg-gray-100 transition"
                            onClick={() => setShowStorageWarning(false)}
                        >
                            {t('storage_warning.dismiss')}
                        </button>
                    </div>
                </div>
            )}
            {activeAlarmAlerts.length > 0 && (
                <div className="alarm-toast-stack" aria-live="polite">
                    {activeAlarmAlerts.map((alarm) => {
                        const label = alarm.label ? alarm.label : t('widgets.alarm.default_label');
                        return (
                            <div key={alarm.id} className="alarm-toast">
                                <div className="alarm-toast-text">
                                    <div className="alarm-toast-title">{t('widgets.alarm.toast_title')}</div>
                                    <div className="alarm-toast-message">
                                        {t('widgets.alarm.toast_label', { label })}
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    className="alarm-toast-action"
                                    onClick={() => updateStoredAlarms((prev) => prev.filter((item) => item.id !== alarm.id))}
                                >
                                    {t('widgets.alarm.dismiss')}
                                </button>
                            </div>
                        );
                    })}
                </div>
            )}

            <DesktopContextMenu
                contextMenu={contextMenu}
                contextMenuRef={contextMenuRef}
                contextWindow={contextWindow}
                contextWidgetId={contextWidgetId ?? null}
                contextIsPinned={contextIsPinned}
                showFavoriteAction={showFavoriteAction}
                showWindowActions={showWindowActions}
                hasOpenWidgets={hasOpenWidgets}
                isToolbarHidden={isToolbarHidden}
                showDateTime={showDateTime}
                showSystemStats={showSystemStats}
                showProfileMenu={showProfileMenu}
                t={t}
                setContextMenu={setContextMenu}
                setPinnedWidgets={setPinnedWidgets}
                setToolbarHidden={setToolbarHidden}
                onOpenFileManager={() => addWidget('file-manager')}
                onOpenSettingsTab={openSettingsTab}
                onToggleMinimize={toggleMinimize}
                onToggleMaximize={toggleMaximize}
                onRequestCloseWidget={requestCloseWidget}
                onToggleDateTime={toggleDateTime}
                onToggleSystemStats={toggleSystemStats}
                onToggleProfileMenu={toggleProfileMenu}
                onMinimizeAllWindows={minimizeAllWindows}
                onResetLayout={resetLayout}
            />
        </div>
    );
};


// --- Componente Principal que Maneja el Estado y el Proveedor de Contexto ---
function App() {
    const [profiles, setProfiles] = useLocalStorage<ProfileCollection>('desktop-profiles', {
        'Escritorio Principal': {
            theme: defaultTheme,
            activeWidgets: [],
            pinnedWidgets: ['screen-annotator', 'work-list', 'alarm', 'file-opener', 'vce-community'],
            vceFavorites: [],
        },
    });
    const [profileOrder, setProfileOrder] = useLocalStorage<string[]>('profile-order', []);
    const [activeProfileName, setActiveProfileName] = useLocalStorage<string>(
        'active-profile-name',
        'Escritorio Principal'
    );

    useEffect(() => {
        setProfiles((prev) => {
            let changed = false;
            const nextProfiles: ProfileCollection = {};
            for (const [name, profile] of Object.entries(prev)) {
                let profileChanged = false;
                let pinnedWidgets = profile.pinnedWidgets;
                if (pinnedWidgets.includes('timer')) {
                    const nextPinned = pinnedWidgets.filter((id) => id !== 'timer');
                    if (!nextPinned.includes('alarm')) {
                        nextPinned.splice(1, 0, 'alarm');
                    }
                    pinnedWidgets = nextPinned;
                    profileChanged = true;
                }
                let activeWidgets = profile.activeWidgets;
                if (activeWidgets.some((widget) => widget.widgetId === 'timer')) {
                    activeWidgets = activeWidgets.map((widget) =>
                        widget.widgetId === 'timer' ? { ...widget, widgetId: 'alarm' } : widget
                    );
                    profileChanged = true;
                }
                let widgetPreferences = profile.widgetPreferences;
                if (widgetPreferences && widgetPreferences.timer) {
                    const { timer, ...rest } = widgetPreferences;
                    widgetPreferences = rest;
                    if (!widgetPreferences.alarm) {
                        widgetPreferences = { ...widgetPreferences, alarm: timer };
                    }
                    profileChanged = true;
                }
                if (profileChanged) {
                    changed = true;
                    nextProfiles[name] = { ...profile, pinnedWidgets, activeWidgets, widgetPreferences };
                } else {
                    nextProfiles[name] = profile;
                }
            }
            return changed ? nextProfiles : prev;
        });
        const unsubscribe = onDesktopEvent('vce-favorites-update', (detail) => {
            if (!detail || !detail.profileName || !detail.favorites) return;
            const profileName = detail.profileName;
            const favorites = detail.favorites;
            setProfiles((prev) => {
                const profile = prev[profileName];
                if (!profile) return prev;
                return {
                    ...prev,
                    [profileName]: {
                        ...profile,
                        vceFavorites: favorites,
                    },
                };
            });
        });
        return unsubscribe;
    }, [setProfiles]);

    const activeProfile = profiles[activeProfileName] || Object.values(profiles)[0];
    const theme = activeProfile.theme || defaultTheme;

    const handleThemeChange = useCallback((newThemeOrUpdater: Theme | ((val: Theme) => Theme)) => {
        const currentTheme = activeProfile.theme;
        const newTheme = typeof newThemeOrUpdater === 'function' ? newThemeOrUpdater(currentTheme) : newThemeOrUpdater;
        const newProfileData = { ...activeProfile, theme: newTheme };
        setProfiles(prev => ({ ...prev, [activeProfileName]: newProfileData }));
    }, [activeProfile, activeProfileName, setProfiles]);

    const handleWallpaperChange = (wallpaperUrl: string) => {
        handleThemeChange((prevTheme) => ({ ...prevTheme, '--wallpaper': wallpaperUrl }));
    };

    const resetTheme = () => {
        handleThemeChange(defaultTheme);
    };

    useEffect(() => {
        document.body.style.backgroundImage = theme['--wallpaper'];
        document.body.classList.toggle('high-contrast', Boolean(theme.highContrast));
        const root = document.documentElement;
        for (const [key, value] of Object.entries(theme)) {
            if (key.startsWith('--') && key !== '--wallpaper') {
                root.style.setProperty(key, value as string);
            }
        }
    }, [theme]);

    useEffect(() => {
        const value = theme['--wallpaper'];
        if (!value) return;
        const lower = value.toLowerCase();
        const isCustomUrl = lower.startsWith('url(data:') || lower.startsWith('url(http');
        const isNone = lower === 'none';
        if (isNone || isCustomUrl || isWallpaperValueValid(value)) return;
        handleThemeChange((prevTheme) => ({ ...prevTheme, '--wallpaper': defaultWallpaperValue }));
    }, [theme, handleThemeChange]);

    useEffect(() => {
        notifyActiveProfileChange(activeProfileName);
    }, [activeProfileName]);

    useEffect(() => {
        notifyProfilesUpdated();
    }, [profiles]);

    const themeContextValue = {
        theme,
        setTheme: handleThemeChange,
        setWallpaper: handleWallpaperChange,
        resetTheme,
        defaultTheme,
    };

    return (
        <ThemeProvider value={themeContextValue}>
            <DesktopUI
                profiles={profiles}
                setProfiles={setProfiles}
                activeProfileName={activeProfileName}
                setActiveProfileName={setActiveProfileName}
                profileOrder={profileOrder}
                setProfileOrder={setProfileOrder}
            />
        </ThemeProvider>
    );
}

export default App;
