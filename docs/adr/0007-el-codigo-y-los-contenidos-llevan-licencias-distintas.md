# 7. El código y los contenidos llevan licencias distintas

Fecha: 2026-09-19 · Estado: aceptado

> Redactado el 2026-09-23, a partir del código y del historial.

## Contexto

El repositorio mezcla programa (el código de la aplicación) y contenido
(textos, guías y materiales didácticos). Una sola licencia no se ajusta bien a
los dos: las de software no están pensadas para textos, y Creative Commons
desaconseja sus licencias para código.

## Decisión

- El código, bajo la GNU Affero General Public License 3.0 o posterior
  (`LICENSE`, y `"license": "AGPL-3.0-or-later"` en `package.json`).
- Los contenidos, bajo Creative Commons Reconocimiento-CompartirIgual 4.0
  (CC BY-SA 4.0).
- `LICENSE-CONTENIDOS.md` explica el reparto y acredita el material de
  terceros, como los sonidos. Las dos licencias se ven en «Créditos y
  licencias», con enlace a su texto.

## Alternativas descartadas

El cambio que introdujo las licencias no dejó escrito qué otras opciones se
valoraron ni por qué se eligieron estas. Queda pendiente completarlo.

## Consecuencias

- Quien modifique el escritorio y lo publique en la web debe compartir el
  código.
- El material ajeno que se añada debe tener una licencia compatible y
  acreditarse en `LICENSE-CONTENIDOS.md` y en «Créditos y licencias».
