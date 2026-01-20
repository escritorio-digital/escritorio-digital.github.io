import type { WidgetConfig } from '../../types';

export type WidgetCategory = {
    id: string;
    titleKey: string;
    widgetIds: string[];
};

export const WIDGET_CATEGORIES: WidgetCategory[] = [
    {
        id: 'organization',
        titleKey: 'settings.widgets.categories.organization',
        widgetIds: ['work-list', 'attendance', 'group-generator', 'calendar', 'program-guide'],
    },
    {
        id: 'time',
        titleKey: 'settings.widgets.categories.time',
        widgetIds: ['timer', 'stopwatch', 'metronome', 'global-clocks'],
    },
    {
        id: 'math_science',
        titleKey: 'settings.widgets.categories.math_science',
        widgetIds: ['scientific-calculator', 'unit-converter', 'latex-markdown'],
    },
    {
        id: 'community',
        titleKey: 'settings.widgets.categories.community',
        widgetIds: ['vce-community', 'comunidad-chatgpt-ia-edu', 'edumedia-iag'],
    },
    {
        id: 'vibe_coding',
        titleKey: 'settings.widgets.categories.vibe_coding',
        widgetIds: ['vce-community', 'local-web'],
    },
    {
        id: 'board_writing',
        titleKey: 'settings.widgets.categories.board_writing',
        widgetIds: [
            'notepad',
            'drawing-pad',
            'image-carousel',
            'edimarkweb',
            'html-sandbox',
            'boardlive',
        ],
    },
    {
        id: 'resources',
        titleKey: 'settings.widgets.categories.resources',
        widgetIds: [
            'file-manager',
            'iframe',
            'local-web',
            'pdf-viewer',
            'file-opener',
            'directo-viewer',
            'wikipedia-search',
        ],
    },
    {
        id: 'interaction',
        titleKey: 'settings.widgets.categories.interaction',
        widgetIds: ['dice', 'random-spinner', 'qr-code-generator', 'traffic-light', 'sound-meter', 'scoreboard'],
    },
    {
        id: 'participation',
        titleKey: 'settings.widgets.categories.participation',
        widgetIds: [
            'directo-vota',
            'directo-escala',
            'directo-nube',
            'directo-ideas',
            'directo-muro',
            'directo-ticket',
            'qplay',
            'boardlive',
        ],
    },
    {
        id: 'logic_games',
        titleKey: 'settings.widgets.categories.logic_games',
        widgetIds: ['tic-tac-toe', 'memory-game', 'sliding-puzzle'],
    },
    {
        id: 'gestures',
        titleKey: 'settings.widgets.categories.gestures',
        widgetIds: ['work-gestures'],
    },
];

export const buildWidgetsByCategory = (
    widgets: WidgetConfig[],
    translate: (key: string) => string
) => {
    const widgetsById = new Map(widgets.map((widget) => [widget.id, widget]));
    const categorized = WIDGET_CATEGORIES.map((category) => ({
        ...category,
        widgets: category.widgetIds
            .map((id) => widgetsById.get(id))
            .filter((widget): widget is WidgetConfig => Boolean(widget))
            .sort((a, b) => translate(a.title).localeCompare(translate(b.title))),
    }));
    const categorizedIds = new Set(WIDGET_CATEGORIES.flatMap((category) => category.widgetIds));
    const uncategorized = widgets
        .filter((widget) => !categorizedIds.has(widget.id))
        .sort((a, b) => translate(a.title).localeCompare(translate(b.title)));
    if (uncategorized.length > 0) {
        categorized.push({
            id: 'other',
            titleKey: 'settings.widgets.categories.other',
            widgetIds: uncategorized.map((widget) => widget.id),
            widgets: uncategorized,
        });
    }
    return categorized;
};
