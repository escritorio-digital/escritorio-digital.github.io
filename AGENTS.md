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
- `npm test`: pasa las pruebas unitarias (ver «Pruebas»).
- `npm run deploy`: publica `dist/` en GitHub Pages (requiere permisos y `gh-pages`).

## Estilo de Código y Nomenclatura
- TypeScript y React con componentes funcionales y hooks.
- Indentación: 4 espacios; evita líneas excesivamente largas.
- Componentes: PascalCase (`ProfileSwitcher.tsx`). Variables/funciones: camelCase.
- Widgets: sufijo “Widget” y carpeta propia (`src/components/widgets/Timer/TimerWidget.tsx`).
- Identificadores de widget: kebab-case (`"timer"`, `"work-list"`).
- Linter: respeta `eslint.config.js` y ejecuta `npm run lint` antes del PR.

## Pruebas
- `npm test` pasa las pruebas unitarias (Vitest y Testing Library), en archivos `*.test.ts(x)` junto al código.
- Las de la calculadora pulsan sus botones igual que una persona; al cambiar un widget que calcula o enseña algo, conviene probarlo así y no solo su lógica interna.

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
- Antes de enviar: `npm test`, `npm run lint`, `npm run build` y prueba `npm run preview`.
- Si el cambio toca la interfaz, pasa también `npm run test:a11y` antes de publicar (ver «Accesibilidad»).

## Añadir un Widget (resumen)
1) Crea `src/components/widgets/<Nombre>/<Nombre>Widget.tsx` y `<Nombre>.css`.
2) Exporta el componente y `export const widgetConfig = { id: 'kebab-id', title: 'widgets.<clave>', defaultSize, ... }`.
3) Añade icono a `public/icons/` si aplica y claves de i18n.
4) El registro de widgets se carga automáticamente desde `index.ts` (glob).

## Decisiones (ADR)
- El porqué de cada decisión que condiciona el proyecto se registra en `docs/adr/` al tomarla, con `nuevo-adr "Título"` desde la raíz, y se anota en `docs/adr/README.md`.
- Si un cambio altera lo que describe un ADR, se actualiza ese ADR (o se marca como sustituido) en el mismo commit.

## Accesibilidad
- `npm run test:a11y` pasa axe-core (WCAG 2.1 A y AA) por el escritorio, el menú Inicio, «Acerca de», «Créditos», cada widget recién abierto y varios widgets con datos. Levanta Vite en un puerto libre y tarda un minuto y medio; termina con error si hay fallos y los lista con el elemento y el motivo.
- Un widget nuevo entra solo en la prueba. Si tiene estados con datos que conviene revisar (listas, resultados), añade un caso en `scripts/test-a11y.mjs`.
- No analiza el contenido de los iframes (es de otros sitios) ni sustituye la revisión con teclado y lector de pantalla.
- En un equipo nuevo, instala antes el navegador: `npx playwright install chromium`.
- Al añadir texto sobre un color del tema, usa `--color-widget-header-text` o `--color-widget-bg-text` (ADR 9).
