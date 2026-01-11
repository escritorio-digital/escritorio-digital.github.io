import React, { useRef } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { useTranslation } from 'react-i18next';
import { wallpaperOptions, getWallpaperValue } from '../../utils/wallpapers';

export const ThemeSettings: React.FC = () => {
  const { t } = useTranslation();
  const { theme, setTheme, setWallpaper, resetTheme } = useTheme();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setTheme({ ...theme, [name]: value });
  };
  
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

  const colorOptions = [
    { id: '--color-bg', labelKey: 'desktop_bg' },
    { id: '--color-widget-bg', labelKey: 'widget_bg' },
    { id: '--color-widget-header', labelKey: 'widget_header' },
    { id: '--color-accent', labelKey: 'accent' },
    { id: '--color-text-light', labelKey: 'text_light' },
    { id: '--color-text-dark', labelKey: 'text_dark' },
  ];
  const availableWallpapers = wallpaperOptions;

  return (
    <div className="p-4 space-y-6">
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
                className="w-10 h-10 rounded-full border-none cursor-pointer"
              />
            </div>
          ))}
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold mb-2">{t('settings.theme.wallpaper_title')}</h3>
        <div className="grid grid-cols-3 gap-3 mb-4 max-h-56 overflow-y-auto pr-1">
          {availableWallpapers.map((wallpaper) => {
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
      
      <button
        onClick={resetTheme}
        className="w-full font-bold py-2 px-4 rounded-lg bg-red-500 text-white hover:bg-red-600 transition-colors mt-4"
        >
        {t('settings.theme.reset_theme_button')}
        </button>
    </div>
  );
};
