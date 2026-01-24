// src/components/core/WidgetWindow.tsx

import React from 'react';
import { Rnd, type RndDragCallback, type RndResizeCallback } from 'react-rnd';
import { CircleHelp, X, Minus, Maximize, Minimize, Pin, PinOff, Expand, Minimize2, MoreVertical, Plus, RotateCcw, Eye, EyeOff, CheckCircle } from 'lucide-react';
import { WidgetToolbarProvider } from './WidgetToolbar';

interface WidgetWindowProps {
  id: string;
  title: string;
  icon?: React.ReactNode | string;
  children: React.ReactNode;
  position: { x: number; y: number };
  size: { width: number | string; height: number | string };
  zIndex: number;
  windowStyle?: 'default' | 'overlay';
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
  toolbarHideLabel?: string;
  toolbarPinLabel?: string;
  toolbarRevealHint?: string;
  toolbarPinned?: boolean;
  onToolbarPinnedChange?: (nextValue: boolean) => void;
  toolSettingsLabel?: string;
  toolSettingsDescription?: string;
  toolSettingsSaveLabel?: string;
  toolSettingsSavedLabel?: string;
  toolSettingsSavedZoom?: number;
  toolSettingsSavedToolbarPinned?: boolean;
  onSaveToolSettings?: (settings: { zoom: number; toolbarPinned: boolean }) => void;
}

export const WidgetWindow: React.FC<WidgetWindowProps> = ({
    id,
    title,
    icon,
    children,
    position,
    size,
    zIndex,
    windowStyle = 'default',
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
    toolbarHideLabel,
    toolbarPinLabel,
    toolbarRevealHint,
    toolbarPinned,
    onToolbarPinnedChange,
    toolSettingsLabel,
    toolSettingsDescription,
    toolSettingsSaveLabel,
    toolSettingsSavedLabel,
    toolSettingsSavedZoom,
    toolSettingsSavedToolbarPinned,
    onSaveToolSettings,
}) => {
  const isOverlay = windowStyle === 'overlay';
  const [isHelpOpen, setIsHelpOpen] = React.useState(false);
  const [isContentFullscreen, setIsContentFullscreen] = React.useState(false);
  const [isMenuOpen, setIsMenuOpen] = React.useState(false);
  const [isToolbarPinned, setIsToolbarPinned] = React.useState(toolbarPinned ?? true);
  const [isToolbarHovering, setIsToolbarHovering] = React.useState(false);
  const [isToolbarHintVisible, setIsToolbarHintVisible] = React.useState(false);
  const [isZoomEditing, setIsZoomEditing] = React.useState(false);
  const [zoomDraft, setZoomDraft] = React.useState('100');
  const [isSaveNoticeVisible, setIsSaveNoticeVisible] = React.useState(false);
  const [toolbarContent, setToolbarContent] = React.useState<React.ReactNode | null>(null);
  const [toolbarHeight, setToolbarHeight] = React.useState(36);
  const [fullscreenButtonPos, setFullscreenButtonPos] = React.useState({ x: 12, y: 12 });
  const menuCloseTimer = React.useRef<number | null>(null);
  const toolbarHideTimer = React.useRef<number | null>(null);
  const toolbarHintTimer = React.useRef<number | null>(null);
  const saveNoticeTimer = React.useRef<number | null>(null);
  const menuRef = React.useRef<HTMLDivElement>(null);
  const toolbarRef = React.useRef<HTMLDivElement>(null);
  const contentFullscreenRef = React.useRef<HTMLDivElement>(null);
  const fullscreenButtonRef = React.useRef<HTMLButtonElement>(null);
  const fullscreenDragRef = React.useRef<{ offsetX: number; offsetY: number } | null>(null);
  const fullscreenDragMovedRef = React.useRef(false);
  const fullscreenDragStartRef = React.useRef<{ x: number; y: number } | null>(null);
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
    if (toolbarHideTimer.current) {
      window.clearTimeout(toolbarHideTimer.current);
    }
  }, []);

  React.useEffect(() => () => {
    if (toolbarHintTimer.current) {
      window.clearTimeout(toolbarHintTimer.current);
    }
    if (saveNoticeTimer.current) {
      window.clearTimeout(saveNoticeTimer.current);
    }
  }, []);

  const fullscreenLabel = isContentFullscreen
    ? exitFullscreenLabel
    : enterFullscreenLabel;
  const maximizeButtonLabel = isMaximized ? restoreLabel : maximizeLabel;
  const zoomValue = zoomLevel ?? 1;
  const handleSaveToolSettings = React.useCallback(() => {
    if (!onSaveToolSettings) return;
    const payload = { zoom: zoomValue, toolbarPinned: isToolbarPinned };
    if (typeof queueMicrotask === 'function') {
      queueMicrotask(() => onSaveToolSettings(payload));
    } else {
      window.setTimeout(() => onSaveToolSettings(payload), 0);
    }
    setIsSaveNoticeVisible(true);
    if (saveNoticeTimer.current) {
      window.clearTimeout(saveNoticeTimer.current);
    }
    saveNoticeTimer.current = window.setTimeout(() => {
      setIsSaveNoticeVisible(false);
      saveNoticeTimer.current = null;
    }, 1800);
  }, [isToolbarPinned, onSaveToolSettings, zoomValue]);
  const clampZoom = (value: number) => Math.min(5, Math.max(0.75, value));
  const showHeader = !isOverlay && !isContentFullscreen;
  const toolbarEnabled = !isOverlay;
  const allowResize = !isOverlay;
  const toolbarVisible = isToolbarPinned || isToolbarHovering || isMenuOpen;
  const toolbarOffset = toolbarEnabled ? (toolbarVisible ? toolbarHeight : 0) : 0;
  const toolbarHideText = toolbarHideLabel ?? '';
  const toolbarPinText = toolbarPinLabel ?? '';
  const toolbarRevealHintText = toolbarRevealHint ?? '';
  const toolbarShortcutLabel = 'Ctrl+Shift+K';
  const zoomInShortcutLabel = 'Ctrl++';
  const zoomOutShortcutLabel = 'Ctrl+-';
  const zoomResetShortcutLabel = 'Ctrl+0';
  const savedZoom = toolSettingsSavedZoom ?? 1;
  const savedToolbarPinned = toolSettingsSavedToolbarPinned ?? true;
  const hasToolSettingsChanges = Math.abs(zoomValue - savedZoom) > 0.001 || isToolbarPinned !== savedToolbarPinned;
  const showToolSettingsSave = Boolean(
    onSaveToolSettings && toolSettingsLabel && toolSettingsSaveLabel && (hasToolSettingsChanges || isSaveNoticeVisible)
  );
  const clearToolbarHideTimer = () => {
    if (toolbarHideTimer.current) {
      window.clearTimeout(toolbarHideTimer.current);
      toolbarHideTimer.current = null;
    }
  };
  const showToolbarHint = () => {
    if (!toolbarRevealHintText) return;
    if (toolbarHintTimer.current) {
      window.clearTimeout(toolbarHintTimer.current);
    }
    setIsToolbarHintVisible(true);
    toolbarHintTimer.current = window.setTimeout(() => {
      setIsToolbarHintVisible(false);
      toolbarHintTimer.current = null;
    }, 3200);
  };
  const toggleToolbarPinned = (force?: boolean) => {
    setIsToolbarPinned((prev) => {
      const next = force ?? !prev;
      if (!next) {
        setIsToolbarHovering(false);
        showToolbarHint();
      } else {
        setIsToolbarHovering(true);
      }
      if (onToolbarPinnedChange) {
        if (typeof queueMicrotask === 'function') {
          queueMicrotask(() => onToolbarPinnedChange(next));
        } else {
          window.setTimeout(() => onToolbarPinnedChange(next), 0);
        }
      }
      return next;
    });
  };
  const scheduleToolbarHide = () => {
    if (isToolbarPinned) return;
    clearToolbarHideTimer();
    toolbarHideTimer.current = window.setTimeout(() => {
      setIsToolbarHovering(false);
      toolbarHideTimer.current = null;
    }, 250);
  };
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
    if (!isActive || isMinimized) return undefined;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey && event.shiftKey && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        clearToolbarHideTimer();
        setIsMenuOpen(false);
        setIsHelpOpen(false);
        setIsZoomEditing(false);
        toggleToolbarPinned();
      }
      if (!onZoomChange || !event.ctrlKey || event.altKey || event.metaKey) return;
      const key = event.key;
      if (key === '+' || key === '=') {
        event.preventDefault();
        onZoomChange(clampZoom(zoomValue + 0.1));
        return;
      }
      if (key === '-' || key === '_') {
        event.preventDefault();
        onZoomChange(clampZoom(zoomValue - 0.1));
      }
      if (key === '0') {
        event.preventDefault();
        if (onZoomReset) {
          onZoomReset();
        } else {
          onZoomChange(clampZoom(1));
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [clearToolbarHideTimer, isActive, isMinimized, onZoomChange, toggleToolbarPinned, zoomValue]);

  React.useEffect(() => {
    if (!isZoomEditing) {
      setZoomDraft(`${Math.round(zoomValue * 100)}`);
    }
  }, [zoomValue, isZoomEditing]);

  React.useEffect(() => {
    if (typeof toolbarPinned !== 'boolean') return;
    setIsToolbarPinned(toolbarPinned);
  }, [toolbarPinned]);

  React.useEffect(() => {
    const element = toolbarRef.current;
    if (!element) return undefined;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const nextHeight = Math.ceil(entry.contentRect.height);
        if (nextHeight > 0) {
          setToolbarHeight(nextHeight);
        }
      }
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  React.useEffect(() => {
    if (!isContentFullscreen) return undefined;
    const frame = window.requestAnimationFrame(() => {
      const container = contentFullscreenRef.current;
      const button = fullscreenButtonRef.current;
      if (!container || !button) return;
      const containerRect = container.getBoundingClientRect();
      const buttonRect = button.getBoundingClientRect();
      const padding = 12;
      const x = Math.max(padding, containerRect.width - buttonRect.width - padding);
      const y = Math.max(padding, toolbarHeight + 20);
      setFullscreenButtonPos({ x, y });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [isContentFullscreen, toolbarHeight]);

  const handleFullscreenButtonPointerDown = (event: React.PointerEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    const container = contentFullscreenRef.current;
    const button = fullscreenButtonRef.current;
    if (!container || !button) return;
    fullscreenDragMovedRef.current = false;
    fullscreenDragStartRef.current = { x: event.clientX, y: event.clientY };
    const buttonRect = button.getBoundingClientRect();
    fullscreenDragRef.current = {
      offsetX: event.clientX - buttonRect.left,
      offsetY: event.clientY - buttonRect.top,
    };

    const handlePointerMove = (moveEvent: PointerEvent) => {
      const drag = fullscreenDragRef.current;
      const containerRect = container.getBoundingClientRect();
      if (!drag) return;
      const start = fullscreenDragStartRef.current;
      if (start) {
        const dx = moveEvent.clientX - start.x;
        const dy = moveEvent.clientY - start.y;
        if (Math.hypot(dx, dy) > 3) {
          fullscreenDragMovedRef.current = true;
        }
      }
      const padding = 12;
      const minY = Math.max(padding, toolbarHeight + 20);
      const maxX = containerRect.width - buttonRect.width - padding;
      const maxY = containerRect.height - buttonRect.height - padding;
      const nextX = Math.min(Math.max(moveEvent.clientX - containerRect.left - drag.offsetX, padding), maxX);
      const nextY = Math.min(Math.max(moveEvent.clientY - containerRect.top - drag.offsetY, minY), maxY);
      setFullscreenButtonPos({ x: nextX, y: nextY });
    };

    const handlePointerUp = () => {
      fullscreenDragRef.current = null;
      fullscreenDragStartRef.current = null;
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
  };

  const handleFullscreenButtonClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    if (fullscreenDragMovedRef.current) {
      fullscreenDragMovedRef.current = false;
      event.preventDefault();
      event.stopPropagation();
      return;
    }
    exitContentFullscreen();
  };

  return (
      <>
        <Rnd
          size={finalSize}
          position={position}
          onDragStop={onDragStop}
          onResizeStop={onResizeStop}
          minWidth={isOverlay ? 0 : 200}
          minHeight={isOverlay ? 0 : (isMinimized ? 40 : 150)}
          disableDragging={isMaximized || isOverlay}
          enableResizing={!isMaximized && !isMinimized && allowResize}
          style={containerStyle}
          onMouseDown={onFocus}
          onMouseDownCapture={onFocus}
          onDragStart={() => onFocus()}
          className={`widget-window relative ${isOverlay ? 'bg-transparent border-transparent rounded-none shadow-none' : 'bg-widget-bg rounded-lg border-2 border-widget-header'} ${isOverlay ? '' : (isActive ? 'ring-2 ring-accent/70 shadow-2xl' : 'shadow-xl')}`}
          dragHandleClassName="widget-header-drag-handle"
          bounds="parent" 
        >
          {showHeader && (
            <div
              className="widget-header relative flex items-center justify-between h-10 bg-widget-header text-text-light font-bold px-3 absolute top-0 left-0 right-0"
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
          )}

          {!isMinimized && (
            <div
              ref={contentFullscreenRef}
              className={`absolute left-0 right-0 min-h-0 ${showHeader ? 'top-10 bottom-0' : 'top-0 bottom-0'}`}
            >
              {isContentFullscreen && (
                <button
                  type="button"
                  onClick={handleFullscreenButtonClick}
                  ref={fullscreenButtonRef}
                  className="absolute z-10 cursor-move rounded-full bg-black/70 p-2 text-white hover:bg-black/85"
                  title={exitFullscreenLabel}
                  aria-label={exitFullscreenLabel}
                  style={{ left: fullscreenButtonPos.x, top: fullscreenButtonPos.y }}
                  onPointerDown={handleFullscreenButtonPointerDown}
                >
                  <Minimize2 size={18} />
                </button>
              )}
              <div className="relative h-full w-full">
                {toolbarEnabled && toolbarRevealHintText && (
                  <div
                    className={`pointer-events-none absolute left-1/2 top-2 z-30 -translate-x-1/2 rounded-2xl bg-black/80 px-4 py-2 text-base text-white shadow-lg transition-all duration-300 ease-out ${
                      isToolbarHintVisible ? 'translate-y-0 opacity-100' : '-translate-y-1 opacity-0'
                    }`}
                    aria-hidden={!isToolbarHintVisible}
                  >
                    {toolbarRevealHintText}
                  </div>
                )}
                {toolbarEnabled && (
                  <>
                    <div
                      className="absolute left-0 right-0 top-0 z-20 h-2"
                      onMouseEnter={() => {
                        clearToolbarHideTimer();
                        setIsToolbarHovering(true);
                      }}
                      onMouseLeave={scheduleToolbarHide}
                    />
                    <div
                      ref={toolbarRef}
                      className={`absolute left-0 right-0 top-0 z-20 flex flex-wrap items-center justify-between gap-2 border-b border-gray-200 bg-white/95 px-2 py-1 text-sm text-gray-700 shadow-sm backdrop-blur transition-all duration-250 ease-in-out ${toolbarVisible ? 'opacity-100 translate-y-0' : 'pointer-events-none -translate-y-3 opacity-0'}`}
                      onMouseEnter={() => {
                        clearToolbarHideTimer();
                        setIsToolbarHovering(true);
                      }}
                      onMouseLeave={scheduleToolbarHide}
                    >
                      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
                        {toolbarContent}
                      </div>
                      <div
                        ref={menuRef}
                        id={menuId}
                        className="relative flex-shrink-0"
                        onMouseEnter={() => {
                          clearToolbarHideTimer();
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
                          scheduleToolbarHide();
                        }}
                        onDoubleClick={(event) => event.stopPropagation()}
                      >
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            setIsMenuOpen(true);
                          }}
                          className="rounded-full p-1 hover:bg-gray-200"
                          title={windowMenuLabel}
                          aria-label={windowMenuLabel}
                          aria-expanded={isMenuOpen}
                        >
                          <MoreVertical size={18} />
                        </button>
                        {isMenuOpen && (
                          <div className="absolute right-0 top-9 z-30 w-64 rounded-md border border-gray-200 bg-white p-2 text-sm text-gray-800 shadow-lg">
                            {helpText && (
                              <button
                                type="button"
                                onClick={() => setIsHelpOpen((prev) => !prev)}
                                className="flex w-full items-center gap-2 rounded-md px-2 py-1 text-left hover:bg-gray-100"
                                title={helpLabel}
                                aria-label={helpLabel}
                              >
                                <CircleHelp size={16} />
                                <span>{title}</span>
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
                                  title={`${zoomOutLabel} (${zoomOutShortcutLabel})`}
                                  aria-label={`${zoomOutLabel} (${zoomOutShortcutLabel})`}
                                >
                                  <Minus size={14} />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => onZoomChange(clampZoom(zoomValue + 0.1))}
                                  className="rounded-md px-2 py-1 text-gray-700 hover:bg-gray-100"
                                  title={`${zoomInLabel} (${zoomInShortcutLabel})`}
                                  aria-label={`${zoomInLabel} (${zoomInShortcutLabel})`}
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
                                  title={`${zoomResetLabel} (${zoomResetShortcutLabel})`}
                                  aria-label={`${zoomResetLabel} (${zoomResetShortcutLabel})`}
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
                            <button
                              type="button"
                              onClick={() => {
                                clearToolbarHideTimer();
                                setIsMenuOpen(false);
                                setIsHelpOpen(false);
                                setIsZoomEditing(false);
                                toggleToolbarPinned();
                              }}
                              className={`flex w-full items-center gap-2 rounded-md px-2 py-1 text-left hover:bg-gray-100 ${
                                helpText || onZoomChange || onSaveToolSettings ? 'mt-2 border-t border-gray-200 pt-2' : ''
                              }`}
                              title={isToolbarPinned ? toolbarHideText : toolbarPinText}
                              aria-label={isToolbarPinned ? toolbarHideText : toolbarPinText}
                            >
                              {isToolbarPinned ? <EyeOff size={16} /> : <Eye size={16} />}
                              <span>{isToolbarPinned ? toolbarHideText : toolbarPinText}</span>
                              <span className="ml-auto text-xs text-gray-400">{toolbarShortcutLabel}</span>
                            </button>
                            {showToolSettingsSave && (
                              <div className="mt-2">
                                <button
                                  type="button"
                                  onClick={handleSaveToolSettings}
                                  className="flex w-full items-center gap-2 rounded-md px-2 py-1 text-left hover:bg-gray-100"
                                  title={toolSettingsDescription || toolSettingsLabel}
                                  aria-label={toolSettingsDescription || toolSettingsLabel}
                                >
                                  <CheckCircle size={16} className={isSaveNoticeVisible ? 'text-green-700' : undefined} />
                                  <span className={isSaveNoticeVisible ? 'text-green-700' : undefined}>
                                    {isSaveNoticeVisible ? (toolSettingsSavedLabel || toolSettingsSaveLabel) : toolSettingsSaveLabel}
                                  </span>
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </>
                )}
                <div
                  className="absolute inset-0 overflow-y-auto overflow-x-hidden box-border transition-all duration-150"
                  style={{ paddingTop: toolbarOffset }}
                >
                  <WidgetToolbarProvider onChange={setToolbarContent}>
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
                  </WidgetToolbarProvider>
                </div>
              </div>
            </div>
          )}
        </Rnd>
      </>
    );
};
