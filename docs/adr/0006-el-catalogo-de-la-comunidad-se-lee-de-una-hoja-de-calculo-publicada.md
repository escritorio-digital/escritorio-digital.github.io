# 6. El catálogo de la comunidad se lee de una hoja de cálculo publicada

Fecha: 2026-01-14 · Estado: aceptado

> Redactado el 2026-09-23, a partir del código y del historial. Describe el
> proyecto tal como está; las alternativas son las evidentes para el caso, no
> un registro de lo que se valoró entonces.

## Contexto

«Aplicaciones de la comunidad» muestra las apps que publica la comunidad Vibe
Coding Educativo. La lista crece cada semana y la mantiene la comunidad, no
este repositorio.

## Decisión

El widget descarga la lista al abrirse, en CSV, desde una hoja de Google
publicada (`CSV_URL` en `VceCommunityWidget.tsx`), sin caché
(`cache: 'no-store'`), y la interpreta con `papaparse`. Los filtros (nivel,
área, idioma) salen de las columnas de la hoja. Los favoritos se guardan en el
navegador, en el perfil activo.

## Alternativas descartadas

- **Copiar la lista en el repositorio.** Quedaría desfasada en pocos días y
  obligaría a publicar una versión por cada app nueva.

## Consecuencias

- La lista está siempre al día sin tocar el escritorio.
- Sin conexión, o si la hoja deja de estar publicada, el widget no muestra
  nada.
- Un cambio en los nombres de las columnas de la hoja puede romper los
  filtros.
