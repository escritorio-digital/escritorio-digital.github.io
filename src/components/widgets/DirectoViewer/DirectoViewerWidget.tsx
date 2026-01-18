import React from 'react';
import type { FC } from 'react';
import { Info } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { getDirectoAppUrl } from '../shared/getDirectoAppUrl';

// --- Estilos CSS como objetos de JavaScript ---

const widgetStyles: React.CSSProperties = {
    position: 'relative',
    width: '100%',
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: '#f0f2f5',
};

const iframeStyles: React.CSSProperties = {
    flexGrow: 1,
    border: 'none',
};

// --- ESTILOS ACTUALIZADOS ---
// Se han cambiado 'top' y 'right' por 'bottom' y 'left'.
const infoButtonStyles: React.CSSProperties = {
    position: 'absolute',
    bottom: '8px', // <-- Cambio aquí
    left: '8px',   // <-- Cambio aquí
    zIndex: 10,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '28px',
    height: '28px',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    color: 'white',
    borderRadius: '50%',
    textDecoration: 'none',
    transition: 'background-color 0.2s ease',
};

// --- Componente principal del Widget ---
export const AppViewerWidget: FC = () => {
    const { t, i18n } = useTranslation();
    const appUrl = getDirectoAppUrl('index.html', i18n);
    const repoUrl = "https://github.com/jjdeharo/directo/";

    return (
        <div style={widgetStyles}>
            <a
                href={repoUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={infoButtonStyles}
                title={t('widgets.directo_viewer.go_to_repo')}
                onMouseOver={(e) => (e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.6)')}
                onMouseOut={(e) => (e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.3)')}
            >
                <Info size={16} />
            </a>

            <iframe
                src={appUrl}
                title={t('widgets.directo_viewer.title')}
                style={iframeStyles}
                sandbox="allow-scripts allow-same-origin allow-forms"
            />
        </div>
    );
};

// --- Configuración del Widget ---

export { widgetConfig } from './widgetConfig';
