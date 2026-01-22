// src/components/core/WidgetWindow.tsx

import React from 'react';
import { Rnd, type RndDragCallback, type RndResizeCallback } from 'react-rnd';
import { CircleHelp, X, Minus, Maximize, Minimize, Pin, PinOff } from 'lucide-react';

interface WidgetWindowProps {
  id: string;
  title: string;
  icon?: React.ReactNode | string;
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
  isActive?: boolean;
  helpText?: string;
}

export const WidgetWindow: React.FC<WidgetWindowProps> = ({ 
    id, title, icon, children, position, size, zIndex, onDragStop, onResizeStop, 
    onClose, onFocus, isMinimized, isMaximized, onToggleMinimize, onToggleMaximize, onOpenContextMenu,
    isPinned, onTogglePin, pinLabel, unpinLabel, isActive, helpText
}) => {
  const [isHeaderHovered, setIsHeaderHovered] = React.useState(false);
  const [isHelpOpen, setIsHelpOpen] = React.useState(false);
  const helpRef = React.useRef<HTMLDivElement>(null);
  const finalSize = isMinimized ? { ...size, height: 40 } : size;
  const containerStyle: React.CSSProperties = {
    zIndex,
    opacity: isMinimized ? 0 : (!isMinimized && !isActive ? 0.97 : 1),
    pointerEvents: isMinimized ? 'none' : 'auto',
    transform: isMinimized ? 'scale(0.98)' : 'scale(1)',
    transition: isMinimized
      ? 'width 220ms ease, height 220ms ease, opacity 220ms ease, transform 220ms ease'
      : 'opacity 120ms ease',
  };
  
  const headerIcon = typeof icon === 'string'
    ? <img src={icon} alt="" aria-hidden="true" />
    : icon;

  React.useEffect(() => {
    if (!isHelpOpen) {
      return undefined;
    }
    const handlePointerDown = (event: MouseEvent) => {
      if (helpRef.current && !helpRef.current.contains(event.target as Node)) {
        setIsHelpOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsHelpOpen(false);
      }
    };
    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isHelpOpen]);

  const helpId = `widget-help-${id}`;

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
        onDragStart={() => onFocus()}
        className={`widget-window bg-widget-bg rounded-lg border-2 border-widget-header relative ${isActive ? 'ring-2 ring-accent/70 shadow-2xl' : 'shadow-xl'}`}
        dragHandleClassName="widget-header-drag-handle"
        bounds="parent" 
      >
        <div
          className="widget-header relative flex items-center justify-between h-10 bg-widget-header text-text-light font-bold px-3 absolute top-0 left-0 right-0"
          onContextMenu={onOpenContextMenu}
          onDoubleClick={(event) => {
            event.stopPropagation();
            onToggleMaximize();
          }}
          onMouseEnter={() => setIsHeaderHovered(true)}
          onMouseLeave={() => setIsHeaderHovered(false)}
        >
          {/* --- LÍNEA MODIFICADA: Se han añadido clases de flexbox para centrar --- */}
          <span className="widget-header-drag-handle flex-grow h-full cursor-move flex items-center gap-2">
            {headerIcon && <span className="widget-header-icon">{headerIcon}</span>}
            <span>{title}</span>
          </span>
          
          <div className="flex items-center gap-1">
            {onTogglePin && (isHeaderHovered || isPinned) && (
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
            {helpText && (
              <div ref={helpRef} className="relative">
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    setIsHelpOpen((prev) => !prev);
                  }}
                  className="hover:bg-black/20 rounded-full p-1"
                  aria-label={helpText}
                  aria-expanded={isHelpOpen}
                  aria-controls={helpId}
                >
                  <CircleHelp size={18} />
                </button>
                {isHelpOpen && (
                  <div
                    id={helpId}
                    role="tooltip"
                    className="absolute right-0 top-10 z-20 w-60 rounded-md bg-black/85 px-3 py-2 text-xs font-normal leading-snug text-white shadow-lg"
                  >
                    {helpText}
                  </div>
                )}
              </div>
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
