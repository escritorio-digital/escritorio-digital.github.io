import type { i18n as I18n } from 'i18next';

const supportedDirectoLanguages = new Set(['es', 'ca', 'gl', 'eu', 'en', 'de']);

export const getDirectoAppUrl = (path: string, i18n: I18n): string => {
    const rawLang = i18n.language || 'es';
    const normalizedLang = rawLang.split('-')[0];
    const lang = supportedDirectoLanguages.has(normalizedLang) ? normalizedLang : 'es';
    const normalizedPath = path.startsWith('/') ? path.slice(1) : path;

    return `/directo/${normalizedPath}?lang=${encodeURIComponent(lang)}`;
};
