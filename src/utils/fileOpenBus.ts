type FileOpenPayload = {
    entryId: string;
    instanceId?: string;
};

const target = new EventTarget();
const pending = new Map<string, FileOpenPayload[]>();
const subscriberCounts = new Map<string, number>();

export const emitFileOpen = (widgetId: string, payload: FileOpenPayload) => {
    const activeSubscribers = subscriberCounts.get(widgetId) ?? 0;
    if (activeSubscribers === 0) {
        const queue = pending.get(widgetId) ?? [];
        queue.push(payload);
        pending.set(widgetId, queue);
    }
    target.dispatchEvent(new CustomEvent<FileOpenPayload>(widgetId, { detail: payload }));
};

export const subscribeFileOpen = (widgetId: string, handler: (payload: FileOpenPayload) => void) => {
    const listener = (event: Event) => {
        const custom = event as CustomEvent<FileOpenPayload>;
        handler(custom.detail);
    };
    subscriberCounts.set(widgetId, (subscriberCounts.get(widgetId) ?? 0) + 1);
    target.addEventListener(widgetId, listener);
    const queue = pending.get(widgetId);
    if (queue && queue.length > 0) {
        queue.splice(0).forEach((payload) => handler(payload));
    }
    return () => {
        target.removeEventListener(widgetId, listener);
        const nextCount = (subscriberCounts.get(widgetId) ?? 1) - 1;
        if (nextCount <= 0) {
            subscriberCounts.delete(widgetId);
            return;
        }
        subscriberCounts.set(widgetId, nextCount);
    };
};
