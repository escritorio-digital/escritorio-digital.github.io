import type { WidgetConfig } from '../../../types';
import { withBaseUrl } from '../../../utils/assetPaths';

export const widgetConfig: Omit<WidgetConfig, 'component'> = {
    id: 'directo-nube',
    title: 'widgets.directo_nube.title',
    icon: (() => {
        const Icon = () => <img src={withBaseUrl('icons/DirectoNube.png')} alt="" width={52} height={52} />;
        return <Icon />;
    })(),
    defaultSize: { width: 560, height: 360 },
};
