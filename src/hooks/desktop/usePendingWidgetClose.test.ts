import React from 'react';
import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import type { ActiveWidget } from '../../types';
import { notifyWidgetDirtyState } from '../../utils/desktopEvents';
import { usePendingWidgetClose } from './usePendingWidgetClose';

const makeWidget = (instanceId: string, widgetId = 'notepad'): ActiveWidget => ({
    instanceId,
    widgetId,
    position: { x: 0, y: 0 },
    size: { width: 400, height: 300 },
    zIndex: 100,
    zoom: 1,
    toolbarPinned: true,
    isMaximized: false,
});

function useHarness(initialWidgets: ActiveWidget[]) {
    const [activeWidgets, setActiveWidgets] = React.useState(initialWidgets);
    const closeWidget = React.useCallback((instanceId: string) => {
        setActiveWidgets((prev) => prev.filter((widget) => widget.instanceId !== instanceId));
    }, []);
    const closeAllWidgetsImmediately = React.useCallback(() => {
        setActiveWidgets([]);
    }, []);

    const pending = usePendingWidgetClose({
        activeWidgets,
        closeWidget,
        closeAllWidgetsImmediately,
    });

    return {
        activeWidgets,
        ...pending,
    };
}

describe('usePendingWidgetClose', () => {
    beforeEach(() => {
        document.body.innerHTML = '';
    });

    it('closes all windows when discarding multiple dirty widgets in sequence', () => {
        const initialWidgets = [
            makeWidget('w1', 'notepad'),
            makeWidget('w2', 'markdown-text-editor'),
            makeWidget('w3', 'work-list'),
            makeWidget('w4', 'notepad'),
            makeWidget('w5', 'markdown-text-editor'),
            makeWidget('w6', 'work-list'),
        ];

        const { result } = renderHook(() => useHarness(initialWidgets));

        act(() => {
            notifyWidgetDirtyState('w1', true, 'notepad');
            notifyWidgetDirtyState('w3', true, 'work-list');
            notifyWidgetDirtyState('w5', true, 'markdown-text-editor');
        });

        act(() => {
            result.current.requestCloseAll();
        });

        expect(result.current.pendingCloseInstanceId).toBe('w1');

        act(() => {
            result.current.discardPendingClose();
        });
        expect(result.current.pendingCloseInstanceId).toBe('w3');

        act(() => {
            result.current.discardPendingClose();
        });
        expect(result.current.pendingCloseInstanceId).toBe('w5');

        act(() => {
            result.current.discardPendingClose();
        });

        expect(result.current.pendingCloseInstanceId).toBeNull();
        expect(result.current.pendingCloseQueue).toEqual([]);
        expect(result.current.activeWidgets).toEqual([]);
    });
});
