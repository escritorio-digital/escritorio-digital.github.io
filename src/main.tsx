import React, { Suspense } from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { i18nReady } from './i18n'; // Importar i18next y esperar readiness
import { useTranslation } from 'react-i18next';

const I18nFallback: React.FC = () => {
  const { t } = useTranslation();
  return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>{t('loading')}</div>;
};

const root = ReactDOM.createRoot(document.getElementById('root')!);

// Esperar a que i18next esté inicializado y el ns cargado antes de renderizar
i18nReady.then(() => {
  root.render(
    <React.StrictMode>
      <Suspense fallback={<I18nFallback />}>
        <App />
      </Suspense>
    </React.StrictMode>
  );
}).catch((err) => {
  // En caso de error, renderizar igualmente para no bloquear la app
  console.error('i18n init error:', err);
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
});
