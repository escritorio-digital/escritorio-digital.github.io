type FileOpenPayload = {
    entryId: string;
};

const target = new EventTarget();
const pending = new Map<string, FileOpenPayload[]>();

export const emitFileOpen = (widgetId: string, payload: FileOpenPayload) => {
    const queue = pending.get(widgetId) ?? [];
    queue.push(payload);
    pending.set(widgetId, queue);
    target.dispatchEvent(new CustomEvent<FileOpenPayload>(widgetId, { detail: payload }));
};

export const subscribeFileOpen = (widgetId: string, handler: (payload: FileOpenPayload) => void) => {
    const listener = (event: Event) => {
        const custom = event as CustomEvent<FileOpenPayload>;
        handler(custom.detail);
    };
    target.addEventListener(widgetId, listener);
    const queue = pending.get(widgetId);
    if (queue && queue.length > 0) {
        queue.splice(0).forEach(handler);
    }
    return () => {
        target.removeEventListener(widgetId, listener);
    };
};
