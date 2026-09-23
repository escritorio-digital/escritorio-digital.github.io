# 2. Los datos se guardan solo en el navegador

Fecha: 2025-07-18 · Estado: aceptado

> Redactado el 2026-09-23, a partir del código y del historial. Describe el
> proyecto tal como está; las alternativas son las evidentes para el caso, no
> un registro de lo que se valoró entonces.

## Contexto

El escritorio se usa en el aula y algunas herramientas manejan datos del
alumnado (asistencia, grupos, marcadores). Tener un servidor supondría decidir
quién guarda esos datos, pedir cuentas al profesorado y mantener un servicio.

## Decisión

Todo lo que se configura o se escribe en el escritorio se guarda en el
navegador de quien lo usa, sin cuentas ni servidor:

- los perfiles de escritorio, los ajustes y los datos pequeños de cada widget,
  en `localStorage`;
- lo que pesa (archivos de «Archivos Ed», webs locales y datos de widgets de
  más de 200 000 caracteres), en IndexedDB, dejando en `localStorage` una marca
  (`__indexed_db__`) que remite a él. Se añadió el 2026-01-12;
- para pasar el escritorio a otro equipo o guardarlo, hay una copia de
  seguridad en un archivo ZIP que se exporta y se importa desde los ajustes
  (`src/utils/backup.ts`).

## Alternativas descartadas

- **Guardar en un servidor propio o en la nube.** Permitiría sincronizar
  equipos, pero enviaría datos del alumnado fuera del centro y obligaría a
  mantener un servicio.
- **Solo `localStorage`.** Su límite (unos 5 MB) no alcanza para archivos ni
  webs locales.

## Consecuencias

- Los datos no salen del equipo, salvo lo que se envía a propósito a los
  servicios externos que se listan en «Créditos y licencias».
- Si se borran los datos del navegador, se pierde el escritorio; la copia de
  seguridad es la única forma de recuperarlo o de llevarlo a otro equipo.
- Cualquier dato nuevo de un widget que deba viajar en la copia tiene que
  añadirse a `WIDGET_DATA_KEYS` en `src/utils/backup.ts`.
- Lo que sale del navegador lo decide quien usa el escritorio. Desde el
  2026-09-23, Asistencia permite además exportar sin nombres: cada estudiante
  aparece con su número, el mismo en todas las fechas, para compartir los datos
  sin identificar a nadie. La exportación completa, con nombres, se mantiene
  porque es la que sirve al docente.
