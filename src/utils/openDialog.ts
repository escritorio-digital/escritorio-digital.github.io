export type OpenDialogResult =
    | { source: 'local'; files: File[] }
    | { source: 'file-manager'; entryIds: string[] };

export type OpenDialogOptions = {
    accept?: string;
    multiple?: boolean;
    sourceWidgetId?: string;
};

type OpenDialogDetail = {
    resolve: (result: OpenDialogResult | null) => void;
    options?: OpenDialogOptions;
};

export const requestOpenFile = (options: OpenDialogOptions = {}): Promise<OpenDialogResult | null> => {
    return new Promise((resolve) => {
        window.dispatchEvent(
            new CustomEvent<OpenDialogDetail>('open-dialog-request', {
                detail: { resolve, options },
            })
        );
    });
};
