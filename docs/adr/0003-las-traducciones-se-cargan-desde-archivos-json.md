# 3. Las traducciones se cargan desde archivos JSON

Fecha: 2025-08-15 · Estado: aceptado

> Redactado el 2026-09-23, a partir del código y del historial. Describe el
> proyecto tal como está; las alternativas son las evidentes para el caso, no
> un registro de lo que se valoró entonces.

## Contexto

La aplicación se usa en centros de varias comunidades lingüísticas. Los textos
estaban escritos dentro de los componentes, y traducirlos exigía tocar el
código.

## Decisión

Los textos de la interfaz están en `public/locales/<idioma>/translation.json`
y se cargan con `i18next`, `react-i18next` e `i18next-http-backend`
(`src/i18n.ts`). Hay nueve idiomas: castellano, catalán, gallego, euskera,
portugués, francés, italiano, alemán e inglés. El castellano es el de
referencia y el de respaldo si falta una clave. El idioma se toma de la
dirección (`?lng=`), de lo elegido antes o del navegador, y se cambia desde el
menú Inicio.

Las normas para editar estos archivos están en `TRANSLATION_GUIDE.md`.

## Alternativas descartadas

- **Textos en el código.** Impiden traducir sin programar.
- **Incluir las traducciones en el paquete de JavaScript.** Carga todos los
  idiomas en cada visita; los JSON se piden solo en el idioma que se usa.

## Consecuencias

- Todo texto nuevo lleva su clave en los nueve archivos, con la misma
  estructura.
- Un JSON mal formado deja la aplicación sin textos en ese idioma: se valida
  después de cada edición.
