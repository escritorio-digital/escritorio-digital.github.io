import { useState } from 'react';
import type { FC } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { QrCode } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import './QrCodeGenerator.css';
import { WidgetToolbar } from '../../core/WidgetToolbar';

export const QrCodeGeneratorWidget: FC = () => {
  const { t } = useTranslation();
  const [text, setText] = useState('https://escritorio-digital.github.io/');
  const [qrValue, setQrValue] = useState('https://escritorio-digital.github.io/');

  const handleGenerate = () => {
    setQrValue(text);
  };

  return (
    <div className="qr-generator-widget">
      <WidgetToolbar>
        <button onClick={handleGenerate} className="generate-button">
          {t('widgets.qr_code_generator.generate_button')}
        </button>
      </WidgetToolbar>
      <div className="qr-display-area">
        {qrValue ? (
          <QRCodeSVG
            value={qrValue}
            size={256}
            bgColor={"#ffffff"}
            fgColor={"#000000"}
            level={"L"}
            includeMargin={true}
            className="qr-code-svg"
          />
        ) : (
          <div className="qr-placeholder">
            <QrCode size={64} />
            <p>{t('widgets.qr_code_generator.placeholder')}</p>
          </div>
        )}
      </div>
      <div className="qr-controls-area">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={t('widgets.qr_code_generator.input_placeholder')}
          className="qr-input"
        />
      </div>
    </div>
  );
};

export { widgetConfig } from './widgetConfig';
