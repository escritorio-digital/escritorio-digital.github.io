# Escritorio Interactivo ReactJS

Este proyecto es un entorno de escritorio virtual construido con React, que permite a los usuarios añadir, mover y redimensionar "widgets" interactivos. El sistema está diseñado para que la creación de nuevos widgets sea un proceso sencillo y modular.

## Novedades de la interfaz

- Fecha y hora visibles en la esquina superior derecha (se puede desactivar en Herramientas → Apariencia).

## Widgets del Escritorio Interactivo

1.  **Control de Asistencia:** Herramienta para llevar un registro diario de la asistencia de los estudiantes, además de asignar insignias y alertas.
2.  **Calculadora Científica:** Realiza operaciones matemáticas, incluyendo funciones trigonométricas, logaritmos, raíces cuadradas y factoriales.
3.  **Calendario:** Un calendario mensual simple para consultar fechas.
4.  **Carrusel de Imágenes:** Carga y muestra una serie de imágenes en formato de diapositivas.
5.  **Conversor de Unidades:** Convierte entre diferentes unidades de medida como longitud, peso y temperatura.
6.  **Cronómetro:** Un cronómetro para medir el tiempo transcurrido, con función para registrar vueltas (laps).
7.  **Dados 3D:** Lanza uno o varios dados virtuales con una animación en tres dimensiones.
8.  **Generador de Grupos:** Permite crear grupos aleatorios a partir de una lista de nombres, ya sea especificando el número de grupos o el número de integrantes por grupo.
9.  **Generador QR:** Crea un código QR a partir de un texto o una URL que introduzcas.
10. **Gestos de Trabajo:** Muestra tarjetas visuales grandes para indicar el modo de trabajo en el aula (Silencio, Parejas, Equipos, Plenaria).
11. **HTML Sandbox:** Un lienzo con un único campo para pegar código HTML y un botón para alternar entre el editor y la vista previa.
12. **Intérprete (MD/LaTeX):** Renderiza documentos que mezclan texto en formato Markdown con fórmulas matemáticas escritas en LaTeX.
13. **Lista de Trabajo:** Un gestor de tareas pendientes (to-do list) que permite añadir, marcar como completadas y eliminar tareas.
14. **Marcador de Puntos:** Un marcador para llevar la puntuación de varios equipos o jugadores.
15. **Medidor de Ruido:** Utiliza el micrófono para medir el nivel de ruido ambiental y lo clasifica como silencio, conversación o ruido.
16. **Memorama:** Un juego de memoria clásico que se crea cargando tus propias imágenes para encontrar los pares.
17. **Metrónomo:** Un metrónomo digital para marcar un tempo (BPM) constante.
18. **Bloc de Notas:** Un editor de texto enriquecido para tomar apuntes rápidos con formato.
19. **Puzzle Deslizante:** El clásico juego de puzzle de 15, que se crea a partir de una imagen que tú subas.
20. **Relojes Mundiales:** Muestra la hora actual en diferentes ciudades del mundo y la compara con tu hora local.
21. **Ruleta Aleatoria:** Una ruleta personalizable para seleccionar opciones al azar.
22. **Semáforo:** Un semáforo visual (rojo, amarillo, verde) ideal para gestionar los tiempos o niveles de ruido en el aula.
23. **Temporizador:** Un contador regresivo que puedes configurar con minutos y segundos.
24. **Tic-Tac-Toe:** El juego clásico de tres en raya para dos jugadores.
25. **Visor Web:** Permite embeber y mostrar el contenido de una URL directamente en el escritorio, usando un iframe.
26. **Visor PDF:** Abre archivos PDF dentro del escritorio.
27. **Explorador de Archivos:** Abre archivos locales (PDF, imágenes, texto/Markdown, audio y vídeo) dentro del escritorio.
28. **Conexión en Directo:** Es un visor de aplicaciones web que carga una página externa, específicamente la aplicación "Conexión en Directo" de Juan José de Haro, dentro de una ventana en el escritorio.
29. **Paleta de Dibujo:** Una completa herramienta de dibujo que permite trazos con diferentes pinceles (lápiz, rotulador, spray), insertar formas geométricas (líneas, rectángulos, círculos), añadir flechas y texto. 

## 🚀 Cómo Crear un Nuevo Widget

El sistema de widgets está diseñado para descubrir y registrar nuevos widgets automáticamente siempre que se siga la estructura de archivos y convenciones de código correctas.

### 1. Estructura de Archivos

Cada widget debe residir en su propia carpeta dentro de `src/components/widgets/`. Por ejemplo, para un nuevo widget llamado "Reloj":

```
src/
└── components/
    └── widgets/
        ├── ... (otros widgets)
        └── Reloj/
            └── RelojWidget.tsx
```

### 2. Anatomía de un Widget

Un archivo de widget válido (p. ej., `RelojWidget.tsx`) debe contener dos exportaciones principales:

#### A. El Componente del Widget

Este es el componente de React que contiene toda la lógica y la interfaz de usuario del widget.

* Debe ser una exportación nombrada que termine en `Widget` (ej. `export const RelojWidget: FC = () => { ... }`) o una exportación por defecto (`export default MiWidget`).
* El componente recibe el control total sobre el área interna de la ventana del widget.

**Ejemplo de Componente:**
```tsx
// src/components/widgets/Reloj/RelojWidget.tsx
import React, { useState, useEffect } from 'react';
import type { FC } from 'react';
import type { WidgetConfig } from '../../../types';

export const RelojWidget: FC = () => {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timerId = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timerId);
  }, []);

  return (
    <div className="flex items-center justify-center h-full text-4xl font-bold text-text-dark">
      {time.toLocaleTimeString()}
    </div>
  );
};

// No olvides exportar también la configuración
export const widgetConfig: Omit<WidgetConfig, 'component'> = {
  // ... ver abajo
};
```

#### B. El Objeto de Configuración

Este es un objeto llamado `widgetConfig` que permite al sistema identificar y gestionar tu widget. Debe exportarse del mismo archivo que el componente.

El objeto debe tener la siguiente estructura, acorde a la interfaz `WidgetConfig`:

* **`id`**: Un identificador único en formato `kebab-case`.
* **`title`**: El nombre que se mostrará en la cabecera de la ventana del widget.
* **`icon`**: Un emoji que se usará como icono en la barra de herramientas y en la librería.
* **`defaultSize`**: Un objeto `{ width: number, height: number }` que define el tamaño inicial del widget.

**Ejemplo de Configuración:**
```tsx
// Dentro de src/components/widgets/Reloj/RelojWidget.tsx

export const widgetConfig: Omit<WidgetConfig, 'component'> = {
  id: 'reloj',
  title: 'Reloj Digital',
  icon: '🕰️',
  defaultSize: { width: 300, height: 150 },
};
```

### 3. Registro Automático

¡Eso es todo! No necesitas registrar el widget en ningún otro lugar. El archivo `src/components/widgets/index.ts` se encarga de importar dinámicamente cualquier archivo que termine en `*Widget.tsx` dentro del directorio de widgets, extrae el componente y su configuración, y lo añade al `WIDGET_REGISTRY`.

Una vez que hayas creado tus archivos y reiniciado el servidor de desarrollo, tu nuevo widget estará disponible automáticamente en la **Librería de Widgets** (el modal de configuración).

## Librerías y Frameworks

### Librerías y Frameworks Principales

* **React:** La biblioteca fundamental para construir toda la interfaz de usuario.
* **Vite:** La herramienta de desarrollo que compila y sirve el proyecto.
* **TypeScript:** Añade un sistema de tipos estáticos a JavaScript para mejorar la robustez y mantenibilidad del código.

---
### Widgets y Funcionalidades Específicas

* **`react-rnd`:** Librería clave que permite que las ventanas de los widgets se puedan mover, redimensionar y arrastrar.
* **`@tiptap/react` y `@tiptap/starter-kit`:** Conjunto de herramientas que potencian el editor de texto enriquecido del "Bloc de Notas".
* **`qrcode.react`:** Utilizada en el "Generador QR" para crear los códigos QR.
* **`katex`:** La librería que renderiza las fórmulas matemáticas de LaTeX en el "Intérprete (MD/LaTeX)".
* **`marked`:** Convierte el texto de Markdown a HTML.
* **`papaparse`:** Usada para importar y exportar datos en formato CSV.
* **`turndown`:** Utilizada para convertir el contenido de HTML de vuelta a Markdown.
* **`html-to-image`:** Permite convertir el contenido de un widget (como el del "Intérprete MD/LaTeX") en una imagen PNG que se puede copiar al portapapeles.
* **`framer-motion`:** Una potente biblioteca para crear animaciones fluidas y complejas, utilizada para las transiciones de los modales y otros efectos visuales.


---
### Diseño y Estilos

* **Tailwind CSS:** El framework principal utilizado para dar estilo a toda la aplicación.
* **`lucide-react`:** La librería que proporciona todos los íconos del proyecto.
* **PostCSS y Autoprefixer:** Herramientas que trabajan junto con Tailwind para asegurar la compatibilidad del CSS.

---

## Créditos, Licencia y Agradecimientos

<p>
El proyecto original <strong>Escritorio Interactivo para el Aula</strong> y su idea pertenecen a <strong>María Teresa González</strong>. Puedes visitar la aplicación original en: <a href="https://mtgonzalezm.github.io/escritorio-interactivo-aula/" target="_blank" rel="noopener noreferrer">https://mtgonzalezm.github.io/escritorio-interactivo-aula/</a>
</p>
<p>
Esta nueva versión fue desarrollada en colaboración por <strong>María Teresa González</strong>, <strong>Juan José de Haro</strong> y <strong>Pablo G. Guízar</strong>. El repositorio de este proyecto se encuentra en: <a href="https://github.com/escritorio-digital/escritorio" target="_blank" rel="noopener noreferrer">Escritorio Digital</a>
</p>
<hr />
<p>
Tanto el proyecto original como esta migración están indexados en el <strong>Repositorio de aplicaciones educativas</strong>, una colección de recursos creados por la comunidad <strong>Vibe Coding Educativo</strong>.
</p>
<ul>
<li>
Consulta más aplicaciones de esta comunidad en: <a href="https://vibe-coding-educativo.github.io/app_edu/" target="_blank" rel="noopener noreferrer">Repositorio Vibe Coding Educativo</a>
</li>
<li>
Únete a la comunidad en Telegram: <a href="https://t.me/vceduca" target="_blank" rel="noopener noreferrer">t.me/vceduca</a>
</li>
</ul>
<hr />
<div>
<p>Este proyecto se adhiere al
<a href="https://conocimiento-abierto.github.io/" target="_blank" rel="noopener noreferrer">Decálogo del Conocimiento Abierto</a></p>
<p>
<a href="https://creativecommons.org/licenses/by-sa/4.0/deed.es" target="_blank" rel="noopener noreferrer">
<img src="https://i.creativecommons.org/l/by-sa/4.0/88x31.png" alt="Licencia Creative Commons BY-SA 4.0" />
</a>
</p>
<p>
Código: <a href="https://www.gnu.org/licenses/agpl-3.0.html" target="_blank" rel="noopener noreferrer">GNU AGPLv3</a> (ver <a href="./LICENSE">LICENSE</a>).
</p>
</div>
