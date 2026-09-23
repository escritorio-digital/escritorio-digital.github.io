# 1. Los widgets se descubren solos a partir de su carpeta

Fecha: 2025-07-18 · Estado: aceptado

> Redactado el 2026-09-23, a partir del código y del historial. Describe el
> proyecto tal como está; las alternativas son las evidentes para el caso, no
> un registro de lo que se valoró entonces.

## Contexto

El escritorio reúne más de cuarenta herramientas (widgets) y se amplía a
menudo, a veces con aportaciones de otras personas. Mantener una lista central
de widgets obligaba a tocar varios archivos por cada herramienta nueva y
provocaba olvidos.

## Decisión

Cada widget vive en su carpeta dentro de `src/components/widgets/` con dos
archivos: `widgetConfig.tsx`, que exporta `widgetConfig` (`id`, `title`,
`icon`, `defaultSize`), y `<Nombre>Widget.tsx`, con el componente.
`src/components/widgets/index.ts` los encuentra con `import.meta.glob` y
construye `WIDGET_REGISTRY`:

- las configuraciones se importan al arrancar, porque son ligeras y hacen falta
  para el menú Inicio;
- los componentes se cargan de forma diferida (`React.lazy`) la primera vez que
  se abre cada widget.

Una carpeta sin `widgetConfig` o sin componente se ignora con un aviso en la
consola.

## Alternativas descartadas

- **Un registro escrito a mano.** Más explícito, pero cada widget nuevo exige
  editarlo y es fácil dejarse uno.
- **Importar todos los componentes al arrancar.** Más simple, pero la primera
  carga crece con cada widget.

## Consecuencias

- Añadir una herramienta es crear su carpeta; el README explica cómo.
- Los nombres de archivo forman parte del contrato: si no siguen la convención,
  el widget no aparece.
- El `id` de `widgetConfig` es la clave con la que se guardan los escritorios
  del usuario; cambiarlo rompe los perfiles ya guardados.
