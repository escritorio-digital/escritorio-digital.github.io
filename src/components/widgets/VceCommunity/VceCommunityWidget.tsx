import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import Papa from 'papaparse';
import './VceCommunityWidget.css';
import { ChevronDown, ChevronUp, PanelLeftClose, PanelLeftOpen, Star } from 'lucide-react';
import { WidgetToolbar } from '../../core/WidgetToolbar';

type VceApp = {
    title: string;
    author: string;
    url: string;
    levels: string[];
    areas: string[];
    languages: string[];
    description: string;
};

const LANGUAGE_OPTIONS = [
    'Español',
    'Català',
    'Galego',
    'Euskara',
    'English',
    'Português',
    'Français',
    'Deutsch',
    'Italiano',
] as const;

const CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSj_hltRI4Q0QolINWJVcKxCMMjfpdiCkKzSdgp9d8RlGTdUU1UIKvaj-TBSkq0JQGneDhfUkSQuFzy/pub?output=csv';
const COMMUNITY_URL = 'https://vibe-coding-educativo.github.io/';
const ACTIVE_PROFILE_STORAGE_KEY = 'active-profile-name';
const ACTIVE_PROFILE_EVENT = 'active-profile-change';
const PROFILES_UPDATED_EVENT = 'profiles-updated';
const defaultProfileKey = 'Escritorio Principal';
const GOOGLE_HOSTS = new Set([
    'google.com',
    'www.google.com',
    'g.co',
    'goo.gl',
    'goo.gle',
    'forms.gle',
    'docs.google.com',
    'drive.google.com',
    'sites.google.com',
    'gemini.google.com',
    'app.goo.gl',
    'ai.studio',
    'www.ai.studio',
    'aistudio.google.com',
    'eaciweb.net',
    'www.eaciweb.net',
    'ja.cat',
    'www.ja.cat',
    'edumind.es',
    'www.edumind.es',
    'claude.ai',
    'www.claude.ai',
    'withgoogle.com',
    'googleusercontent.com',
    'googleapis.com',
]);

const readActiveProfileName = (): string => {
    const stored = window.localStorage.getItem(ACTIVE_PROFILE_STORAGE_KEY);
    if (!stored) return defaultProfileKey;
    try {
        const parsed = JSON.parse(stored);
        return typeof parsed === 'string' && parsed.trim() ? parsed : stored;
    } catch {
        return stored;
    }
};

const readFavoritesForProfile = (profileName: string): string[] => {
    const stored = window.localStorage.getItem('desktop-profiles');
    if (!stored) return [];
    try {
        const parsed = JSON.parse(stored) as Record<string, { vceFavorites?: string[] }>;
        return parsed?.[profileName]?.vceFavorites ?? [];
    } catch {
        return [];
    }
};

export const VceCommunityWidget = () => {
    const { t } = useTranslation();
    const [apps, setApps] = useState<VceApp[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [levelFilter, setLevelFilter] = useState('');
    const [areaFilter, setAreaFilter] = useState('');
    const [languageFilter, setLanguageFilter] = useState<Set<string>>(() => new Set());
    const [isLanguageMenuOpen, setIsLanguageMenuOpen] = useState(false);
    const [activeApp, setActiveApp] = useState<VceApp | null>(null);
    const [expandedApps, setExpandedApps] = useState<Set<string>>(new Set());
    const [isLoading, setIsLoading] = useState(true);
    const [hasError, setHasError] = useState(false);
    const [iframeBlocked, setIframeBlocked] = useState(false);
    const [isListCollapsed, setIsListCollapsed] = useState(false);
    const iframeRef = useRef<HTMLIFrameElement | null>(null);
    const languageMenuRef = useRef<HTMLDivElement | null>(null);
    const [activeProfileName, setActiveProfileName] = useState(() => readActiveProfileName());
    const [favoriteUrls, setFavoriteUrls] = useState<string[]>(() => (
        readFavoritesForProfile(readActiveProfileName())
    ));

    useEffect(() => {
        let isMounted = true;
        const loadApps = async () => {
            setIsLoading(true);
            setHasError(false);
            try {
                const response = await fetch(CSV_URL, { cache: 'no-store' });
                if (!response.ok) {
                    throw new Error('CSV fetch failed');
                }
                const text = await response.text();
                const parsed = Papa.parse<Record<string, string>>(text, {
                    header: true,
                    skipEmptyLines: true,
                });
                const deleteField = '¿QUIERES ELIMINAR UN REGISTRO?\\nMarca la casilla y escribe más abajo la URL que tiene tu aplicación. En el resto de campos, escribe cualquier cosa y envía el formulario.\\nIMPORTANTE: Si solo quieres rectificar un registro, no marques esta casilla, haz lo que se  indica a continuación';
                const toList = (value?: string) =>
                    (value || '')
                        .replaceAll(';', ',')
                        .split(',')
                        .map((item) => item.trim())
                        .filter(Boolean);
                const nextApps = (parsed.data || [])
                    .map((row) => {
                        const app: VceApp = {
                            title: (row['Título de la aplicación'] || '').trim(),
                            author: (row['Tu nombre (Autor/a de la aplicación)'] || '').trim(),
                            url: (row['Enlace (URL) a la aplicación'] || '').trim(),
                            levels: toList(row['Nivel o niveles educativos']),
                            areas: toList(row['Área o áreas de conocimiento']),
                            languages: toList(row['Idiomas de la aplicación']),
                            description: (row['Descripción breve'] || '').trim(),
                        };
                        const deleteFlag = (row[deleteField] || '').trim();
                        return { app, deleteFlag };
                    })
                    .filter(({ app, deleteFlag }) => app.title && app.url && !deleteFlag)
                    .map(({ app }) => app);
                if (isMounted) {
                    setApps(nextApps);
                }
            } catch {
                if (isMounted) {
                    setHasError(true);
                }
            } finally {
                if (isMounted) {
                    setIsLoading(false);
                }
            }
        };
        loadApps();
        return () => {
            isMounted = false;
        };
    }, []);

    useEffect(() => {
        const handleProfileChange = (event: Event) => {
            const detail = (event as CustomEvent<{ name?: string }>).detail;
            setActiveProfileName(detail?.name || readActiveProfileName());
        };
        const handleStorage = (event: StorageEvent) => {
            if (event.key !== ACTIVE_PROFILE_STORAGE_KEY) return;
            setActiveProfileName(readActiveProfileName());
        };
        const handleProfilesUpdated = () => {
            setFavoriteUrls(readFavoritesForProfile(activeProfileName));
        };
        window.addEventListener(ACTIVE_PROFILE_EVENT, handleProfileChange as EventListener);
        window.addEventListener('storage', handleStorage);
        window.addEventListener(PROFILES_UPDATED_EVENT, handleProfilesUpdated);
        return () => {
            window.removeEventListener(ACTIVE_PROFILE_EVENT, handleProfileChange as EventListener);
            window.removeEventListener('storage', handleStorage);
            window.removeEventListener(PROFILES_UPDATED_EVENT, handleProfilesUpdated);
        };
    }, [activeProfileName]);

    useEffect(() => {
        setFavoriteUrls(readFavoritesForProfile(activeProfileName));
    }, [activeProfileName]);

    const levels = useMemo(() => {
        const set = new Set<string>();
        apps.forEach((app) => app.levels.forEach((level) => set.add(level)));
        return Array.from(set).sort((a, b) => a.localeCompare(b));
    }, [apps]);

    const areas = useMemo(() => {
        const set = new Set<string>();
        apps.forEach((app) => app.areas.forEach((area) => set.add(area)));
        return Array.from(set).sort((a, b) => a.localeCompare(b));
    }, [apps]);

    useEffect(() => {
        if (!isLanguageMenuOpen) return;
        const handleClickOutside = (event: MouseEvent) => {
            if (!languageMenuRef.current) return;
            if (!languageMenuRef.current.contains(event.target as Node)) {
                setIsLanguageMenuOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isLanguageMenuOpen]);

    const filteredApps = useMemo(() => {
        const term = searchTerm.trim().toLowerCase();
        const isAllLanguagesSelected = languageFilter.size === 0 || languageFilter.size === LANGUAGE_OPTIONS.length;
        const ordered = [...apps].reverse(); // mostrar en orden inverso al original
        return ordered.filter((app) => {
            if (levelFilter && !app.levels.includes(levelFilter)) return false;
            if (areaFilter && !app.areas.includes(areaFilter)) return false;
            if (!isAllLanguagesSelected) {
                const matchesLanguage = app.languages.some((language) => languageFilter.has(language));
                if (!matchesLanguage) return false;
            }
            if (!term) return true;
            return (
                app.title.toLowerCase().includes(term)
                || app.author.toLowerCase().includes(term)
                || app.description.toLowerCase().includes(term)
            );
        });
    }, [apps, searchTerm, levelFilter, areaFilter, languageFilter]);

    const isGoogleUrl = (url: string) => {
        try {
            const { hostname } = new URL(url);
            const host = hostname.toLowerCase();
            return (
                GOOGLE_HOSTS.has(host)
                || host.endsWith('.google.com')
                || host.endsWith('.googleusercontent.com')
                || host.endsWith('.googleapis.com')
                || host.endsWith('.withgoogle.com')
                || host.endsWith('.ai.studio')
                || host.endsWith('.eaciweb.net')
                || host.endsWith('.ja.cat')
                || host.endsWith('.edumind.es')
                || host.endsWith('.claude.ai')
            );
        } catch {
            return false;
        }
    };

    const favoriteSet = useMemo(() => new Set(favoriteUrls), [favoriteUrls]);
    const favoriteApps = useMemo(() => {
        const byUrl = new Map(filteredApps.map((app) => [app.url, app]));
        return favoriteUrls
            .map((url) => byUrl.get(url))
            .filter((app): app is VceApp => Boolean(app));
    }, [filteredApps, favoriteUrls]);
    const regularApps = useMemo(
        () => filteredApps.filter((app) => !favoriteSet.has(app.url)),
        [filteredApps, favoriteSet]
    );
    const visibleAppsCount = favoriteApps.length + regularApps.length;

    useEffect(() => {
        if (activeApp && !apps.some((app) => app.url === activeApp.url)) {
            setActiveApp(null);
        }
    }, [activeApp, apps]);

    useEffect(() => {
        setIframeBlocked(false);
    }, [activeApp?.url]);

    const toggleFavorite = (url: string) => {
        setFavoriteUrls((prev) => {
            const next = prev.includes(url)
                ? prev.filter((item) => item !== url)
                : [...prev, url];
            window.dispatchEvent(new CustomEvent('vce-favorites-update', {
                detail: {
                    profileName: activeProfileName,
                    favorites: next,
                },
            }));
            return next;
        });
    };

    const moveFavorite = (url: string, direction: 'up' | 'down') => {
        setFavoriteUrls((prev) => {
            const index = prev.indexOf(url);
            if (index === -1) return prev;
            const nextIndex = direction === 'up' ? index - 1 : index + 1;
            if (nextIndex < 0 || nextIndex >= prev.length) return prev;
            const next = [...prev];
            const [item] = next.splice(index, 1);
            next.splice(nextIndex, 0, item);
            window.dispatchEvent(new CustomEvent('vce-favorites-update', {
                detail: {
                    profileName: activeProfileName,
                    favorites: next,
                },
            }));
            return next;
        });
    };

    const toggleExpanded = (url: string) => {
        setExpandedApps((prev) => {
            const next = new Set(prev);
            if (next.has(url)) {
                next.delete(url);
            } else {
                next.add(url);
            }
            return next;
        });
    };

    const handleSelectApp = (app: VceApp) => {
        setActiveApp(app);
        setExpandedApps(new Set());
    };

    const handleIframeLoad = () => {
        setIframeBlocked(false);
        if (!iframeRef.current) return;
        try {
            const href = iframeRef.current.contentWindow?.location.href;
            if (!href || href === 'about:blank') {
                setIframeBlocked(true);
            }
        } catch {
            // Ignore cross-origin access errors.
        }
    };

    const toggleLanguage = (language: string) => {
        setLanguageFilter((prev) => {
            const next = new Set(prev);
            if (next.has(language)) {
                next.delete(language);
            } else {
                next.add(language);
            }
            return next;
        });
    };

    return (
        <div className="vce-widget">
            <WidgetToolbar>
                <div className="vce-toolbar">
                    <div className="vce-header">
                        <div>
                            <div className="vce-title">{t('widgets.vce.title')}</div>
                            <div className="vce-subtitle">{t('widgets.vce.subtitle')}</div>
                        </div>
                        <div className="vce-actions">
                            <button
                                type="button"
                                className="vce-toggle-list"
                                onClick={() => setIsListCollapsed((prev) => !prev)}
                                title={isListCollapsed ? t('widgets.vce.expand_list') : t('widgets.vce.collapse_list')}
                                aria-label={isListCollapsed ? t('widgets.vce.expand_list') : t('widgets.vce.collapse_list')}
                            >
                                {isListCollapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
                            </button>
                            <button
                                type="button"
                                className="vce-open"
                                onClick={() => window.open(COMMUNITY_URL, '_blank', 'noopener,noreferrer')}
                            >
                                {t('widgets.vce.community_link')}
                            </button>
                            <button
                                type="button"
                                className="vce-open"
                                onClick={() => {
                                    if (activeApp) {
                                        window.open(activeApp.url, '_blank', 'noopener,noreferrer');
                                    }
                                }}
                                disabled={!activeApp}
                            >
                                {t('widgets.vce.open_new_tab')}
                            </button>
                            {activeApp && (
                                <button
                                    type="button"
                                    className="vce-fav-toggle"
                                    onClick={() => toggleFavorite(activeApp.url)}
                                    title={favoriteSet.has(activeApp.url)
                                        ? t('widgets.vce.remove_favorite')
                                        : t('widgets.vce.add_favorite')}
                                    aria-label={favoriteSet.has(activeApp.url)
                                        ? t('widgets.vce.remove_favorite')
                                        : t('widgets.vce.add_favorite')}
                                >
                                    <Star size={16} fill={favoriteSet.has(activeApp.url) ? 'currentColor' : 'none'} />
                                </button>
                            )}
                        </div>
                    </div>
                    <div className="vce-filters">
                        <input
                            type="text"
                            className="vce-search"
                            value={searchTerm}
                            onChange={(event) => setSearchTerm(event.target.value)}
                            placeholder={t('widgets.vce.search_placeholder')}
                        />
                        <select
                            className="vce-select"
                            value={levelFilter}
                            onChange={(event) => setLevelFilter(event.target.value)}
                        >
                            <option value="">{t('widgets.vce.filter_level_all')}</option>
                            {levels.map((level) => (
                                <option key={level} value={level}>{level}</option>
                            ))}
                        </select>
                        <select
                            className="vce-select"
                            value={areaFilter}
                            onChange={(event) => setAreaFilter(event.target.value)}
                        >
                            <option value="">{t('widgets.vce.filter_area_all')}</option>
                            {areas.map((area) => (
                                <option key={area} value={area}>{area}</option>
                            ))}
                        </select>
                        <div className="vce-language-filter" ref={languageMenuRef}>
                            <button
                                type="button"
                                className="vce-select vce-language-button"
                                onClick={() => setIsLanguageMenuOpen((prev) => !prev)}
                                aria-haspopup="listbox"
                                aria-expanded={isLanguageMenuOpen}
                            >
                                {languageFilter.size === 0 || languageFilter.size === LANGUAGE_OPTIONS.length
                                    ? t('widgets.vce.filter_languages_all')
                                    : `${t('widgets.vce.filter_languages')} (${languageFilter.size})`}
                                <span className="vce-language-button-icon" aria-hidden="true">
                                    <ChevronDown size={16} />
                                </span>
                            </button>
                            {isLanguageMenuOpen && (
                                <div
                                    className="vce-language-menu"
                                    role="listbox"
                                    aria-multiselectable="true"
                                >
                                    {LANGUAGE_OPTIONS.map((language) => (
                                        <label key={language} className="vce-language-option">
                                            <input
                                                type="checkbox"
                                                checked={languageFilter.size > 0 && languageFilter.has(language)}
                                                onChange={() => toggleLanguage(language)}
                                            />
                                            <span>{language}</span>
                                        </label>
                                    ))}
                                </div>
                            )}
                        </div>
                        <div className="vce-count">
                            {t('widgets.vce.showing_count', { count: visibleAppsCount })}
                        </div>
                    </div>
                </div>
            </WidgetToolbar>

            <div className={`vce-body${isListCollapsed ? ' is-collapsed' : ''}`}>
                <div className={`vce-list${isListCollapsed ? ' is-collapsed' : ''}`}>
                    {isLoading && (
                        <div className="vce-empty">{t('widgets.vce.loading')}</div>
                    )}
                    {hasError && (
                        <div className="vce-empty">{t('widgets.vce.load_error')}</div>
                    )}
                    {!isLoading && !hasError && filteredApps.length === 0 && favoriteApps.length === 0 && (
                        <div className="vce-empty">{t('widgets.vce.no_results')}</div>
                    )}
                    {!isLoading && !hasError && favoriteApps.length > 0 && (
                        <div className="vce-section">
                            <div className="vce-section-title">{t('widgets.vce.favorites_title')}</div>
                        </div>
                    )}
                    {!isLoading && !hasError && favoriteApps.map((app) => {
                        const favoriteIndex = favoriteUrls.indexOf(app.url);
                        const isFirstFavorite = favoriteIndex <= 0;
                        const isLastFavorite = favoriteIndex === favoriteUrls.length - 1;
                        return (
                        <div
                            key={app.url}
                            className={`vce-item vce-item-favorite${activeApp?.url === app.url ? ' vce-item-active' : ''}`}
                            onClick={() => handleSelectApp(app)}
                            role="button"
                            tabIndex={0}
                            onKeyDown={(event) => {
                                if (event.key === 'Enter' || event.key === ' ') {
                                    event.preventDefault();
                                    handleSelectApp(app);
                                }
                            }}
                        >
                            <div className="vce-item-header">
                                <div className="vce-item-title">{app.title}</div>
                                <div className="vce-fav-actions">
                                    <button
                                        type="button"
                                        className="vce-fav-reorder"
                                        disabled={isFirstFavorite}
                                        onClick={(event) => {
                                            event.stopPropagation();
                                            moveFavorite(app.url, 'up');
                                        }}
                                        title={t('widgets.vce.move_up')}
                                        aria-label={t('widgets.vce.move_up')}
                                    >
                                        <ChevronUp size={14} />
                                    </button>
                                    <button
                                        type="button"
                                        className="vce-fav-reorder"
                                        disabled={isLastFavorite}
                                        onClick={(event) => {
                                            event.stopPropagation();
                                            moveFavorite(app.url, 'down');
                                        }}
                                        title={t('widgets.vce.move_down')}
                                        aria-label={t('widgets.vce.move_down')}
                                    >
                                        <ChevronDown size={14} />
                                    </button>
                                    <button
                                        type="button"
                                        className="vce-fav-toggle"
                                        onClick={(event) => {
                                            event.stopPropagation();
                                            toggleFavorite(app.url);
                                        }}
                                        title={favoriteSet.has(app.url)
                                            ? t('widgets.vce.remove_favorite')
                                            : t('widgets.vce.add_favorite')}
                                        aria-label={favoriteSet.has(app.url)
                                            ? t('widgets.vce.remove_favorite')
                                            : t('widgets.vce.add_favorite')}
                                    >
                                        <Star size={16} fill={favoriteSet.has(app.url) ? 'currentColor' : 'none'} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    )})}
                    {!isLoading && !hasError && regularApps.map((app) => {
                        const isExpanded = expandedApps.has(app.url);
                        const hasDescription = Boolean(app.description);
                        const shouldTruncate = hasDescription && app.description.length > 100 && !isExpanded;
                        return (
                        <div
                            key={app.url}
                            className={`vce-item${activeApp?.url === app.url ? ' vce-item-active' : ''}`}
                            onClick={() => handleSelectApp(app)}
                            role="button"
                            tabIndex={0}
                            onKeyDown={(event) => {
                                if (event.key === 'Enter' || event.key === ' ') {
                                    event.preventDefault();
                                    handleSelectApp(app);
                                }
                            }}
                        >
                            <div className="vce-item-header">
                                <div className="vce-item-title">{app.title}</div>
                                <button
                                    type="button"
                                    className="vce-fav-toggle"
                                    onClick={(event) => {
                                        event.stopPropagation();
                                        toggleFavorite(app.url);
                                    }}
                                    title={favoriteSet.has(app.url)
                                        ? t('widgets.vce.remove_favorite')
                                        : t('widgets.vce.add_favorite')}
                                    aria-label={favoriteSet.has(app.url)
                                        ? t('widgets.vce.remove_favorite')
                                        : t('widgets.vce.add_favorite')}
                                >
                                    <Star size={16} fill="none" />
                                </button>
                            </div>
                            <div className="vce-item-author">{app.author}</div>
                            <div className="vce-item-desc">
                                {!hasDescription && t('widgets.vce.no_description')}
                                {hasDescription && shouldTruncate && (
                                    <>
                                        {`${app.description.slice(0, 100)} `}
                                        <button
                                            type="button"
                                            className="vce-item-more"
                                            onClick={(event) => {
                                                event.stopPropagation();
                                                toggleExpanded(app.url);
                                            }}
                                        >
                                            {t('widgets.vce.more')}
                                        </button>
                                    </>
                                )}
                                {hasDescription && !shouldTruncate && (
                                    <>
                                        {app.description}{' '}
                                        {app.description.length > 100 && (
                                            <button
                                                type="button"
                                                className="vce-item-more"
                                                onClick={(event) => {
                                                    event.stopPropagation();
                                                    toggleExpanded(app.url);
                                                }}
                                            >
                                                {t('widgets.vce.less')}
                                            </button>
                                        )}
                                    </>
                                )}
                            </div>
                        </div>
                    )})}
                </div>
                <div className="vce-preview">
                    {activeApp ? (
                        iframeBlocked || isGoogleUrl(activeApp.url) ? (
                            <div className="vce-empty">
                                <div>{t('widgets.vce.iframe_blocked')}</div>
                                <button
                                    type="button"
                                    className="vce-open vce-open-inline"
                                    onClick={() => window.open(activeApp.url, '_blank', 'noopener,noreferrer')}
                                >
                                    {t('widgets.vce.open_new_tab')}
                                </button>
                            </div>
                        ) : (
                            <iframe
                                key={activeApp.url}
                                ref={iframeRef}
                                title={activeApp.title}
                                src={activeApp.url}
                                className="vce-iframe"
                                loading="lazy"
                                onLoad={handleIframeLoad}
                                onError={() => {
                                    setIframeBlocked(true);
                                }}
                            />
                        )
                    ) : (
                        <div className="vce-empty">
                            {isLoading ? t('widgets.vce.loading') : (
                                <div className="vce-intro">
                                    <div className="vce-intro-title">{t('widgets.vce.intro_title')}</div>
                                    <div className="vce-intro-links">
                                        <a href="https://t.me/vceduca" target="_blank" rel="noopener noreferrer">
                                            {t('widgets.vce.intro_group_link')}
                                        </a>
                                        <a href="https://vibe-coding-educativo.github.io/" target="_blank" rel="noopener noreferrer">
                                            {t('widgets.vce.intro_info_link')}
                                        </a>
                                    </div>
                                    <div className="vce-intro-title">{t('widgets.vce.intro_how_title')}</div>
                                    <ol className="vce-intro-list">
                                        <li>{t('widgets.vce.intro_step1')}</li>
                                        <li>{t('widgets.vce.intro_step2')}</li>
                                        <li>{t('widgets.vce.intro_step3')}</li>
                                        <li>{t('widgets.vce.intro_step4')}</li>
                                        <li>{t('widgets.vce.intro_step5')}</li>
                                    </ol>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
