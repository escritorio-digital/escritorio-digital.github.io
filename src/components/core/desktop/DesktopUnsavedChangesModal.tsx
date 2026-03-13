type DesktopUnsavedChangesModalProps = {
    isOpen: boolean;
    widgetLabel: string;
    cancelLabel: string;
    discardLabel: string;
    saveLabel: string;
    title: string;
    message: string;
    onCancel: () => void;
    onDiscard: () => void;
    onSave: () => void;
};

export function DesktopUnsavedChangesModal({
    isOpen,
    widgetLabel,
    cancelLabel,
    discardLabel,
    saveLabel,
    title,
    message,
    onCancel,
    onDiscard,
    onSave,
}: DesktopUnsavedChangesModalProps) {
    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 z-[10003] flex items-center justify-center bg-black/60"
            onClick={onCancel}
        >
            <div
                className="w-full max-w-md rounded-2xl border border-gray-200 bg-white px-6 py-5 text-text-dark shadow-2xl"
                onClick={(event) => event.stopPropagation()}
                role="dialog"
                aria-modal="true"
                aria-label={widgetLabel}
            >
                <h3 className="text-lg font-semibold">{title}</h3>
                <p className="mt-2 text-sm text-gray-600">{message}</p>
                <div className="mt-6 flex flex-wrap justify-end gap-2">
                    <button
                        type="button"
                        className="rounded-full border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-100"
                        onClick={onCancel}
                    >
                        {cancelLabel}
                    </button>
                    <button
                        type="button"
                        className="rounded-full border border-gray-300 bg-gray-100 px-4 py-2 text-sm font-semibold text-gray-800 hover:bg-gray-200"
                        onClick={onDiscard}
                    >
                        {discardLabel}
                    </button>
                    <button
                        type="button"
                        className="rounded-full bg-accent px-4 py-2 text-sm font-semibold text-text-dark shadow-sm hover:opacity-90"
                        onClick={onSave}
                    >
                        {saveLabel}
                    </button>
                </div>
            </div>
        </div>
    );
}
