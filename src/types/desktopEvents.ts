export type DesktopEventMap = {
    'active-profile-change': { name: string };
    'alarm-store-updated': import('../utils/alarmStore').AlarmItem[];
    'file-manager-open': { widgetId: string; entryId: string };
    'file-manager-feedback': { type?: string; filename?: string };
    'file-manager-refresh': undefined;
    'local-web-data-changed': undefined;
    'open-widget': { widgetId: string };
    'open-dialog-request': {
        resolve: (result: import('../utils/openDialog').OpenDialogResult | null) => void;
        options?: import('../utils/openDialog').OpenDialogOptions;
    };
    'open-profile-backup': { tab?: 'export' | 'import' };
    'profiles-updated': undefined;
    'save-dialog-request': {
        resolve: (result: import('../utils/saveDialog').SaveDialogResult) => void;
        suggestedFilename?: string;
        sourceWidgetId?: string;
    };
    'vce-favorites-update': { profileName?: string; favorites?: string[] };
    'widget-close': { instanceId: string; widgetId: string };
    'widget-close-request': { instanceId: string };
    'widget-dirty-state': { instanceId: string; widgetId?: string; isDirty: boolean };
    'widget-entry-opened': { instanceId: string; widgetId?: string; entryId?: string };
    'widget-save-complete': { instanceId: string; widgetId?: string };
    'widget-save-request': { instanceId: string; widgetId?: string };
    'widget-resize-request': { instanceId: string; size: { width?: number; height?: number } };
    'widget-toggle-floating': { instanceId: string; enable?: boolean };
    'widget-title-update': { instanceId: string; title?: string };
};

export type DesktopEventName = keyof DesktopEventMap;
