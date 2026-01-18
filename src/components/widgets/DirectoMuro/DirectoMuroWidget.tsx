import { useTranslation } from 'react-i18next';
import { ExternalAppWidget } from '../shared/ExternalAppWidget';
import { getDirectoAppUrl } from '../shared/getDirectoAppUrl';

export const DirectoMuroWidget = () => {
    const { i18n } = useTranslation();

    return (
        <ExternalAppWidget
            url={getDirectoAppUrl('muro.html', i18n)}
            titleKey="widgets.directo_muro.title"
        />
    );
};

export { widgetConfig } from './widgetConfig';
