import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { FC, PointerEvent as ReactPointerEvent, ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowRight, Circle, CircleHelp, Eraser, GripVertical, Highlighter, Minus, Pencil, RotateCcw, RotateCw, Square, Trash2, X } from 'lucide-react';
import './ScreenAnnotatorWidget.css';

type Tool = 'pen' | 'highlighter' | 'eraser' | 'line' | 'rectangle' | 'ellipse' | 'arrow';

type ToolSettings = Record<Tool, { color: string; size: number; opacity: number }>;

type DraftState = {
    imageDataUrl: string | null;
    tool: Tool;
    toolSettings: ToolSettings;
    fillShapes: boolean;
    toolbarPos: { x: number; y: number };
};

const DEFAULT_COLOR = '#ff2d2d';
const DEFAULT_SIZE = 6;
const buildDefaultToolSettings = (): ToolSettings => ({
    pen: { color: DEFAULT_COLOR, size: DEFAULT_SIZE, opacity: 1 },
    highlighter: { color: '#facc15', size: 14, opacity: 0.2 },
    eraser: { color: DEFAULT_COLOR, size: 18, opacity: 1 },
    line: { color: DEFAULT_COLOR, size: DEFAULT_SIZE, opacity: 1 },
    rectangle: { color: DEFAULT_COLOR, size: DEFAULT_SIZE, opacity: 1 },
    ellipse: { color: DEFAULT_COLOR, size: DEFAULT_SIZE, opacity: 1 },
    arrow: { color: DEFAULT_COLOR, size: DEFAULT_SIZE, opacity: 1 },
});
const DEFAULT_TOOL: Tool = 'pen';
const MAX_HISTORY = 12;

export const ScreenAnnotatorWidget: FC<{ instanceId?: string }> = ({ instanceId }) => {
    const { t } = useTranslation();
    const instanceIdRef = useRef(instanceId ?? `screen-annotator-${Date.now()}-${Math.random().toString(16).slice(2)}`);
    const resolvedInstanceId = instanceId ?? instanceIdRef.current;
    const storageKey = useMemo(() => `screen-annotator-draft:${resolvedInstanceId}`, [resolvedInstanceId]);

    const containerRef = useRef<HTMLDivElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const contextRef = useRef<CanvasRenderingContext2D | null>(null);
    const snapshotRef = useRef<ImageData | null>(null);
    const highlighterSnapshotRef = useRef<ImageData | null>(null);
    const highlighterPointsRef = useRef<{ x: number; y: number }[]>([]);
    const startPointRef = useRef<{ x: number; y: number } | null>(null);
    const undoStackRef = useRef<ImageData[]>([]);
    const redoStackRef = useRef<ImageData[]>([]);
    const isDrawingRef = useRef(false);
    const dprRef = useRef(1);

    const initialDraftRef = useRef<DraftState | null>(null);
    if (!initialDraftRef.current) {
        try {
            const raw = window.localStorage.getItem(storageKey);
            if (raw) {
                const parsed = JSON.parse(raw) as Partial<DraftState> | null;
                if (parsed && typeof parsed === 'object') {
                    initialDraftRef.current = {
                        imageDataUrl: typeof parsed.imageDataUrl === 'string' ? parsed.imageDataUrl : null,
                        tool: (parsed.tool as Tool) || DEFAULT_TOOL,
                        toolSettings: parsed.toolSettings && typeof parsed.toolSettings === 'object'
                            ? { ...buildDefaultToolSettings(), ...(parsed.toolSettings as ToolSettings) }
                            : buildDefaultToolSettings(),
                        fillShapes: Boolean(parsed.fillShapes),
                        toolbarPos: parsed.toolbarPos && typeof parsed.toolbarPos.x === 'number' && typeof parsed.toolbarPos.y === 'number'
                            ? parsed.toolbarPos
                            : { x: 24, y: 24 },
                    };
                }
            }
        } catch {
            initialDraftRef.current = null;
        }
    }

    const [tool, setTool] = useState<Tool>(initialDraftRef.current?.tool ?? DEFAULT_TOOL);
    const [toolSettings, setToolSettings] = useState<ToolSettings>(
        initialDraftRef.current?.toolSettings ?? buildDefaultToolSettings()
    );
    const [fillShapes, setFillShapes] = useState(initialDraftRef.current?.fillShapes ?? false);
    const [toolbarPos, setToolbarPos] = useState(initialDraftRef.current?.toolbarPos ?? { x: 24, y: 24 });
    const [isHelpOpen, setIsHelpOpen] = useState(false);
    const activeSettings = toolSettings[tool] ?? { color: DEFAULT_COLOR, size: DEFAULT_SIZE, opacity: 1 };

    const toolButtons: { id: Tool; icon: ReactNode; label: string }[] = useMemo(() => [
        { id: 'pen', icon: <Pencil size={16} />, label: t('widgets.screen_annotator.tool_pen') },
        { id: 'highlighter', icon: <Highlighter size={16} />, label: t('widgets.screen_annotator.tool_highlighter') },
        { id: 'eraser', icon: <Eraser size={16} />, label: t('widgets.screen_annotator.tool_eraser') },
        { id: 'line', icon: <Minus size={16} />, label: t('widgets.screen_annotator.tool_line') },
        { id: 'rectangle', icon: <Square size={16} />, label: t('widgets.screen_annotator.tool_rectangle') },
        { id: 'ellipse', icon: <Circle size={16} />, label: t('widgets.screen_annotator.tool_ellipse') },
        { id: 'arrow', icon: <ArrowRight size={16} />, label: t('widgets.screen_annotator.tool_arrow') },
    ], [t]);

    const applyToolStyles = useCallback((ctx: CanvasRenderingContext2D, activeTool: Tool) => {
        const settings = toolSettings[activeTool] ?? { color: DEFAULT_COLOR, size: DEFAULT_SIZE, opacity: 1 };
        ctx.lineWidth = settings.size;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.strokeStyle = settings.color;
        ctx.fillStyle = settings.color;
        ctx.globalAlpha = Math.min(1, Math.max(0.05, settings.opacity));
        if (activeTool === 'eraser') {
            ctx.globalCompositeOperation = 'destination-out';
        } else {
            ctx.globalCompositeOperation = 'source-over';
        }
    }, [toolSettings]);

    const resizeCanvas = useCallback(() => {
        const container = containerRef.current;
        const canvas = canvasRef.current;
        if (!container || !canvas) return;
        const rect = container.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;
        dprRef.current = dpr;

        const prevData = canvas.width > 0 && canvas.height > 0 ? canvas.toDataURL('image/png') : null;
        canvas.width = Math.max(1, Math.floor(rect.width * dpr));
        canvas.height = Math.max(1, Math.floor(rect.height * dpr));
        canvas.style.width = `${rect.width}px`;
        canvas.style.height = `${rect.height}px`;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        contextRef.current = ctx;

        if (prevData) {
            const img = new Image();
            img.onload = () => {
                ctx.clearRect(0, 0, rect.width, rect.height);
                ctx.drawImage(img, 0, 0, rect.width, rect.height);
            };
            img.src = prevData;
        }
    }, []);

    const pushHistory = useCallback(() => {
        const canvas = canvasRef.current;
        const ctx = contextRef.current;
        if (!canvas || !ctx) return;
        const snapshot = ctx.getImageData(0, 0, canvas.width, canvas.height);
        undoStackRef.current.push(snapshot);
        if (undoStackRef.current.length > MAX_HISTORY) {
            undoStackRef.current.shift();
        }
        redoStackRef.current = [];
    }, []);

    const persistDraft = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        try {
            const imageDataUrl = canvas.toDataURL('image/png');
            const draft: DraftState = {
                imageDataUrl,
                tool,
                toolSettings,
                fillShapes,
                toolbarPos,
            };
            window.localStorage.setItem(storageKey, JSON.stringify(draft));
        } catch {
            // ignore storage errors
        }
    }, [fillShapes, storageKey, toolbarPos, tool, toolSettings]);

    const clearCanvas = useCallback(() => {
        const canvas = canvasRef.current;
        const ctx = contextRef.current;
        if (!canvas || !ctx) return;
        const width = canvas.width / dprRef.current;
        const height = canvas.height / dprRef.current;
        ctx.clearRect(0, 0, width, height);
        pushHistory();
        persistDraft();
    }, [persistDraft, pushHistory]);

    const handleUndo = useCallback(() => {
        const canvas = canvasRef.current;
        const ctx = contextRef.current;
        if (!canvas || !ctx) return;
        if (undoStackRef.current.length <= 1) return;
        const current = undoStackRef.current.pop();
        if (current) {
            redoStackRef.current.push(current);
        }
        const previous = undoStackRef.current[undoStackRef.current.length - 1];
        if (previous) {
            ctx.putImageData(previous, 0, 0);
            persistDraft();
        }
    }, [persistDraft]);

    const handleRedo = useCallback(() => {
        const canvas = canvasRef.current;
        const ctx = contextRef.current;
        if (!canvas || !ctx) return;
        const next = redoStackRef.current.pop();
        if (!next) return;
        undoStackRef.current.push(next);
        ctx.putImageData(next, 0, 0);
        persistDraft();
    }, [persistDraft]);

    const drawArrow = useCallback((ctx: CanvasRenderingContext2D, start: { x: number; y: number }, end: { x: number; y: number }) => {
        const angle = Math.atan2(end.y - start.y, end.x - start.x);
        const settings = toolSettings.arrow ?? { color: DEFAULT_COLOR, size: DEFAULT_SIZE, opacity: 1 };
        const headLength = Math.max(10, settings.size * 2.5);
        ctx.beginPath();
        ctx.moveTo(start.x, start.y);
        ctx.lineTo(end.x, end.y);
        ctx.moveTo(end.x, end.y);
        ctx.lineTo(end.x - headLength * Math.cos(angle - Math.PI / 6), end.y - headLength * Math.sin(angle - Math.PI / 6));
        ctx.moveTo(end.x, end.y);
        ctx.lineTo(end.x - headLength * Math.cos(angle + Math.PI / 6), end.y - headLength * Math.sin(angle + Math.PI / 6));
        ctx.stroke();
    }, [toolSettings]);

    const drawShapePreview = useCallback((current: { x: number; y: number }) => {
        const ctx = contextRef.current;
        const start = startPointRef.current;
        const snapshot = snapshotRef.current;
        if (!ctx || !start || !snapshot) return;
        ctx.putImageData(snapshot, 0, 0);
        ctx.save();
        applyToolStyles(ctx, tool);

        const width = current.x - start.x;
        const height = current.y - start.y;

        if (tool === 'line') {
            ctx.beginPath();
            ctx.moveTo(start.x, start.y);
            ctx.lineTo(current.x, current.y);
            ctx.stroke();
        } else if (tool === 'rectangle') {
            ctx.beginPath();
            ctx.rect(start.x, start.y, width, height);
            if (fillShapes) ctx.fill();
            ctx.stroke();
        } else if (tool === 'ellipse') {
            ctx.beginPath();
            ctx.ellipse(start.x + width / 2, start.y + height / 2, Math.abs(width / 2), Math.abs(height / 2), 0, 0, Math.PI * 2);
            if (fillShapes) ctx.fill();
            ctx.stroke();
        } else if (tool === 'arrow') {
            drawArrow(ctx, start, current);
        }

        ctx.restore();
    }, [applyToolStyles, drawArrow, fillShapes, tool]);

    const drawHighlighterStroke = useCallback(() => {
        const ctx = contextRef.current;
        const snapshot = highlighterSnapshotRef.current;
        const points = highlighterPointsRef.current;
        if (!ctx || !snapshot || points.length === 0) return;
        ctx.putImageData(snapshot, 0, 0);
        ctx.save();
        applyToolStyles(ctx, 'highlighter');
        ctx.beginPath();
        ctx.moveTo(points[0].x, points[0].y);
        for (let i = 1; i < points.length; i += 1) {
            ctx.lineTo(points[i].x, points[i].y);
        }
        ctx.stroke();
        ctx.restore();
    }, [applyToolStyles]);

    const getPoint = useCallback((event: PointerEvent | ReactPointerEvent<HTMLCanvasElement>) => {
        const canvas = canvasRef.current;
        if (!canvas) return { x: 0, y: 0 };
        const rect = canvas.getBoundingClientRect();
        return {
            x: event.clientX - rect.left,
            y: event.clientY - rect.top,
        };
    }, []);

    const handlePointerDown = useCallback((event: ReactPointerEvent<HTMLCanvasElement>) => {
        if (event.button !== 0) return;
        const canvas = canvasRef.current;
        const ctx = contextRef.current;
        if (!canvas || !ctx) return;
        event.currentTarget.setPointerCapture(event.pointerId);
        const point = getPoint(event);
        isDrawingRef.current = true;
        startPointRef.current = point;

        if (tool === 'pen' || tool === 'eraser') {
            ctx.save();
            applyToolStyles(ctx, tool);
            ctx.beginPath();
            ctx.moveTo(point.x, point.y);
        } else if (tool === 'highlighter') {
            highlighterSnapshotRef.current = ctx.getImageData(0, 0, canvas.width, canvas.height);
            highlighterPointsRef.current = [point];
            drawHighlighterStroke();
        } else {
            snapshotRef.current = ctx.getImageData(0, 0, canvas.width, canvas.height);
        }
    }, [applyToolStyles, drawHighlighterStroke, getPoint, tool]);

    const handlePointerMove = useCallback((event: ReactPointerEvent<HTMLCanvasElement>) => {
        if (!isDrawingRef.current) return;
        const ctx = contextRef.current;
        if (!ctx) return;
        const point = getPoint(event);

        if (tool === 'pen' || tool === 'eraser') {
            ctx.lineTo(point.x, point.y);
            ctx.stroke();
        } else if (tool === 'highlighter') {
            highlighterPointsRef.current.push(point);
            drawHighlighterStroke();
        } else {
            drawShapePreview(point);
        }
    }, [drawHighlighterStroke, drawShapePreview, getPoint, tool]);

    const finishDrawing = useCallback(() => {
        if (!isDrawingRef.current) return;
        const ctx = contextRef.current;
        if (!ctx) return;
        if (tool === 'pen' || tool === 'eraser') {
            ctx.closePath();
            ctx.restore();
        }
        if (tool === 'highlighter') {
            drawHighlighterStroke();
            highlighterSnapshotRef.current = null;
            highlighterPointsRef.current = [];
        }
        snapshotRef.current = null;
        isDrawingRef.current = false;
        pushHistory();
        persistDraft();
    }, [drawHighlighterStroke, persistDraft, pushHistory, tool]);

    const handlePointerUp = useCallback((event: ReactPointerEvent<HTMLCanvasElement>) => {
        if (event.pointerId && event.currentTarget.hasPointerCapture(event.pointerId)) {
            event.currentTarget.releasePointerCapture(event.pointerId);
        }
        finishDrawing();
    }, [finishDrawing]);

    const handlePointerLeave = useCallback(() => {
        finishDrawing();
    }, [finishDrawing]);

    useEffect(() => {
        resizeCanvas();
        if (undoStackRef.current.length === 0) {
            pushHistory();
        }
        const observer = new ResizeObserver(() => resizeCanvas());
        if (containerRef.current) {
            observer.observe(containerRef.current);
        }
        return () => observer.disconnect();
    }, [pushHistory, resizeCanvas]);

    useEffect(() => {
        const draft = initialDraftRef.current;
        const canvas = canvasRef.current;
        const ctx = contextRef.current;
        if (!draft || !draft.imageDataUrl || !canvas || !ctx) return;
        const img = new Image();
        img.onload = () => {
            const width = canvas.width / dprRef.current;
            const height = canvas.height / dprRef.current;
            ctx.clearRect(0, 0, width, height);
            ctx.drawImage(img, 0, 0, width, height);
            pushHistory();
        };
        img.src = draft.imageDataUrl;
    }, [pushHistory]);

    useEffect(() => {
        const handleClose = (event: Event) => {
            const custom = event as CustomEvent<{ instanceId?: string; widgetId?: string }>;
            if (custom.detail?.instanceId !== resolvedInstanceId) return;
            if (custom.detail?.widgetId && custom.detail.widgetId !== 'screen-annotator') return;
            window.localStorage.removeItem(storageKey);
        };
        window.addEventListener('widget-close', handleClose as EventListener);
        return () => window.removeEventListener('widget-close', handleClose as EventListener);
    }, [resolvedInstanceId, storageKey]);

    const toolbarDragRef = useRef<{ offsetX: number; offsetY: number } | null>(null);
    const toolbarPointerIdRef = useRef<number | null>(null);

    const handleToolbarPointerDown = (event: ReactPointerEvent<HTMLButtonElement>) => {
        event.preventDefault();
        toolbarPointerIdRef.current = event.pointerId;
        toolbarDragRef.current = {
            offsetX: event.clientX - toolbarPos.x,
            offsetY: event.clientY - toolbarPos.y,
        };
        event.currentTarget.setPointerCapture(event.pointerId);
    };

    useEffect(() => {
        const handlePointerMove = (event: PointerEvent) => {
            if (!toolbarDragRef.current) return;
            setToolbarPos({
                x: Math.max(12, event.clientX - toolbarDragRef.current.offsetX),
                y: Math.max(12, event.clientY - toolbarDragRef.current.offsetY),
            });
        };

        const handlePointerUp = (event: PointerEvent) => {
            if (toolbarPointerIdRef.current !== event.pointerId) return;
            toolbarPointerIdRef.current = null;
            toolbarDragRef.current = null;
            persistDraft();
        };

        window.addEventListener('pointermove', handlePointerMove);
        window.addEventListener('pointerup', handlePointerUp);
        window.addEventListener('pointercancel', handlePointerUp);
        return () => {
            window.removeEventListener('pointermove', handlePointerMove);
            window.removeEventListener('pointerup', handlePointerUp);
            window.removeEventListener('pointercancel', handlePointerUp);
        };
    }, [persistDraft]);

    const handleClose = () => {
        window.dispatchEvent(new CustomEvent('widget-close-request', { detail: { instanceId: resolvedInstanceId } }));
    };

    const handleClear = () => {
        if (!window.confirm(t('widgets.screen_annotator.clear_confirm'))) return;
        clearCanvas();
    };

    const cursorStyle = tool === 'eraser' ? 'cell' : 'crosshair';
    const isShapeTool = tool === 'line' || tool === 'rectangle' || tool === 'ellipse' || tool === 'arrow';

    return (
        <div ref={containerRef} className="screen-annotator-root">
            <canvas
                ref={canvasRef}
                className="screen-annotator-canvas"
                style={{ cursor: cursorStyle }}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerCancel={handlePointerUp}
                onPointerLeave={handlePointerLeave}
            />
            <div
                className="screen-annotator-toolbar"
                style={{ left: toolbarPos.x, top: toolbarPos.y }}
            >
                <div className="screen-annotator-toolbar-section">
                    <div className="screen-annotator-toolbar-header">
                        <div className="screen-annotator-toolbar-title">
                            <button
                                type="button"
                                className="screen-annotator-handle"
                                title={t('widgets.screen_annotator.toolbar_drag')}
                                aria-label={t('widgets.screen_annotator.toolbar_drag')}
                                onPointerDown={handleToolbarPointerDown}
                            >
                                <GripVertical size={16} />
                            </button>
                            <span>{t('widgets.screen_annotator.title')}</span>
                        </div>
                        <button
                            type="button"
                            className={`screen-annotator-help${isHelpOpen ? ' is-active' : ''}`}
                            onClick={() => setIsHelpOpen((prev) => !prev)}
                            title={t('desktop.window_help')}
                            aria-label={t('desktop.window_help')}
                        >
                            <CircleHelp size={14} />
                        </button>
                    </div>
                    {isHelpOpen && (
                        <div className="screen-annotator-help-text">
                            {t('widgets_help.screen-annotator')}
                        </div>
                    )}
                    <div className="screen-annotator-toolbar-row tools">
                        {toolButtons.map((button) => (
                            <button
                                key={button.id}
                                type="button"
                                className={`screen-annotator-tool ${tool === button.id ? 'is-active' : ''}`}
                                title={button.label}
                                aria-label={button.label}
                                onClick={() => setTool(button.id)}
                            >
                                {button.icon}
                            </button>
                        ))}
                    </div>
                </div>
                <div className="screen-annotator-divider" />
                <div className="screen-annotator-toolbar-section">
                    <div className="screen-annotator-toolbar-row settings">
                        <label className="screen-annotator-field">
                            <span>{t('widgets.screen_annotator.color_label')}</span>
                            <input
                                type="color"
                                value={activeSettings.color}
                                onChange={(event) => {
                                    const nextColor = event.target.value;
                                    setToolSettings((prev) => ({
                                        ...prev,
                                        [tool]: { ...prev[tool], color: nextColor },
                                    }));
                                }}
                                aria-label={t('widgets.screen_annotator.color_label')}
                            />
                        </label>
                        <label className="screen-annotator-field">
                            <span>{t('widgets.screen_annotator.size_label')}</span>
                            <input
                                type="range"
                                min={2}
                                max={36}
                                value={activeSettings.size}
                                onChange={(event) => {
                                    const nextSize = Number(event.target.value);
                                    setToolSettings((prev) => ({
                                        ...prev,
                                        [tool]: { ...prev[tool], size: nextSize },
                                    }));
                                }}
                                aria-label={t('widgets.screen_annotator.size_label')}
                            />
                        </label>
                        <label className="screen-annotator-field">
                            <span>{t('widgets.screen_annotator.opacity_label')}</span>
                            <input
                                type="range"
                                min={5}
                                max={100}
                                step={5}
                                value={Math.round(activeSettings.opacity * 100)}
                                onChange={(event) => {
                                    const nextOpacity = Number(event.target.value) / 100;
                                    setToolSettings((prev) => ({
                                        ...prev,
                                        [tool]: { ...prev[tool], opacity: nextOpacity },
                                    }));
                                }}
                                aria-label={t('widgets.screen_annotator.opacity_label')}
                            />
                        </label>
                        <button
                            type="button"
                            className={`screen-annotator-toggle ${fillShapes ? 'is-active' : ''}`}
                            onClick={() => setFillShapes((prev) => !prev)}
                            disabled={!isShapeTool}
                            title={fillShapes ? t('widgets.screen_annotator.fill_on') : t('widgets.screen_annotator.fill_off')}
                            aria-label={fillShapes ? t('widgets.screen_annotator.fill_on') : t('widgets.screen_annotator.fill_off')}
                        >
                            {fillShapes ? t('widgets.screen_annotator.fill_on') : t('widgets.screen_annotator.fill_off')}
                        </button>
                    </div>
                </div>
                <div className="screen-annotator-divider" />
                <div className="screen-annotator-toolbar-section">
                    <div className="screen-annotator-toolbar-row actions">
                        <button
                            type="button"
                            className="screen-annotator-action"
                            onClick={handleUndo}
                            title={t('widgets.screen_annotator.undo')}
                            aria-label={t('widgets.screen_annotator.undo')}
                        >
                            <RotateCcw size={16} />
                        </button>
                        <button
                            type="button"
                            className="screen-annotator-action"
                            onClick={handleRedo}
                            title={t('widgets.screen_annotator.redo')}
                            aria-label={t('widgets.screen_annotator.redo')}
                        >
                            <RotateCw size={16} />
                        </button>
                        <button
                            type="button"
                            className="screen-annotator-action"
                            onClick={handleClear}
                            title={t('widgets.screen_annotator.clear')}
                            aria-label={t('widgets.screen_annotator.clear')}
                        >
                            <Trash2 size={16} />
                        </button>
                        <button
                            type="button"
                            className="screen-annotator-action screen-annotator-close"
                            onClick={handleClose}
                            title={t('widgets.screen_annotator.close')}
                            aria-label={t('widgets.screen_annotator.close')}
                        >
                            <X size={16} />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
