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

El widget «Web local» usa un service worker propio (`public/local-web-sw.js`)
para servir las webs guardadas en el navegador.

## Alternativas descartadas

- **Aplicación de escritorio (Electron o similar).** Exige instalar y
  mantener versiones por sistema operativo.
- **Web sin caché.** No funciona cuando falla la red.

## Consecuencias

- Tras publicar una versión, cada navegador la recibe en la siguiente visita
  con conexión; hasta entonces puede verse la anterior.
- Lo que depende de servicios externos (Wikipedia, catálogo de la comunidad,
  herramientas en directo) sigue necesitando conexión.
