// src/App.tsx

import { Suspense, useState, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
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
import { PlusSquare, Image, Settings, X, Users, Maximize2, Minimize2, PinOff } from 'lucide-react';
import { defaultWallpaperValue, isWallpaperValueValid } from './utils/wallpapers';
import { withBaseUrl } from './utils/assetPaths';
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

    const setActiveWidgets = useCallback((updater: React.SetStateAction<ActiveWidget[]>) => {
        const updatedWidgets = typeof updater === 'function' ? updater(activeProfile.activeWidgets) : updater;
        const newProfileData: DesktopProfile = { ...activeProfile, activeWidgets: updatedWidgets };
        setProfiles(prev => ({ ...prev, [activeProfileName]: newProfileData }));
    }, [activeProfile, activeProfileName, setProfiles]);

    const setPinnedWidgets = useCallback((updater: React.SetStateAction<string[]>) => {
        const updatedPinned = typeof updater === 'function' ? updater(activeProfile.pinnedWidgets) : updater;
        const newProfileData: DesktopProfile = { ...activeProfile, pinnedWidgets: updatedPinned };
        setProfiles(prev => ({ ...prev, [activeProfileName]: newProfileData }));
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

    const [highestZ, setHighestZ] = useState(100);
    const [isSettingsOpen, setSettingsOpen] = useState(false);
    const [isCreditsOpen, setIsCreditsOpen] = useState(false);
    const [isAboutOpen, setIsAboutOpen] = useState(false);
    const startButtonRef = useRef<HTMLButtonElement>(null);
    const [isStartMenuOpen, setIsStartMenuOpen] = useState(false);
    const [startMenuAnchor, setStartMenuAnchor] = useState<DOMRect | null>(null);
    const [settingsInitialTab, setSettingsInitialTab] = useState<'general' | 'profiles' | 'widgets' | 'theme'>('general');
    const [isToolbarHidden, setToolbarHidden] = useLocalStorage<boolean>('toolbar-hidden', false);
    const [isToolbarPeek, setToolbarPeek] = useState(false);
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
        const widthValue = typeof widget.size.width === 'number' ? Math.min(widget.size.width, maxWidth) : widget.size.width;
        const heightValue = typeof widget.size.height === 'number' ? Math.min(widget.size.height, maxHeight) : widget.size.height;
        const numericWidth = typeof widthValue === 'number' ? widthValue : maxWidth;
        const numericHeight = typeof heightValue === 'number' ? heightValue : maxHeight;
        const maxX = Math.max(margin, window.innerWidth - numericWidth - margin);
        const maxY = Math.max(margin, window.innerHeight - numericHeight - margin);
        const x = Math.min(Math.max(widget.position.x, margin), maxX);
        const y = Math.min(Math.max(widget.position.y, margin), maxY);
        return {
            ...widget,
            size: { width: widthValue, height: heightValue },
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
    };

    const closeWidget = (instanceId: string) => setActiveWidgets(prev => prev.filter(w => w.instanceId !== instanceId));
    const focusWidget = (instanceId: string) => {
        const newZ = highestZ + 1;
        setHighestZ(newZ);
        setActiveWidgets(prev => prev.map(w => (w.instanceId === instanceId ? { ...w, zIndex: newZ } : w)));
    };
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
            return;
        }
        setActiveWidgets(prev =>
            prev.map(w => (w.instanceId === instanceId ? { ...w, isMinimized: true } : w))
        );
    }, [activeProfile.activeWidgets, highestZ, setActiveWidgets, setHighestZ]);
    const minimizeAllWindows = useCallback(() => {
        setActiveWidgets(prev => prev.map(w => ({ ...w, isMinimized: true })));
    }, [setActiveWidgets]);
    const restoreAllWindows = useCallback(() => {
        setActiveWidgets(prev => prev.map(w => ({ ...w, isMinimized: false })));
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

    const toggleStartMenu = (anchorRect: DOMRect) => {
        setStartMenuAnchor(anchorRect);
        setIsStartMenuOpen((prev) => !prev);
    };

    const handleContextMenu = (event: React.MouseEvent<Element>, widgetId?: string, force = false) => {
        if (!force && !widgetId && event.target !== event.currentTarget) return;
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
        setContextMenu({
            isOpen: true,
            x: event.clientX,
            y: event.clientY,
            widgetId: null,
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
        return () => window.clearInterval(intervalId);
    }, []);

    useEffect(() => {
        const updateScreenSize = () => {
            setScreenSize({ width: window.screen.width, height: window.screen.height });
        };
        updateScreenSize();
        window.addEventListener('resize', updateScreenSize);
        return () => window.removeEventListener('resize', updateScreenSize);
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
    const hasMinimizedWidgets = activeProfile.activeWidgets.some((widget) => widget.isMinimized);
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
                return (
                    <WidgetWindow
                        key={widget.instanceId}
                        id={widget.instanceId}
                        title={t(config.title)}
                        position={widget.position}
                        size={widget.size}
                        zIndex={widget.zIndex}
                        isMinimized={widget.isMinimized}
                        isMaximized={widget.isMaximized}
                        onToggleMinimize={() => toggleMinimize(widget.instanceId)}
                        onToggleMaximize={() => toggleMaximize(widget.instanceId)}
                        onClose={() => closeWidget(widget.instanceId)}
                        onFocus={() => focusWidget(widget.instanceId)}
                        onDragStop={(_e, d) => setActiveWidgets(prev => prev.map(w => (w.instanceId === widget.instanceId ? { ...w, position: { x: d.x, y: d.y } } : w)))}
                        onResizeStop={(_e, _direction, ref, _delta, position) => setActiveWidgets(prev => prev.map(w => (w.instanceId === widget.instanceId ? { ...w, size: { width: ref.style.width, height: ref.style.height }, position } : w)))}
                        onOpenContextMenu={(event) => handleContextMenu(event, undefined, true)}
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
            />
            <button
                ref={startButtonRef}
                onClick={(event) => toggleStartMenu(event.currentTarget.getBoundingClientRect())}
                onContextMenu={(event) => handleContextMenu(event, undefined, true)}
                className={`fixed bottom-4 left-4 z-[10001] flex items-center gap-2 px-4 py-2 rounded-full shadow-lg border border-black/10 backdrop-blur-md transition ${isStartMenuOpen ? 'bg-accent text-text-dark' : 'bg-white/90 text-text-dark hover:bg-white'}`}
                title={t('toolbar.start')}
                aria-label={t('toolbar.start')}
            >
                <img src={withBaseUrl('escritorio-digital.png')} alt={t('toolbar.start')} width="22" height="22" />
                <span className="text-sm font-semibold">{t('toolbar.start')}</span>
            </button>
            <StartMenu
                isOpen={isStartMenuOpen}
                onClose={() => setIsStartMenuOpen(false)}
                onAddWidget={addWidget}
                onOpenSettingsTab={openSettingsTab}
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
            <AboutModal
                isOpen={isAboutOpen}
                onClose={() => setIsAboutOpen(false)}
            />
            <SettingsModal
                isOpen={isSettingsOpen}
                onClose={() => setSettingsOpen(false)}
                initialTab={settingsInitialTab}
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
            <ProfileSwitcher
              profiles={profiles}
              activeProfileName={activeProfileName}
              setActiveProfileName={setActiveProfileName}
              setProfiles={setProfiles}
              onManageProfiles={() => openSettingsTab('profiles')}
              onOpenContextMenu={(event) => handleContextMenu(event, undefined, true)}
              profileOrder={profileOrder}
            />

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
                    {contextMenu.widgetId && (
                        <>
                            <button
                                className="w-full text-left px-4 py-2 hover:bg-gray-100 flex items-center gap-2"
                                onClick={() => {
                                    setPinnedWidgets(prev => prev.filter(id => id !== contextMenu.widgetId));
                                    setContextMenu(prev => ({ ...prev, isOpen: false, widgetId: null }));
                                }}
                            >
                                <PinOff size={16} />
                                {t('toolbar.remove_widget')}
                            </button>
                            <div className="my-1 border-t border-gray-200" />
                        </>
                    )}
                    {contextMenu.windowInstanceId && (
                        <>
                            <button
                                className="w-full text-left px-4 py-2 hover:bg-gray-100 text-red-700 flex items-center gap-2"
                                onClick={() => {
                                    closeWidget(contextMenu.windowInstanceId as string);
                                    setContextMenu(prev => ({ ...prev, isOpen: false, windowInstanceId: null }));
                                }}
                            >
                                <X size={16} />
                                {t('context_menu.close_window')}
                            </button>
                            <div className="my-1 border-t border-gray-200" />
                        </>
                    )}
                    <button
                        className="w-full text-left px-4 py-2 hover:bg-gray-100 flex items-center gap-2"
                        onClick={() => openSettingsTab('widgets')}
                    >
                        <PlusSquare size={16} />
                        {t('context_menu.new_widget')}
                    </button>
                    <div className="my-1 border-t border-gray-200" />
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
                            toggleDateTime();
                            setContextMenu(prev => ({ ...prev, isOpen: false }));
                        }}
                    >
                        <span>{t('context_menu.show_datetime')}</span>
                        <span className={`h-4 w-4 rounded border ${showDateTime ? 'bg-accent border-accent' : 'border-gray-400'}`} />
                    </button>
                    <button
                        className="w-full text-left px-4 py-2 hover:bg-gray-100 flex items-center justify-between gap-3"
                        onClick={() => {
                            toggleSystemStats();
                            setContextMenu(prev => ({ ...prev, isOpen: false }));
                        }}
                    >
                        <span>{t('context_menu.show_system_stats')}</span>
                        <span className={`h-4 w-4 rounded border ${showSystemStats ? 'bg-accent border-accent' : 'border-gray-400'}`} />
                    </button>
                    <button
                        className="w-full text-left px-4 py-2 hover:bg-gray-100 flex items-center justify-between gap-3"
                        onClick={() => {
                            setToolbarHidden(!isToolbarHidden);
                            setContextMenu(prev => ({ ...prev, isOpen: false }));
                        }}
                    >
                        <span>{t('context_menu.show_toolbar')}</span>
                        <span className={`h-4 w-4 rounded border ${!isToolbarHidden ? 'bg-accent border-accent' : 'border-gray-400'}`} />
                    </button>
                    {hasOpenWidgets && (
                        <>
                            <div className="my-2 border-t-2 border-gray-200" />
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
                            {hasMinimizedWidgets && (
                                <button
                                    className="w-full text-left px-4 py-2 hover:bg-gray-100 flex items-center gap-2"
                                    onClick={() => {
                                        restoreAllWindows();
                                        setContextMenu(prev => ({ ...prev, isOpen: false }));
                                    }}
                                >
                                    <Maximize2 size={16} />
                                    {t('context_menu.restore_windows')}
                                </button>
                            )}
                            <button
                                className="w-full text-left px-4 py-2 hover:bg-gray-100 text-red-700 flex items-center gap-2"
                                onClick={resetLayout}
                            >
                                <X size={16} />
                                {t('context_menu.reset_layout')}
                            </button>
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
            pinnedWidgets: ['work-list', 'timer', 'file-opener'],
        },
    });
    const [profileOrder, setProfileOrder] = useLocalStorage<string[]>('profile-order', []);
    const [activeProfileName, setActiveProfileName] = useLocalStorage<string>(
        'active-profile-name',
        'Escritorio Principal'
    );

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
        const root = document.documentElement;
        for (const [key, value] of Object.entries(theme)) {
            if (key.startsWith('--') && key !== '--wallpaper') {
                root.style.setProperty(key, value as string);
            }
        }
    }, [theme]);

    useEffect(() => {
        if (theme['--wallpaper'] && !isWallpaperValueValid(theme['--wallpaper'])) {
            handleThemeChange((prevTheme) => ({ ...prevTheme, '--wallpaper': defaultWallpaperValue }));
        }
    }, [theme['--wallpaper']]);

    useEffect(() => {
        window.dispatchEvent(new CustomEvent('active-profile-change', { detail: { name: activeProfileName } }));
    }, [activeProfileName]);

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
