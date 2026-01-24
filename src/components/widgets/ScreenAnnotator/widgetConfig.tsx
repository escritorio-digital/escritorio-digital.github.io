import type { FC } from 'react';
import { useTranslation } from 'react-i18next';
import { withBaseUrl } from '../../../utils/assetPaths';
import type { WidgetConfig } from '../../../types';

export const widgetConfig: Omit<WidgetConfig, 'component'> = {
    id: 'screen-annotator',
    title: 'widgets.screen_annotator.title',
    icon: (() => {
        const WidgetIcon: FC = () => {
            const { t } = useTranslation();
            return (
                <img
                    src={withBaseUrl('icons/pizarra.png')}
                    alt={t('widgets.screen_annotator.title')}
                    width={52}
                    height={52}
                />
            );
        };
        return <WidgetIcon />;
    })(),
    defaultSize: { width: 1200, height: 800 },
    windowStyle: 'overlay',
    defaultMaximized: true,
    searchKeywords: ['widgets.screen_annotator.search_keywords'],
};
