# Cambios realizados

## 2.3.2
- Guardado: reutiliza el ultimo nombre de archivo al volver a guardar.
- Titulo de ventana: muestra el nombre del archivo abierto/guardado.
- Cierre: solo pide guardar si hay cambios reales.

## 2.3.1
- Fix: cerrar todas las ventanas desde el menu contextual cierra todas.
- Editor Markdown: icono actualizado.

## 2.3.0
- Nuevo editor de textos Markdown con barra de formato, vista previa y exportación PDF.
- Integración con EdiCuaTeX para insertar fórmulas desde ventana emergente.
- Zoom de contenido y modos de vista (editor, vista previa, dividido).
- Nuevo icono del editor y búsqueda por "latex" y "fórmula".
- Eliminado el Intérprete (Markdown/LaTeX) anterior.

## 2.2.0
- Widgets con archivos: aviso al cerrar si hay cambios sin guardar (modal propio).
- Bloc de notas: contenido independiente por ventana.

## 2.1.1
- Acerca del proyecto: muestra la version real y la fecha actual.

## 2.1.0
- Archivos Ed: renombrar con menu contextual y tecla F2.
- Guardar archivo: lista navegable de carpetas y archivos con reemplazo rapido.
- Iconos de abrir/guardar normalizados en widgets.
- Bloc de notas: barra responsiva.
- Intérprete (Markdown/LaTeX): renombre y boton de abrir archivos.

## 2.0.1
- Archivos Ed: aviso al guardar y al abrir archivos grandes.
- Reloj del escritorio: parpadeo de los dos puntos cada segundo.
- Reloj mundial: parpadeo de los dos puntos.

## 2.0.0
- Nuevo: gestion de archivos internos con Archivos Ed.

## 1.6.3
- Archivos Ed: menu contextual con opcion Abrir y pulsacion larga en moviles.


## 1.6.2
- Archivos Ed: evita duplicados de la Guia del programa en la lista.


## 1.6.1
- Actualización del icono de Web local.
- Archivos Ed: selección visual del icono y z-index fijo bajo las ventanas.

## 1.6.0
- Archivos Ed: gestor de archivos con carpetas, papelera, copia/pega, selección múltiple y arrastrar/soltar.
- Guardar y abrir: selector de ubicación con nombre de archivo y acceso a Archivos Ed o disco local.
- Web local: nuevo acceso desde Archivos Ed y descripción actualizada.
- Guía del programa: Archivos Ed añadido en todas las guías.
- Perfiles: exportación/importación opcional de Archivos Ed con tamaño estimado.

## 1.5.1
- Generador de grupos: opciones para copiar y guardar los grupos como .txt.

## 1.5.0
- Ventanas: icono de ayuda con descripción breve de cada programa.
- Ventanas: el icono de fijado permanece visible cuando la ventana está fijada.

## 1.4.1
- Guía del programa: catálogo actualizado para incluir todos los widgets y secciones alineadas con el menú Inicio.

## 1.4.0
- Apariencia: nuevos temas de accesibilidad para daltonismo (protanopia, deuteranopia y tritanopia).
- Apariencia: el botón de temas ahora indica que incluye accesibilidad.
- Inicio: nuevo acceso rápido a la guía del programa en Ayuda.

## 1.3.7
- Menú de perfiles: opción para mostrar/ocultar desde Apariencia.
- Menú de perfiles: opción en el menú contextual del botón derecho.
- Menú de perfiles: se oculta en pantallas estrechas como la barra inferior.

## 1.3.6
- Configuración de programas: foco automático en el buscador al abrir la pestaña.
- Configuración de programas: muestra el total de programas disponibles junto al límite.

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
