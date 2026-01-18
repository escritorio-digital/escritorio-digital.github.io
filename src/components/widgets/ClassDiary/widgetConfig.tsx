import type { FC } from 'react';
import { useTranslation } from 'react-i18next';
import { withBaseUrl } from '../../../utils/assetPaths';
import type { WidgetConfig } from '../../../types';

export const widgetConfig: Omit<WidgetConfig, 'component'> = {
    id: 'class-diary',
    title: 'widgets.class_diary.title',
    searchKeywords: ['widgets.class_diary.search_keywords'],
    icon: (() => {
        const WidgetIcon: FC = () => {
            const { t } = useTranslation();
            return (
                <img
                    src={withBaseUrl('icons/ClassDiary.png')}
                    alt={t('widgets.class_diary.title')}
                    width={52}
                    height={52}
                />
            );
        };
        return <WidgetIcon />;
    })(),
    defaultSize: { width: 900, height: 620 },
};
