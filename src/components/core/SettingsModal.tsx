import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { X, Search } from 'lucide-react';
import { WIDGET_REGISTRY } from '../widgets';
import { ThemeSettings } from './ThemeSettings';
import { ProfileManager } from './ProfileManager';
import type { ProfileCollection } from '../../types';
import { clearLocalWebData, WIDGET_DATA_KEYS } from '../../utils/backup';
import { removeFromIndexedDb } from '../../utils/storage';
import { useLocalStorage } from '../../hooks/useLocalStorage';

type WidgetsViewMode = 'theme' | 'alphabetical';

const WIDGET_CATEGORIES: Array<{
  id: string;
  titleKey: string;
  widgetIds: string[];
}> = [
  {
    id: 'organization',
    titleKey: 'settings.widgets.categories.organization',
    widgetIds: ['work-list', 'attendance', 'group-generator', 'calendar', 'program-guide'],
  },
  {
    id: 'time',
    titleKey: 'settings.widgets.categories.time',
    widgetIds: ['timer', 'stopwatch', 'metronome'],
  },
  {
    id: 'math_science',
    titleKey: 'settings.widgets.categories.math_science',
    widgetIds: ['scientific-calculator', 'unit-converter', 'latex-markdown'],
  },
  {
    id: 'resources',
    titleKey: 'settings.widgets.categories.resources',
    widgetIds: ['notepad', 'drawing-pad', 'image-carousel', 'iframe', 'local-web', 'pdf-viewer', 'file-opener', 'directo-viewer', 'html-sandbox'],
  },
  {
    id: 'interaction',
    titleKey: 'settings.widgets.categories.interaction',
    widgetIds: ['dice', 'random-spinner', 'qr-code-generator', 'traffic-light', 'sound-meter', 'scoreboard'],
  },
  {
    id: 'logic_games',
    titleKey: 'settings.widgets.categories.logic_games',
    widgetIds: ['tic-tac-toe', 'memory-game', 'sliding-puzzle'],
  },
  {
    id: 'gestures',
    titleKey: 'settings.widgets.categories.gestures',
    widgetIds: ['work-gestures'],
  },
];

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: 'general' | 'profiles' | 'widgets' | 'theme';
  pinnedWidgets: string[];
  setPinnedWidgets: React.Dispatch<React.SetStateAction<string[]>>;
  profiles: ProfileCollection;
  setProfiles: React.Dispatch<React.SetStateAction<ProfileCollection>>;
  activeProfileName: string;
  setActiveProfileName: (name: string) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  initialTab = 'general',
  pinnedWidgets,
  setPinnedWidgets,
  profiles,
  setProfiles,
  activeProfileName,
  setActiveProfileName,
}) => {
  const { t, i18n } = useTranslation();
  const [activeTab, setActiveTab] = useState('general');
  const [searchTerm, setSearchTerm] = useState('');
  const [widgetsViewMode, setWidgetsViewMode] = useLocalStorage<WidgetsViewMode>('widgets-view-mode', 'theme');

  useEffect(() => {
    if (isOpen) setActiveTab(initialTab);
  }, [isOpen, initialTab]);

  const filteredWidgets = useMemo(() => {
    const normalizedSearch = searchTerm.toLowerCase();
    const results = Object.values(WIDGET_REGISTRY).filter(widget => {
      if (!searchTerm) return true;
      return t(widget.title).toLowerCase().includes(normalizedSearch);
    });
    return results.sort((a, b) => t(a.title).localeCompare(t(b.title)));
  }, [searchTerm, t]);

  const widgetsByCategory = useMemo(() => {
    const widgetsById = new Map(filteredWidgets.map((widget) => [widget.id, widget]));
    const categorized = WIDGET_CATEGORIES.map((category) => ({
      ...category,
      widgets: category.widgetIds
        .map((id) => widgetsById.get(id))
        .filter((widget): widget is (typeof filteredWidgets)[number] => Boolean(widget))
        .sort((a, b) => t(a.title).localeCompare(t(b.title))),
    }));
    const categorizedIds = new Set(WIDGET_CATEGORIES.flatMap((category) => category.widgetIds));
    const uncategorized = filteredWidgets
      .filter((widget) => !categorizedIds.has(widget.id))
      .sort((a, b) => t(a.title).localeCompare(t(b.title)));
    if (uncategorized.length > 0) {
      categorized.push({
        id: 'other',
        titleKey: 'settings.widgets.categories.other',
        widgetIds: uncategorized.map((widget) => widget.id),
        widgets: uncategorized,
      });
    }
    return categorized;
  }, [filteredWidgets]);

  const MAX_WIDGETS = 20;

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
      ...WIDGET_DATA_KEYS,
    ]));
    try {
      keysToClear.forEach(k => window.localStorage.removeItem(k));
      await Promise.all(WIDGET_DATA_KEYS.map((key) => removeFromIndexedDb(key)));
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

            <div className="overflow-y-auto p-4">
              {activeTab === 'general' && (
                <div>
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
              {activeTab === 'profiles' && <ProfileManager profiles={profiles} setProfiles={setProfiles} activeProfileName={activeProfileName} setActiveProfileName={setActiveProfileName} />}
              {activeTab === 'widgets' && (
                <div>
                  <div className="relative mb-4">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                    <input type="text" placeholder={t('settings.widgets.search')} value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2 border rounded-lg bg-white/80 focus:ring-2 focus:ring-accent focus:outline-none" />
                  </div>
                  <div className="flex items-center justify-between gap-3 mb-4">
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
                  <p className="mb-4 text-sm text-gray-600">{t('settings.widgets.pinned_info', { count: pinnedWidgets.length, max: MAX_WIDGETS })}</p>
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
              {activeTab === 'theme' && <ThemeSettings />}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
