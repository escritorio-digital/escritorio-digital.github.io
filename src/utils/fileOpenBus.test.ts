import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('fileOpenBus', () => {
    beforeEach(() => {
        vi.resetModules();
    });

    it('queues file opens emitted before a subscriber exists', async () => {
        const { emitFileOpen, subscribeFileOpen } = await import('./fileOpenBus');
        const handler = vi.fn();

        emitFileOpen('notepad', { entryId: 'entry-1' });

        const unsubscribe = subscribeFileOpen('notepad', handler);

        expect(handler).toHaveBeenCalledTimes(1);
        expect(handler.mock.calls[0]?.[0]).toEqual({ entryId: 'entry-1' });

        unsubscribe();
    });

    it('does not queue duplicate opens while a subscriber is already active', async () => {
        const { emitFileOpen, subscribeFileOpen } = await import('./fileOpenBus');
        const firstHandler = vi.fn();
        const secondHandler = vi.fn();

        const unsubscribeFirst = subscribeFileOpen('work-list', firstHandler);

        emitFileOpen('work-list', { entryId: 'entry-2', instanceId: 'instance-a' });

        expect(firstHandler).toHaveBeenCalledTimes(1);
        expect(firstHandler).toHaveBeenCalledWith({ entryId: 'entry-2', instanceId: 'instance-a' });

        unsubscribeFirst();

        const unsubscribeSecond = subscribeFileOpen('work-list', secondHandler);

        expect(secondHandler).not.toHaveBeenCalled();

        unsubscribeSecond();
    });

    it('replays queued events in order to the first subscriber', async () => {
        const { emitFileOpen, subscribeFileOpen } = await import('./fileOpenBus');
        const handler = vi.fn();

        emitFileOpen('markdown-text-editor', { entryId: 'entry-1' });
        emitFileOpen('markdown-text-editor', { entryId: 'entry-2', instanceId: 'instance-b' });

        const unsubscribe = subscribeFileOpen('markdown-text-editor', handler);

        expect(handler.mock.calls.map((call) => call[0])).toEqual([
            { entryId: 'entry-1' },
            { entryId: 'entry-2', instanceId: 'instance-b' },
        ]);

        unsubscribe();
    });
});
