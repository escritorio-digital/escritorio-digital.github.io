import { FILE_MANAGER_ROOT_ID, saveFileEntry } from './fileManagerDb';

export const downloadBlob = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
};

export const saveToFileManager = async (params: {
    blob: Blob;
    filename: string;
    sourceWidgetId: string;
    sourceWidgetTitleKey: string;
    parentId?: string;
}) => {
    await saveFileEntry({
        name: params.filename,
        parentId: params.parentId ?? FILE_MANAGER_ROOT_ID,
        blob: params.blob,
        mime: params.blob.type,
        sourceWidgetId: params.sourceWidgetId,
        sourceWidgetTitleKey: params.sourceWidgetTitleKey,
    });
    window.dispatchEvent(new CustomEvent('file-manager-refresh'));
};
