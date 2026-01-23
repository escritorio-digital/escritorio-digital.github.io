import { ExternalAppWidget } from '../shared/ExternalAppWidget';

export const DirectoIdeasWidget = () => (
    <ExternalAppWidget
        url="https://jjdeharo.github.io/directo/ideas.html"
        titleKey="widgets.directo_ideas.title"
        appendLanguageParam
        openInPopup
    />
);

export { widgetConfig } from './widgetConfig';
