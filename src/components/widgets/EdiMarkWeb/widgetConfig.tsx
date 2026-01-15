import type { WidgetConfig } from '../../../types';
import type { FC } from 'react';
import { useTranslation } from 'react-i18next';
import { withBaseUrl } from '../../../utils/assetPaths';

const WidgetIcon: FC = () => {
    const { t } = useTranslation();
    return <img src={withBaseUrl('icons/EdiMarkWeb.png')} alt={t('widgets.edimarkweb.title')} width={52} height={52} />;
};

export const widgetConfig: Omit<WidgetConfig, 'component'> = {
    id: 'edimarkweb',
    title: 'widgets.edimarkweb.title',
    startTooltip: 'widgets.edimarkweb.tooltip',
    icon: <WidgetIcon />,
    defaultSize: { width: 1100, height: 720 },
};
