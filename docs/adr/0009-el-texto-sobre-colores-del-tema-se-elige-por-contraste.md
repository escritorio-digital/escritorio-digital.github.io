# 9. El texto sobre colores del tema se elige por contraste

Fecha: 2026-09-23 · Estado: aceptado

## Contexto

El tema del escritorio lo elige cada usuario: color de cabecera de las
ventanas, fondo de las ventanas, texto claro y texto oscuro
(`src/context/ThemeContext.tsx`). Las cabeceras ponían siempre el texto claro
sobre el color de cabecera, y con el tema de serie (`#FCF8DD` sobre `#D3AF37`)
el contraste era de 1,96:1, lejos del 4,5:1 que exige la WCAG 2.1 AA. El fallo
afectaba al título de 40 de los 44 widgets y aparecía en la evaluación VCER.

## Decisión

Los colores de texto que van sobre un color del tema se calculan al aplicar el
tema (`App.tsx`), con `readableTextColor` (`src/utils/contrast.ts`): se toma
el primer candidato que alcanza 4,5:1 sobre ese fondo, en orden de
preferencia, y si ninguno llega, el de más contraste.

- `--color-widget-header-text`, sobre la cabecera: texto claro del tema y,
  si no alcanza, el oscuro. Con el tema de serie sale el oscuro (7,7:1).
- `--color-widget-bg-text`, sobre el fondo de las ventanas: texto claro,
  blanco, texto oscuro y negro.

Los elementos con texto blanco sobre un fondo translúcido encima del fondo de
pantalla (reloj, selector de escritorio, botón de pantalla completa) usan una
opacidad que cumple incluso sobre un fondo de pantalla blanco.

## Alternativas descartadas

- **Oscurecer el dorado de serie para mantener el texto claro.** Cambia la
  identidad visual y no resuelve los temas que elija cada usuario.
- **Fijar un color de texto en el tema de serie.** Vuelve a fallar en cuanto
  alguien cambia el color de cabecera.

## Consecuencias

- Cualquier texto nuevo sobre un color del tema debe usar una de estas
  variables, o añadir otra calculada del mismo modo.
- Con el tema de serie, los títulos de las ventanas pasan de claro a oscuro.
- El modo de alto contraste (`body.high-contrast`) sigue fijando sus propios
  colores por encima de estos.
