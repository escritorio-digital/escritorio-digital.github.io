import { useTranslation } from 'react-i18next';
import { ExternalAppWidget } from '../shared/ExternalAppWidget';
import { getDirectoAppUrl } from '../shared/getDirectoAppUrl';

export const DirectoEscalaWidget = () => {
    const { i18n } = useTranslation();

    return (
        <ExternalAppWidget
            url={getDirectoAppUrl('escala.html', i18n)}
            titleKey="widgets.directo_escala.title"
        />
    );
};

export { widgetConfig } from './widgetConfig';
