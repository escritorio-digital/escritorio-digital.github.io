import type { WidgetConfig } from '../../../types';
import { withBaseUrl } from '../../../utils/assetPaths';

export const widgetConfig: Omit<WidgetConfig, 'component'> = {
    id: 'directo-vota',
    title: 'widgets.directo_vota.title',
    icon: (() => {
      const Icon = () => <img src={withBaseUrl('icons/DirectoVota.png')} alt="" width={52} height={52} />;
      return <Icon />;
    })(),
    defaultSize: { width: 560, height: 360 },
};
