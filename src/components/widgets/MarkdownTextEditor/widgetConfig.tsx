import type { WidgetConfig } from '../../../types';
import type { FC } from 'react';
import { useTranslation } from 'react-i18next';
import { withBaseUrl } from '../../../utils/assetPaths';

const WidgetIcon: FC = () => {
    const { t } = useTranslation();
    return (
        <img
            src={withBaseUrl('icons/MarkdownTextEditor.png')}
            alt={t('widgets.markdown_text_editor.icon_alt')}
            width="52"
            height="52"
        />
    );
};

export const widgetConfig: Omit<WidgetConfig, 'component'> = {
    id: 'markdown-text-editor',
    title: 'widgets.markdown_text_editor.title',
    searchKeywords: ['widgets.markdown_text_editor.search_keywords'],
    icon: <WidgetIcon />,
    defaultSize: { width: 920, height: 620 },
};
