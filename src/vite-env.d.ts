/// <reference types="vite/client" />

// Añade esta declaración para los módulos CSS
declare module '*.css' {
  const content: { [className: string]: string };
  export default content;
}

interface ImportMetaEnv {
  readonly VITE_APP_VERSION?: string;
  readonly VITE_APP_BUILD_DATE?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
