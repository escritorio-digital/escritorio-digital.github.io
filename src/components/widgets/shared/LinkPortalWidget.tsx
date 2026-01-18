import type { ReactNode } from 'react';
import { ExternalLink } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import './LinkPortalWidget.css';

type LinkPortalAction = {
    labelKey: string;
    url: string;
    icon?: ReactNode;
};

type LinkPortalWidgetProps = {
    titleKey: string;
    descriptionKey?: string;
    url: string;
    openLabelKey: string;
    actions?: LinkPortalAction[];
};

export const LinkPortalWidget: React.FC<LinkPortalWidgetProps> = ({
    titleKey,
    descriptionKey,
    url,
    openLabelKey,
    actions = [],
}) => {
    const { t } = useTranslation();

    return (
        <section className="link-portal-widget">
            <header className="link-portal-header">
                <div>
                    <div className="link-portal-title">{t(titleKey)}</div>
                    {descriptionKey && (
                        <p className="link-portal-description">{t(descriptionKey)}</p>
                    )}
                </div>
                <div className="link-portal-actions">
                    {actions.map((action) => (
                        <a
                            key={action.url}
                            className="link-portal-button link-portal-button-secondary"
                            href={action.url}
                            target="_blank"
                            rel="noopener noreferrer"
                        >
                            {action.icon && <span className="link-portal-icon">{action.icon}</span>}
                            {t(action.labelKey)}
                        </a>
                    ))}
                    <a
                        className="link-portal-button"
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                    >
                        <ExternalLink size={16} />
                        {t(openLabelKey)}
                    </a>
                </div>
            </header>
            <div className="link-portal-body">
                <iframe
                    className="link-portal-frame"
                    src={url}
                    title={t(titleKey)}
                    sandbox="allow-scripts allow-forms allow-popups"
                />
            </div>
        </section>
    );
};
