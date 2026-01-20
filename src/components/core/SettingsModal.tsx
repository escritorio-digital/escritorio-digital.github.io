import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { X, Search } from 'lucide-react';
import { WIDGET_REGISTRY } from '../widgets';
import { buildWidgetsByCategory } from '../widgets/widgetCategories';
import { ThemeSettingsModal } from './ThemeSettingsModal';
import { ProfileManager } from './ProfileManager';
import type { ProfileCollection } from '../../types';
import { clearLocalWebData, WIDGET_DATA_KEYS } from '../../utils/backup';
import { removeFromIndexedDb } from '../../utils/storage';
import { clearFileManagerData } from '../../utils/fileManagerDb';
import { useLocalStorage } from '../../hooks/useLocalStorage';
import { useTheme } from '../../context/ThemeContext';
import { wallpaperOptions, getWallpaperValue } from '../../utils/wallpapers';

type WidgetsViewMode = 'theme' | 'alphabetical';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: 'general' | 'profiles' | 'widgets' | 'theme';
  themeModalRequestId?: number;
  pinnedWidgets: string[];
  setPinnedWidgets: React.Dispatch<React.SetStateAction<string[]>>;
  profiles: ProfileCollection;
  setProfiles: React.Dispatch<React.SetStateAction<ProfileCollection>>;
  activeProfileName: string;
  setActiveProfileName: (name: string) => void;
  profileOrder: string[];
  setProfileOrder: React.Dispatch<React.SetStateAction<string[]>>;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  initialTab = 'general',
  themeModalRequestId,
  pinnedWidgets,
  setPinnedWidgets,
  profiles,
  setProfiles,
  activeProfileName,
  setActiveProfileName,
  profileOrder,
  setProfileOrder,
}) => {
  const { t, i18n } = useTranslation();
  const [activeTab, setActiveTab] = useState('general');
  const [searchTerm, setSearchTerm] = useState('');
  const [widgetsViewMode, setWidgetsViewMode] = useLocalStorage<WidgetsViewMode>('widgets-view-mode', 'theme');
  const [isThemeModalOpen, setIsThemeModalOpen] = useState(false);
  const lastThemeRequestRef = useRef<number | null>(null);
  const { theme, setTheme, setWallpaper, resetTheme } = useTheme();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const widgetSearchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) setActiveTab(initialTab);
  }, [isOpen, initialTab]);

  useEffect(() => {
    if (!isOpen || activeTab !== 'widgets') return;
    const focusId = window.requestAnimationFrame(() => {
      widgetSearchInputRef.current?.focus();
    });
    return () => window.cancelAnimationFrame(focusId);
  }, [isOpen, activeTab]);

  useEffect(() => {
    if (!isOpen) setIsThemeModalOpen(false);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || themeModalRequestId == null || themeModalRequestId <= 0) return;
    if (lastThemeRequestRef.current === themeModalRequestId) return;
    lastThemeRequestRef.current = themeModalRequestId;
    setActiveTab('theme');
    setIsThemeModalOpen(true);
  }, [isOpen, themeModalRequestId]);

  const handleWallpaperUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const result = event.target?.result as string;
        setWallpaper(`url(${result})`);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDateTimeToggle = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { checked } = e.target;
    setTheme((prevTheme) => ({ ...prevTheme, showDateTime: checked }));
  };

  const handleSystemStatsToggle = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { checked } = e.target;
    setTheme((prevTheme) => ({ ...prevTheme, showSystemStats: checked }));
  };

  const handleProfileMenuToggle = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { checked } = e.target;
    setTheme((prevTheme) => ({ ...prevTheme, showProfileMenu: checked }));
  };

  const handleSolidColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { value } = e.target;
    setTheme({ ...theme, '--color-bg': value, '--wallpaper': 'none' });
  };

  const normalizeText = useCallback((value: string) => (
    value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
  ), []);

  const filteredWidgets = useMemo(() => {
    const normalizedSearch = normalizeText(searchTerm.trim());
    const results = Object.values(WIDGET_REGISTRY).filter(widget => {
      if (!searchTerm.trim()) return true;
      const title = normalizeText(t(widget.title));
      const tooltip = widget.startTooltip ? normalizeText(t(widget.startTooltip)) : '';
      const keywordMatches = (widget.searchKeywords || [])
        .flatMap((key) => t(key).split(','))
        .map((value) => normalizeText(value.trim()))
        .filter(Boolean)
        .some((value) => value.includes(normalizedSearch));
      return title.includes(normalizedSearch) || tooltip.includes(normalizedSearch) || keywordMatches;
    });
    return results.sort((a, b) => t(a.title).localeCompare(t(b.title)));
  }, [normalizeText, searchTerm, t]);

  const widgetsByCategory = useMemo(() => buildWidgetsByCategory(filteredWidgets, t), [filteredWidgets, t]);

  const MAX_WIDGETS = 20;
  const totalWidgets = Object.keys(WIDGET_REGISTRY).length;

  const togglePin = (widgetId: string) => {
    setPinnedWidgets(prev => {
      if (prev.includes(widgetId)) {
        return prev.filter(id => id !== widgetId);
      } else if (prev.length < MAX_WIDGETS) {
        return [...prev, widgetId];
      }
      alert(t('settings.widgets.max_widgets_alert', { max: MAX_WIDGETS }));
      return prev;
    });
  };

  const handleLanguageChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const newLanguage = event.target.value;
    i18n.changeLanguage(newLanguage);
  };

  const handleFactoryReset = async () => {
    if (!window.confirm(t('settings.general.reset_confirm'))) return;
    const keysToClear = Array.from(new Set([
      'desktop-profiles',
      'active-profile-name',
      'file-manager-trash-ttl-hours',
      'file-manager-icon-position',
      ...WIDGET_DATA_KEYS,
    ]));
    try {
      keysToClear.forEach(k => window.localStorage.removeItem(k));
      await Promise.all(WIDGET_DATA_KEYS.map((key) => removeFromIndexedDb(key)));
      await clearFileManagerData();
      await clearLocalWebData();
    } catch (error) {
      console.warn('No se pudieron limpiar las preferencias locales.', error);
    }
    // Recargar la página para aplicar el estado inicial
    window.location.reload();
  };
  
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div 
          key="settings-modal"
          className="fixed inset-0 bg-black/50 z-[10001] flex items-center justify-center" 
          onClick={onClose}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
        >
          <motion.div 
            className="bg-white/90 backdrop-blur-xl text-text-dark rounded-xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col" 
            onClick={e => e.stopPropagation()}
            initial={{ scale: 0.7, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.7, opacity: 0 }}
            transition={{ type: "spring", stiffness: 100, damping: 10 }}
          >
            <header className="p-4 border-b flex justify-between items-center">
              <h2 className="text-xl font-bold">{t('settings.title')}</h2>
              <button onClick={onClose} className="p-1 rounded-full hover:bg-black/10"><X size={20}/></button>
            </header>

            <div className="flex border-b">
              <button 
                onClick={() => setActiveTab('general')}
                className={`flex-1 p-3 font-semibold ${activeTab === 'general' ? 'bg-accent text-text-dark' : 'hover:bg-gray-200'}`}
              >
                {t('settings.tabs.general')}
              </button>
              <button 
                onClick={() => setActiveTab('profiles')}
                className={`flex-1 p-3 font-semibold ${activeTab === 'profiles' ? 'bg-accent text-text-dark' : 'hover:bg-gray-200'}`}
              >
                {t('settings.tabs.profiles')}
              </button>
              <button 
                onClick={() => setActiveTab('widgets')}
                className={`flex-1 p-3 font-semibold ${activeTab === 'widgets' ? 'bg-accent text-text-dark' : 'hover:bg-gray-200'}`}
              >
                {t('settings.tabs.widgets')}
              </button>
              <button 
                onClick={() => setActiveTab('theme')}
                className={`flex-1 p-3 font-semibold ${activeTab === 'theme' ? 'bg-accent text-text-dark' : 'hover:bg-gray-200'}`}
              >
                {t('settings.tabs.theme')}
              </button>
            </div>

            <div className="overflow-y-auto px-4 pb-4 pt-0">
              {activeTab === 'general' && (
                <div className="pt-4">
                  <h3 className="text-lg font-semibold mb-4">{t('settings.tabs.general')}</h3>
                  <div className="flex items-center justify-between">
                    <label htmlFor="language-select" className="font-medium">{t('settings.general.language')}:</label>
                    <select 
                      id="language-select"
                      value={i18n.language} 
                      onChange={handleLanguageChange}
                      className="p-2 border rounded-lg bg-white/80 focus:ring-2 focus:ring-accent focus:outline-none"
                    >
                      {/* Orden lógico: ES + cooficiales, luego románicas vecinas, alemán y EN al final */}
                      <option value="es">Español</option>
                      <option value="ca">Català</option>
                      <option value="eu">Euskara</option>
                      <option value="gl">Galego</option>
                      <option value="pt">Português</option>
                      <option value="fr">Français</option>
                      <option value="it">Italiano</option>
                      <option value="de">Deutsch</option>
                      <option value="en">English</option>
                    </select>
                  </div>

                  <div className="mt-6 p-4 border border-red-300 rounded-lg bg-red-50">
                    <h4 className="font-semibold text-red-700 mb-2">{t('settings.general.reset_title')}</h4>
                    <p className="text-sm text-red-700 mb-3">{t('settings.general.reset_description')}</p>
                    <button onClick={handleFactoryReset} className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700">
                      {t('settings.general.reset_button')}
                    </button>
                  </div>
                </div>
              )}
              {activeTab === 'profiles' && (
                <div className="pt-4">
                  <ProfileManager
                    profiles={profiles}
                    setProfiles={setProfiles}
                    activeProfileName={activeProfileName}
                    setActiveProfileName={setActiveProfileName}
                    onCloseSettings={onClose}
                    profileOrder={profileOrder}
                    setProfileOrder={setProfileOrder}
                  />
                </div>
              )}
              {activeTab === 'widgets' && (
                <div>
                  <div className="sticky top-0 z-10 -mx-4 px-4 pt-4 pb-4 bg-white/90 backdrop-blur border-b border-black/5 mb-4">
                    <div className="relative mb-3">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                      <input
                        type="text"
                        placeholder={t('settings.widgets.search')}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        ref={widgetSearchInputRef}
                        className="w-full pl-10 pr-4 py-2 border rounded-lg bg-white/80 focus:ring-2 focus:ring-accent focus:outline-none"
                      />
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-sm text-gray-600">{t('settings.widgets.view_label')}</span>
                      <div className="flex rounded-lg border border-gray-200 overflow-hidden bg-white/70">
                        <button
                          type="button"
                          onClick={() => setWidgetsViewMode('theme')}
                          className={`px-3 py-1.5 text-sm font-semibold transition-colors ${widgetsViewMode === 'theme' ? 'bg-accent text-text-dark' : 'text-gray-600 hover:bg-gray-100'}`}
                        >
                          {t('settings.widgets.view_by_theme')}
                        </button>
                        <button
                          type="button"
                          onClick={() => setWidgetsViewMode('alphabetical')}
                          className={`px-3 py-1.5 text-sm font-semibold transition-colors ${widgetsViewMode === 'alphabetical' ? 'bg-accent text-text-dark' : 'text-gray-600 hover:bg-gray-100'}`}
                        >
                          {t('settings.widgets.view_alphabetical')}
                        </button>
                      </div>
                    </div>
                  </div>
                  <p className="mb-4 text-sm text-gray-600">{t('settings.widgets.pinned_info', { count: pinnedWidgets.length, max: MAX_WIDGETS, total: totalWidgets })}</p>
                  {widgetsViewMode === 'alphabetical' ? (
                    <ul className="space-y-2">
                      {filteredWidgets.map(widget => (
                        <li key={widget.id} className="flex items-center justify-between p-3 bg-white/50 rounded-lg">
                          <div className="flex items-center gap-4">
                            <span className="text-2xl">{widget.icon}</span>
                            <span className="font-semibold">{t(widget.title)}</span>
                          </div>
                          <button onClick={() => togglePin(widget.id)} className={`font-semibold py-2 px-4 rounded-lg transition-colors ${pinnedWidgets.includes(widget.id) ? 'bg-widget-header text-text-light hover:bg-[#7b69b1]' : 'bg-accent text-text-dark hover:bg-[#8ec9c9]'}`}>
                            {pinnedWidgets.includes(widget.id) ? t('settings.widgets.remove') : t('settings.widgets.add')}
                          </button>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <div className="space-y-5">
                      {widgetsByCategory
                        .filter((category) => category.widgets.length > 0)
                        .map((category) => (
                          <div key={category.id}>
                            <h4 className="text-sm font-semibold text-gray-800 mb-2 uppercase tracking-wide">{t(category.titleKey)}</h4>
                            <ul className="space-y-2">
                              {category.widgets.map(widget => (
                                <li key={widget.id} className="flex items-center justify-between p-3 bg-white/50 rounded-lg">
                                  <div className="flex items-center gap-4">
                                    <span className="text-2xl">{widget.icon}</span>
                                    <span className="font-semibold">{t(widget.title)}</span>
                                  </div>
                                  <button onClick={() => togglePin(widget.id)} className={`font-semibold py-2 px-4 rounded-lg transition-colors ${pinnedWidgets.includes(widget.id) ? 'bg-widget-header text-text-light hover:bg-[#7b69b1]' : 'bg-accent text-text-dark hover:bg-[#8ec9c9]'}`}>
                                    {pinnedWidgets.includes(widget.id) ? t('settings.widgets.remove') : t('settings.widgets.add')}
                                  </button>
                                </li>
                              ))}
                            </ul>
                          </div>
                        ))}
                    </div>
                  )}
                </div>
              )}
              {activeTab === 'theme' && (
                <div className="pt-4">
                  <div className="p-4 bg-white/70 border border-gray-200 rounded-lg space-y-3">
                    <div>
                      <h3 className="text-lg font-semibold">{t('settings.theme.open_modal_title')}</h3>
                      <p className="text-sm text-gray-600">{t('settings.theme.open_modal_help')}</p>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <span
                          className="h-6 w-6 rounded-full border border-black/10"
                          style={{ backgroundColor: theme['--color-bg'] }}
                          aria-hidden="true"
                        />
                        <span
                          className="h-6 w-6 rounded-full border border-black/10"
                          style={{ backgroundColor: theme['--color-widget-bg'] }}
                          aria-hidden="true"
                        />
                        <span
                          className="h-6 w-6 rounded-full border border-black/10"
                          style={{ backgroundColor: theme['--color-accent'] }}
                          aria-hidden="true"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => setIsThemeModalOpen(true)}
                        className="font-semibold py-2 px-4 rounded-lg bg-accent text-text-dark hover:bg-[#8ec9c9] transition-colors"
                      >
                        {t('settings.theme.open_modal_button')}
                      </button>
                    </div>
                  </div>

                  <div className="mt-6">
                    <h3 className="text-lg font-semibold mb-2">{t('settings.theme.wallpaper_title')}</h3>
                    <div className="mb-4 p-3 bg-white/70 border border-gray-200 rounded-lg">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-semibold text-sm">{t('settings.theme.solid_color_title')}</p>
                          <p className="text-xs text-gray-500">{t('settings.theme.solid_color_help')}</p>
                        </div>
                        <input
                          type="color"
                          value={theme['--color-bg']}
                          onChange={handleSolidColorChange}
                          className="theme-color-input"
                          aria-label={t('settings.theme.solid_color_title')}
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-3 mb-4 max-h-56 overflow-y-auto pr-1">
                      {wallpaperOptions.map((wallpaper) => {
                        const wallpaperValue = getWallpaperValue(wallpaper);
                        const isActive = wallpaper.urls.some(url => theme['--wallpaper'] === `url(${url})`);
                        return (
                          <button
                            key={wallpaper.id}
                            type="button"
                            onClick={() => setWallpaper(wallpaperValue)}
                            className={`h-20 rounded-lg border transition-all ${
                              isActive ? 'border-accent ring-2 ring-accent' : 'border-gray-200 hover:border-gray-400'
                            }`}
                            style={{
                              backgroundImage: `url(${wallpaper.previewUrl})`,
                              backgroundSize: 'cover',
                              backgroundPosition: 'center',
                            }}
                            aria-label={t('settings.theme.wallpaper_title')}
                          />
                        );
                      })}
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="flex-1 font-semibold py-2 px-4 rounded-lg bg-accent text-text-dark hover:bg-[#8ec9c9] transition-colors"
                      >
                        {t('settings.theme.upload_image_button')}
                      </button>
                      <button
                        onClick={() => setWallpaper('none')}
                        className="flex-1 font-semibold py-2 px-4 rounded-lg bg-gray-300 text-text-dark hover:bg-gray-400 transition-colors"
                      >
                        {t('settings.theme.remove_wallpaper_button')}
                      </button>
                    </div>
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleWallpaperUpload}
                      accept="image/*"
                      className="hidden"
                    />
                  </div>

                  <div className="mt-6">
                    <h3 className="text-lg font-semibold mb-2">{t('settings.theme.screen_items_title')}</h3>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between p-3 bg-white/70 border border-gray-200 rounded-lg">
                        <div>
                          <p className="font-semibold text-sm">{t('settings.theme.show_datetime_label')}</p>
                          <p className="text-xs text-gray-500">{t('settings.theme.show_datetime_help')}</p>
                        </div>
                        <input
                          type="checkbox"
                          checked={Boolean(theme.showDateTime ?? true)}
                          onChange={handleDateTimeToggle}
                          className="h-5 w-5"
                        />
                      </div>
                      <div className="flex items-center justify-between p-3 bg-white/70 border border-gray-200 rounded-lg">
                        <div>
                          <p className="font-semibold text-sm">{t('settings.theme.show_system_stats_label')}</p>
                          <p className="text-xs text-gray-500">{t('settings.theme.show_system_stats_help')}</p>
                        </div>
                        <input
                          type="checkbox"
                          checked={Boolean(theme.showSystemStats ?? false)}
                          onChange={handleSystemStatsToggle}
                          className="h-5 w-5"
                        />
                      </div>
                      <div className="flex items-center justify-between p-3 bg-white/70 border border-gray-200 rounded-lg">
                        <div>
                          <p className="font-semibold text-sm">{t('settings.theme.show_profile_menu_label')}</p>
                          <p className="text-xs text-gray-500">{t('settings.theme.show_profile_menu_help')}</p>
                        </div>
                        <input
                          type="checkbox"
                          checked={Boolean(theme.showProfileMenu ?? true)}
                          onChange={handleProfileMenuToggle}
                          className="h-5 w-5"
                        />
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={resetTheme}
                    className="w-full font-bold py-2 px-4 rounded-lg bg-red-500 text-white hover:bg-red-600 transition-colors mt-6"
                  >
                    {t('settings.theme.reset_theme_button')}
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
      <ThemeSettingsModal
        key="theme-settings-modal"
        isOpen={isThemeModalOpen}
        onClose={() => setIsThemeModalOpen(false)}
      />
    </AnimatePresence>
  );
};
