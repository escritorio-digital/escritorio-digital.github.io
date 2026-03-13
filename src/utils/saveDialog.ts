import { requestSaveDialog } from './desktopEvents';

export type SaveDialogResult =
    | { destination: 'file-manager'; parentId: string; filename: string }
    | { destination: 'download'; filename: string }
    | null;

export const requestSaveDestination = (
    suggestedFilename?: string,
    options: { sourceWidgetId?: string } = {}
): Promise<SaveDialogResult> => {
    return new Promise((resolve) => {
        requestSaveDialog(resolve, suggestedFilename, options.sourceWidgetId);
    });
};
