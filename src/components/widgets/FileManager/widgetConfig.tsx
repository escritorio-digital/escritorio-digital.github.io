import type { FC } from 'react';
import { useTranslation } from 'react-i18next';
import { withBaseUrl } from '../../../utils/assetPaths';
import type { WidgetConfig } from '../../../types';

export const widgetConfig: Omit<WidgetConfig, 'component'> = {
    id: 'file-manager',
    title: 'widgets.file_manager.title',
    icon: (() => {
        const WidgetIcon: FC = () => {
            const { t } = useTranslation();
            return (
                <img
                    src={withBaseUrl('icons/archivos.png')}
                    alt={t('widgets.file_manager.title')}
                    width={52}
                    height={52}
                />
            );
        };
        return <WidgetIcon />;
    })(),
    defaultSize: { width: 900, height: 600 },
};
