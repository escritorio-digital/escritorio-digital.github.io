import { ExternalAppWidget } from '../shared/ExternalAppWidget';

export const DirectoVotaWidget = () => (
    <ExternalAppWidget
        url="https://jjdeharo.github.io/directo/vota.html"
        titleKey="widgets.directo_vota.title"
        appendLanguageParam
        openInPopup
    />
);

export { widgetConfig } from './widgetConfig';
