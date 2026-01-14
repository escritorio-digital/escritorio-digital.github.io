import React, { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { LayoutGrid } from 'lucide-react';
import { DndContext, PointerSensor, KeyboardSensor, useSensor, useSensors, closestCenter, type DragEndEvent } from '@dnd-kit/core';
import { SortableContext, arrayMove, horizontalListSortingStrategy, useSortable, sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { WIDGET_REGISTRY } from '../widgets';
import type { ActiveWidget } from '../../types';

interface ToolbarProps {
  pinnedWidgets: string[];
  onWidgetClick: (widgetId: string) => void;
  onWidgetsClick: () => void;
  onOpenContextMenu: (event: React.MouseEvent, widgetId?: string, force?: boolean) => void;
  onReorderPinned: (orderedIds: string[]) => void;
  openWidgets: ActiveWidget[];
  onTaskClick: (instanceId: string) => void;
  onTaskContextMenu: (event: React.MouseEvent, instanceId: string) => void;
  isHidden?: boolean;
  isPeeking?: boolean;
  onMouseLeave?: () => void;
  startButtonRef?: React.RefObject<HTMLButtonElement | null>;
}

export const Toolbar: React.FC<ToolbarProps> = ({
  pinnedWidgets,
  onWidgetClick,
  onWidgetsClick,
  onOpenContextMenu,
  onReorderPinned,
  openWidgets,
  onTaskClick,
  onTaskContextMenu,
  isHidden = false,
  isPeeking = false,
  onMouseLeave,
  startButtonRef: _startButtonRef,
}) => {
  const { t } = useTranslation();
  const toolbarRef = useRef<HTMLDivElement>(null);
  const [anchorLeft, setAnchorLeft] = useState<number | null>(null);
  const [anchorMaxWidth, setAnchorMaxWidth] = useState<number | null>(null);
  const highestZ = openWidgets.reduce((acc, widget) => Math.max(acc, widget.zIndex), 0);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );
  const draggableIds = pinnedWidgets.filter((id) => WIDGET_REGISTRY[id]);
  const visibleTasks = openWidgets
    .map((widget) => {
      const config = WIDGET_REGISTRY[widget.widgetId];
      return config ? { ...widget, title: t(config.title), icon: config.icon } : null;
    })
    .filter((widget): widget is ActiveWidget & { title: string; icon: React.ReactNode } => Boolean(widget))
    .sort((a, b) => a.title.localeCompare(b.title));

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const activeIndex = draggableIds.indexOf(String(active.id));
    const overIndex = draggableIds.indexOf(String(over.id));
    if (activeIndex === -1 || overIndex === -1) return;
    const reorderedVisible = arrayMove(draggableIds, activeIndex, overIndex);
    const hiddenIds = pinnedWidgets.filter((id) => !WIDGET_REGISTRY[id]);
    onReorderPinned([...reorderedVisible, ...hiddenIds]);
  };

  const SortablePinnedButton: React.FC<{ widgetId: string }> = ({ widgetId }) => {
    const widget = WIDGET_REGISTRY[widgetId];
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: widgetId });
    if (!widget) return null;
    const style = {
      transform: isDragging ? CSS.Transform.toString(transform) : undefined,
      transition: isDragging ? transition : undefined,
    };
    return (
      <div ref={setNodeRef} style={style} className="flex-shrink-0">
        <button
          onClick={() => onWidgetClick(widgetId)}
          onContextMenu={(event) => {
            event.stopPropagation();
            onOpenContextMenu(event, widgetId);
          }}
          data-widget-button="true"
          className="group w-14 h-14 bg-accent text-2xl rounded-lg flex items-center justify-center hover:brightness-110 hover:scale-105"
          title={t(widget.title)}
          {...attributes}
          {...listeners}
        >
          <span className="transform-gpu group-hover:scale-110">
            {widget.icon}
          </span>
        </button>
      </div>
    );
  };
  const handleBarContextMenu = (event: React.MouseEvent) => {
    const target = event.target as HTMLElement | null;
    if (target?.closest('[data-widget-button="true"]')) return;
    if (target?.closest('[data-task-button="true"]')) return;
    onOpenContextMenu(event, undefined, true);
  };

  useLayoutEffect(() => {
    // Disable dynamic shifting to avoid layout oscillations causing render loops.
    setAnchorLeft(null);
    setAnchorMaxWidth(null);
  }, []);

  const translateY = isHidden && !isPeeking ? '0.75rem' : '0rem';

  return (
    <div
      ref={toolbarRef}
      className={`fixed bottom-5 left-1/2 bg-widget-bg p-2 rounded-2xl flex items-center gap-3 shadow-lg z-[10000] border border-custom-border max-w-[calc(100vw-1rem)] transition-all duration-200 ${
        isHidden && !isPeeking
          ? 'opacity-0 pointer-events-none'
          : 'opacity-100'
      }`}
      style={{
        transform: `${anchorLeft === null ? 'translate(-50%, ' : 'translate(0, '}${translateY})`,
        left: anchorLeft === null ? undefined : `${anchorLeft}px`,
        maxWidth: anchorMaxWidth === null ? undefined : `${anchorMaxWidth}px`,
      }}
      data-toolbar="true"
      onContextMenu={handleBarContextMenu}
      onMouseLeave={onMouseLeave}
    >
      <div className="flex items-center gap-2">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={draggableIds} strategy={horizontalListSortingStrategy}>
            <div className="flex items-center gap-2">
              {draggableIds.map((widgetId) => (
                <SortablePinnedButton key={widgetId} widgetId={widgetId} />
              ))}
            </div>
          </SortableContext>
        </DndContext>
        <button
          onClick={onWidgetsClick}
          onContextMenu={(event) => onOpenContextMenu(event, undefined, true)}
          className="w-10 h-10 rounded-full text-text-light bg-black/20 hover:bg-black/30 transition-all duration-200 flex items-center justify-center flex-shrink-0"
          title={t('toolbar.widgetLibrary')}
          aria-label={t('toolbar.widgetLibrary')}
        >
          <LayoutGrid size={18} />
        </button>
      </div>
      {visibleTasks.length > 0 && (
        <>
          <div className="h-10 w-px bg-white/30"></div>
          <div className="flex items-center gap-2 overflow-x-auto pr-1 min-w-0 flex-1">
            {visibleTasks.map((widget) => (
            <button
              key={widget.instanceId}
              type="button"
              onClick={() => onTaskClick(widget.instanceId)}
              onContextMenu={(event) => {
                event.stopPropagation();
                onTaskContextMenu(event, widget.instanceId);
              }}
              data-task-button="true"
              className={`min-w-[120px] max-w-[180px] truncate px-3 py-2 rounded-lg border text-xs font-semibold transition ${
                widget.isMinimized
                  ? 'bg-white/60 border-gray-200 text-gray-500'
                  : widget.zIndex === highestZ
                    ? 'bg-amber-100 border-amber-300 text-amber-800'
                    : 'bg-white/90 border-gray-200 text-text-dark hover:bg-amber-50'
              }`}
              title={widget.title}
              aria-label={widget.title}
            >
              <span className="flex items-center gap-2 min-w-0">
                <span className="text-sm leading-none">{widget.icon}</span>
                <span className="truncate">{widget.title}</span>
              </span>
            </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
};
