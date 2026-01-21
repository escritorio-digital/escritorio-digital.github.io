import React from 'react';
import { ExternalLink, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export const AboutModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  const { t, i18n } = useTranslation();
  if (!isOpen) return null;

  const appVersion = import.meta.env.VITE_APP_VERSION ?? 'dev';
  const formattedDate = new Intl.DateTimeFormat(i18n.language, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(new Date());

  return (
    <div className="fixed inset-0 bg-black/50 z-[10001] flex items-center justify-center" onClick={onClose}>
      <div
        className="bg-white/90 backdrop-blur-xl text-text-dark rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="p-4 border-b flex justify-between items-center">
          <h2 className="text-xl font-bold">{t('about.title')}</h2>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-black/10">
            <X size={20} />
          </button>
        </header>

        <div className="p-6 overflow-y-auto text-sm space-y-5">
          <div className="grid gap-2">
            <div>
              <p className="text-xs uppercase tracking-wide text-gray-500">{t('about.app_name_label')}</p>
              <p className="font-semibold">{t('about.app_name_value')}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-gray-500">{t('about.version_label')}</p>
              <p className="font-semibold">{t('about.version_value', { version: appVersion, date: formattedDate })}</p>
            </div>
          </div>

          <div>
            <h3 className="text-base font-semibold mb-2">{t('about.history_title')}</h3>
            <div className="space-y-3">
              <div className="p-3 bg-white/70 border border-gray-200 rounded-lg">
                <p className="font-semibold">{t('about.initial_title')}</p>
                <p className="text-sm text-gray-700">{t('about.initial_text')}</p>
                <p className="text-sm mt-2">
                  {t('about.original_app_label')}{' '}
                  <a
                    href="https://mtgonzalezm.github.io/escritorio-interactivo-aula/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline inline-flex items-center gap-1"
                  >
                    mtgonzalezm.github.io/escritorio-interactivo-aula <ExternalLink size={14} />
                  </a>
                </p>
              </div>
              <div className="p-3 bg-white/70 border border-gray-200 rounded-lg">
                <p className="font-semibold">{t('about.development_title')}</p>
                <p className="text-sm text-gray-700">{t('about.development_text')}</p>
              </div>
              <div className="p-3 bg-white/70 border border-gray-200 rounded-lg">
                <p className="font-semibold">{t('about.continuity_title')}</p>
                <p className="text-sm text-gray-700">{t('about.continuity_text')}</p>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-base font-semibold mb-2">{t('about.community_title')}</h3>
            <div className="p-3 bg-white/70 border border-gray-200 rounded-lg space-y-2">
              <p className="text-sm text-gray-700">{t('about.community_text')}</p>
              <p className="text-sm">
                {t('about.community_repo_label')}{' '}
                <a
                  href="https://vibe-coding-educativo.github.io/app_edu/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline inline-flex items-center gap-1"
                >
                  vibe-coding-educativo.github.io/app_edu <ExternalLink size={14} />
                </a>
              </p>
              <p className="text-sm">
                {t('about.community_telegram_label')}{' '}
                <a
                  href="https://t.me/vceduca"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline inline-flex items-center gap-1"
                >
                  t.me/vceduca <ExternalLink size={14} />
                </a>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
