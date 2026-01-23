import React, { useState } from 'react';
import { ArrowDown, ArrowUp, Check, FolderOpen, Trash2 } from 'lucide-react';
import { defaultTheme, useTheme } from '../../context/ThemeContext';
import { cloneLocalWebData } from '../../utils/backup';
import type { ProfileCollection } from '../../types';
import { useTranslation } from 'react-i18next';

interface ProfileManagerProps {
  profiles: ProfileCollection;
  setProfiles: React.Dispatch<React.SetStateAction<ProfileCollection>>;
  activeProfileName: string;
  setActiveProfileName: (name: string) => void;
  onCloseSettings: () => void;
  profileOrder: string[];
  setProfileOrder: React.Dispatch<React.SetStateAction<string[]>>;
}

export const ProfileManager: React.FC<ProfileManagerProps> = ({
  profiles,
  setProfiles,
  activeProfileName,
  setActiveProfileName,
  onCloseSettings,
  profileOrder,
  setProfileOrder,
}) => {
  const { t } = useTranslation();
  const [newProfileName, setNewProfileName] = useState('');
  const [createMode, setCreateMode] = useState<'empty' | 'clone'>('empty');
  const [editingProfile, setEditingProfile] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const { theme } = useTheme();
  const defaultPinnedWidgets = ['work-list', 'alarm', 'file-opener', 'vce-community'];
  const defaultProfileKey = 'Escritorio Principal';
  const orderedProfileNames = profileOrder.filter((name) => profiles[name]);
  Object.keys(profiles).forEach((name) => {
    if (!orderedProfileNames.includes(name)) orderedProfileNames.push(name);
  });

  const getDisplayName = (name: string) =>
    name === defaultProfileKey ? t('settings.profiles.default_name') : name;

  const handleSaveCurrent = async () => {
    const trimmedName = newProfileName.trim();
    if (trimmedName && !profiles[trimmedName]) {
      const currentProfile = profiles[activeProfileName];
      const profileData = createMode === 'clone'
        ? {
            ...currentProfile,
            theme: theme,
          }
        : {
            theme: defaultTheme,
            activeWidgets: [],
            pinnedWidgets: defaultPinnedWidgets,
            vceFavorites: [],
          };
      setProfiles(prev => ({
        ...prev,
        [trimmedName]: {
            ...profileData,
        }
      }));
      setProfileOrder((prev) => [...prev, trimmedName]);
      if (createMode === 'clone') {
        try {
          await cloneLocalWebData(activeProfileName, trimmedName);
        } catch (error) {
          console.error(error);
        }
      }
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
      setProfileOrder((prev) => prev.filter((item) => item !== name));
      if (activeProfileName === name) {
        setActiveProfileName(Object.keys(newProfiles)[0]);
      }
    }
  };

  const cancelRename = () => {
    setEditingProfile(null);
    setEditingName('');
  };

  const handleRename = (originalName: string) => {
    const trimmedName = editingName.trim();
    if (!trimmedName) {
      alert(t('settings.profiles.invalid_name_alert'));
      return;
    }
    if (trimmedName === originalName) {
      cancelRename();
      return;
    }
    if (profiles[trimmedName]) {
      alert(t('settings.profiles.invalid_name_alert'));
      return;
    }
    setProfiles((prev) => {
      const updated = { ...prev };
      const profileData = updated[originalName];
      if (!profileData) return prev;
      delete updated[originalName];
      updated[trimmedName] = profileData;
      return updated;
    });
    setProfileOrder((prev) => prev.map((item) => (item === originalName ? trimmedName : item)));
    if (activeProfileName === originalName) {
      setActiveProfileName(trimmedName);
    }
    cancelRename();
  };

  const moveProfile = (name: string, direction: 'up' | 'down') => {
    setProfileOrder((prev) => {
      const order = prev.filter((item) => profiles[item]);
      const index = order.indexOf(name);
      if (index === -1) return prev;
      const nextIndex = direction === 'up' ? index - 1 : index + 1;
      if (nextIndex < 0 || nextIndex >= order.length) return prev;
      const updated = [...order];
      const [item] = updated.splice(index, 1);
      updated.splice(nextIndex, 0, item);
      return updated;
    });
  };

  return (
    <div className="p-4 space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-2">{t('settings.profiles.save_current_title')}</h3>
        <div className="mb-3">
          <div className="text-sm font-semibold text-gray-700">{t('settings.profiles.create_mode_label')}</div>
          <div className="mt-2 flex items-center gap-4 text-sm">
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="profile-create-mode"
                value="empty"
                checked={createMode === 'empty'}
                onChange={() => setCreateMode('empty')}
              />
              <span>{t('settings.profiles.create_mode_empty')}</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="profile-create-mode"
                value="clone"
                checked={createMode === 'clone'}
                onChange={() => setCreateMode('clone')}
              />
              <span>{t('settings.profiles.create_mode_clone')}</span>
            </label>
          </div>
        </div>
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
        <button
          onClick={() => {
            onCloseSettings();
            window.dispatchEvent(new CustomEvent('open-profile-backup', { detail: { tab: 'export' } }));
          }}
          className="w-full text-left px-3 py-2 rounded-lg bg-white border border-gray-300 text-sm text-text-dark hover:bg-gray-100 transition-colors shadow-sm"
        >
          {t('backup.manage_profiles')}
        </button>
      </div>
      <div>
        <h3 className="text-lg font-semibold mb-2">{t('settings.profiles.saved_profiles_title')}</h3>
        <ul className="space-y-2">
          {orderedProfileNames.map((name, index) => (
            <li key={name} className="flex items-center justify-between p-3 bg-white/50 rounded-lg">
              {editingProfile === name ? (
                <input
                  type="text"
                  value={editingName}
                  onChange={(e) => setEditingName(e.target.value)}
                  onBlur={() => handleRename(name)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') handleRename(name);
                    if (event.key === 'Escape') cancelRename();
                  }}
                  placeholder={t('settings.profiles.rename_placeholder')}
                  className="flex-grow bg-white border-2 border-gray-300 rounded p-2 focus:border-accent outline-none text-sm"
                />
              ) : (
                <div
                  onDoubleClick={() => {
                    setEditingProfile(name);
                    setEditingName(name);
                  }}
                  className="flex-grow font-semibold cursor-text rounded px-2 py-1 hover:bg-white/60"
                  title={t('settings.profiles.rename_hint')}
                >
                  {getDisplayName(name)}
                </div>
              )}
              <div className="flex gap-2">
                <button
                  onClick={() => moveProfile(name, 'up')}
                  disabled={index === 0}
                  className="p-2 rounded-lg bg-white border border-gray-200 text-gray-600 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed"
                  title={t('settings.profiles.move_up')}
                  aria-label={t('settings.profiles.move_up')}
                >
                  <ArrowUp size={16} />
                </button>
                <button
                  onClick={() => moveProfile(name, 'down')}
                  disabled={index === orderedProfileNames.length - 1}
                  className="p-2 rounded-lg bg-white border border-gray-200 text-gray-600 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed"
                  title={t('settings.profiles.move_down')}
                  aria-label={t('settings.profiles.move_down')}
                >
                  <ArrowDown size={16} />
                </button>
                <button
                  onClick={() => setActiveProfileName(name)}
                  disabled={name === activeProfileName}
                  className="p-2 rounded-lg bg-blue-500 text-white disabled:opacity-50"
                  title={name === activeProfileName ? t('settings.profiles.active_button') : t('settings.profiles.load_button')}
                  aria-label={name === activeProfileName ? t('settings.profiles.active_button') : t('settings.profiles.load_button')}
                >
                  {name === activeProfileName ? <Check size={16} /> : <FolderOpen size={16} />}
                </button>
                <button
                  onClick={() => handleDelete(name)}
                  className="p-2 rounded-lg bg-red-500 text-white"
                  title={t('settings.profiles.delete_button')}
                  aria-label={t('settings.profiles.delete_button')}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};
