import { useEffect, useMemo, useRef, useState } from 'react';
import type { RefObject } from 'react';
import { useTranslation } from 'react-i18next';
import { BookOpen, Info, FileText, Settings, Users, Image, LayoutGrid, X, Star, HelpCircle, Layers, GripVertical } from 'lucide-react';
import { DndContext, PointerSensor, KeyboardSensor, useSensor, useSensors, closestCenter, type DragEndEvent } from '@dnd-kit/core';
import { SortableContext, arrayMove, verticalListSortingStrategy, useSortable, sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { WIDGET_REGISTRY } from '../widgets';
import { buildWidgetsByCategory } from '../widgets/widgetCategories';
import { withBaseUrl } from '../../utils/assetPaths';

type StartMenuProps = {
    isOpen: boolean;
    onClose: () => void;
    onAddWidget: (widgetId: string) => void;
    onOpenSettingsTab: (tab: 'general' | 'profiles' | 'widgets' | 'theme') => void;
    onOpenAbout: () => void;
    onOpenCredits: () => void;
    onRemoveFavorite: (widgetId: string) => void;
    onReorderFavorites: (orderedIds: string[]) => void;
    onClearFavorites: () => void;
    onAddFavorite: (widgetId: string) => void;
    pinnedWidgets: string[];
    anchorRect?: DOMRect | null;
    anchorRef?: RefObject<HTMLButtonElement>;
};

type MenuPosition = {
    left: number;
    bottom: number;
};

const categoryColors: Record<string, string> = {
    organization: 'bg-emerald-500',
    time: 'bg-blue-500',
    math_science: 'bg-teal-500',
    resources: 'bg-amber-500',
    interaction: 'bg-rose-500',
    logic_games: 'bg-purple-500',
    gestures: 'bg-orange-500',
    other: 'bg-gray-500',
};

const MAX_FAVORITES = 20;

export const StartMenu: React.FC<StartMenuProps> = ({
    isOpen,
    onClose,
    onAddWidget,
    onOpenSettingsTab,
    onOpenAbout,
    onOpenCredits,
    onRemoveFavorite,
    onReorderFavorites,
    onClearFavorites,
    onAddFavorite,
    pinnedWidgets,
    anchorRect,
    anchorRef,
}) => {
    const { t } = useTranslation();
    const menuRef = useRef<HTMLDivElement>(null);
    const searchRef = useRef<HTMLInputElement>(null);
    const favoriteMenuRef = useRef<HTMLDivElement>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [menuPosition, setMenuPosition] = useState<MenuPosition | null>(null);
    const [activeSection, setActiveSection] = useState<'favorites' | 'shortcuts' | 'widgets' | 'help'>('widgets');
    const [activeCategoryId, setActiveCategoryId] = useState<string | null>(null);
    const [favoriteMenu, setFavoriteMenu] = useState<{ isOpen: boolean; x: number; y: number; widgetId: string | null }>({
        isOpen: false,
        x: 0,
        y: 0,
        widgetId: null,
    });

    const widgetList = useMemo(() => Object.values(WIDGET_REGISTRY), []);
    const normalizedSearch = searchTerm.trim().toLowerCase();
    const filteredWidgets = useMemo(() => {
        if (!normalizedSearch) return widgetList;
        return widgetList.filter((widget) => t(widget.title).toLowerCase().includes(normalizedSearch));
    }, [normalizedSearch, t, widgetList]);

    const widgetsByCategory = useMemo(() => buildWidgetsByCategory(filteredWidgets, t), [filteredWidgets, t]);
    const pinnedWidgetIds = useMemo(() => pinnedWidgets.filter((id) => WIDGET_REGISTRY[id]), [pinnedWidgets]);
    const pinnedWidgetItems = useMemo(
        () => pinnedWidgetIds.map((id) => WIDGET_REGISTRY[id]).filter(Boolean),
        [pinnedWidgetIds]
    );
    const favoriteIdSet = useMemo(() => new Set(pinnedWidgetIds), [pinnedWidgetIds]);

    useEffect(() => {
        if (!isOpen) return;
        setSearchTerm('');
        setActiveSection('widgets');
        const nextPosition = anchorRect
            ? {
                left: Math.round(anchorRect.left),
                bottom: Math.round(window.innerHeight - anchorRect.top + 8),
            }
            : { left: 16, bottom: 96 };
        setMenuPosition(nextPosition);
        const frame = requestAnimationFrame(() => {
            searchRef.current?.focus();
        });
        return () => cancelAnimationFrame(frame);
    }, [anchorRect, isOpen]);

    useEffect(() => {
        if (!isOpen) {
            setFavoriteMenu({ isOpen: false, x: 0, y: 0, widgetId: null });
        }
    }, [isOpen]);

    useEffect(() => {
        const visibleCategories = widgetsByCategory.filter((category) => category.widgets.length > 0);
        if (visibleCategories.length === 0) {
            setActiveCategoryId(null);
            return;
        }
        if (!activeCategoryId || !visibleCategories.some((category) => category.id === activeCategoryId)) {
            setActiveCategoryId(visibleCategories[0].id);
        }
    }, [activeCategoryId, widgetsByCategory]);

    useEffect(() => {
        if (!isOpen) return;
        const handlePointerDown = (event: MouseEvent) => {
            if (menuRef.current && menuRef.current.contains(event.target as Node)) return;
            if (anchorRef?.current && anchorRef.current.contains(event.target as Node)) return;
            onClose();
        };
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') onClose();
        };
        window.addEventListener('mousedown', handlePointerDown);
        window.addEventListener('keydown', handleKeyDown);
        return () => {
            window.removeEventListener('mousedown', handlePointerDown);
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [anchorRef, isOpen, onClose]);

    useEffect(() => {
        if (!favoriteMenu.isOpen) return;
        const clampMenu = () => {
            const container = menuRef.current;
            const menu = favoriteMenuRef.current;
            if (!container || !menu) return;
            const padding = 8;
            const maxX = Math.max(padding, container.clientWidth - menu.offsetWidth - padding);
            const maxY = Math.max(padding, container.clientHeight - menu.offsetHeight - padding);
            let nextX = Math.min(Math.max(favoriteMenu.x, padding), maxX);
            let nextY = Math.min(Math.max(favoriteMenu.y, padding), maxY);
            if (nextX !== favoriteMenu.x || nextY !== favoriteMenu.y) {
                setFavoriteMenu((prev) => ({ ...prev, x: nextX, y: nextY }));
            }
        };
        const handlePointerDown = (event: MouseEvent) => {
            if (menuRef.current && menuRef.current.contains(event.target as Node)) {
                if ((event.target as HTMLElement).closest('[data-favorite-menu="true"]')) return;
            }
            setFavoriteMenu({ isOpen: false, x: 0, y: 0, widgetId: null });
        };
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                setFavoriteMenu({ isOpen: false, x: 0, y: 0, widgetId: null });
            }
        };
        const frame = requestAnimationFrame(clampMenu);
        window.addEventListener('mousedown', handlePointerDown);
        window.addEventListener('keydown', handleKeyDown);
        return () => {
            cancelAnimationFrame(frame);
            window.removeEventListener('mousedown', handlePointerDown);
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [favoriteMenu.isOpen]);

    useEffect(() => {
        if (!isOpen || !menuPosition) return;
        const menu = menuRef.current;
        if (!menu) return;
        const rect = menu.getBoundingClientRect();
        const padding = 8;
        let nextLeft = menuPosition.left;
        let nextBottom = menuPosition.bottom;
        if (rect.left < padding) {
            nextLeft += padding - rect.left;
        }
        if (rect.right > window.innerWidth - padding) {
            nextLeft -= rect.right - (window.innerWidth - padding);
        }
        if (rect.top < padding) {
            nextBottom -= padding - rect.top;
        }
        if (rect.bottom > window.innerHeight - padding) {
            nextBottom += rect.bottom - (window.innerHeight - padding);
        }
        if (nextLeft !== menuPosition.left || nextBottom !== menuPosition.bottom) {
            setMenuPosition({ left: nextLeft, bottom: nextBottom });
        }
    }, [isOpen, menuPosition]);

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    const handleFavoritesDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        if (!over || active.id === over.id) return;
        const activeIndex = pinnedWidgetIds.indexOf(String(active.id));
        const overIndex = pinnedWidgetIds.indexOf(String(over.id));
        if (activeIndex === -1 || overIndex === -1) return;
        const reorderedVisible = arrayMove(pinnedWidgetIds, activeIndex, overIndex);
        const hiddenIds = pinnedWidgets.filter((id) => !WIDGET_REGISTRY[id]);
        onReorderFavorites([...reorderedVisible, ...hiddenIds]);
    };

    const SortableFavoriteItem: React.FC<{ widgetId: string }> = ({ widgetId }) => {
        const widget = WIDGET_REGISTRY[widgetId];
        const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: widgetId });
        if (!widget) return null;
        const style = {
            transform: CSS.Transform.toString(transform),
            transition,
        };
        return (
            <button
                ref={setNodeRef}
                style={style}
                onClick={() => handleWidgetAdd(widget.id)}
                onContextMenu={(event) => {
                    event.preventDefault();
                    const rect = menuRef.current?.getBoundingClientRect();
                    const nextX = rect ? event.clientX - rect.left : event.clientX;
                    const nextY = rect ? event.clientY - rect.top : event.clientY;
                    setFavoriteMenu({ isOpen: true, x: nextX, y: nextY, widgetId: widget.id });
                }}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg bg-white/90 hover:bg-amber-50 border border-gray-200 transition text-left shadow-sm min-w-0 ${isDragging ? 'opacity-70' : ''}`}
                title={t(widget.title)}
            >
                <span className="text-2xl">{widget.icon}</span>
                <span className="flex-1 min-w-0 text-sm font-semibold text-text-dark leading-tight truncate">
                    {t(widget.title)}
                </span>
                <span
                    {...attributes}
                    {...listeners}
                    onClick={(event) => event.stopPropagation()}
                    className="text-gray-400 hover:text-gray-600 cursor-grab active:cursor-grabbing"
                    title={t('start_menu.reorder_favorites')}
                >
                    <GripVertical size={16} />
                </span>
            </button>
        );
    };

    if (!isOpen || !menuPosition) return null;

    const handleWidgetAdd = (widgetId: string) => {
        onAddWidget(widgetId);
        onClose();
    };

    const handleQuickAction = (tab: 'general' | 'profiles' | 'widgets' | 'theme') => {
        onOpenSettingsTab(tab);
        onClose();
    };

    const handleSearchKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
        if (event.key !== 'Enter') return;
        const firstWidget = filteredWidgets[0];
        if (!firstWidget) return;
        handleWidgetAdd(firstWidget.id);
    };

    const visibleCategories = widgetsByCategory.filter((category) => category.widgets.length > 0);
    const activeCategory = activeCategoryId
        ? visibleCategories.find((category) => category.id === activeCategoryId) || null
        : null;
    const showSearchResults = normalizedSearch.length > 0;

    const renderWidgetList = (widgets: typeof filteredWidgets, highlightFavorites = true) => (
        <div className="space-y-1">
            {widgets.map((widget) => (
                <button
                    key={widget.id}
                    onClick={() => handleWidgetAdd(widget.id)}
                    onContextMenu={(event) => {
                        event.preventDefault();
                        const rect = menuRef.current?.getBoundingClientRect();
                        const nextX = rect ? event.clientX - rect.left : event.clientX;
                        const nextY = rect ? event.clientY - rect.top : event.clientY;
                        setFavoriteMenu({ isOpen: true, x: nextX, y: nextY, widgetId: widget.id });
                    }}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg border transition text-left shadow-sm min-w-0 ${highlightFavorites && favoriteIdSet.has(widget.id) ? 'bg-amber-50 border-amber-300' : 'bg-white/90 hover:bg-amber-50 border-gray-200'}`}
                    title={t(widget.title)}
                >
                    <span className="text-2xl">{widget.icon}</span>
                    <span className="flex-1 min-w-0 text-sm font-semibold text-text-dark leading-tight truncate">
                        {t(widget.title)}
                    </span>
                    {highlightFavorites && favoriteIdSet.has(widget.id) && (
                        <Star size={14} className="text-amber-500" />
                    )}
                </button>
            ))}
        </div>
    );

    return (
        <div
            ref={menuRef}
            className="fixed z-[10001] w-[min(30rem,calc(100vw-1rem))] h-[72vh] max-h-[72vh] bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl border border-gray-200 flex flex-col"
            style={{ left: menuPosition.left, bottom: menuPosition.bottom }}
        >
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-gradient-to-r from-white to-amber-50/70 rounded-t-2xl">
                <div className="flex items-center gap-2">
                    <img src={withBaseUrl('escritorio-digital.png')} alt={t('toolbar.start')} width="22" height="22" />
                    <h3 className="text-base font-semibold text-text-dark">{t('start_menu.title')}</h3>
                </div>
                <button
                    onClick={onClose}
                    className="p-1.5 rounded-full hover:bg-gray-100 text-gray-600"
                    aria-label={t('start_menu.close')}
                    title={t('start_menu.close')}
                >
                    <X size={16} />
                </button>
            </div>
            <div className="px-4 py-3 border-b border-gray-200 bg-white/70">
                <div className="relative">
                    <input
                        ref={searchRef}
                        type="text"
                        placeholder={t('settings.widgets.search')}
                        value={searchTerm}
                        onChange={(event) => setSearchTerm(event.target.value)}
                        onKeyDown={handleSearchKeyDown}
                        className="w-full pl-3 pr-4 py-2 border rounded-lg bg-white/90 focus:ring-2 focus:ring-accent focus:outline-none"
                    />
                </div>
            </div>
            <div className="flex-1 overflow-hidden px-4 py-3 bg-gradient-to-b from-white to-gray-50 min-h-0">
                <div className="flex h-full min-h-0 gap-4">
                    <div className="w-56 shrink-0 space-y-4">
                        <div className="space-y-2">
                            <button
                                onClick={() => setActiveSection('favorites')}
                                className={`w-full text-left px-3 py-2 rounded-lg text-[15px] font-semibold border transition flex items-center gap-2 ${activeSection === 'favorites' ? 'bg-accent text-text-dark border-transparent' : 'bg-white/90 hover:bg-amber-50 border-gray-200'}`}
                            >
                                <Star size={16} />
                                {t('start_menu.favorites')}
                            </button>
                            <button
                                onClick={() => setActiveSection('shortcuts')}
                                className={`w-full text-left px-3 py-2 rounded-lg text-[15px] font-semibold border transition flex items-center gap-2 ${activeSection === 'shortcuts' ? 'bg-accent text-text-dark border-transparent' : 'bg-white/90 hover:bg-amber-50 border-gray-200'}`}
                            >
                                <Settings size={16} />
                                {t('context_menu.settings')}
                            </button>
                            <button
                                onClick={() => setActiveSection('help')}
                                className={`w-full text-left px-3 py-2 rounded-lg text-[15px] font-semibold border transition flex items-center gap-2 ${activeSection === 'help' ? 'bg-accent text-text-dark border-transparent' : 'bg-white/90 hover:bg-amber-50 border-gray-200'}`}
                            >
                                <HelpCircle size={16} />
                                {t('start_menu.help')}
                            </button>
                        </div>
                        <div>
                            <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500 mb-2">
                                {t('start_menu.widgets')}
                            </p>
                            <div className="space-y-1">
                                {visibleCategories.map((category) => (
                                    <button
                                        key={category.id}
                                        onClick={() => {
                                            setActiveSection('widgets');
                                            setActiveCategoryId(category.id);
                                        }}
                                        className={`w-full text-left px-3 py-2 rounded-lg text-[13px] font-semibold border transition flex items-center gap-2 ${activeCategoryId === category.id && activeSection === 'widgets' ? 'bg-accent text-text-dark border-transparent' : 'bg-white/90 hover:bg-amber-50 border-gray-200'}`}
                                    >
                                        <span className={`h-2.5 w-2.5 rounded-full ${categoryColors[category.id] ?? 'bg-gray-400'}`} />
                                        <span className="leading-tight">{t(category.titleKey)}</span>
                                        <span className="ml-auto text-[10px] font-semibold text-gray-600">
                                            {category.widgets.length}
                                        </span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                    <div className="flex-1 overflow-y-auto pr-1 min-h-0">
                        {activeSection === 'favorites' && (
                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <p className="text-xs uppercase tracking-wide text-gray-500">
                                        {t('start_menu.favorites')}
                                    </p>
                                    {pinnedWidgetItems.length > 0 && (
                                        <button
                                            className="text-xs font-semibold text-red-600 hover:text-red-700"
                                            onClick={() => {
                                                if (!window.confirm(t('start_menu.clear_favorites_confirm'))) return;
                                                onClearFavorites();
                                            }}
                                        >
                                            {t('start_menu.clear_favorites')}
                                        </button>
                                    )}
                                </div>
                                {pinnedWidgetItems.length > 0 ? (
                                    <DndContext
                                        sensors={sensors}
                                        collisionDetection={closestCenter}
                                        onDragStart={() => {
                                            setFavoriteMenu({ isOpen: false, x: 0, y: 0, widgetId: null });
                                        }}
                                        onDragEnd={handleFavoritesDragEnd}
                                    >
                                        <SortableContext items={pinnedWidgetIds} strategy={verticalListSortingStrategy}>
                                            <div className="space-y-1">
                                                {pinnedWidgetIds.map((widgetId) => (
                                                    <SortableFavoriteItem key={widgetId} widgetId={widgetId} />
                                                ))}
                                            </div>
                                        </SortableContext>
                                    </DndContext>
                                ) : (
                                    <p className="text-sm text-gray-500">{t('start_menu.no_results')}</p>
                                )}
                            </div>
                        )}
                        {activeSection === 'shortcuts' && (
                            <div className="space-y-3">
                                <p className="text-xs uppercase tracking-wide text-gray-500">{t('context_menu.settings')}</p>
                                <div className="space-y-2">
                                    <button
                                        onClick={() => handleQuickAction('general')}
                                        className="w-full flex items-center gap-3 px-3 py-2 rounded-lg bg-white/90 hover:bg-amber-50 border border-gray-200 transition text-left shadow-sm"
                                    >
                                        <Settings size={18} />
                                        <span className="text-sm font-semibold">{t('context_menu.settings')}</span>
                                    </button>
                                    <button
                                        onClick={() => handleQuickAction('profiles')}
                                        className="w-full flex items-center gap-3 px-3 py-2 rounded-lg bg-white/90 hover:bg-amber-50 border border-gray-200 transition text-left shadow-sm"
                                    >
                                        <Users size={18} />
                                        <span className="text-sm font-semibold">{t('context_menu.manage_profiles')}</span>
                                    </button>
                                    <button
                                        onClick={() => handleQuickAction('theme')}
                                        className="w-full flex items-center gap-3 px-3 py-2 rounded-lg bg-white/90 hover:bg-amber-50 border border-gray-200 transition text-left shadow-sm"
                                    >
                                        <Image size={18} />
                                        <span className="text-sm font-semibold">{t('context_menu.change_background')}</span>
                                    </button>
                                    <button
                                        onClick={() => handleQuickAction('widgets')}
                                        className="w-full flex items-center gap-3 px-3 py-2 rounded-lg bg-white/90 hover:bg-amber-50 border border-gray-200 transition text-left shadow-sm"
                                    >
                                        <LayoutGrid size={18} />
                                        <span className="text-sm font-semibold">{t('toolbar.widgetLibrary')}</span>
                                    </button>
                                </div>
                            </div>
                        )}
                        {activeSection === 'help' && (
                            <div className="space-y-3">
                                <p className="text-xs uppercase tracking-wide text-gray-500">{t('start_menu.help')}</p>
                                <div className="space-y-1">
                                    <button
                                        onClick={() => {
                                            handleWidgetAdd('program-guide');
                                        }}
                                        className="w-full flex items-center gap-3 px-3 py-2 rounded-lg bg-white/90 hover:bg-amber-50 border border-gray-200 transition text-left shadow-sm"
                                    >
                                        <BookOpen size={18} />
                                        <span className="text-sm font-semibold">{t('help.guide')}</span>
                                    </button>
                                    <button
                                        onClick={() => {
                                            onOpenAbout();
                                            onClose();
                                        }}
                                        className="w-full flex items-center gap-3 px-3 py-2 rounded-lg bg-white/90 hover:bg-amber-50 border border-gray-200 transition text-left shadow-sm"
                                    >
                                        <Info size={18} />
                                        <span className="text-sm font-semibold">{t('help.about')}</span>
                                    </button>
                                    <button
                                        onClick={() => {
                                            onOpenCredits();
                                            onClose();
                                        }}
                                        className="w-full flex items-center gap-3 px-3 py-2 rounded-lg bg-white/90 hover:bg-amber-50 border border-gray-200 transition text-left shadow-sm"
                                    >
                                        <FileText size={18} />
                                        <span className="text-sm font-semibold">{t('help.licenses')}</span>
                                    </button>
                                </div>
                            </div>
                        )}
                        {activeSection === 'widgets' && (
                            <div className="space-y-3">
                                <p className="text-xs uppercase tracking-wide text-gray-500">
                                    {showSearchResults ? t('start_menu.widgets') : t('start_menu.widgets')}
                                </p>
                                {showSearchResults ? (
                                    filteredWidgets.length > 0 ? (
                                        renderWidgetList(filteredWidgets, true)
                                    ) : (
                                        <p className="text-sm text-gray-500">{t('start_menu.no_results')}</p>
                                    )
                                ) : activeCategory?.widgets.length ? (
                                    renderWidgetList(activeCategory.widgets, true)
                                ) : (
                                    <p className="text-sm text-gray-500">{t('start_menu.no_results')}</p>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>
            {favoriteMenu.isOpen && favoriteMenu.widgetId && (
                <div
                    data-favorite-menu="true"
                    ref={favoriteMenuRef}
                    className="absolute z-[10002] min-w-[180px] bg-white/95 backdrop-blur-md rounded-lg shadow-xl border border-gray-200 py-2 text-sm text-text-dark"
                    style={{ left: favoriteMenu.x, top: favoriteMenu.y }}
                >
                    <button
                        className="w-full text-left px-4 py-2 hover:bg-gray-100 flex items-center gap-2"
                        onClick={() => {
                            const targetId = favoriteMenu.widgetId as string;
                            if (favoriteIdSet.has(targetId)) {
                                onRemoveFavorite(targetId);
                            } else if (pinnedWidgetIds.length < MAX_FAVORITES) {
                                onAddFavorite(targetId);
                            } else {
                                alert(t('settings.widgets.max_widgets_alert', { max: MAX_FAVORITES }));
                            }
                            setFavoriteMenu({ isOpen: false, x: 0, y: 0, widgetId: null });
                        }}
                    >
                        {favoriteIdSet.has(favoriteMenu.widgetId as string)
                            ? t('start_menu.remove_favorite')
                            : t('start_menu.add_favorite')}
                    </button>
                </div>
            )}
        </div>
    );
};
