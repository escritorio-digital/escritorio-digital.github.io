// src/i18n.ts
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import Backend from 'i18next-http-backend';

const baseUrl = import.meta.env.BASE_URL ?? '/';

// El atributo lang de la página sigue al idioma elegido, para que los lectores de pantalla
// pronuncien bien la interfaz (WCAG 3.1.1).
i18n.on('languageChanged', (lng) => {
  document.documentElement.lang = lng.split('-')[0];
});

i18n
  // Carga las traducciones desde una API/backend (en este caso, la carpeta `public/locales`)
  .use(Backend)
  // Detecta el idioma del usuario
  .use(LanguageDetector)
  // Pasa la instancia de i18n a react-i18next
  .use(initReactI18next)
  // Configuración inicial
  .init({
    // Idioma por defecto si no se detecta ninguno
    fallbackLng: 'es',
    supportedLngs: ['es', 'ca', 'eu', 'gl', 'pt', 'fr', 'it', 'de', 'en'],
    // Activa el modo debug en desarrollo
    debug: false,
    // Forzar recarga
    initImmediate: false,
    // Define el namespace por defecto
    ns: 'translation',
    defaultNS: 'translation',
    // Configuración para el backend de carga
    backend: {
      // Ruta donde se encuentran los archivos de traducción  
      loadPath: `${baseUrl}locales/{{lng}}/{{ns}}.json`,
      // Añadir opciones para debug
      requestOptions: {
        cache: 'no-cache'
      }
    },
    // Configuración de interpolación
    interpolation: {
      escapeValue: false, // React ya escapa por defecto
    },
    // Configuración para el detector de idioma
    detection: {
      // Orden de detección: querystring, cookie, localStorage, navigator, htmlTag
      order: ['querystring', 'cookie', 'localStorage', 'navigator', 'htmlTag'],
      // Caché a usar
      caches: ['localStorage', 'cookie'],
      // Configurar detección de idioma
      lookupQuerystring: 'lng',
      lookupCookie: 'i18next',
      lookupLocalStorage: 'i18nextLng',
      // Excluir cache para ciertos valores
      excludeCacheFor: ['cimode'],
      // Convertir códigos de idioma
      convertDetectedLanguage: (lng: string) => {
        // Si es ca-ES, ca-AD, etc., devolver solo 'ca'
        if (lng.startsWith('ca')) return 'ca';
        // Si es gl-ES, gl, etc., devolver solo 'gl'
        if (lng.startsWith('gl')) return 'gl';
        // Si es eu-ES, eu, etc., devolver solo 'eu'
        if (lng.startsWith('eu')) return 'eu';
        // Si es es-ES, es-MX, etc., devolver solo 'es'  
        if (lng.startsWith('es')) return 'es';
        // Si es pt-PT, pt-BR, etc., devolver solo 'pt'
        if (lng.startsWith('pt')) return 'pt';
        // Si es it-IT, it, etc., devolver solo 'it'
        if (lng.startsWith('it')) return 'it';
        // Si es de-DE, de, etc., devolver solo 'de'
        if (lng.startsWith('de')) return 'de';
        // Si es en-US, en-GB, etc., devolver solo 'en'
        if (lng.startsWith('en')) return 'en';
        // Si es fr-FR, fr-CA, etc., devolver solo 'fr'
        if (lng.startsWith('fr')) return 'fr';
        return lng;
      }
    },
    // Configuración de react-i18next
    react: {
      // Usa Suspense para cargar las traducciones de forma asíncrona
      useSuspense: false,
    },
  });

export default i18n;

// Promesa para asegurar que i18n esté listo antes de renderizar React
export const i18nReady: Promise<void> = new Promise((resolve) => {
  const ensureNsLoaded = () => {
    // Garantiza que el namespace por defecto esté cargado
    i18n.loadNamespaces(['translation']).then(() => resolve());
  };

  if (i18n.isInitialized) {
    ensureNsLoaded();
  } else {
    i18n.on('initialized', ensureNsLoaded);
  }
});
