import React from 'react';
import { useTranslation } from 'react-i18next';
import { LayoutGrid } from 'lucide-react';
import { DndContext, PointerSensor, KeyboardSensor, useSensor, useSensors, closestCenter, type DragEndEvent } from '@dnd-kit/core';
import { SortableContext, arrayMove, horizontalListSortingStrategy, useSortable, sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { WIDGET_REGISTRY } from '../widgets';

interface ToolbarProps {
  pinnedWidgets: string[];
  onWidgetClick: (widgetId: string) => void;
  onWidgetsClick: () => void;
  onOpenContextMenu: (event: React.MouseEvent, widgetId?: string, force?: boolean) => void;
  onReorderPinned: (orderedIds: string[]) => void;
}

export const Toolbar: React.FC<ToolbarProps> = ({
  pinnedWidgets,
  onWidgetClick,
  onWidgetsClick,
  onOpenContextMenu,
  onReorderPinned,
}) => {
  const { t } = useTranslation();
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );
  const draggableIds = pinnedWidgets.filter((id) => WIDGET_REGISTRY[id]);

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
    const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: widgetId });
    if (!widget) return null;
    const style = {
      transform: CSS.Transform.toString(transform),
      transition,
    };
    return (
      <button
        ref={setNodeRef}
        style={style}
        onClick={() => onWidgetClick(widget.id)}
        onContextMenu={(event) => onOpenContextMenu(event, widget.id)}
        data-widget-button="true"
        className="w-14 h-14 bg-accent text-2xl rounded-lg flex items-center justify-center hover:brightness-110 transition-all duration-200 hover:scale-110 flex-shrink-0"
        title={t(widget.title)}
        {...attributes}
        {...listeners}
      >
        {widget.icon}
      </button>
    );
  };
  const handleBarContextMenu = (event: React.MouseEvent) => {
    const target = event.target as HTMLElement | null;
    if (target?.closest('[data-widget-button="true"]')) return;
    onOpenContextMenu(event, undefined, true);
  };

  return (
    <div
      className="fixed bottom-5 left-1/2 -translate-x-1/2 bg-widget-bg p-2 rounded-2xl flex items-center gap-2 shadow-lg z-[10000] border border-custom-border max-w-[calc(100vw-1rem)] overflow-x-auto"
      onContextMenu={handleBarContextMenu}
    >
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={draggableIds} strategy={horizontalListSortingStrategy}>
          {draggableIds.map((widgetId) => (
            <SortablePinnedButton key={widgetId} widgetId={widgetId} />
          ))}
        </SortableContext>
      </DndContext>
      <div className="h-10 w-px bg-white/30 mx-2"></div>
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
  );
};
