import { ExternalAppWidget } from '../shared/ExternalAppWidget';

export const QPlayWidget = () => (
    <ExternalAppWidget
        url="https://jjdeharo.github.io/qplay/"
        titleKey="widgets.qplay.title"
        appendLanguageParam
        openInPopup
    />
);

export { widgetConfig } from './widgetConfig';
