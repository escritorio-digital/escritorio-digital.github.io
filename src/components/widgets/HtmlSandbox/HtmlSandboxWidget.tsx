import { useState } from 'react';
import type { FC } from 'react';
import { Eye, Code } from 'lucide-react';
import './HtmlSandboxWidget.css';
import { useTranslation } from 'react-i18next';
import { WidgetToolbar } from '../../core/WidgetToolbar';

export const HtmlSandboxWidget: FC = () => {
  const { t } = useTranslation();
  const [code, setCode] = useState(() => (
    '<!DOCTYPE html>\n<html>\n<head>\n  <style>\n    body { font-family: sans-serif; background-color: #282c34; color: white; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }\n    h1 { color: #61dafb; }\n  </style>\n</head>\n<body>\n  <h1>' + t('widgets.html_sandbox.paste_code_here') + '</h1>\n  <script>\n    // ' + t('widgets.html_sandbox.your_javascript') + '\n  </script>\n</body>\n</html>'
  ));
  const [isEditorVisible, setIsEditorVisible] = useState(true);

  return (
    <div className="html-sandbox-widget">
      <WidgetToolbar>
        <button
          onClick={() => setIsEditorVisible(!isEditorVisible)}
          className="toggle-view-button"
          title={isEditorVisible ? t('widgets.html_sandbox.show_preview') : t('widgets.html_sandbox.show_code')}
        >
          {isEditorVisible ? <Eye size={20} /> : <Code size={20} />}
        </button>
      </WidgetToolbar>

      {isEditorVisible && (
        <div className="editor-area">
          <textarea
            value={code}
            onChange={(e) => setCode(e.target.value)}
            spellCheck="false"
            className="code-textarea"
          />
        </div>
      )}

      <div className={`preview-area ${isEditorVisible ? 'hidden' : ''}`}>
        <iframe
          srcDoc={code}
          title={t('widgets.html_sandbox.preview_title')}
          sandbox="allow-scripts"
          className="preview-iframe"
        />
      </div>
    </div>
  );
};

export { widgetConfig } from './widgetConfig';
