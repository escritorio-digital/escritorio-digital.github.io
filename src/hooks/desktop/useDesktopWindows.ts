import { useCallback, useEffect, useRef, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { WIDGET_REGISTRY } from '../../components/widgets';
import { emitFileOpen } from '../../utils/fileOpenBus';
import type { ActiveWidget, DesktopProfile } from '../../types';
import { notifyWidgetClosed, onDesktopEvent } from '../../utils/desktopEvents';
import { usePendingWidgetClose } from './usePendingWidgetClose';

const MULTI_INSTANCE_FILE_OPEN_WIDGET_IDS = new Set([
    'attendance',
    'drawing-pad',
    'group-generator',
    'markdown-text-editor',
    'notepad',
    'work-list',
]);

type UseDesktopWindowsParams = {
    activeWidgets: ActiveWidget[];
    widgetPreferences: DesktopProfile['widgetPreferences'];
    activeProfileName: string;
    popupWidgetIds: Set<string>;
    setActiveWidgets: Dispatch<SetStateAction<ActiveWidget[]>>;
    toggleWidgetFloating: (instanceId: string, enable?: boolean) => void;
};

type UseDesktopWindowsResult = {
    activeWindowId: string | null;
    pendingCloseWidgetId: string | null;
    pendingCloseInstanceId: string | null;
    pendingCloseQueue: string[];
    addWidget: (widgetId: string) => string | null;
    closeWidget: (instanceId: string) => void;
    focusWidget: (instanceId: string) => void;
    requestCloseWidget: (instanceId: string) => void;
    requestCloseAll: () => void;
    closeWidgetsWithPrompt: (instanceIds: string[]) => void;
    cancelPendingClose: () => void;
    discardPendingClose: () => void;
    savePendingClose: () => void;
    toggleMinimize: (instanceId: string) => void;
    toggleMaximize: (instanceId: string) => void;
    handleTaskClick: (instanceId: string) => void;
    minimizeAllWindows: () => void;
};

export function useDesktopWindows({
    activeWidgets,
    widgetPreferences,
    activeProfileName,
    popupWidgetIds,
    setActiveWidgets,
    toggleWidgetFloating,
}: UseDesktopWindowsParams): UseDesktopWindowsResult {
    const [highestZ, setHighestZ] = useState(100);
    const highestZRef = useRef(100);
    const [activeWindowId, setActiveWindowId] = useState<string | null>(null);

    useEffect(() => {
        const maxZ = activeWidgets.reduce(
            (max, widget) => (widget.zIndex > max ? widget.zIndex : max),
            100
        );
        setHighestZ((prev) => (prev < maxZ ? maxZ : prev));
    }, [activeWidgets]);

    useEffect(() => {
        highestZRef.current = highestZ;
    }, [highestZ]);

    useEffect(() => {
        if (activeWidgets.length === 0) {
            setActiveWindowId(null);
            return;
        }
        if (!activeWindowId || !activeWidgets.some((widget) => widget.instanceId === activeWindowId)) {
            const nextActive = activeWidgets.reduce<ActiveWidget | null>((acc, item) => {
                if (!acc) return item;
                return item.zIndex > acc.zIndex ? item : acc;
            }, null);
            setActiveWindowId(nextActive ? nextActive.instanceId : null);
        }
    }, [activeWidgets, activeWindowId]);

    const getViewportBounds = useCallback(() => {
        const margin = 16;
        const maxWidth = Math.max(200, window.innerWidth - margin * 2);
        const maxHeight = Math.max(150, window.innerHeight - margin * 2);
        return { margin, maxWidth, maxHeight };
    }, []);

    const clampWidgetToViewport = useCallback((widget: ActiveWidget): ActiveWidget => {
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
    }, [getViewportBounds]);

    const addWidget = useCallback((widgetId: string) => {
        const widgetConfig = WIDGET_REGISTRY[widgetId];
        if (!widgetConfig) return null;
        const newZ = highestZ + 1;
        setHighestZ(newZ);
        const widgetDefaults = widgetPreferences?.[widgetId];
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
        const shouldFloat = Boolean(widgetDefaults?.floating);
        const defaultPosition = {
            x: Math.max(margin, Math.random() * maxX),
            y: Math.max(margin, Math.random() * maxY),
        };
        const defaultSize = { width: widthValue, height: heightValue };
        const newWidget: ActiveWidget = {
            instanceId: `${widgetId}-${Date.now()}`,
            widgetId,
            position: shouldMaximize ? { x: 0, y: 0 } : defaultPosition,
            size: shouldMaximize ? { width: '100vw', height: '100vh' } : defaultSize,
            zIndex: newZ,
            zoom: widgetDefaults?.zoom ?? 1,
            toolbarPinned: widgetDefaults?.toolbarPinned ?? !popupWidgetIds.has(widgetId),
            isMaximized: shouldMaximize,
            previousPosition: shouldMaximize ? defaultPosition : undefined,
            previousSize: shouldMaximize ? defaultSize : undefined,
            windowStyleOverride: shouldFloat ? 'floating' : undefined,
        };
        setActiveWidgets((prev) => [...prev, newWidget]);
        setActiveWindowId(newWidget.instanceId);
        return newWidget.instanceId;
    }, [getViewportBounds, highestZ, popupWidgetIds, setActiveWidgets, widgetPreferences]);

    const addWidgetRef = useRef(addWidget);
    const clampWidgetToViewportRef = useRef(clampWidgetToViewport);

    useEffect(() => {
        addWidgetRef.current = addWidget;
    }, [addWidget]);

    useEffect(() => {
        clampWidgetToViewportRef.current = clampWidgetToViewport;
    }, [clampWidgetToViewport]);

    useEffect(() => {
        return onDesktopEvent('open-widget', (detail) => {
            if (!detail?.widgetId) return;
            addWidgetRef.current(detail.widgetId);
        });
    }, []);

    useEffect(() => {
        return onDesktopEvent('widget-toggle-floating', (detail) => {
            if (!detail?.instanceId) return;
            toggleWidgetFloating(detail.instanceId, detail.enable);
        });
    }, [toggleWidgetFloating]);

    useEffect(() => {
        return onDesktopEvent('widget-resize-request', (detail) => {
            if (!detail?.instanceId || !detail.size) return;
            const { instanceId, size } = detail;
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
        });
    }, [setActiveWidgets]);

    const closeWidget = useCallback((instanceId: string) => {
        setActiveWidgets((prev) => {
            const target = prev.find((widget) => widget.instanceId === instanceId);
            if (target) {
                notifyWidgetClosed(instanceId, target.widgetId);
            }
            const next = prev.filter((widget) => widget.instanceId !== instanceId);
            if (activeWindowId === instanceId) {
                const nextActive = next.reduce<ActiveWidget | null>((acc, item) => {
                    if (!acc) return item;
                    return item.zIndex > acc.zIndex ? item : acc;
                }, null);
                setActiveWindowId(nextActive ? nextActive.instanceId : null);
            }
            return next;
        });
    }, [activeWindowId, setActiveWidgets]);

    const closeAllWidgetsImmediately = useCallback(() => {
        setActiveWidgets([]);
        setActiveWindowId(null);
    }, [setActiveWidgets]);

    const focusWidget = useCallback((instanceId: string) => {
        const newZ = highestZRef.current + 1;
        highestZRef.current = newZ;
        setHighestZ(newZ);
        setActiveWidgets((widgets) =>
            widgets.map((widget) => (widget.instanceId === instanceId ? { ...widget, zIndex: newZ } : widget))
        );
        setActiveWindowId(instanceId);
    }, [setActiveWidgets]);

    useEffect(() => {
        return onDesktopEvent('file-manager-open', (detail) => {
            if (!detail?.widgetId) return;
            const existingForEntry = activeWidgets.find(
                (widget) => widget.widgetId === detail.widgetId && widget.openedEntryId === detail.entryId
            );
            if (existingForEntry) {
                setActiveWidgets((widgets) =>
                    widgets.map((widget) =>
                        widget.instanceId === existingForEntry.instanceId ? { ...widget, isMinimized: false } : widget
                    )
                );
                focusWidget(existingForEntry.instanceId);
                return;
            }
            if (MULTI_INSTANCE_FILE_OPEN_WIDGET_IDS.has(detail.widgetId)) {
                const instanceId = addWidgetRef.current(detail.widgetId);
                window.setTimeout(() => {
                    emitFileOpen(detail.widgetId, { entryId: detail.entryId, instanceId: instanceId ?? undefined });
                }, 50);
                return;
            }
            const sameWidgets = activeWidgets.filter((widget) => widget.widgetId === detail.widgetId);
            if (sameWidgets.length > 0) {
                const target = sameWidgets.reduce((acc, item) => (item.zIndex > acc.zIndex ? item : acc));
                setActiveWidgets((widgets) =>
                    widgets.map((widget) =>
                        widget.instanceId === target.instanceId ? { ...widget, isMinimized: false } : widget
                    )
                );
                focusWidget(target.instanceId);
            } else {
                addWidgetRef.current(detail.widgetId);
            }
            window.setTimeout(() => {
                emitFileOpen(detail.widgetId, { entryId: detail.entryId });
            }, 50);
        });
    }, [activeWidgets, focusWidget, setActiveWidgets]);

    useEffect(() => {
        return onDesktopEvent('widget-title-update', (detail) => {
            if (!detail?.instanceId) return;
            const nextTitle = detail.title?.trim() ?? '';
            setActiveWidgets((prev) =>
                prev.map((widget) =>
                    widget.instanceId === detail.instanceId
                        ? { ...widget, titleOverride: nextTitle || undefined }
                        : widget
                )
            );
        });
    }, [setActiveWidgets]);

    useEffect(() => {
        return onDesktopEvent('widget-entry-opened', (detail) => {
            if (!detail?.instanceId) return;
            setActiveWidgets((prev) =>
                prev.map((widget) =>
                    widget.instanceId === detail.instanceId
                        ? { ...widget, openedEntryId: detail.entryId || undefined }
                        : widget
                )
            );
        });
    }, [setActiveWidgets]);

    const {
        pendingCloseWidgetId,
        pendingCloseInstanceId,
        pendingCloseQueue,
        closeWidgetsWithPrompt,
        requestCloseWidget,
        requestCloseAll,
        cancelPendingClose,
        discardPendingClose,
        savePendingClose,
    } = usePendingWidgetClose({
        activeWidgets,
        closeWidget,
        closeAllWidgetsImmediately,
    });

    const toggleMinimize = useCallback((instanceId: string) => {
        setActiveWidgets((prev) =>
            prev.map((widget) => (
                widget.instanceId === instanceId ? { ...widget, isMinimized: !widget.isMinimized } : widget
            ))
        );
    }, [setActiveWidgets]);

    const handleTaskClick = useCallback((instanceId: string) => {
        const target = activeWidgets.find((widget) => widget.instanceId === instanceId);
        if (!target) return;
        if (target.isMinimized) {
            const newZ = highestZ + 1;
            setHighestZ(newZ);
            setActiveWidgets((prev) =>
                prev.map((widget) => (
                    widget.instanceId === instanceId ? { ...widget, isMinimized: false, zIndex: newZ } : widget
                ))
            );
            setActiveWindowId(instanceId);
            return;
        }
        if (activeWindowId !== instanceId) {
            focusWidget(instanceId);
            return;
        }
        setActiveWidgets((prev) =>
            prev.map((widget) => (
                widget.instanceId === instanceId ? { ...widget, isMinimized: true } : widget
            ))
        );
    }, [activeWidgets, activeWindowId, focusWidget, highestZ, setActiveWidgets]);

    const minimizeAllWindows = useCallback(() => {
        setActiveWidgets((prev) => prev.map((widget) => ({ ...widget, isMinimized: true })));
    }, [setActiveWidgets]);

    const toggleMaximize = useCallback((instanceId: string) => {
        const newZ = highestZ + 1;
        setHighestZ(newZ);
        setActiveWidgets((prev) => prev.map((widget) => {
            if (widget.instanceId !== instanceId) return widget;
            if (widget.isMaximized) {
                return {
                    ...widget,
                    isMaximized: false,
                    position: widget.previousPosition || { x: 100, y: 100 },
                    size: widget.previousSize || { width: 500, height: 400 },
                    zIndex: newZ,
                };
            }
            return {
                ...widget,
                isMaximized: true,
                isMinimized: false,
                previousPosition: widget.position,
                previousSize: widget.size,
                position: { x: 0, y: 0 },
                size: { width: '100vw', height: '100vh' },
                zIndex: newZ,
            };
        }));
    }, [highestZ, setActiveWidgets]);

    useEffect(() => {
        const handleResize = () => {
            setActiveWidgets((prev) => prev.map(clampWidgetToViewport));
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, [clampWidgetToViewport, setActiveWidgets]);

    useEffect(() => {
        setActiveWidgets((prev) => prev.map(clampWidgetToViewport));
    }, [activeProfileName, clampWidgetToViewport, setActiveWidgets]);

    return {
        activeWindowId,
        pendingCloseWidgetId,
        pendingCloseInstanceId,
        pendingCloseQueue,
        addWidget,
        closeWidget,
        focusWidget,
        requestCloseWidget,
        requestCloseAll,
        closeWidgetsWithPrompt,
        cancelPendingClose,
        discardPendingClose,
        savePendingClose,
        toggleMinimize,
        toggleMaximize,
        handleTaskClick,
        minimizeAllWindows,
    };
}
