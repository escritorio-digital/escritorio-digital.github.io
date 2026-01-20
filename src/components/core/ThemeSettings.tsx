import React from 'react';
import { useTheme } from '../../context/ThemeContext';
import type { Theme } from '../../context/ThemeContext';
import { useTranslation } from 'react-i18next';

export const ThemeSettings: React.FC = () => {
  const { t } = useTranslation();
  const { theme, setTheme, defaultTheme } = useTheme();

  type ThemePreset = {
    id: string;
    labelKey: string;
    colors: Partial<Theme>;
  };

  const handleColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setTheme({ ...theme, [name]: value });
  };

  const handleHighContrastToggle = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { checked } = e.target;
    setTheme((prevTheme) => ({ ...prevTheme, highContrast: checked }));
  };

  const handleFontScaleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const { value } = e.target;
    setTheme((prevTheme) => ({ ...prevTheme, '--font-scale': value }));
  };

  const themePresets: ThemePreset[] = [
    {
      id: 'classic',
      labelKey: 'settings.theme.presets.classic',
      colors: {
        '--color-bg': defaultTheme['--color-bg'],
        '--color-widget-bg': defaultTheme['--color-widget-bg'],
        '--color-widget-header': defaultTheme['--color-widget-header'],
        '--color-accent': defaultTheme['--color-accent'],
        '--color-text-light': defaultTheme['--color-text-light'],
        '--color-text-dark': defaultTheme['--color-text-dark'],
        '--color-border': defaultTheme['--color-border'],
      },
    },
    {
      id: 'chalkboard',
      labelKey: 'settings.theme.presets.chalkboard',
      colors: {
        '--color-bg': '#122B39',
        '--color-widget-bg': '#1F4E5F',
        '--color-widget-header': '#F4B860',
        '--color-accent': '#F7D07A',
        '--color-text-light': '#F7F4EA',
        '--color-text-dark': '#0B1B21',
        '--color-border': '#122B39',
      },
    },
    {
      id: 'slate',
      labelKey: 'settings.theme.presets.slate',
      colors: {
        '--color-bg': '#232136',
        '--color-widget-bg': '#3A355A',
        '--color-widget-header': '#9E7FB2',
        '--color-accent': '#F6C177',
        '--color-text-light': '#F5F2FF',
        '--color-text-dark': '#14111F',
        '--color-border': '#232136',
      },
    },
    {
      id: 'sand',
      labelKey: 'settings.theme.presets.sand',
      colors: {
        '--color-bg': '#FFF3D9',
        '--color-widget-bg': '#FF7A5C',
        '--color-widget-header': '#2B7A78',
        '--color-accent': '#F5D547',
        '--color-text-light': '#FFF8EA',
        '--color-text-dark': '#2B1D0E',
        '--color-border': '#F3E2BF',
      },
    },
    {
      id: 'ocean',
      labelKey: 'settings.theme.presets.ocean',
      colors: {
        '--color-bg': '#E9F4FF',
        '--color-widget-bg': '#2F80ED',
        '--color-widget-header': '#1B3A57',
        '--color-accent': '#FFB703',
        '--color-text-light': '#F8F9FB',
        '--color-text-dark': '#0E1A24',
        '--color-border': '#D7E8FF',
      },
    },
    {
      id: 'confetti',
      labelKey: 'settings.theme.presets.confetti',
      colors: {
        '--color-bg': '#FFF6F9',
        '--color-widget-bg': '#FF6B6B',
        '--color-widget-header': '#6BCB77',
        '--color-accent': '#4D96FF',
        '--color-text-light': '#FFFFFF',
        '--color-text-dark': '#2B2D42',
        '--color-border': '#FDE3EC',
      },
    },
    {
      id: 'sunrise',
      labelKey: 'settings.theme.presets.sunrise',
      colors: {
        '--color-bg': '#FFE8D6',
        '--color-widget-bg': '#FF7F50',
        '--color-widget-header': '#6C5B7B',
        '--color-accent': '#F9C74F',
        '--color-text-light': '#FFF7EA',
        '--color-text-dark': '#2D1E1E',
        '--color-border': '#F6D3C1',
      },
    },
    {
      id: 'berry',
      labelKey: 'settings.theme.presets.berry',
      colors: {
        '--color-bg': '#F6ECFF',
        '--color-widget-bg': '#7B2CBF',
        '--color-widget-header': '#FAD643',
        '--color-accent': '#FF70A6',
        '--color-text-light': '#FDF7FF',
        '--color-text-dark': '#221133',
        '--color-border': '#EAD9FF',
      },
    },
    {
      id: 'mint',
      labelKey: 'settings.theme.presets.mint',
      colors: {
        '--color-bg': '#E8FFF7',
        '--color-widget-bg': '#2A9D8F',
        '--color-widget-header': '#264653',
        '--color-accent': '#E9C46A',
        '--color-text-light': '#F7FFFB',
        '--color-text-dark': '#0E1F20',
        '--color-border': '#D2F3E7',
      },
    },
    {
      id: 'colorblind-protanopia',
      labelKey: 'settings.theme.presets.colorblind_protanopia',
      colors: {
        '--color-bg': '#F7F7F2',
        '--color-widget-bg': '#2A6F97',
        '--color-widget-header': '#F4D35E',
        '--color-accent': '#EE6C4D',
        '--color-text-light': '#FFFFFF',
        '--color-text-dark': '#1B263B',
        '--color-border': '#E0E0D6',
      },
    },
    {
      id: 'colorblind-deuteranopia',
      labelKey: 'settings.theme.presets.colorblind_deuteranopia',
      colors: {
        '--color-bg': '#F0F5F9',
        '--color-widget-bg': '#457B9D',
        '--color-widget-header': '#E9C46A',
        '--color-accent': '#2A9D8F',
        '--color-text-light': '#FFFFFF',
        '--color-text-dark': '#1D3557',
        '--color-border': '#DCE6EF',
      },
    },
    {
      id: 'colorblind-tritanopia',
      labelKey: 'settings.theme.presets.colorblind_tritanopia',
      colors: {
        '--color-bg': '#FFF3F0',
        '--color-widget-bg': '#8C1C13',
        '--color-widget-header': '#5A189A',
        '--color-accent': '#2F7E4E',
        '--color-text-light': '#FFFFFF',
        '--color-text-dark': '#2D1B1B',
        '--color-border': '#F0DAD4',
      },
    },
  ];

  const applyPreset = (preset: ThemePreset) => {
    setTheme((prevTheme) => ({ ...prevTheme, ...preset.colors }));
  };

  const isPresetActive = (preset: ThemePreset) => {
    return Object.entries(preset.colors).every(([key, value]) => theme[key as keyof Theme] === value);
  };

  const colorOptions = [
    { id: '--color-bg', labelKey: 'desktop_bg' },
    { id: '--color-widget-bg', labelKey: 'widget_bg' },
    { id: '--color-widget-header', labelKey: 'widget_header' },
    { id: '--color-accent', labelKey: 'accent' },
    { id: '--color-text-light', labelKey: 'text_light' },
    { id: '--color-text-dark', labelKey: 'text_dark' },
  ];

  return (
    <div className="p-4 space-y-6">
      <div>
        <h3 className="text-lg font-semibold">{t('settings.theme.accessibility_title')}</h3>
        <p className="text-sm text-gray-600 mb-3">{t('settings.theme.accessibility_help')}</p>
        <div className="grid gap-3">
          <label className="flex items-center justify-between text-sm">
            <span>{t('settings.theme.high_contrast')}</span>
            <input
              type="checkbox"
              checked={Boolean(theme.highContrast)}
              onChange={handleHighContrastToggle}
              className="h-4 w-4 rounded border-gray-300 accent-accent"
            />
          </label>
          <label className="flex items-center justify-between text-sm">
            <span>{t('settings.theme.font_scale')}</span>
            <select
              value={theme['--font-scale']}
              onChange={handleFontScaleChange}
              className="p-2 border rounded-lg bg-white/80 focus:ring-2 focus:ring-accent focus:outline-none"
            >
              <option value="0.9">{t('settings.theme.font_scale_90')}</option>
              <option value="1">{t('settings.theme.font_scale_100')}</option>
              <option value="1.1">{t('settings.theme.font_scale_110')}</option>
              <option value="1.25">{t('settings.theme.font_scale_125')}</option>
              <option value="1.5">{t('settings.theme.font_scale_150')}</option>
            </select>
          </label>
        </div>
      </div>
      <div>
        <h3 className="text-lg font-semibold">{t('settings.theme.presets_title')}</h3>
        <p className="text-sm text-gray-600 mb-3">{t('settings.theme.presets_help')}</p>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {themePresets.map((preset) => {
            const isActive = isPresetActive(preset);
            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => applyPreset(preset)}
                className={`text-left p-3 rounded-lg border transition-all ${
                  isActive ? 'border-accent ring-2 ring-accent' : 'border-gray-200 hover:border-gray-400'
                }`}
                aria-pressed={isActive}
              >
                <div
                  className="h-14 rounded-md overflow-hidden border border-black/10 mb-2"
                  style={{ backgroundColor: preset.colors['--color-bg'] }}
                >
                  <div style={{ backgroundColor: preset.colors['--color-widget-header'] }} className="h-4" />
                  <div className="flex h-10">
                    <div style={{ backgroundColor: preset.colors['--color-widget-bg'] }} className="flex-1" />
                    <div style={{ backgroundColor: preset.colors['--color-accent'] }} className="w-6" />
                  </div>
                </div>
                <span className="text-sm font-semibold">{t(preset.labelKey)}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold mb-2">{t('settings.theme.theme_colors_title')}</h3>
        <div className="grid grid-cols-2 gap-4">
          {colorOptions.map(({ id, labelKey }) => (
            <div key={id} className="flex items-center justify-between">
              <label htmlFor={id} className="text-sm">{t(`settings.theme.colors.${labelKey}`)}</label>
              <input
                type="color"
                id={id}
                name={id}
                value={theme[id as keyof typeof theme] as string}
                onChange={handleColorChange}
                className="theme-color-input"
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
