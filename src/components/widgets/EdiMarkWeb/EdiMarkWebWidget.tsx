import { useState } from 'react';
import type { FC } from 'react';
import { ExternalLink, RotateCcw } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import './EdiMarkWebWidget.css';
import { WidgetToolbar } from '../../core/WidgetToolbar';

const APP_URL = 'https://edimarkweb.github.io/';

export const EdiMarkWebWidget: FC = () => {
    const { t } = useTranslation();
    const [reloadKey, setReloadKey] = useState(0);

    const handleReload = () => setReloadKey((prev) => prev + 1);

    return (
        <div className="edimarkweb-widget">
            <WidgetToolbar>
                <div className="edimarkweb-toolbar">
                    <div className="edimarkweb-heading">
                        <p className="edimarkweb-title">EdiMarkWeb</p>
                        <p className="edimarkweb-subtitle">{t('widgets.edimarkweb.subtitle')}</p>
                    </div>
                    <div className="edimarkweb-actions">
                        <button type="button" className="edimarkweb-button" onClick={handleReload}>
                            <RotateCcw size={16} />
                            <span>{t('widgets.edimarkweb.reload')}</span>
                        </button>
                        <a
                            className="edimarkweb-link"
                            href={APP_URL}
                            target="_blank"
                            rel="noreferrer"
                        >
                            <ExternalLink size={16} />
                            <span>{t('widgets.edimarkweb.open_new_tab')}</span>
                        </a>
                    </div>
                </div>
            </WidgetToolbar>
            <div className="edimarkweb-frame">
                <iframe
                    key={reloadKey}
                    src={APP_URL}
                    title={t('widgets.edimarkweb.title')}
                    className="edimarkweb-iframe"
                    sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-downloads"
                />
            </div>
        </div>
    );
};

export { widgetConfig } from './widgetConfig';
