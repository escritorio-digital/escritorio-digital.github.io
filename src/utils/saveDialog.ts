export type SaveDialogResult =
    | { destination: 'file-manager'; parentId: string; filename: string }
    | { destination: 'download'; filename: string }
    | null;

type SaveDialogDetail = {
    resolve: (result: SaveDialogResult) => void;
    suggestedFilename?: string;
};

export const requestSaveDestination = (suggestedFilename?: string): Promise<SaveDialogResult> => {
    return new Promise((resolve) => {
        window.dispatchEvent(
            new CustomEvent<SaveDialogDetail>('save-dialog-request', {
                detail: { resolve, suggestedFilename },
            })
        );
    });
};
