import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { emitDesktopEvent } from '../../utils/desktopEvents';
import type { OpenDialogResult } from '../../utils/openDialog';
import type { FileManagerEntry } from '../../utils/fileManagerDb';
import type { SaveDialogResult } from '../../utils/saveDialog';
import { useDesktopDialogs } from './useDesktopDialogs';

// React 19 + testing-library necesita esta bandera para los updates dentro de act.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

const rootEntries: FileManagerEntry[] = [
    {
        id: 'folder-a',
        type: 'folder',
        name: 'Carpeta A',
        parentId: 'root',
        createdAt: 1,
        updatedAt: 1,
    },
    {
        id: 'note-1',
        type: 'file',
        name: 'Apuntes.txt',
        parentId: 'root',
        createdAt: 1,
        updatedAt: 1,
        mime: 'text/plain',
        sourceWidgetId: 'notepad',
    },
    {
        id: 'md-1',
        type: 'file',
        name: 'Tema.md',
        parentId: 'root',
        createdAt: 1,
        updatedAt: 1,
        mime: 'text/markdown',
        sourceWidgetId: 'markdown-text-editor',
    },
    {
        id: 'other-1',
        type: 'file',
        name: 'Otro.txt',
        parentId: 'root',
        createdAt: 1,
        updatedAt: 1,
        mime: 'text/plain',
        sourceWidgetId: 'work-list',
    },
    {
        id: 'pdf-1',
        type: 'file',
        name: 'Guia.pdf',
        parentId: 'root',
        createdAt: 1,
        updatedAt: 1,
        mime: 'application/pdf',
        sourceWidgetId: 'markdown-text-editor',
    },
];

vi.mock('../../utils/fileManagerDb', () => {
    return {
        FILE_MANAGER_ROOT_ID: 'root',
        getAllEntries: vi.fn(async () => rootEntries),
        listEntriesByParent: vi.fn(async (parentId: string) => rootEntries.filter((entry) => entry.parentId === parentId)),
    };
});

describe('useDesktopDialogs', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('filters save dialog entries by source widget while keeping folders visible', async () => {
        const { result } = renderHook(() => useDesktopDialogs({
            t: (key: string) => key === 'save_dialog.default_filename' ? 'archivo' : key,
        }));

        let resolved: SaveDialogResult | undefined;
        const resolve = vi.fn((value: SaveDialogResult) => {
            resolved = value;
        });

        act(() => {
            emitDesktopEvent('save-dialog-request', {
                resolve,
                suggestedFilename: '  Mi*archivo?.txt  ',
                sourceWidgetId: 'notepad',
            });
        });

        await waitFor(() => expect(result.current.saveDialogState.isOpen).toBe(true));
        await waitFor(() => expect(result.current.saveDialogEntries.map((entry) => entry.id)).toEqual(['folder-a', 'note-1']));

        expect(result.current.saveDialogFilterWidget).toBe(true);
        expect(result.current.saveDialogFilename).toBe('Mi*archivo?.txt');
        expect(result.current.getSaveDialogFilename()).toBe('Mi-archivo-.txt');

        act(() => {
            result.current.closeSaveDialog({ destination: 'download', filename: 'final.txt' });
        });

        expect(resolved).toEqual({ destination: 'download', filename: 'final.txt' });
        expect(result.current.saveDialogState.isOpen).toBe(false);
        expect(result.current.saveDialogFilterWidget).toBe(false);
    });

    it('filters open dialog entries by accept rules and source widget', async () => {
        const { result } = renderHook(() => useDesktopDialogs({
            t: (key: string) => key,
        }));

        let resolved: OpenDialogResult | null | undefined;
        const resolve = vi.fn((value: OpenDialogResult | null) => {
            resolved = value;
        });

        act(() => {
            emitDesktopEvent('open-dialog-request', {
                resolve,
                options: {
                    accept: '.md,text/plain',
                    sourceWidgetId: 'markdown-text-editor',
                },
            });
        });

        await waitFor(() => expect(result.current.openDialogState.isOpen).toBe(true));
        await waitFor(() => expect(result.current.openDialogEntries.map((entry) => entry.id)).toEqual(['folder-a', 'md-1']));

        expect(result.current.openDialogFilterWidget).toBe(true);

        act(() => {
            result.current.closeOpenDialog({ source: 'file-manager', entryIds: ['md-1'] });
        });

        expect(resolved).toEqual({ source: 'file-manager', entryIds: ['md-1'] });
        expect(result.current.openDialogState.isOpen).toBe(false);
        expect(result.current.openDialogFilterWidget).toBe(false);
    });
});
