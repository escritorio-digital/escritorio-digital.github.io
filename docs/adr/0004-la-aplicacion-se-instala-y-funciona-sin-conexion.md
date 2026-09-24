# 4. La aplicación se instala y funciona sin conexión

Fecha: 2025-08-20 · Estado: aceptado

> Redactado el 2026-09-23, a partir del código y del historial. Describe el
> proyecto tal como está; las alternativas son las evidentes para el caso, no
> un registro de lo que se valoró entonces.

## Contexto

En muchas aulas la conexión falla o es lenta, y el escritorio se proyecta
durante toda la clase. Depender de la red en cada carga lo hace frágil.

## Decisión

El escritorio es una aplicación web progresiva (PWA) generada con
`vite-plugin-pwa` (`vite.config.ts`): tiene manifiesto, se puede instalar y un
service worker guarda la aplicación para abrirla sin conexión. Las
actualizaciones se aplican solas (`registerType: 'autoUpdate'`).

La caché incluye, además del programa (`js`, `css`, `html`), las traducciones
(`json`) y las guías de uso (`md`), para que se actualicen a la vez que el
programa. Se añadieron el 2026-09-23 (versión 2.7.2): hasta entonces se pedían
siempre a la red, y en la primera visita tras publicar una versión el
programa anterior, guardado en caché, se mezclaba con las traducciones nuevas
y mostraba claves sin traducir; sin conexión, la aplicación se quedaba sin
textos. Desde la versión 2.7.6 se guarda también la insignia de la licencia
(`badges/*.png`, 1,5 KB), que antes se cargaba de Creative Commons. Los iconos
(unos 11 MB) no se guardan, para no cargar esa descarga a cada visitante.

El widget «Web local» usa un service worker propio (`public/local-web-sw.js`)
para servir las webs guardadas en el navegador.

## Alternativas descartadas

- **Aplicación de escritorio (Electron o similar).** Exige instalar y
  mantener versiones por sistema operativo.
- **Web sin caché.** No funciona cuando falla la red.

## Consecuencias

- Tras publicar una versión, cada navegador la recibe en la siguiente visita
  con conexión; hasta entonces ve la anterior entera, con sus textos.
- Un archivo nuevo que la aplicación lea en `public/` y deba funcionar sin
  conexión tiene que coincidir con `globPatterns` en `vite.config.ts`.
- Sin conexión, los iconos de los widgets que no se hayan visto antes no
  aparecen.
- Lo que depende de servicios externos (Wikipedia, catálogo de la comunidad,
  páginas de las comunidades, herramientas en directo) sigue necesitando
  conexión.
