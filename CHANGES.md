# Cambios realizados

## 1.3.4
- Barra inferior oculta en pantallas estrechas para evitar desbordes y mantener solo el botón Inicio.

## 1.3.2
- Estadísticas del sistema: añadido el tamaño de la ventana (viewport) junto al tamaño de pantalla.

## 1.3.1
- El menú Inicio conserva el alto durante las búsquedas y se reajusta al panel izquierdo al cerrar el buscador o reabrir.

## 1.3.0
- Añadido el programa EdiMarkWeb al menú Inicio con visor integrado y acceso a pestaña nueva.
- Icono y traducciones completos en todos los idiomas para el nuevo programa.
- Tooltip de arranque opcional para programas en menú y barra.

## Configuración
- Al abrir «Configurar ED» desde el menú contextual del fondo, se muestra directamente la pestaña General (sin que se superponga el modal de temas en la primera apertura).

## Iconos
- Nuevos iconos con fondo transparente para las herramientas participativas (Votación, Escala, Nube, Lluvia de ideas, Muro, QPlay y BoardLive).

## Fondos y tema
- Los fondos personalizados (subidos o externos) se mantienen y pueden eliminarse correctamente con el botón de quitar fondo.

## Ruleta (Random Spinner)
- Corrección del nombre ganador para que coincida con la flecha del puntero.
- Carga de opciones desde archivo .txt (una línea por opción), con botón de subida.
- Opción "Eliminar opción al salir": el ganador se elimina al iniciar el siguiente giro, sin clic extra.
- Evita resultados con opciones antiguas (lista consistente tras eliminar).
- Ajustes de layout: evita recortes laterales y ancho por defecto más grande.
- Nuevo control para activar/desactivar eliminación tras selección.
- Estilos del botón de carga y del selector de eliminación.

## Generador de Grupos
- Vista "Ver en grande" con overlay para mostrar grupos a tamaño de proyección.
- Responsive avanzado: el tamaño de texto y tarjetas se ajusta al espacio disponible y al número de grupos.
- Botón en el panel de salida para abrir/cerrar la vista grande.
- Traducciones añadidas para la vista grande.

## Cronómetro
- Texto del tiempo ahora es responsivo y escala según el tamaño de la ventana.
- Botones centrados horizontalmente y escalables en tamaño/íconos.
- Correcciones de “vibración” en tamaño al maximizar.

## Temporizador
- Texto del tiempo ahora es responsivo y escala según el tamaño de la ventana.
- Color del tiempo con contraste automático: texto claro con borde y sombra para destacar sobre fondos variables.

## Menú contextual del escritorio (clic derecho en fondo vacío)
- Menú personalizado solo en espacios vacíos del escritorio.
- Opciones: Nuevo widget, Configuración, Administrar perfiles, Cambiar fondo, Mostrar/Ocultar barra inferior, Cerrar todas las ventanas.
- Posicionamiento inteligente para no desbordar pantalla.
- Iconos añadidos siguiendo el estilo de la app.
- Enlace directo a la pestaña concreta de Configuración.
- Nuevo toggle de visibilidad de barra inferior (persistido en localStorage).

## Lista de Trabajo
- Ítems con tarjeta clara semitransparente, borde y sombra para destacar sobre fondos variables.
- Más separación entre ítems y checkbox con fondo claro para legibilidad.

## i18n
- Nuevas claves y traducciones añadidas para:
  - Ruleta: carga desde archivo, eliminar opción al salir.
  - Generador de grupos: vista grande.
  - Menú contextual del escritorio.
- Corrección de ubicación de claves `context_menu` en todos los idiomas.
- Traducción al alemán añadida (trabajo previo).

## Otros
- Ajuste de tamaño por defecto de la ruleta y mejoras de layout.

## Responsivo (Fase 1)
- Scoreboard, Ruleta, Gestos de trabajo, Semáforo, Sonómetro, Relojes globales, Dados y Memorama ahora escalan tipografías, iconos y controles con el tamaño del widget para proyección.
- Uso de `clamp()` y unidades de contenedor (`cqw`) con valores de respaldo para mantener legibilidad en tamaños pequeños.

## Responsivo (Fase 2)
- Conversor de unidades, Calendario, Lista de trabajo, Asistencia, Tres en raya y Puzzle deslizante ajustan tamaños de texto/controles y espaciados según el tamaño de la ventana.
- Calendario: números y cabecera con fondos/píldoras para mejorar contraste respetando el fondo del widget.
