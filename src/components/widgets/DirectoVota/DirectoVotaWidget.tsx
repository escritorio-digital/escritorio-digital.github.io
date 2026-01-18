import { useTranslation } from 'react-i18next';
import { ExternalAppWidget } from '../shared/ExternalAppWidget';
import { getDirectoAppUrl } from '../shared/getDirectoAppUrl';

export const DirectoVotaWidget = () => {
    const { i18n } = useTranslation();

    return (
        <ExternalAppWidget
            url={getDirectoAppUrl('vota.html', i18n)}
            titleKey="widgets.directo_vota.title"
        />
    );
};

export { widgetConfig } from './widgetConfig';
