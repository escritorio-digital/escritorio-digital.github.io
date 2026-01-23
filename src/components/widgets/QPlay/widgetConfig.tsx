import type { WidgetConfig } from '../../../types';
import { withBaseUrl } from '../../../utils/assetPaths';

export const widgetConfig: Omit<WidgetConfig, 'component'> = {
    id: 'qplay',
    title: 'widgets.qplay.title',
    icon: (() => {
      const Icon = () => <img src={withBaseUrl('icons/QPlay.png')} alt="" width={52} height={52} />;
      return <Icon />;
    })(),
    defaultSize: { width: 560, height: 360 },
};
