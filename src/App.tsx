// src/App.tsx

import { Suspense, useState, useEffect, useRef, useCallback } from 'react';
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
import { PlusSquare, Image, Settings, X, Users, Maximize2, Minimize2, Pin, PinOff } from 'lucide-react';
import { defaultWallpaperValue, isWallpaperValueValid } from './utils/wallpapers';
import { withBaseUrl } from './utils/assetPaths';
import { getWidgetHelpText } from './utils/widgetHelp';
import { emitFileOpen } from './utils/fileOpenBus';
import type { SaveDialogResult } from './utils/saveDialog';
import { FILE_MANAGER_ROOT_ID, createFolder, getAllEntries, listEntriesByParent, type FileManagerEntry } from './utils/fileManagerDb';
import type { OpenDialogResult, OpenDialogOptions } from './utils/openDialog';
// --- ¡AQUÍ ESTÁ EL CAMBIO! Importamos el nuevo componente ---
import { ProfileSwitcher } from './components/core/ProfileSwitcher';

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
    const [saveDialogState, setSaveDialogState] = useState<{ isOpen: boolean }>({ isOpen: false });
    const saveDialogResolverRef = useRef<((result: SaveDialogResult) => void) | null>(null);
    const [saveDialogFolders, setSaveDialogFolders] = useState<{ id: string; label: string }[]>([]);
    const [saveDialogFolderId, setSaveDialogFolderId] = useState(FILE_MANAGER_ROOT_ID);
    const [saveDialogFilename, setSaveDialogFilename] = useState('');
    const [saveDialogSuggestedFilename, setSaveDialogSuggestedFilename] = useState('');
    const [openDialogState, setOpenDialogState] = useState<{
        isOpen: boolean;
        options: OpenDialogOptions;
    }>({ isOpen: false, options: {} });
    const openDialogResolverRef = useRef<((result: OpenDialogResult | null) => void) | null>(null);
    const [openDialogFolderId, setOpenDialogFolderId] = useState(FILE_MANAGER_ROOT_ID);
    const [openDialogEntries, setOpenDialogEntries] = useState<FileManagerEntry[]>([]);
    const [openDialogSelectedIds, setOpenDialogSelectedIds] = useState<string[]>([]);
    const [openDialogFolderLabel, setOpenDialogFolderLabel] = useState('');
    const [openDialogParentId, setOpenDialogParentId] = useState(FILE_MANAGER_ROOT_ID);
    const openDialogInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (fileManagerIconPosition.y >= 32) return;
        setFileManagerIconPosition((prev) => ({ ...prev, y: 32 }));
    }, [fileManagerIconPosition.y, setFileManagerIconPosition]);

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
                setSaveDialogFolders(options);
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
        if (!openDialogState.isOpen) return;
        let isMounted = true;
        const loadEntries = async () => {
            const entries = await listEntriesByParent(openDialogFolderId);
            const allEntries = await getAllEntries();
            const folders = allEntries.filter((entry) => entry.type === 'folder');
            const byId = new Map(folders.map((entry) => [entry.id, entry]));
            const current = byId.get(openDialogFolderId);
            const labelFor = (entry: FileManagerEntry) => {
                const parts: string[] = [];
                let cursor: FileManagerEntry | undefined = entry;
                while (cursor && cursor.id !== FILE_MANAGER_ROOT_ID) {
                    parts.unshift(cursor.name);
                    cursor = byId.get(cursor.parentId);
                }
                return parts.join(' / ') || t('open_dialog.root_folder');
            };
            const folderLabel = current ? labelFor(current) : t('open_dialog.root_folder');
            const parentId = current?.parentId || FILE_MANAGER_ROOT_ID;
            if (isMounted) {
                setOpenDialogEntries(entries);
                setOpenDialogFolderLabel(folderLabel);
                setOpenDialogParentId(parentId);
                setOpenDialogSelectedIds([]);
            }
        };
        loadEntries();
        return () => {
            isMounted = false;
        };
    }, [openDialogFolderId, openDialogState.isOpen, t]);

    const getSaveDialogFilename = useCallback(() => {
        const trimmed = saveDialogFilename.trim();
        if (trimmed) return trimmed;
        const fallback = saveDialogSuggestedFilename.trim() || t('save_dialog.default_filename');
        return fallback.trim() || 'archivo';
    }, [saveDialogFilename, saveDialogSuggestedFilename, t]);

    const closeOpenDialog = useCallback((result: OpenDialogResult | null) => {
        const resolver = openDialogResolverRef.current;
        openDialogResolverRef.current = null;
        setOpenDialogState((prev) => ({ ...prev, isOpen: false }));
        if (resolver) resolver(result);
    }, []);
    const [contextMenu, setContextMenu] = useState<{
        isOpen: boolean;
        x: number;
        y: number;
        widgetId: string | null;
        windowInstanceId: string | null;
    }>({
        isOpen: false,
        x: 0,
        y: 0,
        widgetId: null,
        windowInstanceId: null,
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
        if (!widgetConfig) return;
        const newZ = highestZ + 1;
        setHighestZ(newZ);
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

        const newWidget: ActiveWidget = {
            instanceId: `${widgetId}-${Date.now()}`,
            widgetId: widgetId,
            position: { 
                x: Math.max(margin, Math.random() * maxX), 
                y: Math.max(margin, Math.random() * maxY) 
            },
            size: { width: widthValue, height: heightValue },
            zIndex: newZ,
        };
        setActiveWidgets(prev => [...prev, newWidget]);
        setActiveWindowId(newWidget.instanceId);
    };

    const addWidgetRef = useRef(addWidget);
    useEffect(() => {
        addWidgetRef.current = addWidget;
    }, [addWidget]);

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
            const custom = event as CustomEvent<{ resolve?: (result: SaveDialogResult) => void; suggestedFilename?: string }>;
            if (!custom.detail?.resolve) return;
            if (saveDialogResolverRef.current) {
                saveDialogResolverRef.current(null);
            }
            saveDialogResolverRef.current = custom.detail.resolve;
            const suggested = custom.detail.suggestedFilename?.trim() || t('save_dialog.default_filename');
            setSaveDialogSuggestedFilename(suggested);
            setSaveDialogFilename(suggested);
            setSaveDialogState({ isOpen: true });
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
            setOpenDialogState({ isOpen: true, options: custom.detail.options ?? {} });
        };
        window.addEventListener('open-dialog-request', handler as EventListener);
        return () => window.removeEventListener('open-dialog-request', handler as EventListener);
    }, []);

    const closeWidget = (instanceId: string) => setActiveWidgets(prev => {
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
        });
    };

    const resetLayout = () => {
        setActiveWidgets([]);
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
    }, [showDateTime, formattedDate, formattedTime, i18n.language]);

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
                    <div className="text-4xl font-semibold leading-tight">{formattedTime}</div>
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
                const helpText = getWidgetHelpText(widget.widgetId);
                return (
                    <WidgetWindow
                        key={widget.instanceId}
                        id={widget.instanceId}
                        title={t(config.title)}
                        icon={config.icon}
                        helpText={helpText}
                        position={widget.position}
                        size={widget.size}
                        zIndex={widget.zIndex}
                        isMinimized={widget.isMinimized}
                        isMaximized={widget.isMaximized}
                        onToggleMinimize={() => toggleMinimize(widget.instanceId)}
                        onToggleMaximize={() => toggleMaximize(widget.instanceId)}
                        onClose={() => closeWidget(widget.instanceId)}
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
                    >
                        <Suspense
                            fallback={
                                <div className="flex items-center justify-center h-full text-sm text-gray-500">
                                    {t('loading')}
                                </div>
                            }
                        >
                            <Component />
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
                onDrag={(_, data) => setFileManagerIconPosition({ x: data.x, y: data.y })}
                onDragStop={(_, data) => setFileManagerIconPosition({ x: data.x, y: data.y })}
                dragHandleClassName="file-manager-desktop-icon"
                className="z-[10001]"
            >
                <div
                    role="button"
                    tabIndex={0}
                    onDoubleClick={() => addWidget('file-manager')}
                    onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault();
                            addWidget('file-manager');
                        }
                    }}
                    className="file-manager-desktop-icon flex h-full w-full flex-col items-center justify-center gap-1 bg-transparent text-text-dark select-none cursor-default touch-none"
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
                    className="fixed inset-0 z-[10002] flex items-center justify-center bg-black/50"
                    onClick={() => closeSaveDialog(null)}
                >
                    <div
                        className="w-full max-w-md rounded-2xl bg-white/95 px-6 py-5 text-text-dark shadow-2xl backdrop-blur-xl"
                        onClick={(event) => event.stopPropagation()}
                        role="dialog"
                        aria-modal="true"
                    >
                        <h3 className="text-lg font-semibold">{t('save_dialog.title')}</h3>
                        <p className="mt-2 text-sm text-gray-600">{t('save_dialog.description')}</p>
                        <div className="mt-4">
                            <label className="text-sm font-semibold text-gray-700" htmlFor="save-filename-input">
                                {t('save_dialog.filename_label')}
                            </label>
                            <input
                                id="save-filename-input"
                                type="text"
                                className="mt-2 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                                value={saveDialogFilename}
                                onChange={(event) => setSaveDialogFilename(event.target.value)}
                            />
                        </div>
                        <div className="mt-4">
                            <label className="text-sm font-semibold text-gray-700" htmlFor="save-folder-select">
                                {t('save_dialog.folder_label')}
                            </label>
                            <div className="mt-2 flex items-center gap-2">
                                <select
                                    id="save-folder-select"
                                    className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm"
                                    value={saveDialogFolderId}
                                    onChange={(event) => setSaveDialogFolderId(event.target.value)}
                                >
                                    {saveDialogFolders.map((option) => (
                                        <option key={option.id} value={option.id}>
                                            {option.label}
                                        </option>
                                    ))}
                                </select>
                                <button
                                    type="button"
                                    className="rounded-full border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-100"
                                    onClick={async () => {
                                        const name = window.prompt(t('widgets.file_manager.new_folder_prompt'));
                                        if (!name) return;
                                        const trimmed = name.trim();
                                        if (!trimmed) return;
                                        const folder = await createFolder(trimmed, saveDialogFolderId);
                                        setSaveDialogFolderId(folder.id);
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
                                        setSaveDialogFolders(options);
                                    }}
                                >
                                    {t('save_dialog.new_folder')}
                                </button>
                            </div>
                        </div>
                        <div className="mt-6 flex flex-wrap justify-end gap-2">
                            <button
                                type="button"
                                className="rounded-full border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-100"
                                onClick={() => closeSaveDialog(null)}
                            >
                                {t('save_dialog.cancel')}
                            </button>
                            <button
                                type="button"
                                className="rounded-full border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-100"
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
                    className="fixed inset-0 z-[10002] flex items-center justify-center bg-black/50"
                    onClick={() => closeOpenDialog(null)}
                >
                    <div
                        className="w-full max-w-3xl rounded-2xl bg-white/95 px-6 py-5 text-text-dark shadow-2xl backdrop-blur-xl"
                        onClick={(event) => event.stopPropagation()}
                        role="dialog"
                        aria-modal="true"
                    >
                        <h3 className="text-lg font-semibold">{t('open_dialog.title')}</h3>
                        <p className="mt-2 text-sm text-gray-600">{t('open_dialog.description')}</p>
                        <div className="mt-4 grid gap-4 md:grid-cols-[2fr_1fr]">
                            <div className="rounded-xl border border-gray-200 p-4">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <div className="text-sm font-semibold text-gray-700">{t('open_dialog.file_manager')}</div>
                                        <div className="text-xs text-gray-500">{openDialogFolderLabel}</div>
                                    </div>
                                    <button
                                        type="button"
                                        className="rounded-full border border-gray-200 px-3 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-100 disabled:cursor-not-allowed"
                                        onClick={() => setOpenDialogFolderId(openDialogParentId)}
                                        disabled={openDialogFolderId === FILE_MANAGER_ROOT_ID}
                                    >
                                        {t('open_dialog.up')}
                                    </button>
                                </div>
                                <div className="mt-3 max-h-64 overflow-y-auto">
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
                                                                isSelected ? 'bg-accent/40' : 'hover:bg-gray-100'
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
                                                            <span className="truncate">
                                                                {entry.type === 'folder' ? '📁 ' : '📄 '}
                                                                {entry.name}
                                                            </span>
                                                            {entry.type === 'file' && (
                                                                <span className="text-xs text-gray-400">
                                                                    {entry.size ? `${Math.round(entry.size / 1024)} KB` : ''}
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
                            <div className="rounded-xl border border-gray-200 p-4">
                                <div className="text-sm font-semibold text-gray-700">{t('open_dialog.local')}</div>
                                <p className="mt-2 text-xs text-gray-500">{t('open_dialog.local_hint')}</p>
                                <button
                                    type="button"
                                    className="mt-4 w-full rounded-full border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-100"
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
                                className="rounded-full border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-100"
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

            {contextMenu.isOpen && (
                <div
                    ref={contextMenuRef}
                    className="fixed z-[10000] min-w-[220px] bg-white/95 backdrop-blur-md rounded-lg shadow-xl border border-gray-200 py-2 text-sm text-text-dark"
                    style={{ left: contextMenu.x, top: contextMenu.y }}
                >
                    {contextMenu.windowInstanceId && contextWindow ? (
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
                                    closeWidget(contextWindow.instanceId);
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
                                                closeWidget(contextMenu.windowInstanceId as string);
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
            pinnedWidgets: ['work-list', 'timer', 'file-opener', 'vce-community'],
            vceFavorites: [],
        },
    });
    const [profileOrder, setProfileOrder] = useLocalStorage<string[]>('profile-order', []);
    const [activeProfileName, setActiveProfileName] = useLocalStorage<string>(
        'active-profile-name',
        'Escritorio Principal'
    );

    useEffect(() => {
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
