# 8. El escritorio no cuenta visitas

Fecha: 2026-09-23 · Estado: aceptado

## Contexto

Desde el 2026-03-12 el escritorio contaba visitas con el sistema propio de
estadísticas de bilateria.org (`src/utils/analytics.ts`): sin IP ni cookies,
una visita por navegador cada media hora, con la dirección completa, la página
de procedencia y los parámetros UTM. Lo anunciaba un aviso de privacidad en
«Acerca del proyecto».

Al evaluar la aplicación con la rúbrica VCER de la guía «Vibe coding
responsable», el punto de datos personales, que es eliminatorio, quedó en 0,
porque la rúbrica no admite ninguna analítica. Además, el contador cargaba un
script remoto (JSONP), es decir, ejecutaba código del servidor de estadísticas.

## Decisión

Se retira el contador entero: el módulo, sus metadatos en `index.html` y la
llamada en `main.tsx`. El aviso de estadísticas se sustituye por un apartado
«Privacidad» que dice que los datos se guardan solo en el navegador, que no se
recogen estadísticas y dónde se listan los servicios externos.

## Alternativas descartadas

- **Mantenerlo y recortar lo que envía**, como se hizo al principio en
  OpenWorksheets. Seguiría siendo analítica y la rúbrica lo penaliza igual.

## Consecuencias

- Se pierde la única forma de saber cuánto se usa el escritorio.
- Los navegadores que ya lo usaban conservan en `localStorage` la clave
  `analytics:last-visit:escritorio-digital`, que ya nadie lee.
- Cualquier medición futura tendrá que plantearse sin enviar datos a un
  servidor, o se dirá con claridad qué se pierde en la rúbrica.
