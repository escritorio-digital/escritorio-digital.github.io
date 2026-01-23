import { ExternalAppWidget } from '../shared/ExternalAppWidget';

export const DirectoTicketWidget = () => (
    <ExternalAppWidget
        url="https://jjdeharo.github.io/directo/ticket.html"
        titleKey="widgets.directo_ticket.title"
        appendLanguageParam
        openInPopup
    />
);

export { widgetConfig } from './widgetConfig';
