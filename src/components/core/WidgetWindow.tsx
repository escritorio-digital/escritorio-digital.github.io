// src/components/core/WidgetWindow.tsx

import React from 'react';
import { Rnd, type RndDragCallback, type RndResizeCallback } from 'react-rnd';
import { X, Minus, Maximize, Minimize, Pin, PinOff } from 'lucide-react';

interface WidgetWindowProps {
  id: string;
  title: string;
  children: React.ReactNode;
  position: { x: number; y: number };
  size: { width: number | string; height: number | string };
  zIndex: number;
  onDragStop: RndDragCallback;
  onResizeStop: RndResizeCallback;
  onClose: () => void;
  onFocus: () => void;
  isMinimized?: boolean;
  isMaximized?: boolean;
  onToggleMinimize: () => void;
  onToggleMaximize: () => void;
  onOpenContextMenu?: (event: React.MouseEvent) => void;
  isPinned?: boolean;
  onTogglePin?: () => void;
  pinLabel?: string;
  unpinLabel?: string;
}

export const WidgetWindow: React.FC<WidgetWindowProps> = ({ 
    title, children, position, size, zIndex, onDragStop, onResizeStop, 
    onClose, onFocus, isMinimized, isMaximized, onToggleMinimize, onToggleMaximize, onOpenContextMenu,
    isPinned, onTogglePin, pinLabel, unpinLabel
}) => {
  const [isHeaderHovered, setIsHeaderHovered] = React.useState(false);
  const finalSize = isMinimized ? { ...size, height: 40 } : size;
  const containerStyle: React.CSSProperties = {
    zIndex,
    opacity: isMinimized ? 0 : 1,
    pointerEvents: isMinimized ? 'none' : 'auto',
    transform: isMinimized ? 'scale(0.98)' : 'scale(1)',
    transition: 'width 220ms ease, height 220ms ease, opacity 220ms ease, transform 220ms ease',
  };
  
  return (
      <Rnd
        size={finalSize}
        position={position}
        onDragStop={onDragStop}
        onResizeStop={onResizeStop}
        minWidth={200}
        minHeight={isMinimized ? 40 : 150}
        disableDragging={isMaximized}
        enableResizing={!isMaximized && !isMinimized}
        style={containerStyle}
        onMouseDown={onFocus}
        onMouseDownCapture={onFocus}
        className="bg-widget-bg rounded-lg shadow-2xl border-2 border-widget-header relative"
        dragHandleClassName="widget-header-drag-handle"
        bounds="parent" 
      >
        <div
          className="flex items-center justify-between h-10 bg-widget-header text-text-light font-bold px-3 absolute top-0 left-0 right-0"
          onContextMenu={onOpenContextMenu}
          onMouseEnter={() => setIsHeaderHovered(true)}
          onMouseLeave={() => setIsHeaderHovered(false)}
        >
          {/* --- LÍNEA MODIFICADA: Se han añadido clases de flexbox para centrar --- */}
          <span className="widget-header-drag-handle flex-grow h-full cursor-move flex items-center">{title}</span>
          
          <div className="flex items-center gap-1">
            {onTogglePin && isHeaderHovered && (
              <button
                onClick={onTogglePin}
                onContextMenu={onOpenContextMenu}
                className="hover:bg-black/20 rounded-full p-1"
                title={isPinned ? unpinLabel : pinLabel}
                aria-label={isPinned ? unpinLabel : pinLabel}
              >
                {isPinned ? <PinOff size={18} /> : <Pin size={18} />}
              </button>
            )}
            <button onClick={onToggleMinimize} onContextMenu={onOpenContextMenu} className="hover:bg-black/20 rounded-full p-1">
              <Minus size={18} />
            </button>
            <button onClick={onToggleMaximize} onContextMenu={onOpenContextMenu} className="hover:bg-black/20 rounded-full p-1">
              {isMaximized ? <Minimize size={18} /> : <Maximize size={18} />}
            </button>
            <button onClick={onClose} onContextMenu={onOpenContextMenu} className="hover:bg-black/20 rounded-full p-1">
              <X size={18} />
            </button>
          </div>
        </div>

        {!isMinimized && (
          <div className="absolute top-10 left-0 right-0 bottom-0 min-h-0 overflow-auto">
            {children}
          </div>
        )}
      </Rnd>
    );
};
