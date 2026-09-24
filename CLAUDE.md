# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Escritorio Digital is an interactive desktop environment built with React that allows users to add, move, and resize interactive "widgets". The system is designed for educational use and includes 27 different widgets like calculators, timers, drawing tools, games, and productivity tools.

## Development Commands

- **Development server**: `npm run dev`
- **Build**: `npm run build` (runs TypeScript check first, then Vite build)
- **Lint**: `npm run lint`
- **Accessibility check**: `npm run test:a11y` (axe-core, WCAG 2.1 AA, all widgets; see AGENTS.md)
- **Preview build**: `npm run preview`
- **Deploy to GitHub Pages**: `npm run deploy`

## Architecture

### Widget System
The core architecture revolves around a dynamic widget registry system:

- **Widget Discovery**: All widgets are auto-discovered from `src/components/widgets/` using Vite's `import.meta.glob()`
- **Widget Structure**: Each widget must be in its own folder with a `*Widget.tsx` file
- **Widget Requirements**: Each widget file must export:
  - A React component (named export ending in "Widget" or default export)
  - A `widgetConfig` object with `id`, `title`, `icon`, and `defaultSize`
- **Registry**: `src/components/widgets/index.ts` automatically builds the `WIDGET_REGISTRY`

### State Management
- **Desktop State**: Managed in `App.tsx` with profiles system
- **Profile System**: Multiple desktop configurations stored in localStorage
- **Widget State**: Each active widget has `instanceId`, `widgetId`, `position`, `size`, `zIndex`, and optional minimize/maximize states
- **Theme System**: CSS custom properties managed through React Context (`ThemeContext.tsx`)

### Key Components
- **`App.tsx`**: Main application logic and state management
- **`WidgetWindow.tsx`**: Draggable/resizable window wrapper using `react-rnd`
- **`Toolbar.tsx`**: Widget library and pinned widgets interface
- **`SettingsModal.tsx`**: Profile management and theme customization

### Internationalization
- **i18n System**: Uses `react-i18next` with JSON translation files in `public/locales/`
- **Supported Languages**: Spanish (es), English (en), Catalan (ca), Galician (gl), Basque (eu)
- **Configuration**: Language setup in `src/i18n.ts` and language selector in `SettingsModal.tsx`

### Translation Guidelines
**IMPORTANTE**: Para todas las traducciones, seguir al pie de la letra las instrucciones en el archivo `TRANSLATION_GUIDE.md`. Toda la información actualizada y las mejores prácticas están documentadas allí.

## Technical Stack

- **Frontend**: React 19, TypeScript, Vite
- **Styling**: Tailwind CSS with custom CSS properties for theming
- **UI Components**: Lucide React icons, Framer Motion animations
- **Widget Features**: react-rnd (drag/resize), TipTap (rich text), KaTeX (math), marked (markdown)
- **Build**: Vite with TypeScript, ESLint for linting