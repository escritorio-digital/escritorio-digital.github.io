import { ExternalAppWidget } from '../shared/ExternalAppWidget';

export const DirectoMuroWidget = () => (
    <ExternalAppWidget
        url="https://jjdeharo.github.io/directo/muro.html"
        titleKey="widgets.directo_muro.title"
        appendLanguageParam
        openInPopup
    />
);

export { widgetConfig } from './widgetConfig';
