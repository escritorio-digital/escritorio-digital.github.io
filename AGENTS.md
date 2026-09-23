# Repository Guidelines

Guía breve para contribuir al proyecto Escritorio Digital (Vite + React + TS).

## Estructura del Proyecto
- `src/`: código fuente (React/TypeScript).
  - `components/core/`: UI base (toolbar, ventanas, ajustes).
  - `components/widgets/<Nombre>/<Nombre>Widget.tsx`: widgets; estilos en `*.css`.
  - `context/`, `hooks/`, `types/`: estado, utilidades y tipados.
- `public/`: activos públicos (iconos, sonidos) e i18n en `public/locales/<lang>/translation.json`.
- Configuración: `vite.config.ts`, `eslint.config.js`, `tailwind.config.js`, `postcss.config.js`.

## Comandos de Desarrollo
- `npm run dev`: inicia el servidor Vite en desarrollo.
- `npm run build`: compila TypeScript y genera `dist/` para producción.
- `npm run preview`: previsualiza el build localmente.
- `npm run lint`: ejecuta ESLint sobre el proyecto.
- `npm run deploy`: publica `dist/` en GitHub Pages (requiere permisos y `gh-pages`).

## Estilo de Código y Nomenclatura
- TypeScript y React con componentes funcionales y hooks.
- Indentación: 4 espacios; evita líneas excesivamente largas.
- Componentes: PascalCase (`ProfileSwitcher.tsx`). Variables/funciones: camelCase.
- Widgets: sufijo “Widget” y carpeta propia (`src/components/widgets/Timer/TimerWidget.tsx`).
- Identificadores de widget: kebab-case (`"timer"`, `"work-list"`).
- Linter: respeta `eslint.config.js` y ejecuta `npm run lint` antes del PR.

## Pruebas
- Actualmente no hay test suite. Si añades pruebas:
  - Sugiere Vitest + React Testing Library.
  - Ficheros `*.test.ts(x)` junto al componente (`src/...`).
  - Cubre lógica y render básico; apunta a >80% en lo modificado.

## Internacionalización (i18n)
- Sigue TRANSLATION_GUIDE.md al pie de la letra.
- Claves idénticas en todos los idiomas; usa `public/locales/es/translation.json` como base y solo traduce valores.
- Escapes: usa `\\n` para saltos de línea y `\\\\sqrt` en LaTeX. Valida el JSON tras cada cambio: `python3 -m json.tool public/locales/<lang>/translation.json > /dev/null`.
- Actualiza `supportedLngs` y `convertDetectedLanguage` en `src/i18n.ts`, y añade la opción en `src/components/core/SettingsModal.tsx` para nuevos idiomas.
- Limpia la caché del navegador tras cambios (Ctrl+Alt+R) si no ves las actualizaciones.

## Commits y Pull Requests
- Commits: sigue Conventional Commits `type(scope): mensaje` (ej.: `feat(i18n): add basque translation`, `fix(build): resolve typescript errors`).
- PRs: describe el cambio, motivación y enlaza issue. Incluye capturas para cambios de UI.
- i18n: actualiza claves en `public/locales/*/translation.json` y valida cadenas.
- Antes de enviar: `npm run lint`, `npm run build` y prueba `npm run preview`.

## Añadir un Widget (resumen)
1) Crea `src/components/widgets/<Nombre>/<Nombre>Widget.tsx` y `<Nombre>.css`.
2) Exporta el componente y `export const widgetConfig = { id: 'kebab-id', title: 'widgets.<clave>', defaultSize, ... }`.
3) Añade icono a `public/icons/` si aplica y claves de i18n.
4) El registro de widgets se carga automáticamente desde `index.ts` (glob).

## Decisiones (ADR)
- El porqué de cada decisión que condiciona el proyecto se registra en `docs/adr/` al tomarla, con `nuevo-adr "Título"` desde la raíz, y se anota en `docs/adr/README.md`.
- Si un cambio altera lo que describe un ADR, se actualiza ese ADR (o se marca como sustituido) en el mismo commit.
