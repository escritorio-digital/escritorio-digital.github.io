import React from 'react';
import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ActiveWidget } from '../../types';
import { notifyWidgetEntryOpened, openFileManagerEntry } from '../../utils/desktopEvents';
import { useDesktopWindows } from './useDesktopWindows';

function useHarness(initialWidgets: ActiveWidget[] = []) {
    const [activeWidgets, setActiveWidgets] = React.useState<ActiveWidget[]>(initialWidgets);

    const windows = useDesktopWindows({
        activeWidgets,
        widgetPreferences: {},
        activeProfileName: 'Escritorio Principal',
        popupWidgetIds: new Set<string>(),
        setActiveWidgets,
        toggleWidgetFloating: () => {},
    });

    return {
        activeWidgets,
        setActiveWidgets,
        ...windows,
    };
}

describe('useDesktopWindows', () => {
    beforeEach(() => {
        vi.restoreAllMocks();
        vi.useFakeTimers();
        vi.spyOn(Date, 'now').mockReturnValue(1_700_000_000_000);
    });

    it('focuses an existing window when reopening the same file entry', () => {
        const { result } = renderHook(() => useHarness());

        act(() => {
            openFileManagerEntry('notepad', 'entry-1');
        });

        expect(result.current.activeWidgets).toHaveLength(1);
        const firstInstance = result.current.activeWidgets[0];
        expect(firstInstance?.widgetId).toBe('notepad');

        act(() => {
            notifyWidgetEntryOpened(firstInstance.instanceId, 'entry-1', 'notepad');
        });

        act(() => {
            openFileManagerEntry('notepad', 'entry-1');
        });

        expect(result.current.activeWidgets).toHaveLength(1);
        expect(result.current.activeWindowId).toBe(firstInstance.instanceId);
    });

    it('opens a new window when opening a different file entry for a multi-instance widget', () => {
        const { result } = renderHook(() => useHarness());

        act(() => {
            openFileManagerEntry('markdown-text-editor', 'entry-a');
        });

        expect(result.current.activeWidgets).toHaveLength(1);
        const firstInstance = result.current.activeWidgets[0];

        act(() => {
            notifyWidgetEntryOpened(firstInstance.instanceId, 'entry-a', 'markdown-text-editor');
        });

        act(() => {
            vi.spyOn(Date, 'now').mockReturnValue(1_700_000_000_100);
            openFileManagerEntry('markdown-text-editor', 'entry-b');
        });

        expect(result.current.activeWidgets).toHaveLength(2);
        expect(result.current.activeWidgets.map((widget) => widget.instanceId)).toContain(firstInstance.instanceId);
        expect(new Set(result.current.activeWidgets.map((widget) => widget.instanceId)).size).toBe(2);
    });
});
