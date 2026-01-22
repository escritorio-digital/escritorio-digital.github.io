import type { FC } from 'react';
import { useTranslation } from 'react-i18next';
import { withBaseUrl } from '../../../utils/assetPaths';
import type { WidgetConfig } from '../../../types';

export const widgetConfig: Omit<WidgetConfig, 'component'> = {
  id: 'dice',
  title: 'widgets.dice.title',
  icon: (() => {
    const WidgetIcon: FC = () => {
      const { t } = useTranslation();
      return <img src={withBaseUrl('icons/Dice.png')} alt={t('widgets.dice.title')} width={52} height={52} />;
    };
    return <WidgetIcon />;
  })(),
  defaultSize: { width: 460, height: 320 },
};
