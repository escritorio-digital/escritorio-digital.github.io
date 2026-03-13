import { requestOpenDialog } from './desktopEvents';

export type OpenDialogResult =
    | { source: 'local'; files: File[] }
    | { source: 'file-manager'; entryIds: string[] };

export type OpenDialogOptions = {
    accept?: string;
    multiple?: boolean;
    sourceWidgetId?: string;
};

export const requestOpenFile = (options: OpenDialogOptions = {}): Promise<OpenDialogResult | null> => {
    return new Promise((resolve) => {
        requestOpenDialog(resolve, options);
    });
};
