import React from 'react';
import { useTranslation, Trans } from 'react-i18next';
import { X, Github } from 'lucide-react';

interface CreditsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenGuide: () => void;
}

export const CreditsModal: React.FC<CreditsModalProps> = ({ isOpen, onClose, onOpenGuide }) => {
  const { t } = useTranslation();
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-[10001] flex items-center justify-center" onClick={onClose}>
      <div 
        className="bg-white/90 backdrop-blur-xl text-text-dark rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col" 
        onClick={e => e.stopPropagation()}
      >
        <header className="p-4 border-b flex justify-between items-center">
          <h2 className="text-xl font-bold">{t('credits.title')}</h2>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-black/10"><X size={20}/></button>
        </header>

        <div className="p-6 overflow-y-auto text-sm space-y-4">
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg text-center">
            <p className="font-semibold text-amber-900">{t('credits.user_guide_title')}</p>
            <button
              onClick={() => {
                onOpenGuide();
                onClose();
              }}
              className="inline-flex items-center justify-center mt-2 px-4 py-2 rounded-full bg-amber-200 text-amber-900 font-semibold hover:bg-amber-300 transition-colors"
            >
              {t('credits.user_guide_link')}
            </button>
          </div>
          <p dangerouslySetInnerHTML={{ __html: t('credits.original_project') }} />
          <p>
            {t('credits.original_link')}{' '}
            <a href="https://mtgonzalezm.github.io/escritorio-interactivo-aula/" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
              https://mtgonzalezm.github.io/escritorio-interactivo-aula/
            </a>
          </p>
          <p>
            <Trans i18nKey="credits.new_version">
              Esta nueva versión fue desarrollada en colaboración por <strong>María Teresa González</strong>, <strong>Juan José de Haro</strong> y <strong>Pablo G. Guízar</strong>. El repositorio de este proyecto se encuentra en:
              <a href="https://github.com/escritorio-digital/escritorio" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                {t('credits.repository_link_text')}
              </a>
            </Trans>
          </p>
          <p className="flex items-center gap-2">
            <Github size={18} className="text-gray-700" />
            <a href="https://github.com/escritorio-digital/escritorio-digital.github.io" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
              github.com/escritorio-digital/escritorio-digital.github.io
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
          <div className="text-center p-4 bg-gray-100 rounded-lg">
            <p className="font-semibold">{t('credits.open_knowledge_adherence')}</p>
            <a href="https://conocimiento-abierto.github.io/" target="_blank" rel="noopener noreferrer" className="text-lg font-bold text-blue-600 hover:underline">
              {t('credits.open_knowledge_decalogue')}
            </a>
            <p className="mt-4">
              <a href="https://creativecommons.org/licenses/by-sa/4.0/deed.es" target="_blank" rel="noopener noreferrer" className="inline-block" title="Creative Commons Attribution-ShareAlike 4.0 International License">
                <img src="https://i.creativecommons.org/l/by-sa/4.0/88x31.png" alt="Licencia Creative Commons BY-SA 4.0" />
              </a>
            </p>
            <p className="mt-4 text-sm text-gray-700">
              {t('credits.code_license')}{' '}
              <a href="https://www.gnu.org/licenses/agpl-3.0.html" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                GNU AGPLv3
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
