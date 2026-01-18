import { useTranslation } from 'react-i18next';
import { ExternalAppWidget } from '../shared/ExternalAppWidget';
import { getDirectoAppUrl } from '../shared/getDirectoAppUrl';

export const DirectoNubeWidget = () => {
    const { i18n } = useTranslation();

    return (
        <ExternalAppWidget
            url={getDirectoAppUrl('nube.html', i18n)}
            titleKey="widgets.directo_nube.title"
        />
    );
};

export { widgetConfig } from './widgetConfig';
