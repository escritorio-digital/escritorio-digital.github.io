// src/App.tsx

import { Suspense, useState, useEffect, useRef, useCallback, cloneElement, isValidElement } from 'react';
import { useTranslation } from 'react-i18next';
import { Rnd } from 'react-rnd';
import { WIDGET_REGISTRY } from './components/widgets';
import { useLocalStorage } from './hooks/useLocalStorage';
import { WidgetWindow } from './components/core/WidgetWindow';
import { Toolbar } from './components/core/Toolbar';
import { SettingsModal } from './components/core/SettingsModal';
import { CreditsModal } from './components/core/CreditsModal';
import { AboutModal } from './components/core/AboutModal';
import { StartMenu } from './components/core/StartMenu';
import { ThemeProvider, defaultTheme, type Theme } from './context/ThemeContext';
import type { ActiveWidget, DesktopProfile, ProfileCollection } from './types';
import { PlusSquare, Image, Settings, X, Users, Maximize2, Minimize2, Pin, PinOff, FolderOpen, Home, Bell, BellRing, Folder, File, Music, Film } from 'lucide-react';
import { defaultWallpaperValue, isWallpaperValueValid } from './utils/wallpapers';
import { withBaseUrl } from './utils/assetPaths';
import { getWidgetHelpText } from './utils/widgetHelp';
import { emitFileOpen } from './utils/fileOpenBus';
import type { SaveDialogResult } from './utils/saveDialog';
import { FILE_MANAGER_ROOT_ID, createFolder, getAllEntries, listEntriesByParent, type FileManagerEntry } from './utils/fileManagerDb';
import type { OpenDialogResult, OpenDialogOptions } from './utils/openDialog';
import { getStoredAlarms, setStoredAlarms, subscribeAlarmStore, updateStoredAlarms, type AlarmItem } from './utils/alarmStore';
// --- ¡AQUÍ ESTÁ EL CAMBIO! Importamos el nuevo componente ---
import { ProfileSwitcher } from './components/core/ProfileSwitcher';

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

    const closeSaveDialog = useCallback((result: SaveDialogResult) => {
        const resolver = saveDialogResolverRef.current;
        saveDialogResolverRef.current = null;
        setSaveDialogState({ isOpen: false });
        setSaveDialogFilterWidget(false);
        if (resolver) resolver(result);
    }, []);

    const toggleProfileMenu = useCallback(() => {
        const nextShowProfileMenu = !showProfileMenu;
        const newProfileData: DesktopProfile = {
            ...activeProfile,
            theme: { ...activeProfile.theme, showProfileMenu: nextShowProfileMenu },
        };
        setProfiles(prev => ({ ...prev, [activeProfileName]: newProfileData }));
    }, [activeProfile, activeProfileName, setProfiles, showProfileMenu]);

    const [highestZ, setHighestZ] = useState(100);
    const highestZRef = useRef(100);
    useEffect(() => {
        const maxZ = activeProfile.activeWidgets.reduce(
            (max, widget) => (widget.zIndex > max ? widget.zIndex : max),
            100
        );
        setHighestZ((prev) => (prev < maxZ ? maxZ : prev));
    }, [activeProfile.activeWidgets]);
    useEffect(() => {
        highestZRef.current = highestZ;
    }, [highestZ]);
    const [activeWindowId, setActiveWindowId] = useState<string | null>(null);
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
    const [saveDialogState, setSaveDialogState] = useState<{ isOpen: boolean; sourceWidgetId?: string }>({ isOpen: false });
    const [saveDialogFilterWidget, setSaveDialogFilterWidget] = useState(false);
    const saveDialogResolverRef = useRef<((result: SaveDialogResult) => void) | null>(null);
    const [saveDialogFolderId, setSaveDialogFolderId] = useState(FILE_MANAGER_ROOT_ID);
    const [saveDialogFilename, setSaveDialogFilename] = useState('');
    const [saveDialogSuggestedFilename, setSaveDialogSuggestedFilename] = useState('');
    const [saveDialogEntries, setSaveDialogEntries] = useState<FileManagerEntry[]>([]);
    const [saveDialogSelectedEntryId, setSaveDialogSelectedEntryId] = useState<string | null>(null);
    const [saveDialogBreadcrumb, setSaveDialogBreadcrumb] = useState<FileManagerEntry[]>([]);
    const [openDialogState, setOpenDialogState] = useState<{
        isOpen: boolean;
        options: OpenDialogOptions;
    }>({ isOpen: false, options: {} });
    const [openDialogFilterWidget, setOpenDialogFilterWidget] = useState(false);
    const openDialogResolverRef = useRef<((result: OpenDialogResult | null) => void) | null>(null);
    const [openDialogFolderId, setOpenDialogFolderId] = useState(FILE_MANAGER_ROOT_ID);
    const [openDialogEntries, setOpenDialogEntries] = useState<FileManagerEntry[]>([]);
    const [openDialogSelectedIds, setOpenDialogSelectedIds] = useState<string[]>([]);
    const openDialogInputRef = useRef<HTMLInputElement>(null);
    const [openDialogBreadcrumb, setOpenDialogBreadcrumb] = useState<FileManagerEntry[]>([]);
    const openDialogWidgetLabel = getWidgetLabel(openDialogState.options.sourceWidgetId);
    const saveDialogWidgetLabel = getWidgetLabel(saveDialogState.sourceWidgetId);
    const [alarmItems, setAlarmItems] = useState<AlarmItem[]>(() => getStoredAlarms());
    const alarmAudioContextRef = useRef<AudioContext | null>(null);
    const alarmSoundTimerRef = useRef<number | null>(null);
    const activeAlarmAlerts = alarmItems.filter((alarm) => alarm.triggered);

    useEffect(() => {
        if (fileManagerIconPosition.y >= 32) return;
        setFileManagerIconPosition((prev) => ({ ...prev, y: 32 }));
    }, [fileManagerIconPosition.y, setFileManagerIconPosition]);

    useEffect(() => subscribeAlarmStore(setAlarmItems), []);

    useEffect(() => {
        const interval = window.setInterval(() => {
            const alarms = getStoredAlarms();
            if (alarms.length === 0) return;
            const now = Date.now();
            let updated = false;
            const next = alarms.map((alarm) => {
                if (!alarm.triggered && alarm.targetTime <= now) {
                    updated = true;
                    return { ...alarm, triggered: true };
                }
                return alarm;
            });
            if (updated) setStoredAlarms(next);
        }, 1000);
        return () => window.clearInterval(interval);
    }, []);

    const playAlarmBeep = useCallback(() => {
        const AudioContextClass = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (!AudioContextClass) return;
        if (!alarmAudioContextRef.current) {
            alarmAudioContextRef.current = new AudioContextClass();
        }
        const context = alarmAudioContextRef.current;
        if (context.state === 'suspended') {
            context.resume().catch(() => undefined);
        }
        const oscillator = context.createOscillator();
        const gainNode = context.createGain();
        oscillator.type = 'square';
        oscillator.frequency.setValueAtTime(620, context.currentTime);
        oscillator.frequency.linearRampToValueAtTime(920, context.currentTime + 0.45);
        oscillator.frequency.linearRampToValueAtTime(680, context.currentTime + 0.95);
        const now = context.currentTime;
        gainNode.gain.setValueAtTime(0.001, now);
        gainNode.gain.exponentialRampToValueAtTime(0.28, now + 0.04);
        gainNode.gain.exponentialRampToValueAtTime(0.001, now + 1.2);
        oscillator.connect(gainNode);
        gainNode.connect(context.destination);
        oscillator.start(now);
        oscillator.stop(now + 1.3);
    }, []);

    const startAlarmSound = useCallback(() => {
        if (alarmSoundTimerRef.current !== null) return;
        playAlarmBeep();
        alarmSoundTimerRef.current = window.setInterval(playAlarmBeep, 1600);
    }, [playAlarmBeep]);

    const stopAlarmSound = useCallback(() => {
        if (alarmSoundTimerRef.current === null) return;
        window.clearInterval(alarmSoundTimerRef.current);
        alarmSoundTimerRef.current = null;
    }, []);

    useEffect(() => {
        const shouldSound = alarmItems.some((alarm) => alarm.triggered && alarm.soundEnabled);
        if (shouldSound) {
            startAlarmSound();
        } else {
            stopAlarmSound();
        }
    }, [alarmItems, startAlarmSound, stopAlarmSound]);

    useEffect(() => () => stopAlarmSound(), [stopAlarmSound]);

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

    useEffect(() => {
        if (!saveDialogState.isOpen) return;
        let isMounted = true;
        const loadFolders = async () => {
            const entries = await getAllEntries();
            const folders = entries.filter((entry) => entry.type === 'folder');
            const byId = new Map(folders.map((entry) => [entry.id, entry]));
            const labelFor = (entry: FileManagerEntry) => {
                const parts: string[] = [];
                let current: FileManagerEntry | undefined = entry;
                while (current && current.id !== FILE_MANAGER_ROOT_ID) {
                    parts.unshift(current.name);
                    current = byId.get(current.parentId);
                }
                return parts.join(' / ') || t('save_dialog.root_folder');
            };
            const options = [
                { id: FILE_MANAGER_ROOT_ID, label: t('save_dialog.root_folder') },
                ...folders
                    .filter((entry) => entry.id !== FILE_MANAGER_ROOT_ID)
                    .map((entry) => ({
                        id: entry.id,
                        label: labelFor(entry),
                    }))
                    .sort((a, b) => a.label.localeCompare(b.label)),
            ];
            if (isMounted) {
                if (!options.find((option) => option.id === saveDialogFolderId)) {
                    setSaveDialogFolderId(FILE_MANAGER_ROOT_ID);
                }
            }
        };
        loadFolders();
        return () => {
            isMounted = false;
        };
    }, [saveDialogFolderId, saveDialogState.isOpen, t]);

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
    }, [saveDialogFilterWidget, saveDialogFolderId, saveDialogState.isOpen, saveDialogState.sourceWidgetId, t]);

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
                    if (rule.startsWith('.')) {
                        return extension === rule;
                    }
                    if (rule.endsWith('/*')) {
                        const prefix = rule.slice(0, -1);
                        return mime.startsWith(prefix);
                    }
                    if (rule.includes('/')) {
                        return mime === rule;
                    }
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
    }, [openDialogFilterWidget, openDialogFolderId, openDialogState.isOpen, openDialogState.options.sourceWidgetId, t]);

    const normalizeFilename = useCallback((name: string) => {
        const trimmed = name.trim();
        if (!trimmed) return '';
        let normalized = trimmed.replace(/[\\/:*?"<>|]/g, '-');
        normalized = normalized.replace(/[\u0000-\u001f]/g, '');
        normalized = normalized.replace(/\s+/g, ' ');
        normalized = normalized.replace(/^\.+/, '').replace(/\.+$/, '');
        return normalized.trim();
    }, []);

    const getSaveDialogFilename = useCallback(() => {
        const normalized = normalizeFilename(saveDialogFilename);
        if (normalized) return normalized;
        const fallback = normalizeFilename(saveDialogSuggestedFilename)
            || normalizeFilename(t('save_dialog.default_filename'))
            || 'archivo';
        return fallback;
    }, [normalizeFilename, saveDialogFilename, saveDialogSuggestedFilename, t]);

    const closeOpenDialog = useCallback((result: OpenDialogResult | null) => {
        const resolver = openDialogResolverRef.current;
        openDialogResolverRef.current = null;
        setOpenDialogFilterWidget(false);
        setOpenDialogState((prev) => ({ ...prev, isOpen: false }));
        if (resolver) resolver(result);
    }, []);
    const [contextMenu, setContextMenu] = useState<{
        isOpen: boolean;
        x: number;
        y: number;
        widgetId: string | null;
        windowInstanceId: string | null;
        source?: 'desktop' | 'window' | 'task' | 'file-manager-icon';
    }>({
        isOpen: false,
        x: 0,
        y: 0,
        widgetId: null,
        windowInstanceId: null,
        source: 'desktop',
    });
    const contextMenuRef = useRef<HTMLDivElement>(null);
    const [showStorageWarning, setShowStorageWarning] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(!!document.fullscreenElement);

    useEffect(() => {
        if (activeProfile.activeWidgets.length === 0) {
            setActiveWindowId(null);
            return;
        }
        if (!activeWindowId || !activeProfile.activeWidgets.some((w) => w.instanceId === activeWindowId)) {
            const nextActive = activeProfile.activeWidgets.reduce<ActiveWidget | null>((acc, item) => {
                if (!acc) return item;
                return item.zIndex > acc.zIndex ? item : acc;
            }, null);
            setActiveWindowId(nextActive ? nextActive.instanceId : null);
        }
    }, [activeProfile.activeWidgets, activeWindowId]);

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
    const getViewportBounds = () => {
        const margin = 16;
        const maxWidth = Math.max(200, window.innerWidth - margin * 2);
        const maxHeight = Math.max(150, window.innerHeight - margin * 2);
        return { margin, maxWidth, maxHeight };
    };

    const clampWidgetToViewport = (widget: ActiveWidget): ActiveWidget => {
        if (widget.isMaximized) return widget;
        const { margin, maxWidth, maxHeight } = getViewportBounds();
        const parseDimension = (value: number | string, fallback: number) => {
            if (typeof value === 'number') return value;
            const trimmed = value.trim();
            if (trimmed.endsWith('vw')) {
                const parsed = Number.parseFloat(trimmed);
                return Number.isFinite(parsed) ? (window.innerWidth * parsed) / 100 : fallback;
            }
            if (trimmed.endsWith('vh')) {
                const parsed = Number.parseFloat(trimmed);
                return Number.isFinite(parsed) ? (window.innerHeight * parsed) / 100 : fallback;
            }
            const parsed = Number.parseFloat(trimmed);
            return Number.isFinite(parsed) ? parsed : fallback;
        };
        const numericWidth = Math.min(parseDimension(widget.size.width, maxWidth), maxWidth);
        const numericHeight = Math.min(parseDimension(widget.size.height, maxHeight), maxHeight);
        const maxX = Math.max(margin, window.innerWidth - numericWidth - margin);
        const maxY = Math.max(margin, window.innerHeight - numericHeight - margin);
        const x = Math.min(Math.max(widget.position.x, margin), maxX);
        const y = Math.min(Math.max(widget.position.y, margin), maxY);
        return {
            ...widget,
            size: { width: numericWidth, height: numericHeight },
            position: { x, y },
        };
    };

    const addWidget = (widgetId: string) => {
        const widgetConfig = WIDGET_REGISTRY[widgetId];
        if (!widgetConfig) return null;
        const newZ = highestZ + 1;
        setHighestZ(newZ);
        const widgetDefaults = activeProfile.widgetPreferences?.[widgetId];
        const { margin, maxWidth, maxHeight } = getViewportBounds();
        const widthValue = typeof widgetConfig.defaultSize.width === 'number'
            ? Math.min(widgetConfig.defaultSize.width, maxWidth)
            : widgetConfig.defaultSize.width;
        const heightValue = typeof widgetConfig.defaultSize.height === 'number'
            ? Math.min(widgetConfig.defaultSize.height, maxHeight)
            : widgetConfig.defaultSize.height;
        const numericWidth = typeof widthValue === 'number' ? widthValue : maxWidth;
        const numericHeight = typeof heightValue === 'number' ? heightValue : maxHeight;
        const maxX = Math.max(margin, window.innerWidth - numericWidth - margin);
        const maxY = Math.max(margin, window.innerHeight - numericHeight - margin);

        const shouldMaximize = Boolean(widgetConfig.defaultMaximized) || widgetConfig.windowStyle === 'overlay';
        const defaultPosition = {
            x: Math.max(margin, Math.random() * maxX),
            y: Math.max(margin, Math.random() * maxY),
        };
        const defaultSize = { width: widthValue, height: heightValue };
        const newWidget: ActiveWidget = {
            instanceId: `${widgetId}-${Date.now()}`,
            widgetId: widgetId,
            position: shouldMaximize ? { x: 0, y: 0 } : defaultPosition,
            size: shouldMaximize ? { width: '100vw', height: '100vh' } : defaultSize,
            zIndex: newZ,
            zoom: widgetDefaults?.zoom ?? 1,
            toolbarPinned: widgetDefaults?.toolbarPinned ?? !POPUP_WIDGET_IDS.has(widgetId),
            isMaximized: shouldMaximize,
            previousPosition: shouldMaximize ? defaultPosition : undefined,
            previousSize: shouldMaximize ? defaultSize : undefined,
        };
        setActiveWidgets(prev => [...prev, newWidget]);
        setActiveWindowId(newWidget.instanceId);
        return newWidget.instanceId;
    };

    const addWidgetRef = useRef(addWidget);
    const clampWidgetToViewportRef = useRef(clampWidgetToViewport);
    useEffect(() => {
        addWidgetRef.current = addWidget;
    }, [addWidget]);
    useEffect(() => {
        clampWidgetToViewportRef.current = clampWidgetToViewport;
    }, [clampWidgetToViewport]);

    useEffect(() => {
        const handler = (event: Event) => {
            const custom = event as CustomEvent<{ widgetId?: string }>;
            if (!custom.detail?.widgetId) return;
            addWidgetRef.current(custom.detail.widgetId);
        };
        window.addEventListener('open-widget', handler as EventListener);
        return () => window.removeEventListener('open-widget', handler as EventListener);
    }, []);

    useEffect(() => {
        const handler = (event: Event) => {
            const custom = event as CustomEvent<{ instanceId?: string; size?: { width?: number; height?: number } }>;
            if (!custom.detail?.instanceId || !custom.detail.size) return;
            const { instanceId, size } = custom.detail;
            setActiveWidgets((prev) =>
                prev.map((widget) => {
                    if (widget.instanceId !== instanceId) return widget;
                    if (widget.isMaximized) return widget;
                    const nextSize = {
                        width: size.width ?? widget.size.width,
                        height: size.height ?? widget.size.height,
                    };
                    return clampWidgetToViewportRef.current({ ...widget, size: nextSize });
                })
            );
        };
        window.addEventListener('widget-resize-request', handler as EventListener);
        return () => window.removeEventListener('widget-resize-request', handler as EventListener);
    }, [setActiveWidgets]);

    useEffect(() => {
        const handler = (event: Event) => {
            const custom = event as CustomEvent<{ resolve?: (result: SaveDialogResult) => void; suggestedFilename?: string; sourceWidgetId?: string }>;
            if (!custom.detail?.resolve) return;
            if (saveDialogResolverRef.current) {
                saveDialogResolverRef.current(null);
            }
            saveDialogResolverRef.current = custom.detail.resolve;
            const suggested = custom.detail.suggestedFilename?.trim() || t('save_dialog.default_filename');
            setSaveDialogSuggestedFilename(suggested);
            setSaveDialogFilename(suggested);
            setSaveDialogFilterWidget(Boolean(custom.detail.sourceWidgetId));
            setSaveDialogState({ isOpen: true, sourceWidgetId: custom.detail.sourceWidgetId });
        };
        window.addEventListener('save-dialog-request', handler as EventListener);
        return () => window.removeEventListener('save-dialog-request', handler as EventListener);
    }, [t]);

    useEffect(() => {
        const handler = (event: Event) => {
            const custom = event as CustomEvent<{ resolve?: (result: OpenDialogResult | null) => void; options?: OpenDialogOptions }>;
            if (!custom.detail?.resolve) return;
            if (openDialogResolverRef.current) {
                openDialogResolverRef.current(null);
            }
            openDialogResolverRef.current = custom.detail.resolve;
            setOpenDialogSelectedIds([]);
            setOpenDialogFolderId(FILE_MANAGER_ROOT_ID);
            setOpenDialogFilterWidget(Boolean(custom.detail.options?.sourceWidgetId));
            setOpenDialogState({ isOpen: true, options: custom.detail.options ?? {} });
        };
        window.addEventListener('open-dialog-request', handler as EventListener);
        return () => window.removeEventListener('open-dialog-request', handler as EventListener);
    }, []);

    const closeWidget = (instanceId: string) => setActiveWidgets(prev => {
        const target = prev.find((widget) => widget.instanceId === instanceId);
        if (target) {
            window.dispatchEvent(
                new CustomEvent('widget-close', {
                    detail: { instanceId, widgetId: target.widgetId },
                })
            );
        }
        const next = prev.filter(w => w.instanceId !== instanceId);
        if (activeWindowId === instanceId) {
            const nextActive = next.reduce<ActiveWidget | null>((acc, item) => {
                if (!acc) return item;
                return item.zIndex > acc.zIndex ? item : acc;
            }, null);
            setActiveWindowId(nextActive ? nextActive.instanceId : null);
        }
        return next;
    });
    const [dirtyWidgets, setDirtyWidgets] = useState<Record<string, boolean>>({});
    const [pendingCloseWidgetId, setPendingCloseWidgetId] = useState<string | null>(null);
    const [pendingCloseInstanceId, setPendingCloseInstanceId] = useState<string | null>(null);
    const [pendingCloseAfterSave, setPendingCloseAfterSave] = useState<string | null>(null);
    const [pendingCloseQueue, setPendingCloseQueue] = useState<string[]>([]);
    const focusWidget = useCallback((instanceId: string) => {
        const newZ = highestZRef.current + 1;
        highestZRef.current = newZ;
        setHighestZ(newZ);
        setActiveWidgets((widgets) =>
            widgets.map((w) => (w.instanceId === instanceId ? { ...w, zIndex: newZ } : w))
        );
        setActiveWindowId(instanceId);
    }, [setActiveWidgets]);
    useEffect(() => {
        const handler = (event: Event) => {
            const custom = event as CustomEvent<{ widgetId: string; entryId: string }>;
            if (!custom.detail?.widgetId) return;
            if (custom.detail.widgetId === 'markdown-text-editor') {
                const instanceId = addWidgetRef.current(custom.detail.widgetId);
                window.setTimeout(() => {
                    emitFileOpen(custom.detail.widgetId, { entryId: custom.detail.entryId, instanceId: instanceId ?? undefined });
                }, 50);
                return;
            }
            const sameWidgets = activeProfile.activeWidgets.filter((widget) => widget.widgetId === custom.detail.widgetId);
            if (sameWidgets.length > 0) {
                const target = sameWidgets.reduce((acc, item) => (item.zIndex > acc.zIndex ? item : acc));
                setActiveWidgets((widgets) =>
                    widgets.map((widget) =>
                        widget.instanceId === target.instanceId ? { ...widget, isMinimized: false } : widget
                    )
                );
                focusWidget(target.instanceId);
            } else {
                addWidgetRef.current(custom.detail.widgetId);
            }
            window.setTimeout(() => {
                emitFileOpen(custom.detail.widgetId, { entryId: custom.detail.entryId });
            }, 50);
        };
        window.addEventListener('file-manager-open', handler as EventListener);
        return () => window.removeEventListener('file-manager-open', handler as EventListener);
    }, [activeProfile.activeWidgets, focusWidget, setActiveWidgets]);
    useEffect(() => {
        const handler = (event: Event) => {
            const custom = event as CustomEvent<{ instanceId?: string; widgetId?: string; isDirty?: boolean }>;
            if (!custom.detail?.instanceId) return;
            const instanceId = custom.detail.instanceId;
            setDirtyWidgets((prev) => {
                const next = { ...prev };
                if (custom.detail.isDirty) {
                    next[instanceId] = true;
                } else {
                    delete next[instanceId];
                }
                return next;
            });
        };
        window.addEventListener('widget-dirty-state', handler as EventListener);
        return () => window.removeEventListener('widget-dirty-state', handler as EventListener);
    }, []);
    useEffect(() => {
        const handler = (event: Event) => {
            const custom = event as CustomEvent<{ instanceId?: string; title?: string }>;
            if (!custom.detail?.instanceId) return;
            const nextTitle = custom.detail.title?.trim() ?? '';
            setActiveWidgets((prev) =>
                prev.map((widget) =>
                    widget.instanceId === custom.detail.instanceId
                        ? { ...widget, titleOverride: nextTitle || undefined }
                        : widget
                )
            );
        };
        window.addEventListener('widget-title-update', handler as EventListener);
        return () => window.removeEventListener('widget-title-update', handler as EventListener);
    }, [setActiveWidgets]);
    const closeWidgetsWithPrompt = useCallback((instanceIds: string[]) => {
        for (let index = 0; index < instanceIds.length; index += 1) {
            const instanceId = instanceIds[index];
            const target = activeProfile.activeWidgets.find((widget) => widget.instanceId === instanceId);
            if (!target) {
                continue;
            }
            const isDirty = dirtyWidgets[instanceId];
            if (isDirty) {
                setPendingCloseWidgetId(target.widgetId);
                setPendingCloseInstanceId(instanceId);
                setPendingCloseQueue(instanceIds.slice(index + 1));
                return;
            }
            closeWidget(instanceId);
        }
        setPendingCloseQueue([]);
    }, [activeProfile.activeWidgets, closeWidget, dirtyWidgets]);
    const requestCloseWidget = useCallback((instanceId: string) => {
        closeWidgetsWithPrompt([instanceId]);
    }, [closeWidgetsWithPrompt]);
    useEffect(() => {
        const handler = (event: Event) => {
            const custom = event as CustomEvent<{ instanceId?: string }>;
            if (!custom.detail?.instanceId) return;
            requestCloseWidget(custom.detail.instanceId);
        };
        window.addEventListener('widget-close-request', handler as EventListener);
        return () => window.removeEventListener('widget-close-request', handler as EventListener);
    }, [requestCloseWidget]);
    const requestCloseAll = useCallback(() => {
        const instanceIds = activeProfile.activeWidgets.map((widget) => widget.instanceId);
        const hasDirty = instanceIds.some((instanceId) => dirtyWidgets[instanceId]);
        if (!hasDirty) {
            setActiveWidgets([]);
            setActiveWindowId(null);
            setPendingCloseQueue([]);
            return;
        }
        closeWidgetsWithPrompt(instanceIds);
    }, [activeProfile.activeWidgets, closeWidgetsWithPrompt, dirtyWidgets, setActiveWidgets]);
    useEffect(() => {
        const handler = (event: Event) => {
            const custom = event as CustomEvent<{ instanceId?: string }>;
            if (!custom.detail?.instanceId) return;
            if (pendingCloseAfterSave === custom.detail.instanceId) {
                closeWidget(custom.detail.instanceId);
                setPendingCloseAfterSave(null);
                setPendingCloseInstanceId(null);
                setPendingCloseWidgetId(null);
                if (pendingCloseQueue.length > 0) {
                    closeWidgetsWithPrompt(pendingCloseQueue);
                }
            }
        };
        window.addEventListener('widget-save-complete', handler as EventListener);
        return () => window.removeEventListener('widget-save-complete', handler as EventListener);
    }, [closeWidget, pendingCloseAfterSave, pendingCloseQueue, closeWidgetsWithPrompt]);
    const toggleMinimize = (instanceId: string) => setActiveWidgets(prev => prev.map(w => (w.instanceId === instanceId ? { ...w, isMinimized: !w.isMinimized } : w)));
    const handleTaskClick = useCallback((instanceId: string) => {
        const target = activeProfile.activeWidgets.find((widget) => widget.instanceId === instanceId);
        if (!target) return;
        if (target.isMinimized) {
            const newZ = highestZ + 1;
            setHighestZ(newZ);
            setActiveWidgets(prev =>
                prev.map(w => (w.instanceId === instanceId ? { ...w, isMinimized: false, zIndex: newZ } : w))
            );
            setActiveWindowId(instanceId);
            return;
        }
        if (activeWindowId !== instanceId) {
            focusWidget(instanceId);
            return;
        }
        setActiveWidgets(prev =>
            prev.map(w => (w.instanceId === instanceId ? { ...w, isMinimized: true } : w))
        );
    }, [activeProfile.activeWidgets, activeWindowId, focusWidget, highestZ, setActiveWidgets, setHighestZ]);
    const minimizeAllWindows = useCallback(() => {
        setActiveWidgets(prev => prev.map(w => ({ ...w, isMinimized: true })));
    }, [setActiveWidgets]);
    const toggleMaximize = (instanceId: string) => {
        const newZ = highestZ + 1;
        setHighestZ(newZ);
        setActiveWidgets(prev => prev.map(w => {
            if (w.instanceId === instanceId) {
                if (w.isMaximized) {
                    return { ...w, isMaximized: false, position: w.previousPosition || { x: 100, y: 100 }, size: w.previousSize || { width: 500, height: 400 }, zIndex: newZ };
                } else {
                    return { ...w, isMaximized: true, isMinimized: false, previousPosition: w.position, previousSize: w.size, position: { x: 0, y: 0 }, size: { width: '100vw', height: '100vh' }, zIndex: newZ };
                }
            }
            return w;
        }));
    };

    useEffect(() => {
        if (!contextMenu.isOpen) return;
        const handlePointerDown = (event: MouseEvent) => {
            if (contextMenuRef.current && contextMenuRef.current.contains(event.target as Node)) return;
            setContextMenu(prev => ({ ...prev, isOpen: false }));
        };
        const handleResize = () => {
            setContextMenu(prev => ({ ...prev, isOpen: false }));
        };
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                setContextMenu(prev => ({ ...prev, isOpen: false }));
            }
        };
        window.addEventListener('mousedown', handlePointerDown);
        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('resize', handleResize);
        return () => {
            window.removeEventListener('mousedown', handlePointerDown);
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('resize', handleResize);
        };
    }, [contextMenu.isOpen]);

    useEffect(() => {
        if (!contextMenu.isOpen) return;
        const clampMenu = () => {
            const menu = contextMenuRef.current;
            if (!menu) return;
            const rect = menu.getBoundingClientRect();
            const padding = 8;
            const maxX = Math.max(padding, window.innerWidth - rect.width - padding);
            const maxY = Math.max(padding, window.innerHeight - rect.height - padding);
            const nextX = Math.min(Math.max(contextMenu.x, padding), maxX);
            const nextY = Math.min(Math.max(contextMenu.y, padding), maxY);
            if (nextX !== contextMenu.x || nextY !== contextMenu.y) {
                setContextMenu(prev => ({ ...prev, x: nextX, y: nextY }));
            }
        };
        const frameId = requestAnimationFrame(clampMenu);
        return () => cancelAnimationFrame(frameId);
    }, [contextMenu.isOpen, contextMenu.x, contextMenu.y]);

    useEffect(() => {
        const handleStorageWarning = () => {
            setShowStorageWarning(true);
        };
        window.addEventListener('storage-quota-exceeded', handleStorageWarning);
        return () => window.removeEventListener('storage-quota-exceeded', handleStorageWarning);
    }, []);

    useEffect(() => {
        const handleResize = () => {
            setActiveWidgets(prev => prev.map(clampWidgetToViewport));
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, [setActiveWidgets]);

    useEffect(() => {
        setActiveWidgets(prev => prev.map(clampWidgetToViewport));
    }, [activeProfileName]);

    useEffect(() => {
        const handleFullscreenChange = () => {
            setIsFullscreen(!!document.fullscreenElement);
        };
        document.addEventListener('fullscreenchange', handleFullscreenChange);
        return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
    }, []);

    const toggleFullscreen = async () => {
        try {
            if (!document.fullscreenElement) {
                await document.documentElement.requestFullscreen();
            } else {
                await document.exitFullscreen();
            }
        } catch (error) {
            console.warn('No se pudo cambiar a pantalla completa.', error);
        }
    };

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

    const isEditableTarget = (target: EventTarget | null): boolean => {
        if (!(target instanceof HTMLElement)) return false;
        if (target.isContentEditable) return true;
        return Boolean(target.closest('input, textarea, select, [contenteditable="true"]'));
    };

    const hasTextSelection = (): boolean => {
        const selection = window.getSelection?.();
        return Boolean(selection && !selection.isCollapsed && selection.toString().trim());
    };

    const handleContextMenu = (event: React.MouseEvent<Element>, widgetId?: string, force = false) => {
        if (!force && isEditableTarget(event.target)) return;
        if (!force && hasTextSelection()) return;
        event.preventDefault();
        setContextMenu({
            isOpen: true,
            x: event.clientX,
            y: event.clientY,
            widgetId: widgetId ?? null,
            windowInstanceId: null,
            source: 'desktop',
        });
    };

    const handleTaskContextMenu = (event: React.MouseEvent, instanceId: string) => {
        event.preventDefault();
        const targetWidgetId = activeProfile.activeWidgets.find(widget => widget.instanceId === instanceId)?.widgetId ?? null;
        setContextMenu({
            isOpen: true,
            x: event.clientX,
            y: event.clientY,
            widgetId: targetWidgetId,
            windowInstanceId: instanceId,
            source: 'task',
        });
    };

    const handleWindowContextMenu = (event: React.MouseEvent, widgetId: string, instanceId: string) => {
        event.preventDefault();
        event.stopPropagation();
        setContextMenu({
            isOpen: true,
            x: event.clientX,
            y: event.clientY,
            widgetId,
            windowInstanceId: instanceId,
            source: 'window',
        });
    };

    const resetLayout = () => {
        requestCloseAll();
        setContextMenu(prev => ({ ...prev, isOpen: false }));
    };

    const [now, setNow] = useState(new Date());
    const [storageEstimate, setStorageEstimate] = useState<{ usage: number | null; quota: number | null }>({
        usage: null,
        quota: null,
    });
    const [screenSize, setScreenSize] = useState({ width: window.screen.width, height: window.screen.height });
    const [windowSize, setWindowSize] = useState({ width: window.innerWidth, height: window.innerHeight });
    const clockRef = useRef<HTMLDivElement>(null);
    const [clockBottom, setClockBottom] = useState<number | null>(null);

    const formattedDate = new Intl.DateTimeFormat(i18n.language, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
    }).format(now);
    const formattedTime = new Intl.DateTimeFormat(i18n.language, {
        hour: '2-digit',
        minute: '2-digit',
    }).format(now);
    const isClockColonOn = now.getSeconds() % 2 === 0;
    const activeAlarms = alarmItems.filter((alarm) => !alarm.triggered).sort((a, b) => a.targetTime - b.targetTime);
    const ringingAlarmCount = alarmItems.filter((alarm) => alarm.triggered).length;

    const renderClockTime = (time: string) => {
        const parts = time.split(':');
        if (parts.length < 2) return time;
        return parts.flatMap((part, index) => {
            const chunk = <span key={`time-part-${index}`}>{part}</span>;
            if (index === 0) return [chunk];
            return [
                <span
                    key={`time-colon-${index}`}
                    className={`desktop-clock-colon${isClockColonOn ? ' is-on' : ''}`}
                >
                    :
                </span>,
                chunk,
            ];
        });
    };

    useEffect(() => {
        const intervalId = window.setInterval(() => setNow(new Date()), 1000);
        return () => window.clearInterval(intervalId);
    }, []);

    useEffect(() => {
        if (!showDateTime) {
            setClockBottom(null);
            return;
        }
        const updateClockBottom = () => {
            const node = clockRef.current;
            if (!node) return;
            const rect = node.getBoundingClientRect();
            setClockBottom(rect.bottom);
        };
        const rafId = window.requestAnimationFrame(updateClockBottom);
        window.addEventListener('resize', updateClockBottom);
        return () => {
            window.cancelAnimationFrame(rafId);
            window.removeEventListener('resize', updateClockBottom);
        };
    }, [showDateTime, formattedDate, formattedTime, i18n.language, activeAlarms.length, ringingAlarmCount]);

    useEffect(() => {
        const updateStorage = async () => {
            if (!navigator.storage?.estimate) {
                setStorageEstimate({ usage: null, quota: null });
                return;
            }
            const estimate = await navigator.storage.estimate();
            setStorageEstimate({
                usage: typeof estimate.usage === 'number' ? estimate.usage : null,
                quota: typeof estimate.quota === 'number' ? estimate.quota : null,
            });
        };
        updateStorage();
        const intervalId = window.setInterval(updateStorage, 30000);
        const handleStorageUsageChange = () => updateStorage();
        window.addEventListener('storage-usage-changed', handleStorageUsageChange);
        return () => {
            window.clearInterval(intervalId);
            window.removeEventListener('storage-usage-changed', handleStorageUsageChange);
        };
    }, []);

    useEffect(() => {
        const updateViewportSizes = () => {
            setScreenSize({ width: window.screen.width, height: window.screen.height });
            setWindowSize({ width: window.innerWidth, height: window.innerHeight });
        };
        updateViewportSizes();
        window.addEventListener('resize', updateViewportSizes);
        return () => window.removeEventListener('resize', updateViewportSizes);
    }, []);

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
            <button
                onClick={toggleFullscreen}
                onContextMenu={(event) => handleContextMenu(event, undefined, true)}
                className="fixed top-4 left-4 z-[2] p-2 rounded-full text-white/80 bg-black/15 backdrop-blur-sm hover:bg-black/30 hover:text-white transition-colors"
                title={isFullscreen ? t('desktop.fullscreen_exit') : t('desktop.fullscreen_enter')}
                aria-label={isFullscreen ? t('desktop.fullscreen_exit') : t('desktop.fullscreen_enter')}
            >
                {isFullscreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
            </button>
            {showDateTime && (
                <div
                    ref={clockRef}
                    className="fixed top-4 right-4 z-[1] pointer-events-none select-none text-white bg-black/45 backdrop-blur-md rounded-2xl px-6 py-5 shadow-lg"
                >
                    <div className="text-lg opacity-90">{formattedDate}</div>
                    <div className="text-4xl font-semibold leading-tight">{renderClockTime(formattedTime)}</div>
                    {(ringingAlarmCount > 0 || activeAlarms.length > 0) && (
                        <div className="mt-2 flex flex-col gap-1 text-sm font-semibold text-white/90">
                            {ringingAlarmCount > 0 && (
                                <div className="flex items-center gap-2">
                                    <BellRing size={16} />
                                    <span>{t('widgets.alarm.clock_triggered', { count: ringingAlarmCount })}</span>
                                </div>
                            )}
                            {activeAlarms.slice(0, 3).map((alarm) => {
                                const label = alarm.label || t('widgets.alarm.default_label');
                                return (
                                    <div key={alarm.id} className="flex items-center gap-2">
                                        <Bell size={14} />
                                        <span>{label}: {formatRemainingTime(alarm.targetTime - now.getTime())}</span>
                                    </div>
                                );
                            })}
                            {activeAlarms.length > 3 && (
                                <div className="flex items-center gap-2 pl-5 text-xs text-white/80">
                                    <span>+{activeAlarms.length - 3}</span>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}
            {showSystemStats && statsRows.length > 0 && (
                <div
                    className="fixed right-4 z-[1] pointer-events-none select-none text-white bg-black/45 backdrop-blur-md rounded-2xl px-5 py-4 shadow-lg min-w-[220px]"
                    style={{ top: showDateTime && clockBottom != null ? `${Math.round(clockBottom + 5)}px` : '1rem' }}
                >
                    <div className="space-y-1 text-sm">
                        {statsRows.map((row) => (
                            <div key={row.label} className="flex justify-between gap-4">
                                <span className="text-white/70">{row.label}</span>
                                <span className="text-white">{row.value}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
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
                const windowTitle = widget.titleOverride
                    ? `${t(config.title)} — ${widget.titleOverride}`
                    : t(config.title);
                return (
                    <WidgetWindow
                        key={widget.instanceId}
                        id={widget.instanceId}
                        title={windowTitle}
                        icon={config.icon}
                        windowStyle={config.windowStyle}
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
                            <Component instanceId={widget.instanceId} />
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
                                                <span className="truncate">
                                                    {entry.name}
                                                </span>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    className="rounded-full border border-gray-300 bg-white px-3 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-100"
                                    onClick={async () => {
                                        const name = window.prompt(t('widgets.file_manager.new_folder_prompt'));
                                        if (!name) return;
                                        const trimmed = name.trim();
                                        if (!trimmed) return;
                                        const folder = await createFolder(trimmed, saveDialogFolderId);
                                        setSaveDialogFolderId(folder.id);
                                    }}
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
                                                        <span className="truncate">
                                                            {entry.name}
                                                        </span>
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
            {pendingCloseInstanceId && pendingCloseWidgetId && (
                <div
                    className="fixed inset-0 z-[10003] flex items-center justify-center bg-black/60"
                    onClick={() => {
                        setPendingCloseInstanceId(null);
                        setPendingCloseWidgetId(null);
                        setPendingCloseQueue([]);
                    }}
                >
                    <div
                        className="w-full max-w-md rounded-2xl border border-gray-200 bg-white px-6 py-5 text-text-dark shadow-2xl"
                        onClick={(event) => event.stopPropagation()}
                        role="dialog"
                        aria-modal="true"
                    >
                        <h3 className="text-lg font-semibold">{t('unsaved_modal.title')}</h3>
                        <p className="mt-2 text-sm text-gray-600">
                            {t('unsaved_modal.message', {
                                widget: pendingCloseWidgetId && WIDGET_REGISTRY[pendingCloseWidgetId]
                                    ? t(WIDGET_REGISTRY[pendingCloseWidgetId].title)
                                    : t('unsaved_modal.unknown_widget'),
                            })}
                        </p>
                        <div className="mt-6 flex flex-wrap justify-end gap-2">
                            <button
                                type="button"
                                className="rounded-full border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-100"
                                onClick={() => {
                                    setPendingCloseInstanceId(null);
                                    setPendingCloseWidgetId(null);
                                    setPendingCloseQueue([]);
                                }}
                            >
                                {t('unsaved_modal.cancel')}
                            </button>
                            <button
                                type="button"
                                className="rounded-full border border-gray-300 bg-gray-100 px-4 py-2 text-sm font-semibold text-gray-800 hover:bg-gray-200"
                                onClick={() => {
                                    const instanceId = pendingCloseInstanceId;
                                    setPendingCloseInstanceId(null);
                                    setPendingCloseWidgetId(null);
                                    if (instanceId) {
                                        setDirtyWidgets((prev) => {
                                            const next = { ...prev };
                                            delete next[instanceId];
                                            return next;
                                        });
                                        closeWidget(instanceId);
                                    }
                                    if (pendingCloseQueue.length > 0) {
                                        closeWidgetsWithPrompt(pendingCloseQueue);
                                    }
                                }}
                            >
                                {t('unsaved_modal.discard')}
                            </button>
                            <button
                                type="button"
                                className="rounded-full bg-accent px-4 py-2 text-sm font-semibold text-text-dark shadow-sm hover:opacity-90"
                                onClick={() => {
                                    const instanceId = pendingCloseInstanceId;
                                    const widgetId = pendingCloseWidgetId;
                                    setPendingCloseInstanceId(null);
                                    setPendingCloseWidgetId(null);
                                    if (instanceId) {
                                        setPendingCloseAfterSave(instanceId);
                                        window.dispatchEvent(new CustomEvent('widget-save-request', { detail: { instanceId, widgetId } }));
                                    }
                                }}
                            >
                                {t('unsaved_modal.save')}
                            </button>
                        </div>
                    </div>
                </div>
            )}
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

            {contextMenu.isOpen && (
                <div
                    ref={contextMenuRef}
                    className="fixed z-[10000] min-w-[220px] bg-white/95 backdrop-blur-md rounded-lg shadow-xl border border-gray-200 py-2 text-sm text-text-dark"
                    style={{ left: contextMenu.x, top: contextMenu.y }}
                >
                    {contextMenu.source === 'file-manager-icon' ? (
                        <button
                            className="w-full text-left px-4 py-2 hover:bg-gray-100 flex items-center gap-2"
                            onClick={() => {
                                addWidget('file-manager');
                                setContextMenu(prev => ({ ...prev, isOpen: false, widgetId: null, windowInstanceId: null }));
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
                                            setPinnedWidgets(prev => prev.filter(id => id !== contextWidgetId));
                                        } else {
                                            setPinnedWidgets(prev => (prev.includes(contextWidgetId) ? prev : [...prev, contextWidgetId]));
                                        }
                                        setContextMenu(prev => ({ ...prev, isOpen: false, widgetId: null, windowInstanceId: null }));
                                    }}
                                >
                                    {contextIsPinned ? <PinOff size={16} /> : <Pin size={16} />}
                                    {contextIsPinned ? t('toolbar.remove_widget') : t('toolbar.add_widget')}
                                </button>
                            )}
                            <button
                                className="w-full text-left px-4 py-2 hover:bg-gray-100 flex items-center gap-2"
                                onClick={() => {
                                    toggleMinimize(contextWindow.instanceId);
                                    setContextMenu(prev => ({ ...prev, isOpen: false, windowInstanceId: null }));
                                }}
                            >
                                <Minimize2 size={16} />
                                {t('context_menu.minimize_window')}
                            </button>
                            <button
                                className="w-full text-left px-4 py-2 hover:bg-gray-100 flex items-center gap-2"
                                onClick={() => {
                                    toggleMaximize(contextWindow.instanceId);
                                    setContextMenu(prev => ({ ...prev, isOpen: false, windowInstanceId: null }));
                                }}
                            >
                                {contextWindow.isMaximized ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
                                {contextWindow.isMaximized ? t('context_menu.restore_window') : t('context_menu.maximize_window')}
                            </button>
                            <button
                                className="w-full text-left px-4 py-2 hover:bg-gray-100 flex items-center gap-2"
                                onClick={() => {
                                    requestCloseWidget(contextWindow.instanceId);
                                    setContextMenu(prev => ({ ...prev, isOpen: false, windowInstanceId: null }));
                                }}
                            >
                                <X size={16} />
                                {t('context_menu.close_window')}
                            </button>
                        </>
                    ) : (
                        <>
                            {showFavoriteAction && (
                                <>
                                    <button
                                        className="w-full text-left px-4 py-2 hover:bg-gray-100 flex items-center gap-2"
                                        onClick={() => {
                                            if (!contextWidgetId) return;
                                            if (contextIsPinned) {
                                                setPinnedWidgets(prev => prev.filter(id => id !== contextWidgetId));
                                            } else {
                                                setPinnedWidgets(prev => (prev.includes(contextWidgetId) ? prev : [...prev, contextWidgetId]));
                                            }
                                            setContextMenu(prev => ({ ...prev, isOpen: false, widgetId: null, windowInstanceId: null }));
                                        }}
                                    >
                                        {contextIsPinned ? <PinOff size={16} /> : <Pin size={16} />}
                                        {contextIsPinned ? t('toolbar.remove_widget') : t('toolbar.add_widget')}
                                    </button>
                                </>
                            )}
                            <button
                                className="w-full text-left px-4 py-2 hover:bg-gray-100 flex items-center gap-2"
                                onClick={() => openSettingsTab('widgets')}
                            >
                                <PlusSquare size={16} />
                                {t('context_menu.new_widget')}
                            </button>
                            {showWindowActions && <div className="my-1 border-t border-gray-200" />}
                            <button
                                className="w-full text-left px-4 py-2 hover:bg-gray-100 flex items-center gap-2"
                                onClick={() => openSettingsTab('profiles')}
                            >
                                <Users size={16} />
                                {t('context_menu.manage_profiles')}
                            </button>
                            <button
                                className="w-full text-left px-4 py-2 hover:bg-gray-100 flex items-center gap-2"
                                onClick={() => openSettingsTab('general')}
                            >
                                <Settings size={16} />
                                {t('context_menu.settings')}
                            </button>
                            <button
                                className="w-full text-left px-4 py-2 hover:bg-gray-100 flex items-center gap-2"
                                onClick={() => openSettingsTab('theme')}
                            >
                                <Image size={16} />
                                {t('context_menu.change_background')}
                            </button>
                            <div className="my-1 border-t border-gray-200" />
                            <button
                                className="w-full text-left px-4 py-2 hover:bg-gray-100 flex items-center justify-between gap-3"
                                onClick={() => {
                                    setToolbarHidden(!isToolbarHidden);
                                    setContextMenu(prev => ({ ...prev, isOpen: false }));
                                }}
                            >
                                <span>{isToolbarHidden ? t('context_menu.show_toolbar') : t('context_menu.hide_toolbar')}</span>
                                <span className={`h-4 w-4 rounded border ${!isToolbarHidden ? 'bg-accent border-accent' : 'border-gray-400'}`} />
                            </button>
                            <button
                                className="w-full text-left px-4 py-2 hover:bg-gray-100 flex items-center justify-between gap-3"
                                onClick={() => {
                                    toggleDateTime();
                                    setContextMenu(prev => ({ ...prev, isOpen: false }));
                                }}
                            >
                                <span>{showDateTime ? t('context_menu.hide_datetime') : t('context_menu.show_datetime')}</span>
                                <span className={`h-4 w-4 rounded border ${showDateTime ? 'bg-accent border-accent' : 'border-gray-400'}`} />
                            </button>
                            <button
                                className="w-full text-left px-4 py-2 hover:bg-gray-100 flex items-center justify-between gap-3"
                                onClick={() => {
                                    toggleSystemStats();
                                    setContextMenu(prev => ({ ...prev, isOpen: false }));
                                }}
                            >
                                <span>{showSystemStats ? t('context_menu.hide_system_stats') : t('context_menu.show_system_stats')}</span>
                                <span className={`h-4 w-4 rounded border ${showSystemStats ? 'bg-accent border-accent' : 'border-gray-400'}`} />
                            </button>
                            <button
                                className="w-full text-left px-4 py-2 hover:bg-gray-100 flex items-center justify-between gap-3"
                                onClick={() => {
                                    toggleProfileMenu();
                                    setContextMenu(prev => ({ ...prev, isOpen: false }));
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
                                            minimizeAllWindows();
                                            setContextMenu(prev => ({ ...prev, isOpen: false }));
                                        }}
                                    >
                                        <Minimize2 size={16} />
                                        {t('context_menu.minimize_windows')}
                                    </button>
                                    {contextMenu.windowInstanceId && (
                                        <button
                                            className="w-full text-left px-4 py-2 hover:bg-gray-100 flex items-center gap-2"
                                            onClick={() => {
                                                requestCloseWidget(contextMenu.windowInstanceId as string);
                                                setContextMenu(prev => ({ ...prev, isOpen: false, windowInstanceId: null }));
                                            }}
                                        >
                                            <X size={16} />
                                            {t('context_menu.close_window')}
                                        </button>
                                    )}
                                    <button
                                        className="w-full text-left px-4 py-2 hover:bg-gray-100 flex items-center gap-2"
                                        onClick={resetLayout}
                                    >
                                        <X size={16} />
                                        {t('context_menu.reset_layout')}
                                    </button>
                                </>
                            )}
                        </>
                    )}
                </div>
            )}
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
        const handleVceFavoritesUpdate = (event: Event) => {
            const detail = (event as CustomEvent<{ profileName?: string; favorites?: string[] }>).detail;
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
        };
        window.addEventListener('vce-favorites-update', handleVceFavoritesUpdate as EventListener);
        return () => window.removeEventListener('vce-favorites-update', handleVceFavoritesUpdate as EventListener);
    }, [setProfiles]);

    const activeProfile = profiles[activeProfileName] || Object.values(profiles)[0];
    const theme = activeProfile.theme || defaultTheme;

    const handleThemeChange = (newThemeOrUpdater: Theme | ((val: Theme) => Theme)) => {
        const currentTheme = activeProfile.theme;
        const newTheme = typeof newThemeOrUpdater === 'function' ? newThemeOrUpdater(currentTheme) : newThemeOrUpdater;
        const newProfileData = { ...activeProfile, theme: newTheme };
        setProfiles(prev => ({ ...prev, [activeProfileName]: newProfileData }));
    };

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
    }, [theme['--wallpaper'], handleThemeChange]);

    useEffect(() => {
        window.dispatchEvent(new CustomEvent('active-profile-change', { detail: { name: activeProfileName } }));
    }, [activeProfileName]);

    useEffect(() => {
        window.dispatchEvent(new Event('profiles-updated'));
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
