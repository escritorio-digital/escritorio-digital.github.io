import React from 'react';
import { X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useEscapeKey } from '../../hooks/useEscapeKey';
import { ThemeSettings } from './ThemeSettings';

interface ThemeSettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const ThemeSettingsModal: React.FC<ThemeSettingsModalProps> = ({ isOpen, onClose }) => {
    const { t } = useTranslation();
    useEscapeKey(isOpen, onClose);
    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 bg-black/50 z-[10002] flex items-center justify-center"
            onClick={(event) => {
                event.stopPropagation();
                onClose();
            }}
        >
            <div
                className="bg-white/90 backdrop-blur-xl text-text-dark rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col"
                onClick={(event) => event.stopPropagation()}
            >
                <header className="p-4 border-b flex justify-between items-center">
                    <h2 className="text-xl font-bold">{t('settings.theme.modal_title')}</h2>
                    <button onClick={onClose} className="p-1 rounded-full hover:bg-black/10" aria-label={t('desktop.window_close')} title={t('desktop.window_close')}>
                        <X size={20} />
                    </button>
                </header>
                <div className="overflow-y-auto">
                    <ThemeSettings />
                </div>
            </div>
        </div>
    );
};
