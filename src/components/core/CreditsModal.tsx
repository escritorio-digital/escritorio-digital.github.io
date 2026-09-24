import React from 'react';
import { useTranslation, Trans } from 'react-i18next';
import { useEscapeKey } from '../../hooks/useEscapeKey';
import { X } from 'lucide-react';

interface CreditsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CreditsModal: React.FC<CreditsModalProps> = ({ isOpen, onClose }) => {
  const { t, i18n } = useTranslation();
  useEscapeKey(isOpen, onClose);
  if (!isOpen) return null;

  const lang = (i18n.resolvedLanguage || i18n.language || 'es').split('-')[0];
  const ccDeeds: Record<string, string> = {
    es: 'https://creativecommons.org/licenses/by-sa/4.0/deed.es',
    en: 'https://creativecommons.org/licenses/by-sa/4.0/deed.en',
    ca: 'https://creativecommons.org/licenses/by-sa/4.0/deed.ca',
    gl: 'https://creativecommons.org/licenses/by-sa/4.0/deed.gl',
    eu: 'https://creativecommons.org/licenses/by-sa/4.0/deed.eu',
    de: 'https://creativecommons.org/licenses/by-sa/4.0/deed.de',
    fr: 'https://creativecommons.org/licenses/by-sa/4.0/deed.fr',
    it: 'https://creativecommons.org/licenses/by-sa/4.0/deed.it',
    pt: 'https://creativecommons.org/licenses/by-sa/4.0/deed.pt',
  };
  const ccDeedUrl = ccDeeds[lang] ?? ccDeeds.es;

  // Todo lo que el escritorio carga, incrusta o abre de otros sitios.
  const externalServices = [
    { name: 'Google Fonts', url: 'https://fonts.google.com/specimen/Mulish', purposeKey: 'licenses.services.fonts' },
    { name: 'Creative Commons', url: 'https://creativecommons.org/', purposeKey: 'licenses.services.badge' },
    { name: 'Google Sheets', url: 'https://workspace.google.com/products/sheets/', purposeKey: 'licenses.services.catalog' },
    { name: 'Wikipedia', url: 'https://www.wikipedia.org/', purposeKey: 'licenses.services.wikipedia' },
    { name: 'Directo', url: 'https://jjdeharo.github.io/directo/', purposeKey: 'licenses.services.directo' },
    { name: 'QPlay', url: 'https://jjdeharo.github.io/qplay/', purposeKey: 'licenses.services.qplay' },
    { name: 'BoardLive', url: 'https://boardlive.github.io/', purposeKey: 'licenses.services.boardlive' },
    { name: 'ChatGPT-IA-edu', url: 'https://chatgpt-ia-edu.github.io/', purposeKey: 'licenses.services.chatgpt' },
    { name: 'Vibe Coding Educativo', url: 'https://vibe-coding-educativo.github.io/app_edu/', purposeKey: 'licenses.services.vce' },
  ];

  const ccBySa3Deeds: Record<string, string> = {
    es: 'https://creativecommons.org/licenses/by-sa/3.0/deed.es',
    en: 'https://creativecommons.org/licenses/by-sa/3.0/deed.en',
    ca: 'https://creativecommons.org/licenses/by-sa/3.0/deed.ca',
    gl: 'https://creativecommons.org/licenses/by-sa/3.0/deed.gl',
    eu: 'https://creativecommons.org/licenses/by-sa/3.0/deed.eu',
    de: 'https://creativecommons.org/licenses/by-sa/3.0/deed.de',
    fr: 'https://creativecommons.org/licenses/by-sa/3.0/deed.fr',
    it: 'https://creativecommons.org/licenses/by-sa/3.0/deed.it',
    pt: 'https://creativecommons.org/licenses/by-sa/3.0/deed.pt',
  };

  const sounds = [
    {
      labelKey: 'licenses.sound_dice',
      author: 'u_qpfzpydtro',
      authorUrl: 'https://pixabay.com/users/u_qpfzpydtro-29496424/',
      source: 'Pixabay',
      sourceUrl: 'https://pixabay.com/sound-effects/dice-142528/',
      license: 'licenses.pixabay_license',
      licenseUrl: 'https://pixabay.com/service/license-summary/',
    },
    {
      labelKey: 'licenses.sound_alarm',
      author: 'Tim (corsica_s)',
      authorUrl: 'https://freesound.org/people/corsica_s/',
      source: 'freedesktop.org',
      sourceUrl: 'https://gitlab.freedesktop.org/xdg/xdg-sound-theme',
      license: 'CC BY-SA 3.0',
      licenseUrl: ccBySa3Deeds[lang] ?? ccBySa3Deeds.es,
    },
  ];

  return (
    <div className="fixed inset-0 bg-black/50 z-[10001] flex items-center justify-center" onClick={onClose}>
      <div 
        className="bg-white/90 backdrop-blur-xl text-text-dark rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col" 
        onClick={e => e.stopPropagation()}
      >
        <header className="p-4 border-b flex justify-between items-center">
          <h2 className="text-xl font-bold">{t('licenses.title')}</h2>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-black/10" aria-label={t('desktop.window_close')} title={t('desktop.window_close')}><X size={20}/></button>
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
              <p className="mb-2">{t('licenses.external_text')}</p>
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-gray-300">
                    <th scope="col" className="py-1 pr-3 font-semibold">{t('licenses.service_col')}</th>
                    <th scope="col" className="py-1 font-semibold">{t('licenses.purpose_col')}</th>
                  </tr>
                </thead>
                <tbody>
                  {externalServices.map(({ name, url, purposeKey }) => (
                    <tr key={name} className="border-b border-gray-200 align-top">
                      <td className="py-1 pr-3">
                        <a href={url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">{name}</a>
                      </td>
                      <td className="py-1">{t(purposeKey)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div>
              <h4 className="font-semibold">{t('licenses.images_title')}</h4>
              <ul className="list-disc list-inside space-y-1">
              <li>{t('licenses.images_generated')}</li>
              <li>
                {t('licenses.wikipedia_icon')}{' '}
                <a href="https://commons.wikimedia.org/wiki/File:Wikipedia-logo-v2.svg" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Wikimedia Commons</a>
                {', '}
                <a href={ccBySa3Deeds[lang] ?? ccBySa3Deeds.es} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">CC BY-SA 3.0</a>
                {'. '}
                <a href="https://foundation.wikimedia.org/wiki/Policy:Trademark_policy" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">{t('licenses.wikipedia_trademark')}</a>
              </li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold">{t('licenses.sounds_title')}</h4>
              <ul className="list-disc list-inside space-y-1">
                {sounds.map(({ labelKey, author, authorUrl, source, sourceUrl, license, licenseUrl }) => (
                  <li key={labelKey}>
                    {t(labelKey)}:{' '}
                    <a href={authorUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">{author}</a>
                    {' ('}
                    <a href={sourceUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">{source}</a>
                    {'), '}
                    <a href={licenseUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">{t(license)}</a>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h4 className="font-semibold">{t('licenses.libraries_title')}</h4>
              <p>{t('licenses.libraries_text')}</p>
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
