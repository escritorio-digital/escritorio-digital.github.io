import type { FC } from 'react';
import { useTranslation } from 'react-i18next';
import { withBaseUrl } from '../../../utils/assetPaths';
import type { WidgetConfig } from '../../../types';

export const widgetConfig: Omit<WidgetConfig, 'component'> = {
    id: 'alarm',
    title: 'widgets.alarm.title',
    icon: (() => {
        const WidgetIcon: FC = () => {
            const { t } = useTranslation();
            return <img src={withBaseUrl('icons/Timer.png')} alt={t('widgets.alarm.icon_alt')} width={52} height={52} />;
        };
        return <WidgetIcon />;
    })(),
    defaultSize: { width: 720, height: 520 },
};
