import { ExternalAppWidget } from '../shared/ExternalAppWidget';

export const DirectoNubeWidget = () => (
    <ExternalAppWidget
        url="https://jjdeharo.github.io/directo/nube.html"
        titleKey="widgets.directo_nube.title"
        appendLanguageParam
        openInPopup
    />
);

export { widgetConfig } from './widgetConfig';
