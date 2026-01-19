import { ExternalAppWidget } from '../shared/ExternalAppWidget';

export const BoardLiveWidget = () => (
    <ExternalAppWidget
        url="https://boardlive.github.io/"
        titleKey="widgets.boardlive.title"
        appendLanguageParam
    />
);

export { widgetConfig } from './widgetConfig';
