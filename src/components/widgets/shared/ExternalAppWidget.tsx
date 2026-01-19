import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

type ExternalAppWidgetProps = {
    url: string;
    titleKey: string;
    appendLanguageParam?: boolean;
    languageParamKey?: string;
};

const buildUrlWithLanguage = (rawUrl: string, language: string, paramKey: string): string => {
    try {
        const url = new URL(rawUrl);
        url.searchParams.set(paramKey, language);
        return url.toString();
    } catch (error) {
        return rawUrl;
    }
};

export const ExternalAppWidget: React.FC<ExternalAppWidgetProps> = ({
    url,
    titleKey,
    appendLanguageParam = false,
    languageParamKey = 'lang',
}) => {
    const { t, i18n } = useTranslation();
    const resolvedUrl = useMemo(() => {
        if (!appendLanguageParam) return url;
        const language = (i18n.resolvedLanguage ?? i18n.language).split('-')[0];
        return buildUrlWithLanguage(url, language, languageParamKey);
    }, [appendLanguageParam, i18n.language, i18n.resolvedLanguage, languageParamKey, url]);

    return (
        <div className="flex h-full w-full flex-col bg-white/70">
            <div className="flex items-center justify-between gap-2 border-b border-gray-200 bg-white/90 px-3 py-2">
                <span className="text-sm font-semibold text-text-dark">{t(titleKey)}</span>
                <button
                    type="button"
                    onClick={() => window.open(resolvedUrl, '_blank', 'noopener,noreferrer')}
                    className="text-xs font-semibold text-accent hover:text-accent/80"
                >
                    {t('widgets.local_web.open_fullscreen_window')}
                </button>
            </div>
            <iframe
                title={t(titleKey)}
                src={resolvedUrl}
                className="h-full w-full flex-1 border-0"
                loading="lazy"
            />
        </div>
    );
};
