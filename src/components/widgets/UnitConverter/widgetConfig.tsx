import type { WidgetConfig } from '../../../types';
import type { FC } from 'react';
import { useTranslation } from 'react-i18next';
import { withBaseUrl } from '../../../utils/assetPaths';

const WidgetIcon: FC = () => {
    const { t } = useTranslation();
    return <img src={withBaseUrl('icons/UnitConverter.png')} alt={t('widgets.unit_converter.icon_alt')} width="52" height="52" />;
}

export const widgetConfig: Omit<WidgetConfig, 'component'> = {
  id: 'unit-converter',
  title: 'widgets.unit_converter.title',
  icon: <WidgetIcon />,
  defaultSize: { width: 640, height: 420 },
};
