import React, { useState } from 'react';
import { useTheme } from '../../context/ThemeContext';
import type { ProfileCollection } from '../../types';
import { useTranslation } from 'react-i18next';

interface ProfileManagerProps {
  profiles: ProfileCollection;
  setProfiles: React.Dispatch<React.SetStateAction<ProfileCollection>>;
  activeProfileName: string;
  setActiveProfileName: (name: string) => void;
}

export const ProfileManager: React.FC<ProfileManagerProps> = ({
  profiles,
  setProfiles,
  activeProfileName,
  setActiveProfileName,
}) => {
  const { t } = useTranslation();
  const [newProfileName, setNewProfileName] = useState('');
  const { theme } = useTheme();
  const defaultProfileKey = 'Escritorio Principal';

  const getDisplayName = (name: string) =>
    name === defaultProfileKey ? t('settings.profiles.default_name') : name;

  const handleSaveCurrent = () => {
    const trimmedName = newProfileName.trim();
    if (trimmedName && !profiles[trimmedName]) {
      const currentProfile = profiles[activeProfileName];
      setProfiles(prev => ({
        ...prev,
        [trimmedName]: {
            ...currentProfile,
            theme: theme,
        }
      }));
      setActiveProfileName(trimmedName);
      setNewProfileName('');
    } else {
      alert(t('settings.profiles.invalid_name_alert'));
    }
  };

  const handleDelete = (name: string) => {
    if (Object.keys(profiles).length <= 1) {
      alert(t('settings.profiles.delete_last_alert'));
      return;
    }
    const displayName = getDisplayName(name);
    if (window.confirm(t('settings.profiles.delete_confirm', { name: displayName }))) {
      const newProfiles = { ...profiles };
      delete newProfiles[name];
      setProfiles(newProfiles);
      if (activeProfileName === name) {
        setActiveProfileName(Object.keys(newProfiles)[0]);
      }
    }
  };

  return (
    <div className="p-4 space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-2">{t('settings.profiles.save_current_title')}</h3>
        <div className="flex gap-2">
          <input
            type="text"
            value={newProfileName}
            onChange={(e) => setNewProfileName(e.target.value)}
            placeholder={t('settings.profiles.new_profile_placeholder')}
            className="flex-grow bg-white border-2 border-gray-300 rounded p-2 focus:border-accent outline-none text-sm"
          />
          <button onClick={handleSaveCurrent} className="font-semibold py-2 px-4 rounded-lg bg-accent text-text-dark">
            {t('settings.profiles.save_button')}
          </button>
        </div>
      </div>
      <div>
        <h3 className="text-lg font-semibold mb-2">{t('settings.profiles.saved_profiles_title')}</h3>
        <ul className="space-y-2">
          {Object.keys(profiles).map(name => (
            <li key={name} className="flex items-center justify-between p-3 bg-white/50 rounded-lg">
              <span className="font-semibold">{getDisplayName(name)}</span>
              <div className="flex gap-2">
                <button
                  onClick={() => setActiveProfileName(name)}
                  disabled={name === activeProfileName}
                  className="font-semibold py-1 px-3 rounded-lg bg-blue-500 text-white disabled:opacity-50"
                >
                  {name === activeProfileName ? t('settings.profiles.active_button') : t('settings.profiles.load_button')}
                </button>
                <button onClick={() => handleDelete(name)} className="font-semibold py-1 px-3 rounded-lg bg-red-500 text-white">
                  {t('settings.profiles.delete_button')}
                </button>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};
