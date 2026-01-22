// src/components/core/WidgetWindow.tsx

import React from 'react';
import { Rnd, type RndDragCallback, type RndResizeCallback } from 'react-rnd';
import { CircleHelp, X, Minus, Maximize, Minimize, Pin, PinOff, Expand, Minimize2, MoreVertical, Plus, RotateCcw } from 'lucide-react';

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
  helpLabel?: string;
  minimizeLabel?: string;
  maximizeLabel?: string;
  restoreLabel?: string;
  closeLabel?: string;
  enterFullscreenLabel?: string;
  exitFullscreenLabel?: string;
  windowMenuLabel?: string;
  zoomLevel?: number;
  zoomInLabel?: string;
  zoomOutLabel?: string;
  zoomResetLabel?: string;
  zoomEditHint?: string;
  onZoomChange?: (nextZoom: number) => void;
  onZoomReset?: () => void;
}

export const WidgetWindow: React.FC<WidgetWindowProps> = ({
    id,
    title,
    icon,
    children,
    position,
    size,
    zIndex,
    onDragStop,
    onResizeStop,
    onClose,
    onFocus,
    isMinimized,
    isMaximized,
    onToggleMinimize,
    onToggleMaximize,
    onOpenContextMenu,
    isPinned,
    onTogglePin,
    pinLabel,
    unpinLabel,
    isActive,
    helpText,
    helpLabel,
    minimizeLabel,
    maximizeLabel,
    restoreLabel,
    closeLabel,
    enterFullscreenLabel,
    exitFullscreenLabel,
    windowMenuLabel,
    zoomLevel,
    zoomInLabel,
    zoomOutLabel,
    zoomResetLabel,
    zoomEditHint,
    onZoomChange,
    onZoomReset,
}) => {
  const [isHelpOpen, setIsHelpOpen] = React.useState(false);
  const [isContentFullscreen, setIsContentFullscreen] = React.useState(false);
  const [isMenuOpen, setIsMenuOpen] = React.useState(false);
  const [isZoomEditing, setIsZoomEditing] = React.useState(false);
  const [zoomDraft, setZoomDraft] = React.useState('100');
  const menuCloseTimer = React.useRef<number | null>(null);
  const menuRef = React.useRef<HTMLDivElement>(null);
  const contentFullscreenRef = React.useRef<HTMLDivElement>(null);
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
  const menuId = `window-menu-${id}`;

  React.useEffect(() => {
    const handleFullscreenChange = () => {
      const active = document.fullscreenElement === contentFullscreenRef.current;
      setIsContentFullscreen(active);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  React.useEffect(() => {
    if (!isMenuOpen) {
      return undefined;
    }
    const handlePointerDown = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
        setIsHelpOpen(false);
        setIsZoomEditing(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsMenuOpen(false);
        setIsHelpOpen(false);
        setIsZoomEditing(false);
      }
    };
    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isMenuOpen]);

  React.useEffect(() => () => {
    if (menuCloseTimer.current) {
      window.clearTimeout(menuCloseTimer.current);
    }
  }, []);

  React.useEffect(() => () => {
    if (menuCloseTimer.current) {
      window.clearTimeout(menuCloseTimer.current);
    }
  }, []);

  const fullscreenLabel = isContentFullscreen
    ? exitFullscreenLabel
    : enterFullscreenLabel;
  const maximizeButtonLabel = isMaximized ? restoreLabel : maximizeLabel;
  const zoomValue = zoomLevel ?? 1;
  const clampZoom = (value: number) => Math.min(5, Math.max(0.75, value));
  const requestContentFullscreen = async () => {
    const target = contentFullscreenRef.current;
    if (!target) return;
    try {
      await target.requestFullscreen();
    } catch {
      // ignore fullscreen errors
    }
  };
  const exitContentFullscreen = async () => {
    if (!document.fullscreenElement) return;
    try {
      await document.exitFullscreen();
    } catch {
      // ignore fullscreen errors
    }
  };

  React.useEffect(() => {
    if (!isZoomEditing) {
      setZoomDraft(`${Math.round(zoomValue * 100)}`);
    }
  }, [zoomValue, isZoomEditing]);

  return (
      <>
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
            className={`widget-header relative flex items-center justify-between h-10 bg-widget-header text-text-light font-bold px-3 absolute top-0 left-0 right-0 ${isContentFullscreen ? 'hidden' : ''}`}
            onContextMenu={onOpenContextMenu}
            onDoubleClick={(event) => {
              event.stopPropagation();
              onToggleMaximize();
            }}
          >
            {/* --- LÍNEA MODIFICADA: Se han añadido clases de flexbox para centrar --- */}
            <span className="widget-header-drag-handle flex-grow h-full cursor-move flex items-center gap-2">
              {headerIcon && <span className="widget-header-icon">{headerIcon}</span>}
              <span>{title}</span>
            </span>
            
            <div className="flex items-center gap-1">
              {(helpText || onZoomChange) && (
                <div
                  ref={menuRef}
                  id={menuId}
                  className="relative"
                  onMouseEnter={() => {
                    if (menuCloseTimer.current) {
                      window.clearTimeout(menuCloseTimer.current);
                      menuCloseTimer.current = null;
                    }
                    setIsMenuOpen(true);
                  }}
                  onMouseLeave={() => {
                    if (menuCloseTimer.current) {
                      window.clearTimeout(menuCloseTimer.current);
                    }
                    menuCloseTimer.current = window.setTimeout(() => {
                      setIsMenuOpen(false);
                      menuCloseTimer.current = null;
                    }, 250);
                  }}
                  onDoubleClick={(event) => event.stopPropagation()}
                >
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      setIsMenuOpen(true);
                    }}
                    className="hover:bg-black/20 rounded-full p-1"
                    title={windowMenuLabel}
                    aria-label={windowMenuLabel}
                    aria-expanded={isMenuOpen}
                  >
                    <MoreVertical size={18} />
                  </button>
                  {isMenuOpen && (
                    <div className="absolute right-0 top-10 z-30 w-64 rounded-md border border-gray-200 bg-white p-2 text-sm text-gray-800 shadow-lg">
                      {helpText && (
                        <button
                          type="button"
                          onClick={() => setIsHelpOpen((prev) => !prev)}
                          className="flex w-full items-center gap-2 rounded-md px-2 py-1 text-left hover:bg-gray-100"
                          title={helpLabel}
                          aria-label={helpLabel}
                        >
                          <CircleHelp size={16} />
                          <span>{helpLabel}</span>
                        </button>
                      )}
                      {helpText && isHelpOpen && (
                        <div className="mt-2 rounded-md bg-gray-100 px-2 py-2 text-xs text-gray-700">
                          {helpText}
                        </div>
                      )}
                      {onZoomChange && (
                        <div className={`mt-2 flex items-center gap-1 ${helpText ? 'pt-2 border-t border-gray-200' : ''}`}>
                          <button
                            type="button"
                            onClick={() => onZoomChange(clampZoom(zoomValue - 0.1))}
                            className="rounded-md px-2 py-1 text-gray-700 hover:bg-gray-100"
                            title={zoomOutLabel}
                            aria-label={zoomOutLabel}
                          >
                            <Minus size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={() => onZoomChange(clampZoom(zoomValue + 0.1))}
                            className="rounded-md px-2 py-1 text-gray-700 hover:bg-gray-100"
                            title={zoomInLabel}
                            aria-label={zoomInLabel}
                          >
                            <Plus size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              if (onZoomReset) {
                                onZoomReset();
                                return;
                              }
                              onZoomChange?.(clampZoom(1));
                            }}
                            className="rounded-md px-2 py-1 text-gray-700 hover:bg-gray-100"
                            title={zoomResetLabel}
                            aria-label={zoomResetLabel}
                          >
                            <RotateCcw size={14} />
                          </button>
                          {isZoomEditing ? (
                            <input
                              type="text"
                              value={zoomDraft}
                              onChange={(event) => setZoomDraft(event.target.value)}
                              onBlur={() => {
                                const value = Number.parseFloat(zoomDraft);
                                if (!Number.isNaN(value) && onZoomChange) {
                                  onZoomChange(clampZoom(value / 100));
                                }
                                setIsZoomEditing(false);
                              }}
                              onKeyDown={(event) => {
                                if (event.key === 'Enter') {
                                  const value = Number.parseFloat(zoomDraft);
                                  if (!Number.isNaN(value) && onZoomChange) {
                                    onZoomChange(clampZoom(value / 100));
                                  }
                                  setIsZoomEditing(false);
                                }
                                if (event.key === 'Escape') {
                                  setIsZoomEditing(false);
                                }
                              }}
                              className="w-16 rounded-md border border-gray-200 px-2 py-1 text-center text-xs"
                              title={zoomEditHint}
                              inputMode="numeric"
                            />
                          ) : (
                            <button
                              type="button"
                              onClick={(event) => event.stopPropagation()}
                              onDoubleClick={(event) => {
                                event.preventDefault();
                                event.stopPropagation();
                                setIsZoomEditing(true);
                              }}
                              className="rounded-md px-2 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-100"
                              title={zoomEditHint || zoomResetLabel}
                              aria-label={zoomResetLabel}
                              onMouseDown={(event) => event.stopPropagation()}
                              onClickCapture={(event) => event.stopPropagation()}
                            >
                              {Math.round(zoomValue * 100)}%
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
              {onTogglePin && (
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
              <button
                onClick={onToggleMinimize}
                onContextMenu={onOpenContextMenu}
                className="hover:bg-black/20 rounded-full p-1"
                title={minimizeLabel}
                aria-label={minimizeLabel}
              >
                <Minus size={18} />
              </button>
              <button
                onClick={isContentFullscreen ? exitContentFullscreen : requestContentFullscreen}
                onContextMenu={onOpenContextMenu}
                className="hover:bg-black/20 rounded-full p-1"
                title={fullscreenLabel}
                aria-label={fullscreenLabel}
              >
                <Expand size={18} />
              </button>
              <button
                onClick={onToggleMaximize}
                onContextMenu={onOpenContextMenu}
                className="hover:bg-black/20 rounded-full p-1"
                title={maximizeButtonLabel}
                aria-label={maximizeButtonLabel}
              >
                {isMaximized ? <Minimize size={18} /> : <Maximize size={18} />}
              </button>
              <button
                onClick={onClose}
                onContextMenu={onOpenContextMenu}
                className="hover:bg-black/20 rounded-full p-1"
                title={closeLabel}
                aria-label={closeLabel}
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {!isMinimized && (
            <div
              ref={contentFullscreenRef}
              className={`absolute left-0 right-0 min-h-0 overflow-auto ${isContentFullscreen ? 'top-0 bottom-0' : 'top-10 bottom-0'}`}
            >
              {isContentFullscreen && (
                <button
                  type="button"
                  onClick={exitContentFullscreen}
                  className="absolute right-3 top-3 z-10 rounded-full bg-black/70 p-2 text-white hover:bg-black/85"
                  title={exitFullscreenLabel}
                  aria-label={exitFullscreenLabel}
                >
                  <Minimize2 size={18} />
                </button>
              )}
              <div
                className="h-full w-full"
                style={{
                  transform: `scale(${zoomValue})`,
                  transformOrigin: 'top left',
                  width: `${100 / zoomValue}%`,
                  height: `${100 / zoomValue}%`,
                }}
              >
                {children}
              </div>
            </div>
          )}
        </Rnd>
      </>
    );
};
