import { useTranslation } from 'react-i18next';
import { ExternalAppWidget } from '../shared/ExternalAppWidget';
import { getDirectoAppUrl } from '../shared/getDirectoAppUrl';

export const DirectoIdeasWidget = () => {
    const { i18n } = useTranslation();

    return (
        <ExternalAppWidget
            url={getDirectoAppUrl('ideas.html', i18n)}
            titleKey="widgets.directo_ideas.title"
        />
    );
};

export { widgetConfig } from './widgetConfig';
