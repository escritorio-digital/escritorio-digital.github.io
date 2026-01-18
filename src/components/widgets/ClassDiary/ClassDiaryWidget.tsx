import { LinkPortalWidget } from '../shared/LinkPortalWidget';

const CLASS_DIARY_URL = 'https://jjdeharo.github.io/diario/';

export const ClassDiaryWidget = () => (
    <LinkPortalWidget
        titleKey="widgets.class_diary.title"
        descriptionKey="widgets.class_diary.description"
        url={CLASS_DIARY_URL}
        openLabelKey="widgets.class_diary.open_new_tab"
        sandbox="allow-same-origin allow-scripts allow-forms allow-popups"
    />
);

export { widgetConfig } from './widgetConfig';
