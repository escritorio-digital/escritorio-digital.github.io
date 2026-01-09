import { useEffect, useRef, useState } from 'react';
import type { FC } from 'react';
import { useTranslation } from 'react-i18next';
import type { WidgetConfig } from '../../../types';
import { FileText, Link } from 'lucide-react';
import './PdfViewerWidget.css';

export const PdfViewerWidget: FC = () => {
  const { t } = useTranslation();
  const [urlInput, setUrlInput] = useState('');
  const [pdfUrl, setPdfUrl] = useState('');
  const objectUrlRef = useRef<string | null>(null);

  const cleanupObjectUrl = () => {
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
  };

  useEffect(() => {
    return () => cleanupObjectUrl();
  }, []);

  const handleLoadUrl = () => {
    const nextUrl = urlInput.trim();
    if (!nextUrl) return;
    cleanupObjectUrl();
    setPdfUrl(nextUrl);
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    cleanupObjectUrl();
    const objectUrl = URL.createObjectURL(file);
    objectUrlRef.current = objectUrl;
    setPdfUrl(objectUrl);
  };

  return (
    <div className="pdf-viewer-widget">
      <div className="pdf-controls">
        <Link size={18} className="pdf-icon" />
        <input
          type="text"
          value={urlInput}
          onChange={(e) => setUrlInput(e.target.value)}
          placeholder={t('widgets.pdf_viewer.url_placeholder')}
          onKeyPress={(e) => e.key === 'Enter' && handleLoadUrl()}
          className="pdf-url-input"
        />
        <button onClick={handleLoadUrl} className="pdf-action-button">
          {t('widgets.pdf_viewer.load_button')}
        </button>
        <label className="pdf-action-button pdf-upload-button">
          {t('widgets.pdf_viewer.upload_button')}
          <input type="file" accept="application/pdf" onChange={handleFileChange} hidden />
        </label>
      </div>
      <div className="pdf-container">
        {pdfUrl ? (
          <object data={pdfUrl} type="application/pdf" className="pdf-embed">
            <div className="pdf-placeholder">
              <FileText size={28} />
              <p>{t('widgets.pdf_viewer.empty_state')}</p>
            </div>
          </object>
        ) : (
          <div className="pdf-placeholder">
            <FileText size={28} />
            <p>{t('widgets.pdf_viewer.empty_state')}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export const widgetConfig: Omit<WidgetConfig, 'component'> = {
  id: 'pdf-viewer',
  title: 'widgets.pdf_viewer.title',
  icon: <img src="/icons/Pdf.png" alt="PDF" width={52} height={52} />,
  defaultSize: { width: 720, height: 520 },
};
