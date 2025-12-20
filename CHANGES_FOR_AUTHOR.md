# Cambios realizados para informar al autor

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

## Otros
- Ajuste de tamaño por defecto de la ruleta y mejoras de layout.

