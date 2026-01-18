import React, { useState, useRef, useEffect, useMemo } from 'react';
import { ChevronUp, ChevronsUpDown, Download, Upload, Users } from 'lucide-react';
import type { ProfileCollection } from '../../types';
import { useTranslation } from 'react-i18next';
import type { LocalWebArchive } from '../../utils/backup';
import {
  buildBackupPayload,
  clearLocalWebData,
  exportLocalWebRecords,
  getLocalWebStats,
  buildBackupArchive,
  isZipBuffer,
  isValidBackupPayload,
  parseBackupArchive,
  exportWidgetData,
  importLocalWebData,
  importLocalWebRecords,
  importWidgetData,
  WIDGET_DATA_KEYS,
} from '../../utils/backup';
import { getFromIndexedDb } from '../../utils/storage';

// Definimos las propiedades que nuestro componente necesita
interface ProfileSwitcherProps {
  profiles: ProfileCollection;
  activeProfileName: string;
  setActiveProfileName: (name: string) => void;
  onManageProfiles: () => void;
  onOpenContextMenu: (event: React.MouseEvent) => void;
  setProfiles: React.Dispatch<React.SetStateAction<ProfileCollection>>;
  profileOrder: string[];
}

export const ProfileSwitcher: React.FC<ProfileSwitcherProps> = ({
  profiles,
  activeProfileName,
  setActiveProfileName,
  onManageProfiles,
  onOpenContextMenu,
  setProfiles,
  profileOrder,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isBackupOpen, setIsBackupOpen] = useState(false);
  const [backupTab, setBackupTab] = useState<'export' | 'import'>('export');
  const [includeProfiles] = useState(true);
  const [includeWidgetData, setIncludeWidgetData] = useState(true);
  const [includeLocalWeb, setIncludeLocalWeb] = useState(true);
  const [hasWidgetData, setHasWidgetData] = useState(false);
  const [hasLocalWeb, setHasLocalWeb] = useState(false);
  const [hasSelectedLocalWeb, setHasSelectedLocalWeb] = useState(false);
  const [selectedProfiles, setSelectedProfiles] = useState<string[]>([]);
  const [importMode, setImportMode] = useState<'replace' | 'merge'>('replace');
  const [backupStatus, setBackupStatus] = useState('');
  const [sizeLabel, setSizeLabel] = useState('');
  const [isEstimating, setIsEstimating] = useState(false);
  const [isTransferOpen, setIsTransferOpen] = useState(false);
  const [transferLabel, setTransferLabel] = useState('');
  const [transferProgress, setTransferProgress] = useState('');
  const { t } = useTranslation();
  const profileNames = useMemo(() => {
    const names = Object.keys(profiles);
    const ordered = profileOrder.filter((name) => names.includes(name));
    names.forEach((name) => {
      if (!ordered.includes(name)) ordered.push(name);
    });
    return ordered;
  }, [profiles, profileOrder]);
  const isPartialProfileSelection =
    includeProfiles &&
    selectedProfiles.length > 0 &&
    selectedProfiles.length < profileNames.length;
  const canIncludeLocalWeb =
    (hasLocalWeb || hasSelectedLocalWeb) &&
    selectedProfiles.length > 0;
  const containerRef = useRef<HTMLDivElement>(null);
  const importInputRef = useRef<HTMLInputElement>(null);
  const estimateCounterRef = useRef(0);
  const abortControllerRef = useRef<AbortController | null>(null);
  const defaultProfileKey = 'Escritorio Principal';

  useEffect(() => {
    const handleOpenBackup = (event: Event) => {
      const detail = (event as CustomEvent<{ tab?: 'export' | 'import' }>).detail;
      setBackupTab(detail?.tab ?? 'export');
      setIsBackupOpen(true);
      setIsOpen(false);
    };
    window.addEventListener('open-profile-backup', handleOpenBackup as EventListener);
    return () => window.removeEventListener('open-profile-backup', handleOpenBackup as EventListener);
  }, []);

  const getDisplayName = (name: string) =>
    name === defaultProfileKey ? t('settings.profiles.default_name') : name;

  const handleProfileSelect = (name: string) => {
    setActiveProfileName(name);
    setIsOpen(false);
  };

  const handleManageProfiles = () => {
    onManageProfiles();
    setIsOpen(false);
  };

  useEffect(() => {
    if (!isOpen && !isBackupOpen) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setIsBackupOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, isBackupOpen]);

  useEffect(() => {
    if (!isBackupOpen) return;
    setSelectedProfiles((prev) => {
      if (prev.length === profileNames.length && prev.every((name) => profileNames.includes(name))) {
        return prev;
      }
      return profileNames;
    });
    setBackupStatus('');
    setSizeLabel('');
    setBackupTab('export');
    setImportMode('replace');
    const widgetDataAvailable = WIDGET_DATA_KEYS.some((key) => {
      const item = window.localStorage.getItem(key);
      return Boolean(item);
    });
    setHasWidgetData(widgetDataAvailable);
    setIncludeWidgetData(widgetDataAvailable);
    getLocalWebStats()
      .then((stats) => {
        const available = stats.siteCount > 0;
        setHasLocalWeb(available);
        if (!available) setIncludeLocalWeb(false);
      })
      .catch(() => {
        setHasLocalWeb(false);
        setIncludeLocalWeb(false);
      });
  }, [isBackupOpen, profileNames, activeProfileName]);

  useEffect(() => {
    if (!isBackupOpen) return;
    if (selectedProfiles.length === 0) return;
    getLocalWebStats(selectedProfiles, activeProfileName)
      .then((stats) => {
        const available = stats.siteCount > 0;
        setHasSelectedLocalWeb(available);
        if (!available) setIncludeLocalWeb(false);
      })
      .catch(() => {
        setHasSelectedLocalWeb(false);
        setIncludeLocalWeb(false);
      });
  }, [isBackupOpen, selectedProfiles, activeProfileName]);

  useEffect(() => {
    if (!isPartialProfileSelection) return;
    if (includeWidgetData) setIncludeWidgetData(false);
  }, [isPartialProfileSelection, includeWidgetData]);

  useEffect(() => {
    if (canIncludeLocalWeb) return;
    if (includeLocalWeb) setIncludeLocalWeb(false);
  }, [canIncludeLocalWeb, includeLocalWeb]);

  const toggleProfileSelection = (name: string) => {
    setSelectedProfiles(prev => {
      if (prev.includes(name)) return prev.filter(item => item !== name);
      return [...prev, name];
    });
  };

  const downloadBackup = (data: Uint8Array) => {
    const blob = new Blob([data], { type: 'application/zip' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `escritorio-digital-backup-${new Date().toISOString().slice(0, 10)}.zip`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  const closeTransfer = () => {
    setIsTransferOpen(false);
    setTransferLabel('');
    setTransferProgress('');
  };

  const formatBytes = (value: number): string => {
    if (!Number.isFinite(value)) return '0 B';
    if (value < 1024) return `${value} B`;
    const kb = value / 1024;
    if (kb < 1024) return `${kb.toFixed(1)} KB`;
    const mb = kb / 1024;
    if (mb < 1024) return `${mb.toFixed(1)} MB`;
    const gb = mb / 1024;
    return `${gb.toFixed(2)} GB`;
  };

  const buildDataForExport = async () => {
    const data: Parameters<typeof buildBackupPayload>[0] = {};
    if (includeProfiles && selectedProfiles.length > 0) {
      const selected: ProfileCollection = {};
      selectedProfiles.forEach((name) => {
        if (profiles[name]) selected[name] = profiles[name];
      });
      data.profiles = selected;
      data.activeProfileName = selected[activeProfileName] ? activeProfileName : selectedProfiles[0];
    }
    if (includeWidgetData && hasWidgetData && !isPartialProfileSelection) {
      data.widgetData = await exportWidgetData(WIDGET_DATA_KEYS);
    }
    return buildBackupPayload(data);
  };

  const mergeProfiles = (current: ProfileCollection, incoming: ProfileCollection) => {
    const updated: ProfileCollection = { ...current };
    const nameMap = new Map<string, string>();
    Object.entries(incoming).forEach(([name, profile]) => {
      let candidate = name;
      if (updated[candidate]) {
        let index = 2;
        while (updated[`${name} (${index})`]) {
          index += 1;
        }
        candidate = `${name} (${index})`;
      }
      updated[candidate] = profile;
      nameMap.set(name, candidate);
    });
    return { updated, nameMap };
  };

  const estimateWidgetDataSize = async () => {
    let total = 0;
    for (const key of WIDGET_DATA_KEYS) {
      const item = window.localStorage.getItem(key);
      if (!item) continue;
      if (item === '__indexed_db__') {
        const value = await getFromIndexedDb(key);
        if (value) total += new Blob([value]).size;
      } else {
        total += new Blob([item]).size;
      }
    }
    return total;
  };

  const estimateBackupSize = async () => {
    let total = 0;
    if (includeProfiles && selectedProfiles.length > 0) {
      const selected: ProfileCollection = {};
      selectedProfiles.forEach((name) => {
        if (profiles[name]) selected[name] = profiles[name];
      });
      const profileData = {
        profiles: selected,
        activeProfileName: selected[activeProfileName] ? activeProfileName : selectedProfiles[0],
      };
      total += new Blob([JSON.stringify(profileData)]).size;
    }
    if (includeWidgetData && hasWidgetData && !isPartialProfileSelection) {
      total += await estimateWidgetDataSize();
    }
    if (includeLocalWeb) {
      const stats = await getLocalWebStats(selectedProfiles, activeProfileName);
      if (stats.siteCount > 0) {
        total += Math.ceil(stats.totalBytes * 1.1);
      }
    }
    return total;
  };

  useEffect(() => {
    if (!isBackupOpen) return;
    estimateCounterRef.current += 1;
    const estimateId = estimateCounterRef.current;
    const estimate = async () => {
      if (includeProfiles && selectedProfiles.length === 0) {
        setSizeLabel(t('backup.size_unknown'));
        setIsEstimating(false);
        return;
      }
      setIsEstimating(true);
      try {
        const size = await estimateBackupSize();
        if (estimateCounterRef.current !== estimateId) return;
        setSizeLabel(t('backup.size_label', { size: formatBytes(size) }));
      } catch {
        if (estimateCounterRef.current === estimateId) setSizeLabel(t('backup.size_unknown'));
      } finally {
        if (estimateCounterRef.current === estimateId) setIsEstimating(false);
      }
    };
    estimate();
  }, [isBackupOpen, includeProfiles, includeWidgetData, includeLocalWeb, selectedProfiles, hasWidgetData, hasLocalWeb, profiles, activeProfileName, t]);

  const handleExport = async () => {
    if (includeProfiles && selectedProfiles.length === 0) {
      setBackupStatus(t('backup.no_profiles'));
      return;
    }
    setBackupStatus(t('backup.exporting'));
    setIsBackupOpen(false);
    setIsTransferOpen(true);
    setTransferLabel(t('backup.progress_export_title'));
    setTransferProgress(t('backup.progress_preparing'));
    abortControllerRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;
    try {
      const payload = await buildDataForExport();
      const fallbackProfileName = selectedProfiles.includes(activeProfileName)
        ? activeProfileName
        : selectedProfiles[0];
      const localWebRecords = includeLocalWeb
        ? await exportLocalWebRecords(selectedProfiles, fallbackProfileName)
        : undefined;
      let lastUpdate = 0;
      let processed = 0;
      const archive = await buildBackupArchive(
        payload.data,
        localWebRecords,
        (current, total) => {
          const now = performance.now();
          if (now - lastUpdate > 200) {
            setTransferProgress(`${current}/${total}`);
            lastUpdate = now;
          }
        },
        async () => {
          processed += 1;
          if (processed % 5 === 0) {
            await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
          }
        },
        controller.signal
      );
      if (controller.signal.aborted) return;
      downloadBackup(archive);
      setBackupStatus(t('backup.export_ready'));
    } catch (error) {
      if (!controller.signal.aborted) {
        console.error(error);
        setBackupStatus(t('backup.invalid_file'));
      }
    } finally {
      if (!controller.signal.aborted) {
        closeTransfer();
      }
    }
  };

  const handleImportClick = () => {
    setIsBackupOpen(false);
    importInputRef.current?.click();
  };

  const handleImportFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      setBackupStatus(t('backup.importing'));
      setIsTransferOpen(true);
      setTransferLabel(t('backup.progress_import_title'));
      setTransferProgress(t('backup.progress_preparing'));
      abortControllerRef.current?.abort();
      const controller = new AbortController();
      abortControllerRef.current = controller;
      const buffer = await file.arrayBuffer();
      let payload: ReturnType<typeof buildBackupPayload>;
      let localWebRecords: LocalWebArchive | undefined;
      if (isZipBuffer(buffer) || file.name.toLowerCase().endsWith('.zip')) {
        const parsed = parseBackupArchive(buffer);
        payload = parsed.payload;
        localWebRecords = parsed.localWeb;
      } else {
        const text = new TextDecoder().decode(buffer);
        payload = JSON.parse(text) as ReturnType<typeof buildBackupPayload>;
        if (!isValidBackupPayload(payload)) {
          setBackupStatus(t('backup.invalid_file'));
          closeTransfer();
          return;
        }
      }
      if (!payload?.data) {
        setBackupStatus(t('backup.invalid_file'));
        closeTransfer();
        return;
      }
      if (controller.signal.aborted) return;
      let profileNameMap: Map<string, string> | undefined;
      let fallbackProfileName = payload.data.activeProfileName || activeProfileName;
      if (payload.data.profiles) {
        if (importMode === 'replace') {
          const incoming = payload.data.profiles;
          const names = Object.keys(incoming);
          if (names.length > 0) {
            setProfiles(incoming);
            const desired = payload.data.activeProfileName;
            const resolved = desired && incoming[desired] ? desired : names[0];
            setActiveProfileName(resolved);
            fallbackProfileName = resolved;
          }
        } else {
          setProfiles((prev) => {
            const merged = mergeProfiles(prev, payload.data.profiles || {});
            profileNameMap = merged.nameMap;
            const desired = payload.data.activeProfileName;
            if (desired) {
              const mapped = merged.nameMap.get(desired);
              if (mapped) {
                setActiveProfileName(mapped);
                fallbackProfileName = mapped;
              } else if (merged.updated[desired]) {
                setActiveProfileName(desired);
                fallbackProfileName = desired;
              }
            }
            return merged.updated;
          });
        }
      }
      if (payload.data.widgetData) {
        await importWidgetData(payload.data.widgetData);
      }
      if (payload.data.localWeb || localWebRecords) {
        if (importMode === 'replace') {
          await clearLocalWebData();
        }
        if (localWebRecords) {
          let lastUpdate = 0;
          let processed = 0;
          await importLocalWebRecords(localWebRecords, {
            signal: controller.signal,
            onProgress: (current, total) => {
              const now = performance.now();
              if (now - lastUpdate > 200) {
                setTransferProgress(`${current}/${total}`);
                lastUpdate = now;
              }
            },
            yieldControl: async () => {
              processed += 1;
              if (processed % 5 === 0) {
                await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
              }
            },
            profileNameMap,
            fallbackProfileName,
          });
        } else if (payload.data.localWeb) {
          await importLocalWebData(payload.data.localWeb, { profileNameMap, fallbackProfileName });
        }
        window.dispatchEvent(new Event('local-web-data-changed'));
      }
      setBackupStatus(t('backup.import_done'));
      if (!controller.signal.aborted) {
        closeTransfer();
      }
      window.location.reload();
    } catch (error) {
      if (abortControllerRef.current?.signal.aborted) {
        setBackupStatus('');
      } else {
        console.error(error);
        setBackupStatus(t('backup.invalid_file'));
      }
      closeTransfer();
    } finally {
      event.target.value = '';
    }
  };

  const handleCancelTransfer = () => {
    abortControllerRef.current?.abort();
    closeTransfer();
    setBackupStatus('');
  };

  return (
    // Contenedor principal en la esquina inferior derecha
    <div className="fixed bottom-4 right-4 z-[9999] max-[700px]:hidden" ref={containerRef} onContextMenu={onOpenContextMenu}>
      <div className="relative">
        {/* Menú desplegable que aparece cuando isOpen es true */}
        {isOpen && (
          <div className="absolute bottom-full mb-2 w-56 bg-white/80 backdrop-blur-md rounded-lg shadow-lg border border-black/10 text-sm">
            <ul className="p-1">
              {profileNames.map(name => (
                <li key={name}>
                  <button
                    onClick={() => handleProfileSelect(name)}
                    className={`w-full text-left px-3 py-2 rounded-md transition-colors ${
                      name === activeProfileName
                        ? 'font-semibold bg-accent/30 text-text-dark'
                        : 'hover:bg-accent hover:text-text-dark'
                    }`}
                  >
                    {getDisplayName(name)}
                  </button>
                </li>
              ))}
            </ul>
            <div className="border-t border-black/10 p-1 space-y-1">
              <button
                onClick={handleManageProfiles}
                className="w-full text-left px-3 py-2 rounded-md hover:bg-accent hover:text-text-dark transition-colors flex items-center gap-2"
              >
                <Users size={16} />
                {t('settings.profiles.manage_button')}
              </button>
              <button
                onClick={() => {
                  setIsBackupOpen(true);
                  setIsOpen(false);
                }}
                className="w-full text-left px-3 py-2 rounded-md hover:bg-accent hover:text-text-dark transition-colors flex items-center gap-2"
              >
                <Download size={16} />
                {t('backup.manage_profiles')}
              </button>
            </div>
          </div>
        )}

        {/* El botón principal que siempre está visible */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          onContextMenu={onOpenContextMenu}
          className="w-56 h-12 px-4 bg-black/20 backdrop-blur-md rounded-full text-white hover:bg-black/40 transition-colors flex items-center justify-between"
          title={t('settings.profiles.switcher_title')}
        >
          <span className="font-semibold">{getDisplayName(activeProfileName)}</span>
          {/* El icono cambia si el menú está abierto o cerrado */}
          {isOpen ? <ChevronUp size={20} /> : <ChevronsUpDown size={20} />}
        </button>
        {isBackupOpen && (
          <div className="fixed inset-0 z-[10001] flex items-center justify-center bg-black/40">
            <div className="w-full max-w-xl bg-white/90 backdrop-blur-md rounded-xl shadow-2xl border border-black/10 p-5 text-sm">
              <div className="flex items-center justify-between mb-4">
                <div className="font-semibold text-lg">{t('backup.manage_profiles')}</div>
                <button
                  onClick={() => setIsBackupOpen(false)}
                  className="text-gray-600 hover:text-gray-800"
                >
                  ✕
                </button>
              </div>

              <div className="flex border-b border-gray-300 mb-5">
                <button
                  onClick={() => setBackupTab('export')}
                  className={`-mb-px px-4 py-2 text-sm font-semibold rounded-t-md border transition-colors ${
                    backupTab === 'export'
                      ? 'bg-accent text-text-dark border-accent border-b-white shadow-sm'
                      : 'bg-gray-100 text-gray-600 border-transparent hover:text-text-dark'
                  }`}
                >
                  {t('backup.tab_export')}
                </button>
                <button
                  onClick={() => setBackupTab('import')}
                  className={`-mb-px ml-1 px-4 py-2 text-sm font-semibold rounded-t-md border transition-colors ${
                    backupTab === 'import'
                      ? 'bg-accent text-text-dark border-accent border-b-white shadow-sm'
                      : 'bg-gray-100 text-gray-600 border-transparent hover:text-text-dark'
                  }`}
                >
                  {t('backup.tab_import')}
                </button>
              </div>

              {backupTab === 'export' && (
                <>
                  <div className="space-y-3">
                    <div className="text-sm font-semibold text-gray-700">{t('backup.choose_profiles')}</div>
                    <div className="space-y-1 max-h-32 overflow-auto border border-gray-200 rounded-lg p-2 bg-white/60">
                      {profileNames.map((name) => (
                        <label key={name} className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={selectedProfiles.includes(name)}
                            onChange={() => toggleProfileSelection(name)}
                          />
                          <span>{getDisplayName(name)}</span>
                        </label>
                      ))}
                    </div>
                    <div className="text-xs text-gray-500">{t('backup.include_profiles')}</div>
                    {hasWidgetData && (
                      <label className={`flex items-center gap-2 ${isPartialProfileSelection ? 'opacity-50' : ''}`}>
                        <input
                          type="checkbox"
                          checked={includeWidgetData}
                          onChange={(e) => setIncludeWidgetData(e.target.checked)}
                          disabled={isPartialProfileSelection}
                        />
                        <span>{t('backup.include_widgets')}</span>
                      </label>
                    )}
                    <label className={`flex items-center gap-2 ${canIncludeLocalWeb ? '' : 'opacity-50'}`}>
                      <input
                        type="checkbox"
                        checked={includeLocalWeb}
                        onChange={(e) => setIncludeLocalWeb(e.target.checked)}
                        disabled={!canIncludeLocalWeb}
                      />
                      <span>{t('backup.include_local_web')}</span>
                    </label>
                  </div>

                  <div className="mt-3 text-sm text-gray-700 font-semibold">
                    {isEstimating ? t('backup.size_estimating') : sizeLabel || t('backup.size_unknown')}
                  </div>

                  {backupStatus && <div className="mt-2 text-xs text-gray-600">{backupStatus}</div>}

                  <div className="mt-4">
                    <button
                      onClick={handleExport}
                      className="w-full py-2 rounded-md bg-accent text-text-dark font-semibold hover:bg-[#8ec9c9] transition-colors flex items-center justify-center gap-2"
                    >
                      <Download size={16} />
                      {t('backup.export_button')}
                    </button>
                  </div>
                </>
              )}

              {backupTab === 'import' && (
                <>
                  <div className="space-y-3">
                    <div className="text-sm font-semibold text-gray-700">{t('backup.import_mode_label')}</div>
                    <label className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="import-mode"
                        value="replace"
                        checked={importMode === 'replace'}
                        onChange={() => setImportMode('replace')}
                      />
                      <span>{t('backup.import_mode_replace')}</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="import-mode"
                        value="merge"
                        checked={importMode === 'merge'}
                        onChange={() => setImportMode('merge')}
                      />
                      <span>{t('backup.import_mode_merge')}</span>
                    </label>
                  </div>

                  {backupStatus && <div className="mt-2 text-xs text-gray-600">{backupStatus}</div>}

                  <div className="mt-4">
                    <button
                      onClick={handleImportClick}
                      className="w-full py-2 rounded-md border border-gray-200 bg-white hover:bg-gray-100 transition-colors flex items-center justify-center gap-2"
                    >
                      <Upload size={16} />
                      {t('backup.import_button')}
                    </button>
                  </div>

                  <p className="mt-3 text-[11px] text-gray-500">{t('backup.import_note')}</p>
                </>
              )}
            </div>
          </div>
        )}
        {isTransferOpen && (
          <div className="fixed inset-0 z-[10002] flex items-center justify-center bg-black/50">
            <div className="w-full max-w-sm bg-white/95 backdrop-blur-md rounded-xl shadow-2xl border border-black/10 p-5 text-sm">
              <div className="font-semibold text-lg mb-2">{transferLabel}</div>
              <div className="text-sm text-gray-700 mb-4">{transferProgress}</div>
              <button
                onClick={handleCancelTransfer}
                className="w-full py-2 rounded-md border border-gray-200 bg-white hover:bg-gray-100 transition-colors font-semibold"
              >
                {t('backup.progress_cancel')}
              </button>
            </div>
          </div>
        )}
        <input
          ref={importInputRef}
          type="file"
          accept="application/json,application/zip,.zip"
          className="hidden"
          onChange={handleImportFile}
        />
      </div>
    </div>
  );
};
