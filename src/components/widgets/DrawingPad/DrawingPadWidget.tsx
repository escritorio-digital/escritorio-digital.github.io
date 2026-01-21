import React, { useRef, useEffect, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
// Importamos todos los iconos necesarios, incluyendo Type para la herramienta de texto y iconos de navegación
import { Paintbrush, Eraser, Trash2, Pen, Highlighter, SprayCan, Image as ImageIcon, Save as SaveIcon, LineChart, Square, Circle, ArrowRight, Type, RotateCcw, Move } from 'lucide-react';
import { downloadBlob, saveToFileManager } from '../../../utils/fileSave';
import { getEntry } from '../../../utils/fileManagerDb';
import { subscribeFileOpen } from '../../../utils/fileOpenBus';
import { requestSaveDestination } from '../../../utils/saveDialog';
import { requestOpenFile } from '../../../utils/openDialog';
// Asumiendo que WidgetConfig existe en tu proyecto. Si no, puedes quitar esta línea o definirla.

// --- El Componente Principal del Widget de Dibujo ---
export const DrawingPadWidget: React.FC<{ instanceId?: string }> = ({ instanceId }) => {
  const { t } = useTranslation();
  const instanceIdRef = useRef(instanceId ?? `drawing-pad-${Date.now()}-${Math.random().toString(16).slice(2)}`);
  const resolvedInstanceId = instanceId ?? instanceIdRef.current;
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const contextRef = useRef<CanvasRenderingContext2D | null>(null);

  const [isDrawing, setIsDrawing] = useState(false);
  const [color, setColor] = useState('#000000');
  const [brushSize, setBrushSize] = useState(5); // Ahora también afecta el tamaño de la fuente
  const [mode, setMode] = useState<'draw' | 'erase'>('draw');
  // `drawingTool` ahora gestiona los tipos de pincel, formas, flechas y la nueva herramienta de texto
  const [drawingTool, setDrawingTool] = useState<'pencil' | 'marker' | 'spray' | 'line' | 'rectangle' | 'circle' | 'arrow' | 'text'>('pencil');
  const [backgroundImage, setBackgroundImage] = useState<HTMLImageElement | null>(null); // Para la imagen de fondo
  // Para las formas y flechas: almacenar el punto de inicio y una instantánea del canvas
  const [startX, setStartX] = useState(0);
  const [startY, setStartY] = useState(0);
  const [snapshot, setSnapshot] = useState<ImageData | null>(null);

  // Estado para la entrada de texto interactiva
  const [isTexting, setIsTexting] = useState(false);
  const [textInput, setTextInput] = useState('');
  const [textX, setTextX] = useState(0);
  const [textY, setTextY] = useState(0);
  const textInputRef = useRef<HTMLInputElement>(null);
  
  // Estado para controlar la visibilidad del mensaje inicial
  const [showInitialMessage, setShowInitialMessage] = useState(true);
  
  // Estado para el desplazamiento del lienzo (pan)
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [currentFilename, setCurrentFilename] = useState<string | null>(null);
  
  // Canvas oculto para mantener el contenido completo durante redimensionamientos
  const backupCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [hasBackupContent, setHasBackupContent] = useState(false);
  // DPI: factor de escala de dispositivo
  const dprRef = useRef<number>(typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1);
  
  // Refs para valores actuales para evitar dependencias en useEffect
  const panOffsetRef = useRef(panOffset);
  const hasBackupContentRef = useRef(hasBackupContent);

  // Actualizar refs cuando cambien los valores
  panOffsetRef.current = panOffset;
  hasBackupContentRef.current = hasBackupContent;

  // Función para ocultar el mensaje inicial al realizar cualquier interacción
  const hideInitialMessage = useCallback(() => {
    if (showInitialMessage) {
      setShowInitialMessage(false);
    }
  }, [showInitialMessage]);

  // Estado para el arrastre del pan
  const [panDragStart, setPanDragStart] = useState<{ x: number, y: number } | null>(null);

  // Función para redibujar con pan (sin useEffect)
  const redrawCanvasWithPan = useCallback((offsetX: number, offsetY: number) => {
    // No dependemos del estado asíncrono; usamos refs actuales
    if (!canvasRef.current || !backupCanvasRef.current) return;
    
    const canvas = canvasRef.current;
    const backupCanvas = backupCanvasRef.current;
    const mainContext = canvas.getContext('2d');
    
    if (mainContext) {
      // Limpiar el canvas principal
      mainContext.clearRect(0, 0, canvas.width, canvas.height);
      
      // Restaurar el contenido desde el backup aplicando el desplazamiento
      // Usar coordenadas absolutas para mostrar la porción correcta del backup
      const dpr = dprRef.current || 1;
      const sourceX = Math.max(0, Math.round(offsetX * dpr));
      const sourceY = Math.max(0, Math.round(offsetY * dpr));
      const sourceWidth = Math.min(canvas.width, backupCanvas.width - sourceX);
      const sourceHeight = Math.min(canvas.height, backupCanvas.height - sourceY);
      
      if (sourceWidth > 0 && sourceHeight > 0) {
        mainContext.drawImage(
          backupCanvas,
          sourceX, sourceY, sourceWidth, sourceHeight,
          0, 0, sourceWidth, sourceHeight
        );
      }
    }
  }, []);

  const resetPan = useCallback(() => {
    setPanOffset({ x: 0, y: 0 });
    redrawCanvasWithPan(0, 0);
  }, [redrawCanvasWithPan]);

  // Función para activar/desactivar modo pan
  const togglePanMode = useCallback(() => {
    setIsPanning(!isPanning);
    // Si estamos activando modo pan, también resetear cualquier arrastre en curso
    if (!isPanning) {
      setPanDragStart(null);
    }
  }, [isPanning]);

  // Función para crear/obtener el canvas de backup
  const getBackupCanvas = useCallback(() => {
    if (!backupCanvasRef.current) {
      backupCanvasRef.current = document.createElement('canvas');
    }
    return backupCanvasRef.current;
  }, []);

  // Función para guardar el contenido actual en el canvas de backup (después de dibujar)
  const saveToBackup = useCallback(() => {
    const mainCanvas = canvasRef.current;
    if (!mainCanvas) return;

    const backupCanvas = getBackupCanvas();
    const currentPanOffset = panOffsetRef.current;
    const dpr = dprRef.current || 1;
    
    // Asegurar que el backup sea lo suficientemente grande para todo el contenido
    const minBackupWidth = Math.max(mainCanvas.width + Math.abs(Math.round(currentPanOffset.x * dpr)), backupCanvas.width || 0);
    const minBackupHeight = Math.max(mainCanvas.height + Math.abs(Math.round(currentPanOffset.y * dpr)), backupCanvas.height || 0);
    
    // Si el backup necesita redimensionarse, preservar contenido existente
    if (backupCanvas.width < minBackupWidth || backupCanvas.height < minBackupHeight) {
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = minBackupWidth;
      tempCanvas.height = minBackupHeight;
      const tempContext = tempCanvas.getContext('2d');
      
      if (tempContext) {
        // Preservar contenido existente del backup
        if (hasBackupContentRef.current && backupCanvas.width > 0 && backupCanvas.height > 0) {
          tempContext.drawImage(backupCanvas, 0, 0);
        }
        
        // Actualizar dimensiones del backup
        backupCanvas.width = minBackupWidth;
        backupCanvas.height = minBackupHeight;
        
        const backupContext = backupCanvas.getContext('2d');
        if (backupContext) {
          backupContext.clearRect(0, 0, minBackupWidth, minBackupHeight);
          backupContext.drawImage(tempCanvas, 0, 0);
        }
      }
    }
    
    // Guardar el contenido actual del canvas en la posición correcta del backup
    const backupContext = backupCanvas.getContext('2d');
    if (backupContext) {
      const destX = Math.max(0, Math.round(currentPanOffset.x * dpr));
      const destY = Math.max(0, Math.round(currentPanOffset.y * dpr));
      backupContext.drawImage(mainCanvas, 0, 0, mainCanvas.width, mainCanvas.height, destX, destY, mainCanvas.width, mainCanvas.height);
    }
    
    setHasBackupContent(true);
  }, [getBackupCanvas]);

  // Función auxiliar para obtener coordenadas de pantalla (para pan)
  const getScreenCoordinates = useCallback((event: React.MouseEvent<HTMLCanvasElement> | MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    
    const rect = canvas.getBoundingClientRect();
    
    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top
    };
  }, []);

  // Función auxiliar para obtener coordenadas correctas del canvas (para dibujo)
    const getCanvasCoordinates = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas) return { x: 0, y: 0 };
      
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      
    return {
      x: (event.clientX - rect.left) * scaleX + panOffset.x * scaleX,
      y: (event.clientY - rect.top) * scaleY + panOffset.y * scaleY
    };
    }, [panOffset]);

  // Función auxiliar para obtener coordenadas correctas del canvas desde MouseEvent nativo
    const getCanvasCoordinatesFromNative = useCallback((event: MouseEvent) => {
      const canvas = canvasRef.current;
      if (!canvas) return { x: 0, y: 0 };
      
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      
    return {
      x: (event.clientX - rect.left) * scaleX + panOffset.x * scaleX,
      y: (event.clientY - rect.top) * scaleY + panOffset.y * scaleY
    };
    }, [panOffset]);

  // Función para redibujar el contenido del canvas (imagen de fondo y, eventualmente, trazos guardados)
  const drawCanvasContent = useCallback((preserveDrawings = false) => {
    const canvas = canvasRef.current;
    const context = contextRef.current;
    if (!canvas || !context) return;

    // Guardar el contenido actual si queremos preservar los dibujos
    let savedContent: ImageData | null = null;
    if (preserveDrawings) {
      savedContent = context.getImageData(0, 0, canvas.width, canvas.height);
    }

    // Limpia el canvas completamente solo si no estamos preservando
    if (!preserveDrawings) {
      context.clearRect(0, 0, canvas.width, canvas.height);
    }

    // Dibuja la imagen de fondo si existe, escalándola para que encaje
    if (backgroundImage) {
      const hRatio = canvas.width / backgroundImage.width;
      const vRatio = canvas.height / backgroundImage.height;
      const ratio = Math.min(hRatio, vRatio);

      const centerShift_x = (canvas.width - backgroundImage.width * ratio) / 2;
      const centerShift_y = (canvas.height - backgroundImage.height * ratio) / 2;

      // Si estamos preservando dibujos, crear un canvas temporal para la imagen de fondo
      if (preserveDrawings && savedContent) {
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = canvas.width;
        tempCanvas.height = canvas.height;
        const tempContext = tempCanvas.getContext('2d');
        
        if (tempContext) {
          // Dibujar imagen de fondo en canvas temporal
          tempContext.drawImage(backgroundImage, 0, 0, backgroundImage.width, backgroundImage.height,
                            centerShift_x, centerShift_y, backgroundImage.width * ratio, backgroundImage.height * ratio);
          
          // Restaurar los dibujos encima
          tempContext.putImageData(savedContent, 0, 0);
          
          // Copiar todo al canvas principal
          context.clearRect(0, 0, canvas.width, canvas.height);
          context.drawImage(tempCanvas, 0, 0);
        }
      } else {
        context.drawImage(backgroundImage, 0, 0, backgroundImage.width, backgroundImage.height,
                          centerShift_x, centerShift_y, backgroundImage.width * ratio, backgroundImage.height * ratio);
      }
    } else if (preserveDrawings && savedContent) {
      // Si no hay imagen de fondo pero queremos preservar los dibujos, simplemente los restauramos
      context.putImageData(savedContent, 0, 0);
    }
    // En una implementación con deshacer/rehacer, aquí se redibujarían los trazos permanentes
  }, [backgroundImage]);

  // Efecto para inicializar el canvas y manejar el redimensionamiento de la ventana
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resizeCanvas = () => {
      const cssWidth = canvas.offsetWidth;
      const cssHeight = canvas.offsetHeight;
      const dpr = (typeof window !== 'undefined' ? window.devicePixelRatio : 1) || 1;
      dprRef.current = dpr;

      if (cssWidth <= 0 || cssHeight <= 0) return;

      const newWidth = Math.round(cssWidth * dpr);
      const newHeight = Math.round(cssHeight * dpr);

      if (canvas.width !== newWidth || canvas.height !== newHeight) {
        const currentPanOffset = panOffsetRef.current;
        const destX = Math.max(0, Math.round(currentPanOffset.x * dpr));
        const destY = Math.max(0, Math.round(currentPanOffset.y * dpr));

        // 1) Asegurar backup y que tenga tamaño suficiente para alojar el contenido actual
        const backupCanvas = getBackupCanvas();
        const ensureBackupSize = (minW: number, minH: number) => {
          if (backupCanvas.width >= minW && backupCanvas.height >= minH) return;
          const tmp = document.createElement('canvas');
          tmp.width = Math.max(minW, backupCanvas.width);
          tmp.height = Math.max(minH, backupCanvas.height);
          const tctx = tmp.getContext('2d');
          if (tctx && backupCanvas.width > 0 && backupCanvas.height > 0) {
            tctx.drawImage(backupCanvas, 0, 0);
          }
          backupCanvas.width = tmp.width;
          backupCanvas.height = tmp.height;
          const bctx2 = backupCanvas.getContext('2d');
          if (bctx2 && tctx) {
            bctx2.clearRect(0, 0, backupCanvas.width, backupCanvas.height);
            bctx2.drawImage(tmp, 0, 0);
          }
        };

        // Necesitamos al menos alojar el contenido visible actual
        ensureBackupSize(destX + canvas.width, destY + canvas.height);

        // 2) Copiar el contenido visible actual al backup en su posición correcta (sin escalar)
        const bctx = backupCanvas.getContext('2d');
        if (bctx && canvas.width > 0 && canvas.height > 0) {
          bctx.drawImage(
            canvas,
            0, 0, canvas.width, canvas.height,
            destX, destY, canvas.width, canvas.height
          );
          hasBackupContentRef.current = true;
          setHasBackupContent(true);
        }

        // 3) Redimensionar el canvas principal (esto limpia el contenido)
        canvas.width = newWidth;
        canvas.height = newHeight;
        contextRef.current = canvas.getContext('2d');

        // 4) Restaurar desde backup sin escalar, usando el panOffset actual (viewport)
        redrawCanvasWithPan(currentPanOffset.x, currentPanOffset.y);
      }
    };

    const context = canvas.getContext('2d');
    if (!context) return;
    contextRef.current = context;

    resizeCanvas(); // Ajusta el tamaño inicial

    // Usar ResizeObserver para detectar cambios en el tamaño del widget
    const resizeObserver = new ResizeObserver(() => {
      resizeCanvas();
    });
    
    resizeObserver.observe(canvas.parentElement || canvas);
    
    // También escuchar eventos de redimensionamiento de ventana como respaldo
    window.addEventListener('resize', resizeCanvas);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', resizeCanvas);
    };
  }, []); // Sin dependencias para evitar bucles - todo se maneja internamente

  // Efecto para cambiar el modo de composición global del canvas (dibujar vs. borrar)
  useEffect(() => {
    if (contextRef.current) {
      contextRef.current.globalCompositeOperation = mode === 'draw' ? 'source-over' : 'destination-out';
    }
  }, [mode]);

  // Manejador para iniciar el dibujo o la creación de forma/texto
  const startDrawing = (event: React.MouseEvent<HTMLCanvasElement>) => {
    // Ocultar mensaje inicial al empezar a dibujar
    hideInitialMessage();
    
    // Si estamos en modo pan, iniciar arrastre del lienzo
    if (isPanning) {
      const screenCoords = getScreenCoordinates(event);
      setPanDragStart(screenCoords);
      return;
    }
    
    // Si estamos en modo texto y ya hay un input activo, no hacemos nada
    if (drawingTool === 'text' && isTexting) return;

    // Se asegura que tanto el contexto como el canvas existan antes de continuar
    if (!contextRef.current || !canvasRef.current) return;
    const { x: offsetX, y: offsetY } = getCanvasCoordinates(event);

    if (drawingTool === 'text') {
      // Si la herramienta es texto, preparamos la entrada de texto
      setIsTexting(true);
      setTextX(offsetX);
      setTextY(offsetY);
      setTextInput(''); // Limpiar el input anterior
      // Guarda una instantánea del canvas antes de añadir texto
      setSnapshot(contextRef.current.getImageData(0, 0, canvasRef.current.width, canvasRef.current.height));
      // Enfocar el input después de que se renderice
      setTimeout(() => textInputRef.current?.focus(), 0);
    } else if (['line', 'rectangle', 'circle', 'arrow'].includes(drawingTool)) {
      // Para formas y flechas, guarda el punto de inicio y una instantánea del canvas
      setStartX(offsetX);
      setStartY(offsetY);
      setSnapshot(contextRef.current.getImageData(0, 0, canvasRef.current.width, canvasRef.current.height));
    } else {
      // Para pinceles, inicia una nueva ruta de dibujo
      contextRef.current.beginPath();
      contextRef.current.moveTo(offsetX, offsetY);
    }
    setIsDrawing(true); // isDrawing se usa para arrastrar, pero aquí también para indicar que una acción está en curso
  };

  // Función auxiliar para dibujar una cabeza de flecha
  const drawArrowhead = (context: CanvasRenderingContext2D, x: number, y: number, angle: number, size: number) => {
    context.save();
    context.beginPath();
    context.translate(x, y);
    context.rotate(angle);
    context.moveTo(0, 0);
    context.lineTo(-size, -size / 2);
    context.lineTo(-size, size / 2);
    context.closePath();
    context.fill(); // Rellena la cabeza de flecha
    context.restore();
  };

  // Manejador para dibujar mientras se arrastra el ratón (incluye previsualización de formas y flechas)
  const draw = (event: React.MouseEvent<HTMLCanvasElement>) => {
    // Si estamos en modo pan y hay un arrastre activo
    if (isPanning && panDragStart) {
      const currentScreenCoords = getScreenCoordinates(event);
      const deltaX = currentScreenCoords.x - panDragStart.x;
      const deltaY = currentScreenCoords.y - panDragStart.y;
      
      // Antes de actualizar, guardar el contenido actual en el backup
      if (hasBackupContent && backupCanvasRef.current) {
        const backupCanvas = backupCanvasRef.current;
        const backupContext = backupCanvas.getContext('2d');
        const canvas = canvasRef.current;
        
        if (backupContext && canvas) {
          const currentPanOffset = panOffsetRef.current;
          const dpr = dprRef.current || 1;
          const destX = Math.max(0, Math.round(currentPanOffset.x * dpr));
          const destY = Math.max(0, Math.round(currentPanOffset.y * dpr));
          backupContext.drawImage(canvas, 0, 0, canvas.width, canvas.height, destX, destY, canvas.width, canvas.height);
        }
      }
      
      const newOffset = {
        x: panOffset.x - deltaX,
        y: panOffset.y - deltaY
      };
      
      // Actualizar estado y redibujar inmediatamente
      setPanOffset(newOffset);
      redrawCanvasWithPan(newOffset.x, newOffset.y);
      
      setPanDragStart(currentScreenCoords);
      return;
    }
    
    if (!isDrawing || !contextRef.current) return;
    const { x: offsetX, y: offsetY } = getCanvasCoordinates(event);
    const context = contextRef.current;

    context.lineWidth = brushSize;
    context.strokeStyle = color;
    context.fillStyle = color; // Relevante para el spray y cabeza de flecha

    // Si es una forma o flecha, restaura el canvas al estado del snapshot y dibuja la previsualización
    if (snapshot && ['line', 'rectangle', 'circle', 'arrow'].includes(drawingTool)) {
      context.putImageData(snapshot, 0, 0); // Restaura el canvas para borrar la previsualización anterior
      const width = offsetX - startX;
      const height = offsetY - startY;

      switch (drawingTool) {
        case 'line':
          context.beginPath();
          context.moveTo(startX, startY);
          context.lineTo(offsetX, offsetY);
          context.stroke();
          break;
        case 'rectangle':
          context.strokeRect(startX, startY, width, height);
          break;
        case 'circle':
          const centerX = (startX + offsetX) / 2;
          const centerY = (startY + offsetY) / 2;
          const radiusX = Math.abs(width / 2);
          const radiusY = Math.abs(height / 2);
          context.beginPath();
          context.ellipse(centerX, centerY, radiusX, radiusY, 0, 0, 2 * Math.PI);
          context.stroke();
          break;
        case 'arrow':
          context.beginPath();
          context.moveTo(startX, startY);
          context.lineTo(offsetX, offsetY);
          context.stroke();

          // Dibuja la cabeza de flecha en la previsualización
          const angle = Math.atan2(offsetY - startY, offsetX - startX);
          // Aumentado el tamaño de la cabeza de flecha para que sea más visible
          drawArrowhead(context, offsetX, offsetY, angle, brushSize * 4); 
          break;
        default:
          break;
      }
    } else if (drawingTool !== 'text') { // Solo dibujar trazo libre si no es herramienta de texto
      // Para pinceles de trazo libre
      switch (drawingTool) {
        case 'pencil':
          context.lineCap = 'round';
          context.lineJoin = 'round';
          context.lineTo(offsetX, offsetY);
          context.stroke();
          break;
        case 'marker':
          context.lineCap = 'square';
          context.lineJoin = 'miter';
          context.lineTo(offsetX, offsetY);
          context.stroke();
          break;
        case 'spray':
          for (let i = 0; i < 15; i++) {
            const angle = Math.random() * 2 * Math.PI;
            const radius = Math.random() * brushSize;
            const x = offsetX + radius * Math.cos(angle);
            const y = offsetY + radius * Math.sin(angle);
            context.fillRect(x, y, 1, 1);
          }
          break;
        default:
          break;
      }
      context.beginPath();
      context.moveTo(offsetX, offsetY);
    }
  };

  // Manejador para detener el dibujo o finalizar la creación de forma/flecha/texto
  const stopDrawing = (event: MouseEvent) => { // Aceptar MouseEvent directamente
    // Si estamos en modo pan, finalizar arrastre
    if (isPanning) {
      setPanDragStart(null);
      return;
    }
    
    if (!contextRef.current) return;
    const context = contextRef.current;
    
    // Determine the end coordinates based on the event or start point
    const { x: currentX, y: currentY } = getCanvasCoordinatesFromNative(event);

    // Fallback para cuando las coordenadas no sean válidas (ej. mouseleave fuera del canvas)
    let finalX = currentX;
    let finalY = currentY;
    if (['line', 'rectangle', 'circle', 'arrow'].includes(drawingTool)) {
      if (isNaN(currentX) || isNaN(currentY)) {
        finalX = startX; // Usa el punto de inicio como final si el evento no da coordenadas válidas
        finalY = startY;
      }
    }

    // Si estábamos dibujando una forma o flecha, la dibujamos de forma final
    if (snapshot && ['line', 'rectangle', 'circle', 'arrow'].includes(drawingTool)) {
        // Restauramos el canvas al estado anterior para limpiar la última previsualización
        context.putImageData(snapshot, 0, 0); 
        // Dibujamos la forma/flecha final de nuevo para que sea permanente
        const width = finalX - startX;
        const height = finalY - startY;

        switch (drawingTool) {
            case 'line':
                context.beginPath();
                context.moveTo(startX, startY);
                context.lineTo(finalX, finalY);
                context.stroke();
                break;
            case 'rectangle':
                context.strokeRect(startX, startY, width, height);
                break;
            case 'circle':
                const centerX = (startX + finalX) / 2;
                const centerY = (startY + finalY) / 2;
                const radiusX = Math.abs(width / 2);
                const radiusY = Math.abs(height / 2);
                context.beginPath();
                context.ellipse(centerX, centerY, radiusX, radiusY, 0, 0, 2 * Math.PI);
                context.stroke();
                break;
            case 'arrow':
                context.beginPath();
                context.moveTo(startX, startY);
                context.lineTo(finalX, finalY);
                context.stroke();

                // Dibuja la cabeza de flecha final
                const angle = Math.atan2(finalY - startY, finalX - startX);
                drawArrowhead(context, finalX, finalY, angle, brushSize * 4);
                break;
            default:
                break;
        }
        setSnapshot(null); // Limpiar el snapshot
    } else if (drawingTool === 'text') {
      // Para texto, la lógica de stopDrawing se maneja en handleTextSubmit
      // No se hace nada aquí directamente
    } else {
        // Para pinceles, cerrar la ruta
        context.closePath();
    }
    setIsDrawing(false);
    
    // Guardar en backup después de completar cualquier trazo
    saveToBackup();
  };

  // Limpiar todo el canvas (imagen y dibujos)
  const clearCanvas = () => {
    const canvas = canvasRef.current;
    const context = contextRef.current;
    if (canvas && context) {
      // Usar window.confirm para confirmación antes de borrar
      if (window.confirm(t('widgets.drawing_pad.clear_confirm'))) {
        setBackgroundImage(null); // Elimina la imagen de fondo
        context.clearRect(0, 0, canvas.width, canvas.height); // Limpia los trazos
        setIsTexting(false); // Asegurarse de que el input de texto se oculte
        setTextInput('');
        
        // Limpiar también el backup
        if (backupCanvasRef.current) {
          const backupContext = backupCanvasRef.current.getContext('2d');
          if (backupContext) {
            backupContext.clearRect(0, 0, backupCanvasRef.current.width, backupCanvasRef.current.height);
          }
        }
        setHasBackupContent(false);
        setPanOffset({ x: 0, y: 0 });
        setPanDragStart(null);
      }
    }
  };

  const loadImageFile = (file: File) => {
    // Ocultar mensaje inicial al subir una imagen
    hideInitialMessage();
    
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        setBackgroundImage(img); // Establece la imagen de fondo
        drawCanvasContent(); // Redibuja el canvas con la nueva imagen
        
        // Guardar en backup después de cargar imagen
        saveToBackup();
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
    window.dispatchEvent(
      new CustomEvent('widget-title-update', {
        detail: { instanceId: resolvedInstanceId, title: file.name },
      })
    );
    setCurrentFilename(file.name);
  };

  const handleOpenImage = async () => {
    const result = await requestOpenFile({ accept: 'image/*' });
    if (!result) return;
    if (result.source === 'local') {
      const [file] = result.files;
      if (file) loadImageFile(file);
      return;
    }
    const [entryId] = result.entryIds;
    if (!entryId) return;
    const entry = await getEntry(entryId);
    if (!entry?.blob) return;
    const file = new File([entry.blob], entry.name, { type: entry.mime || entry.blob.type });
    loadImageFile(file);
  };

  useEffect(() => {
    const unsubscribe = subscribeFileOpen('drawing-pad', async ({ entryId }) => {
      const entry = await getEntry(entryId);
      if (!entry?.blob) return;
      const file = new File([entry.blob], entry.name, { type: entry.mime || entry.blob.type });
      loadImageFile(file);
    });
    return unsubscribe;
  }, []);

  // Manejador para guardar el dibujo
  const handleSaveDrawing = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.toBlob(async (blob) => {
      if (!blob) return;
      const filename = currentFilename || t('widgets.drawing_pad.default_filename');
      const destination = await requestSaveDestination(filename);
      if (!destination) return;
      if (destination?.destination === 'file-manager') {
        await saveToFileManager({
          blob,
          filename: destination.filename,
          sourceWidgetId: 'drawing-pad',
          sourceWidgetTitleKey: 'widgets.drawing_pad.title',
          parentId: destination.parentId,
        });
        window.dispatchEvent(
          new CustomEvent('widget-title-update', {
            detail: { instanceId: resolvedInstanceId, title: destination.filename },
          })
        );
        setCurrentFilename(destination.filename);
        return;
      }
      if (destination?.destination === 'download') {
        downloadBlob(blob, destination.filename);
      }
      window.dispatchEvent(
        new CustomEvent('widget-title-update', {
          detail: { instanceId: resolvedInstanceId, title: destination.filename },
        })
      );
      setCurrentFilename(destination.filename);
    }, 'image/png');
  };

  // NUEVA FUNCIÓN: Dibujar el texto en el canvas de forma permanente
  const drawTextOnCanvas = useCallback((text: string, x: number, y: number) => {
    const context = contextRef.current;
    if (!context || !text) return;

    context.font = `${brushSize * 2}px Arial`; // El tamaño de pincel afecta el tamaño de la fuente
    context.fillStyle = color; // El color de pincel afecta el color del texto
    context.fillText(text, x, y);
  }, [brushSize, color]);

  // NUEVA FUNCIÓN: Manejar el envío del texto (al presionar Enter o perder el foco)
  const handleTextSubmit = () => {
    if (textInput.trim() !== '') {
      // Restaurar el canvas al estado antes de que apareciera el input
      if (snapshot) {
        contextRef.current?.putImageData(snapshot, 0, 0);
      } else {
        // Si no hay snapshot (ej. primer texto en un canvas vacío), simplemente redibujar el fondo
        drawCanvasContent();
      }
      drawTextOnCanvas(textInput, textX, textY); // Dibujar el texto de forma permanente
      
      // Guardar en backup después de añadir texto
      saveToBackup();
    }
    setIsTexting(false); // Ocultar el input de texto
    setTextInput(''); // Limpiar el estado del input
    setSnapshot(null); // Limpiar el snapshot
    setIsDrawing(false); // Finalizar la acción de "dibujo" (texto)
  };

  // Manejar la pulsación de teclas en el input de texto
  const handleTextInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleTextSubmit();
    }
  };

  // Títulos condicionales para navegación
  const panModeTitle = isPanning ? t('widgets.drawing_pad.exit_pan') : t('widgets.drawing_pad.pan_mode');

  return (
    <div className="w-full h-full flex flex-col bg-gray-100 rounded-lg shadow-md overflow-hidden">
      <div className="p-2 bg-gray-200 flex items-center gap-2 border-b flex-wrap">
        {/* Modo Dibujar/Borrar */}
        <div className="flex items-center gap-2 border-r pr-2">
          <button onClick={() => { hideInitialMessage(); setMode('draw'); }} className={`p-2 rounded-md ${mode === 'draw' ? 'bg-blue-500 text-white' : 'hover:bg-gray-300'}`} title={t('widgets.drawing_pad.brush')}>
            <Paintbrush size={20} />
          </button>
          <button onClick={() => { hideInitialMessage(); setMode('erase'); }} className={`p-2 rounded-md ${mode === 'erase' ? 'bg-blue-500 text-white' : 'hover:bg-gray-300'}`} title={t('widgets.drawing_pad.eraser')}>
            <Eraser size={20} />
          </button>
        </div>

        {/* Herramientas de Dibujo (Pinceles, Formas, Flechas, Texto) */}
        {mode === 'draw' && (
          <div className="flex items-center gap-2 border-r pr-2">
            {/* Pinceles */}
            <button onClick={() => { hideInitialMessage(); setDrawingTool('pencil'); }} className={`p-2 rounded-md ${drawingTool === 'pencil' ? 'bg-blue-500 text-white' : 'hover:bg-gray-300'}`} title={t('widgets.drawing_pad.pencil')}>
              <Pen size={20} />
            </button>
            <button onClick={() => { hideInitialMessage(); setDrawingTool('marker'); }} className={`p-2 rounded-md ${drawingTool === 'marker' ? 'bg-blue-500 text-white' : 'hover:bg-gray-300'}`} title={t('widgets.drawing_pad.marker')}>
              <Highlighter size={20} />
            </button>
            <button onClick={() => { hideInitialMessage(); setDrawingTool('spray'); }} className={`p-2 rounded-md ${drawingTool === 'spray' ? 'bg-blue-500 text-white' : 'hover:bg-gray-300'}`} title={t('widgets.drawing_pad.spray')}>
              <SprayCan size={20} />
            </button>
            {/* Formas */}
            <button onClick={() => { hideInitialMessage(); setDrawingTool('line'); }} className={`p-2 rounded-md ${drawingTool === 'line' ? 'bg-blue-500 text-white' : 'hover:bg-gray-300'}`} title={t('widgets.drawing_pad.line')}>
              <LineChart size={20} />
            </button>
            <button onClick={() => { hideInitialMessage(); setDrawingTool('rectangle'); }} className={`p-2 rounded-md ${drawingTool === 'rectangle' ? 'bg-blue-500 text-white' : 'hover:bg-gray-300'}`} title={t('widgets.drawing_pad.rectangle')}>
              <Square size={20} />
            </button>
            <button onClick={() => { hideInitialMessage(); setDrawingTool('circle'); }} className={`p-2 rounded-md ${drawingTool === 'circle' ? 'bg-blue-500 text-white' : 'hover:bg-gray-300'}`} title={t('widgets.drawing_pad.circle')}>
              <Circle size={20} />
            </button>
            {/* Herramienta: Flecha */}
            <button onClick={() => { hideInitialMessage(); setDrawingTool('arrow'); }} className={`p-2 rounded-md ${drawingTool === 'arrow' ? 'bg-blue-500 text-white' : 'hover:bg-gray-300'}`} title={t('widgets.drawing_pad.arrow')}>
              <ArrowRight size={20} />
            </button>
            {/* NUEVA HERRAMIENTA: Texto */}
            <button onClick={() => { hideInitialMessage(); setDrawingTool('text'); }} className={`p-2 rounded-md ${drawingTool === 'text' ? 'bg-blue-500 text-white' : 'hover:bg-gray-300'}`} title={t('widgets.drawing_pad.text')}>
              <Type size={20} />
            </button>
          </div>
        )}

        {/* Selector de Color y Tamaño del Pincel */}
        <div className="flex items-center gap-4">
          {mode === 'draw' && (
            <input
              type="color"
              value={color}
              onChange={(e) => { hideInitialMessage(); setColor(e.target.value); }}
              className="w-8 h-8 cursor-pointer rounded-md border border-gray-300"
              title={t('widgets.drawing_pad.select_color')}
            />
          )}
          <div className="flex items-center gap-2">
            <input
              type="range"
              min="1"
              max="50"
              value={brushSize}
              onChange={(e) => { hideInitialMessage(); setBrushSize(Number(e.target.value)); }}
              className="w-24 h-2 bg-gray-300 rounded-lg appearance-none cursor-pointer"
              title={t('widgets.drawing_pad.brush_size')}
            />
            <span className="text-sm w-6 text-center text-gray-700">{brushSize}</span>
          </div>
        </div>

        {/* Botón para subir imagen */}
        <button onClick={handleOpenImage} className="p-2 rounded-md hover:bg-gray-300" title={t('widgets.drawing_pad.upload_image')}>
          <ImageIcon size={20} />
        </button>

        {/* Botón: Guardar Dibujo */}
        <button onClick={handleSaveDrawing} className="p-2 rounded-md hover:bg-green-300" title={t('widgets.drawing_pad.save_drawing')}>
          <SaveIcon size={20} />
        </button>

        {/* Botón: Limpiar Todo */}
        <button onClick={clearCanvas} className="p-2 rounded-md hover:bg-red-300" title={t('widgets.drawing_pad.clear_all')}>
          <Trash2 size={20} />
        </button>

        {/* Controles de Navegación */}
        <div className="ml-auto flex items-center gap-2 border-l pl-2">
          <button 
            onClick={togglePanMode} 
            className={`p-2 rounded-md ${isPanning ? 'bg-blue-500 text-white' : 'hover:bg-gray-300'}`} 
            title={panModeTitle}
          >
            <Move size={20} />
          </button>
          <button onClick={resetPan} className="p-2 rounded-md hover:bg-blue-300" title={t('widgets.drawing_pad.center_view')}>
            <RotateCcw size={20} />
          </button>
        </div>
      </div>

      {/* Área del Canvas */}
      <div className="flex-grow w-full h-full relative bg-white">
        <canvas
          ref={canvasRef}
          onMouseDown={startDrawing}
          // Para el texto, onMouseUp no finaliza el dibujo, sino que lo inicia
          onMouseUp={(e) => {
            if (isPanning) {
              // Al soltar el ratón en modo navegación, fijamos la vista actual
              setPanDragStart(null);
              // Opcional: persistir la vista final en el backup
              saveToBackup();
              return;
            }
            if (drawingTool !== 'text') {
              stopDrawing(e.nativeEvent);
            }
          }}
          onMouseLeave={(e) => { 
            if (isPanning) {
              setPanDragStart(null);
            } else if (isDrawing && drawingTool !== 'text') {
              stopDrawing(e.nativeEvent);
            }
          }}
          onMouseMove={draw}
          className={`w-full h-full block ${isPanning ? 'cursor-grab' : (panDragStart ? 'cursor-grabbing' : 'cursor-crosshair')}`}
          style={{ cursor: isPanning ? (panDragStart ? 'grabbing' : 'grab') : 'crosshair' }}
        />
        {!backgroundImage && showInitialMessage && (
          <div className="absolute inset-0 flex items-center justify-center text-gray-400 text-lg pointer-events-none">
            {t('widgets.drawing_pad.start_drawing')}
          </div>
        )}

        {/* Campo de entrada de texto interactivo */}
        {isTexting && (
          <input
            type="text"
            ref={textInputRef}
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            onBlur={handleTextSubmit} // Al perder el foco, se dibuja el texto
            onKeyDown={handleTextInputKeyDown} // Al presionar Enter, se dibuja el texto
            style={{
              position: 'absolute',
              left: textX,
              top: textY,
              fontSize: `${brushSize * 2}px`, // Tamaño de fuente basado en brushSize
              color: color,
              fontFamily: 'Arial', // Puedes cambiar la fuente
              backgroundColor: 'rgba(255, 255, 255, 0.8)',
              border: '1px solid #ccc',
              padding: '2px 5px',
              zIndex: 100,
              minWidth: '50px',
              outline: 'none',
              transform: 'translate(-50%, -50%)' // Centrar el input en el clic
            }}
            className="rounded-md shadow-sm"
          />
        )}
      </div>
    </div>
  );
};

// Se incluye widgetConfig para tu WIDGET_REGISTRY

export { widgetConfig } from './widgetConfig';
