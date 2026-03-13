import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('desktopEvents', () => {
    beforeEach(() => {
        vi.restoreAllMocks();
    });

    it('emits and listens to typed custom events', async () => {
        const { emitDesktopEvent, onDesktopEvent } = await import('./desktopEvents');
        const handler = vi.fn();

        const unsubscribe = onDesktopEvent('widget-title-update', handler);

        emitDesktopEvent('widget-title-update', {
            instanceId: 'notepad-1',
            title: 'Apuntes',
        });

        expect(handler).toHaveBeenCalledTimes(1);
        expect(handler.mock.calls[0]?.[0]).toEqual({
            instanceId: 'notepad-1',
            title: 'Apuntes',
        });

        unsubscribe();
    });

    it('supports events without detail payload', async () => {
        const { notifyProfilesUpdated, onDesktopEvent } = await import('./desktopEvents');
        const handler = vi.fn();

        const unsubscribe = onDesktopEvent('profiles-updated', handler);

        notifyProfilesUpdated();

        expect(handler).toHaveBeenCalledTimes(1);
        expect(handler.mock.calls[0]?.[0]).toBeNull();

        unsubscribe();
    });

    it('removes listeners when unsubscribed', async () => {
        const { notifyActiveProfileChange, onDesktopEvent } = await import('./desktopEvents');
        const handler = vi.fn();

        const unsubscribe = onDesktopEvent('active-profile-change', handler);
        unsubscribe();

        notifyActiveProfileChange('Profesorado');

        expect(handler).not.toHaveBeenCalled();
    });

    it('wraps helper emitters with the expected payload', async () => {
        const { notifyFileManagerFeedback, onDesktopEvent, requestWidgetResize } = await import('./desktopEvents');
        const feedbackHandler = vi.fn();
        const resizeHandler = vi.fn();

        const unsubscribeFeedback = onDesktopEvent('file-manager-feedback', feedbackHandler);
        const unsubscribeResize = onDesktopEvent('widget-resize-request', resizeHandler);

        notifyFileManagerFeedback('saved', 'tareas.csv');
        requestWidgetResize('alarm-1', { height: 480 });

        expect(feedbackHandler.mock.calls[0]?.[0]).toEqual({
            type: 'saved',
            filename: 'tareas.csv',
        });
        expect(resizeHandler.mock.calls[0]?.[0]).toEqual({
            instanceId: 'alarm-1',
            size: { height: 480 },
        });

        unsubscribeFeedback();
        unsubscribeResize();
    });
});
