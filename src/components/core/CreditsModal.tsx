import React from 'react';
import { useTranslation, Trans } from 'react-i18next';
import { X } from 'lucide-react';

interface CreditsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CreditsModal: React.FC<CreditsModalProps> = ({ isOpen, onClose }) => {
  const { t, i18n } = useTranslation();
  if (!isOpen) return null;

  const lang = (i18n.resolvedLanguage || i18n.language || 'es').split('-')[0];
  const ccDeeds: Record<string, string> = {
    es: 'https://creativecommons.org/licenses/by-sa/4.0/deed.es',
    en: 'https://creativecommons.org/licenses/by-sa/4.0/deed.en',
    ca: 'https://creativecommons.org/licenses/by-sa/4.0/deed.ca',
    gl: 'https://creativecommons.org/licenses/by-sa/4.0/deed.gl',
    eu: 'https://creativecommons.org/licenses/by-sa/4.0/deed.eu',
  };
  const ccDeedUrl = ccDeeds[lang] ?? ccDeeds.es;

  return (
    <div className="fixed inset-0 bg-black/50 z-[10001] flex items-center justify-center" onClick={onClose}>
      <div 
        className="bg-white/90 backdrop-blur-xl text-text-dark rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col" 
        onClick={e => e.stopPropagation()}
      >
        <header className="p-4 border-b flex justify-between items-center">
          <h2 className="text-xl font-bold">{t('licenses.title')}</h2>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-black/10"><X size={20}/></button>
        </header>

        <div className="p-6 overflow-y-auto text-sm space-y-4">
          <p dangerouslySetInnerHTML={{ __html: t('credits.original_project') }} />
          <p>
            {t('credits.original_link')}{' '}
            <a href="https://mtgonzalezm.github.io/escritorio-interactivo-aula/" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
              https://mtgonzalezm.github.io/escritorio-interactivo-aula/
            </a>
          </p>
          <p>
            <Trans i18nKey="credits.new_version" />{' '}
            <a href="https://github.com/escritorio-digital/escritorio-digital.github.io" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
              {t('credits.repository_link_text')}
            </a>
          </p>
          <hr />
          <p dangerouslySetInnerHTML={{ __html: t('credits.vibe_community') }} />
          <ul className="list-disc list-inside space-y-2">
            <li>
              {t('credits.vibe_apps_link_text')}{' '}
              <a href="https://vibe-coding-educativo.github.io/app_edu/" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                {t('credits.vibe_apps_repo_text')}
              </a>
            </li>
            <li>
              {t('credits.vibe_telegram_link_text')}{' '}
              <a href="https://t.me/vceduca" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                t.me/vceduca
              </a>
            </li>
          </ul>
           <hr />
          <section className="space-y-4">
            <div>
              <h4 className="font-semibold">{t('licenses.code_title')}</h4>
              <p>
                {t('licenses.code_text')}{' '}
                <strong>{t('licenses.code_license_name')}</strong>
              </p>
              <p>{t('licenses.code_license_desc')}</p>
              <p>
                <a href="https://www.gnu.org/licenses/agpl-3.0.html" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                  {t('licenses.code_link_label')}
                </a>
              </p>
            </div>

            <div>
              <h4 className="font-semibold">{t('licenses.content_title')}</h4>
              <p>
                {t('licenses.content_text')}{' '}
                <strong>{t('licenses.content_license_name')}</strong>
              </p>
              <p>
                <a href={ccDeedUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                  {t('licenses.content_link_label')}
                </a>
              </p>
            </div>

            <div>
              <h4 className="font-semibold">{t('licenses.external_title')}</h4>
              <p>{t('licenses.external_text')}</p>
              <p>
                <a href="https://github.com/escritorio-digital/escritorio-digital.github.io" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                  {t('licenses.repo_link_label')}
                </a>
              </p>
            </div>
          </section>
           <hr />
          <div className="text-center p-4 bg-gray-100 rounded-lg">
            <p className="font-semibold">{t('licenses.principles_text')}</p>
            <a href="https://conocimiento-abierto.github.io/" target="_blank" rel="noopener noreferrer" className="text-lg font-bold text-blue-600 hover:underline">
              {t('licenses.principles_name')}
            </a>
            <p className="mt-4">
              <a href={ccDeedUrl} target="_blank" rel="noopener noreferrer" className="inline-block" title={t('licenses.content_license_name')}>
                <img src="https://i.creativecommons.org/l/by-sa/4.0/88x31.png" alt={t('licenses.content_license_name')} />
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
