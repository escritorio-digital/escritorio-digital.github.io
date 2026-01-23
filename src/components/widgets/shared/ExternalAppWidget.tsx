import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';

type ExternalAppWidgetProps = {
    url: string;
    titleKey: string;
    appendLanguageParam?: boolean;
    languageParamKey?: string;
    openInPopup?: boolean;
    autoOpen?: boolean;
    popupFeatures?: string;
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
    openInPopup = false,
    autoOpen = false,
    popupFeatures = 'noopener,noreferrer,toolbar=no,location=no,status=no,menubar=no,directories=no,scrollbars=yes,resizable=yes,width=1200,height=800',
}) => {
    const { t, i18n } = useTranslation();
    const autoOpenRef = useRef(false);
    const resolvedUrl = useMemo(() => {
        if (!appendLanguageParam) return url;
        const language = (i18n.resolvedLanguage ?? i18n.language).split('-')[0];
        return buildUrlWithLanguage(url, language, languageParamKey);
    }, [appendLanguageParam, i18n.language, i18n.resolvedLanguage, languageParamKey, url]);

    const openPopup = useCallback(() => {
        const newWindow = window.open(resolvedUrl, '_blank', popupFeatures);
        if (newWindow) {
            newWindow.opener = null;
            return true;
        }
        return false;
    }, [popupFeatures, resolvedUrl]);

    useEffect(() => {
        if (!openInPopup || !autoOpen || autoOpenRef.current) return;
        autoOpenRef.current = true;
        openPopup();
    }, [autoOpen, openInPopup, openPopup]);

    if (openInPopup) {
        return (
            <div className="flex h-full w-full items-center justify-center bg-white/70 p-4">
                <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-5 text-center shadow-sm">
                    <div className="text-base font-semibold text-text-dark">{t(titleKey)}</div>
                    <p className="mt-2 text-sm text-text-muted">{t('widgets.external_app.popup_hint')}</p>
                    <button
                        type="button"
                        onClick={openPopup}
                        className="mt-4 inline-flex items-center justify-center rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-text-dark hover:bg-accent/90"
                    >
                        {t('widgets.external_app.popup_button')}
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="flex h-full w-full flex-col bg-white/70">
            <div className="flex items-center justify-between gap-2 border-b border-gray-200 bg-white/90 px-3 py-2">
                <span className="text-sm font-semibold text-text-dark">{t(titleKey)}</span>
                <button
                    type="button"
                    onClick={openPopup}
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
