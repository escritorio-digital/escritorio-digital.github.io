import { useCallback, useEffect, useRef, useState } from 'react';
import type { ActiveWidget } from '../../types';
import { onDesktopEvent, requestWidgetSave } from '../../utils/desktopEvents';

type UsePendingWidgetCloseParams = {
    activeWidgets: ActiveWidget[];
    closeWidget: (instanceId: string) => void;
    closeAllWidgetsImmediately: () => void;
};

type UsePendingWidgetCloseResult = {
    pendingCloseWidgetId: string | null;
    pendingCloseInstanceId: string | null;
    pendingCloseQueue: string[];
    closeWidgetsWithPrompt: (instanceIds: string[]) => void;
    requestCloseWidget: (instanceId: string) => void;
    requestCloseAll: () => void;
    cancelPendingClose: () => void;
    discardPendingClose: () => void;
    savePendingClose: () => void;
};

export function usePendingWidgetClose({
    activeWidgets,
    closeWidget,
    closeAllWidgetsImmediately,
}: UsePendingWidgetCloseParams): UsePendingWidgetCloseResult {
    const [dirtyWidgets, setDirtyWidgets] = useState<Record<string, boolean>>({});
    const [pendingCloseWidgetId, setPendingCloseWidgetId] = useState<string | null>(null);
    const [pendingCloseInstanceId, setPendingCloseInstanceId] = useState<string | null>(null);
    const [pendingCloseAfterSave, setPendingCloseAfterSave] = useState<string | null>(null);
    const [pendingCloseQueue, setPendingCloseQueue] = useState<string[]>([]);
    const [isBulkCloseInProgress, setIsBulkCloseInProgress] = useState(false);
    const activeWidgetsRef = useRef(activeWidgets);
    const dirtyWidgetsRef = useRef(dirtyWidgets);
    const pendingCloseQueueRef = useRef(pendingCloseQueue);
    const pendingCloseAfterSaveRef = useRef(pendingCloseAfterSave);

    useEffect(() => {
        activeWidgetsRef.current = activeWidgets;
    }, [activeWidgets]);

    useEffect(() => {
        dirtyWidgetsRef.current = dirtyWidgets;
    }, [dirtyWidgets]);

    useEffect(() => {
        pendingCloseQueueRef.current = pendingCloseQueue;
    }, [pendingCloseQueue]);

    useEffect(() => {
        pendingCloseAfterSaveRef.current = pendingCloseAfterSave;
    }, [pendingCloseAfterSave]);

    const updatePendingCloseQueue = useCallback((instanceIds: string[]) => {
        pendingCloseQueueRef.current = instanceIds;
        setPendingCloseQueue(instanceIds);
    }, []);

    const cancelPendingClose = useCallback(() => {
        setPendingCloseInstanceId(null);
        setPendingCloseWidgetId(null);
        setPendingCloseAfterSave(null);
        setIsBulkCloseInProgress(false);
        updatePendingCloseQueue([]);
    }, [updatePendingCloseQueue]);

    const advanceCloseQueue = useCallback((instanceIds: string[]) => {
        const remaining = [...instanceIds];
        while (remaining.length > 0) {
            const instanceId = remaining.shift();
            if (!instanceId) continue;
            const target = activeWidgetsRef.current.find((widget) => widget.instanceId === instanceId);
            if (!target) continue;
            if (dirtyWidgetsRef.current[instanceId]) {
                setPendingCloseWidgetId(target.widgetId);
                setPendingCloseInstanceId(instanceId);
                updatePendingCloseQueue(remaining);
                return;
            }
            closeWidget(instanceId);
        }
        setPendingCloseInstanceId(null);
        setPendingCloseWidgetId(null);
        setPendingCloseAfterSave(null);
        if (activeWidgetsRef.current.length === 0) {
            setIsBulkCloseInProgress(false);
        }
        updatePendingCloseQueue([]);
    }, [closeWidget, updatePendingCloseQueue]);

    const closeWidgetsWithPrompt = useCallback((instanceIds: string[]) => {
        advanceCloseQueue(instanceIds);
    }, [advanceCloseQueue]);

    const requestCloseWidget = useCallback((instanceId: string) => {
        closeWidgetsWithPrompt([instanceId]);
    }, [closeWidgetsWithPrompt]);

    const requestCloseAll = useCallback(() => {
        const instanceIds = activeWidgets.map((widget) => widget.instanceId);
        const hasDirty = instanceIds.some((instanceId) => dirtyWidgets[instanceId]);
        if (!hasDirty) {
            closeAllWidgetsImmediately();
            setIsBulkCloseInProgress(false);
            updatePendingCloseQueue([]);
            return;
        }
        setIsBulkCloseInProgress(true);
        closeWidgetsWithPrompt(instanceIds);
    }, [activeWidgets, closeAllWidgetsImmediately, closeWidgetsWithPrompt, dirtyWidgets, updatePendingCloseQueue]);

    const discardPendingClose = useCallback(() => {
        const instanceId = pendingCloseInstanceId;
        const remainingQueue = pendingCloseQueueRef.current;
        setPendingCloseInstanceId(null);
        setPendingCloseWidgetId(null);
        if (instanceId) {
            const nextDirtyWidgets = { ...dirtyWidgetsRef.current };
            delete nextDirtyWidgets[instanceId];
            dirtyWidgetsRef.current = nextDirtyWidgets;
            setDirtyWidgets((prev) => {
                const next = { ...prev };
                delete next[instanceId];
                return next;
            });
            closeWidget(instanceId);
        }
        advanceCloseQueue(remainingQueue);
    }, [advanceCloseQueue, closeWidget, pendingCloseInstanceId]);

    const savePendingClose = useCallback(() => {
        const instanceId = pendingCloseInstanceId;
        const widgetId = pendingCloseWidgetId;
        setPendingCloseInstanceId(null);
        setPendingCloseWidgetId(null);
        if (instanceId) {
            setPendingCloseAfterSave(instanceId);
            requestWidgetSave(instanceId, widgetId ?? undefined);
        }
    }, [pendingCloseInstanceId, pendingCloseWidgetId]);

    useEffect(() => {
        const unsubscribeDirtyState = onDesktopEvent('widget-dirty-state', (detail) => {
            if (!detail?.instanceId) return;
            const instanceId = detail.instanceId;
            setDirtyWidgets((prev) => {
                const next = { ...prev };
                if (detail.isDirty) {
                    next[instanceId] = true;
                } else {
                    delete next[instanceId];
                }
                return next;
            });
        });
        const unsubscribeCloseRequest = onDesktopEvent('widget-close-request', (detail) => {
            if (!detail?.instanceId) return;
            requestCloseWidget(detail.instanceId);
        });
        const unsubscribeSaveComplete = onDesktopEvent('widget-save-complete', (detail) => {
            if (!detail?.instanceId) return;
            if (pendingCloseAfterSaveRef.current === detail.instanceId) {
                closeWidget(detail.instanceId);
                setPendingCloseAfterSave(null);
                setPendingCloseInstanceId(null);
                setPendingCloseWidgetId(null);
                advanceCloseQueue(pendingCloseQueueRef.current);
            }
        });

        return () => {
            unsubscribeDirtyState();
            unsubscribeCloseRequest();
            unsubscribeSaveComplete();
        };
    }, [advanceCloseQueue, closeWidget, requestCloseWidget]);

    useEffect(() => {
        if (!isBulkCloseInProgress) return;
        if (pendingCloseInstanceId || pendingCloseAfterSave) return;
        if (activeWidgets.length === 0) {
            setIsBulkCloseInProgress(false);
            return;
        }
        advanceCloseQueue(activeWidgets.map((widget) => widget.instanceId));
    }, [activeWidgets, advanceCloseQueue, isBulkCloseInProgress, pendingCloseAfterSave, pendingCloseInstanceId]);

    return {
        pendingCloseWidgetId,
        pendingCloseInstanceId,
        pendingCloseQueue,
        closeWidgetsWithPrompt,
        requestCloseWidget,
        requestCloseAll,
        cancelPendingClose,
        discardPendingClose,
        savePendingClose,
    };
}
