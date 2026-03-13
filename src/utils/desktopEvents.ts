import type { DesktopEventMap, DesktopEventName } from '../types/desktopEvents';

type DesktopEventHandler<K extends DesktopEventName> = (
    detail: DesktopEventMap[K],
    event: CustomEvent<DesktopEventMap[K]>
) => void;

export function emitDesktopEvent<K extends DesktopEventName>(
    eventName: K,
    ...detailArg: DesktopEventMap[K] extends undefined ? [] : [detail: DesktopEventMap[K]]
) {
    const detail = (detailArg[0] ?? undefined) as DesktopEventMap[K];
    window.dispatchEvent(new CustomEvent(eventName, { detail }));
}

export function onDesktopEvent<K extends DesktopEventName>(
    eventName: K,
    handler: DesktopEventHandler<K>,
    target: Window | Document = window
) {
    const listener: EventListener = (event) => {
        const customEvent = event as CustomEvent<DesktopEventMap[K]>;
        handler(customEvent.detail, customEvent);
    };

    target.addEventListener(eventName, listener);
    return () => target.removeEventListener(eventName, listener);
}

export const openWidget = (widgetId: string) => emitDesktopEvent('open-widget', { widgetId });
export const openFileManagerEntry = (widgetId: string, entryId: string) =>
    emitDesktopEvent('file-manager-open', { widgetId, entryId });
export const notifyActiveProfileChange = (name: string) =>
    emitDesktopEvent('active-profile-change', { name });
export const notifyAlarmStoreUpdated = (alarms: import('../utils/alarmStore').AlarmItem[]) =>
    emitDesktopEvent('alarm-store-updated', alarms);
export const notifyFileManagerFeedback = (type?: string, filename?: string) =>
    emitDesktopEvent('file-manager-feedback', { type, filename });
export const notifyFileManagerRefresh = () => emitDesktopEvent('file-manager-refresh');
export const notifyLocalWebDataChanged = () => emitDesktopEvent('local-web-data-changed');
export const requestOpenDialog = (
    resolve: (result: import('../utils/openDialog').OpenDialogResult | null) => void,
    options?: import('../utils/openDialog').OpenDialogOptions
) => emitDesktopEvent('open-dialog-request', { resolve, options });
export const requestOpenProfileBackup = (tab?: 'export' | 'import') =>
    emitDesktopEvent('open-profile-backup', { tab });
export const notifyProfilesUpdated = () => emitDesktopEvent('profiles-updated');
export const requestWidgetClose = (instanceId: string) =>
    emitDesktopEvent('widget-close-request', { instanceId });
export const requestWidgetResize = (
    instanceId: string,
    size: { width?: number; height?: number }
) => emitDesktopEvent('widget-resize-request', { instanceId, size });
export const requestWidgetSave = (instanceId: string, widgetId?: string) =>
    emitDesktopEvent('widget-save-request', { instanceId, widgetId });
export const requestSaveDialog = (
    resolve: (result: import('../utils/saveDialog').SaveDialogResult) => void,
    suggestedFilename?: string,
    sourceWidgetId?: string
) => emitDesktopEvent('save-dialog-request', { resolve, suggestedFilename, sourceWidgetId });
export const requestWidgetToggleFloating = (instanceId: string, enable?: boolean) =>
    emitDesktopEvent('widget-toggle-floating', { instanceId, enable });
export const notifyVceFavoritesUpdate = (profileName?: string, favorites?: string[]) =>
    emitDesktopEvent('vce-favorites-update', { profileName, favorites });
export const notifyWidgetClosed = (instanceId: string, widgetId: string) =>
    emitDesktopEvent('widget-close', { instanceId, widgetId });
export const notifyWidgetDirtyState = (instanceId: string, isDirty: boolean, widgetId?: string) =>
    emitDesktopEvent('widget-dirty-state', { instanceId, widgetId, isDirty });
export const notifyWidgetEntryOpened = (instanceId: string, entryId?: string, widgetId?: string) =>
    emitDesktopEvent('widget-entry-opened', { instanceId, widgetId, entryId });
export const notifyWidgetSaveComplete = (instanceId: string, widgetId?: string) =>
    emitDesktopEvent('widget-save-complete', { instanceId, widgetId });
export const notifyWidgetTitleUpdate = (instanceId: string, title?: string) =>
    emitDesktopEvent('widget-title-update', { instanceId, title });
