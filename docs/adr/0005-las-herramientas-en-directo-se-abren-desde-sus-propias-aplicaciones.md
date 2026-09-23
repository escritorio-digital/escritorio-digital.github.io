# 5. Las herramientas en directo se abren desde sus propias aplicaciones

Fecha: 2026-01-12 · Estado: aceptado

> Redactado el 2026-09-23, a partir del código y del historial. Describe el
> proyecto tal como está; las alternativas son las evidentes para el caso, no
> un registro de lo que se valoró entonces.

## Contexto

Votaciones, nubes de palabras, concursos o pizarras compartidas necesitan que
el alumnado se conecte desde sus dispositivos. Ya existían aplicaciones que lo
hacen: Directo y QPlay, del mismo autor, y BoardLive.

## Decisión

El escritorio no reprograma esas herramientas: las abre desde su propia web
con `ExternalAppWidget` (`src/components/widgets/shared/`), pasando el idioma
en la dirección (`?lang=`). Son Votación simple, Escala de valoración, Nube de
palabras, Lluvia de ideas y votos, Muro interactivo y Tickets de salida (de
Directo), QPlay y BoardLive.

Desde el 2026-01-23 (versión 2.5.3) se abren en una ventana nueva del
navegador, no dentro de la ventana del widget: el widget muestra un aviso y un
botón «Abrir en ventana nueva». El aviso dice que lo necesitan «para funcionar
correctamente»; el historial no detalla qué fallaba dentro del marco.

## Alternativas descartadas

- **Reprogramar las herramientas dentro del escritorio.** Duplicaría
  aplicaciones que ya existen y habría que mantener dos versiones.
- **Incrustarlas en la ventana del widget.** Fue la primera forma y se
  sustituyó por la ventana nueva.

## Consecuencias

- Cada herramienta mejora en su propia aplicación sin tocar el escritorio.
- Dependen de que esas webs sigan publicadas; figuran en «Servicios externos»
  de «Créditos y licencias».
- Lo que el alumnado envía en ellas lo gestiona cada aplicación, no el
  escritorio.
