import { useCallback, useEffect, useRef, useState } from 'react';
import type React from 'react';

export type DesktopContextMenuState = {
    isOpen: boolean;
    x: number;
    y: number;
    widgetId: string | null;
    windowInstanceId: string | null;
    source?: 'desktop' | 'window' | 'task' | 'file-manager-icon';
};

type UseDesktopContextMenuParams = {
    activeWidgets: Array<{ instanceId: string; widgetId: string }>;
};

type UseDesktopContextMenuResult = {
    contextMenu: DesktopContextMenuState;
    setContextMenu: React.Dispatch<React.SetStateAction<DesktopContextMenuState>>;
    contextMenuRef: React.RefObject<HTMLDivElement | null>;
    handleContextMenu: (event: React.MouseEvent<Element>, widgetId?: string, force?: boolean) => void;
    handleTaskContextMenu: (event: React.MouseEvent, instanceId: string) => void;
    handleWindowContextMenu: (event: React.MouseEvent, widgetId: string, instanceId: string) => void;
};

const initialState: DesktopContextMenuState = {
    isOpen: false,
    x: 0,
    y: 0,
    widgetId: null,
    windowInstanceId: null,
    source: 'desktop',
};

export function useDesktopContextMenu({
    activeWidgets,
}: UseDesktopContextMenuParams): UseDesktopContextMenuResult {
    const [contextMenu, setContextMenu] = useState<DesktopContextMenuState>(initialState);
    const contextMenuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!contextMenu.isOpen) return;
        const handlePointerDown = (event: MouseEvent) => {
            if (contextMenuRef.current && contextMenuRef.current.contains(event.target as Node)) return;
            setContextMenu((prev) => ({ ...prev, isOpen: false }));
        };
        const handleResize = () => {
            setContextMenu((prev) => ({ ...prev, isOpen: false }));
        };
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                setContextMenu((prev) => ({ ...prev, isOpen: false }));
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
                setContextMenu((prev) => ({ ...prev, x: nextX, y: nextY }));
            }
        };
        const frameId = requestAnimationFrame(clampMenu);
        return () => cancelAnimationFrame(frameId);
    }, [contextMenu.isOpen, contextMenu.x, contextMenu.y]);

    const isEditableTarget = useCallback((target: EventTarget | null): boolean => {
        if (!(target instanceof HTMLElement)) return false;
        if (target.isContentEditable) return true;
        return Boolean(target.closest('input, textarea, select, [contenteditable="true"]'));
    }, []);

    const hasTextSelection = useCallback((): boolean => {
        const selection = window.getSelection?.();
        return Boolean(selection && !selection.isCollapsed && selection.toString().trim());
    }, []);

    const handleContextMenu = useCallback((event: React.MouseEvent<Element>, widgetId?: string, force = false) => {
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
    }, [hasTextSelection, isEditableTarget]);

    const handleTaskContextMenu = useCallback((event: React.MouseEvent, instanceId: string) => {
        event.preventDefault();
        const targetWidgetId = activeWidgets.find((widget) => widget.instanceId === instanceId)?.widgetId ?? null;
        setContextMenu({
            isOpen: true,
            x: event.clientX,
            y: event.clientY,
            widgetId: targetWidgetId,
            windowInstanceId: instanceId,
            source: 'task',
        });
    }, [activeWidgets]);

    const handleWindowContextMenu = useCallback((event: React.MouseEvent, widgetId: string, instanceId: string) => {
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
    }, []);

    return {
        contextMenu,
        setContextMenu,
        contextMenuRef,
        handleContextMenu,
        handleTaskContextMenu,
        handleWindowContextMenu,
    };
}
