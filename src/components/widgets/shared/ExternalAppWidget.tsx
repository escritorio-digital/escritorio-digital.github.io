import { useTranslation } from 'react-i18next';

type ExternalAppWidgetProps = {
    url: string;
    titleKey: string;
};

export const ExternalAppWidget: React.FC<ExternalAppWidgetProps> = ({ url, titleKey }) => {
    const { t } = useTranslation();

    return (
        <div className="flex h-full w-full flex-col bg-white/70">
            <div className="flex items-center justify-between gap-2 border-b border-gray-200 bg-white/90 px-3 py-2">
                <span className="text-sm font-semibold text-text-dark">{t(titleKey)}</span>
                <button
                    type="button"
                    onClick={() => window.open(url, '_blank', 'noopener,noreferrer')}
                    className="text-xs font-semibold text-text-dark underline decoration-accent/60 underline-offset-2 hover:text-text-dark/70"
                >
                    {t('widgets.local_web.open_fullscreen_window')}
                </button>
            </div>
            <iframe
                title={t(titleKey)}
                src={url}
                className="h-full w-full flex-1 border-0"
                loading="lazy"
            />
        </div>
    );
};
