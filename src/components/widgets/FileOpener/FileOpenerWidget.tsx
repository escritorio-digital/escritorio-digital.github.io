import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { FC } from 'react';
import { useTranslation } from 'react-i18next';
import { FolderOpen, FileText } from 'lucide-react';
import { marked } from 'marked';
import katex from 'katex';
import './FileOpenerWidget.css';
import 'katex/dist/katex.min.css';
import { getEntry } from '../../../utils/fileManagerDb';
import { subscribeFileOpen } from '../../../utils/fileOpenBus';
import { requestOpenFile } from '../../../utils/openDialog';
import { WidgetToolbar } from '../../core/WidgetToolbar';

type DisplayType = 'none' | 'image' | 'pdf' | 'text' | 'markdown' | 'video' | 'audio' | 'html';

function renderMarkdownWithLatex(input: string): string {
  const tokens: Array<{ id: number; latex: string; displayMode: boolean }> = [];
  let tokenized = input.replace(/\$\$([\s\S]+?)\$\$/g, (_, latex) => {
    const id = tokens.length;
    tokens.push({ id, latex, displayMode: true });
    return `@@LATEX_BLOCK_${id}@@`;
  });
  tokenized = tokenized.replace(/\$(?!\$)([^\n$]+?)\$/g, (_, latex) => {
    const id = tokens.length;
    tokens.push({ id, latex, displayMode: false });
    return `@@LATEX_INLINE_${id}@@`;
  });

  let html = marked.parse(tokenized) as string;
  for (const token of tokens) {
    const placeholder = token.displayMode ? `@@LATEX_BLOCK_${token.id}@@` : `@@LATEX_INLINE_${token.id}@@`;
    const rendered = katex.renderToString(token.latex.trim(), {
      throwOnError: false,
      displayMode: token.displayMode,
    });
    html = html.split(placeholder).join(rendered);
  }
  return html;
}

export const FileOpenerWidget: FC = () => {
  const { t } = useTranslation();
  const markdownRef = useRef<HTMLDivElement>(null);
  const [displayType, setDisplayType] = useState<DisplayType>('none');
  const [fileName, setFileName] = useState('');
  const [fileUrl, setFileUrl] = useState('');
  const [fileContent, setFileContent] = useState('');

  useEffect(() => {
    return () => {
      if (fileUrl) {
        URL.revokeObjectURL(fileUrl);
      }
    };
  }, [fileUrl]);

  const handlePick = async () => {
    const result = await requestOpenFile({
      accept: 'image/*,application/pdf,text/plain,text/markdown,text/html,video/*,audio/*,.md,.markdown,.txt,.html,.htm,.xhtml',
    });
    if (!result) return;
    if (result.source === 'local') {
      const [file] = result.files;
      if (file) openFile(file);
      return;
    }
    const [entryId] = result.entryIds;
    if (!entryId) return;
    const entry = await getEntry(entryId);
    if (!entry?.blob) return;
    const file = new File([entry.blob], entry.name, { type: entry.mime || entry.blob.type });
    openFile(file);
  };

  const openFile = useCallback(async (file: File) => {
    if (fileUrl) URL.revokeObjectURL(fileUrl);
    setFileUrl('');
    setFileContent('');
    const name = file.name;
    const lower = name.toLowerCase();
    const isImage = file.type.startsWith('image/') || lower.match(/\.(png|jpe?g|gif|webp|bmp|svg)$/);
    const isPdf = file.type === 'application/pdf' || lower.endsWith('.pdf');
    const isMarkdown = lower.endsWith('.md') || lower.endsWith('.markdown');
    const isHtml = file.type === 'text/html' || lower.match(/\.(html?|xhtml)$/);
    const isText = (file.type.startsWith('text/') && !isHtml) || lower.endsWith('.txt');
    const isVideo = file.type.startsWith('video/') || lower.match(/\.(mp4|webm|ogg|mov)$/);
    const isAudio = file.type.startsWith('audio/') || lower.match(/\.(mp3|wav|ogg|m4a|aac|flac)$/);

    setFileName(name);

    if (isImage) {
      const url = URL.createObjectURL(file);
      setFileUrl(url);
      setDisplayType('image');
      return;
    }
    if (isPdf) {
      const url = URL.createObjectURL(file);
      setFileUrl(url);
      setDisplayType('pdf');
      return;
    }
    if (isMarkdown) {
      const content = await file.text();
      setDisplayType('markdown');
      setFileContent(content);
      setFileUrl('');
      return;
    }
    if (isHtml) {
      const url = URL.createObjectURL(file);
      setFileUrl(url);
      setDisplayType('html');
      return;
    }
    if (isText) {
      const content = await file.text();
      setDisplayType('text');
      setFileContent(content);
      setFileUrl('');
      return;
    }
    if (isVideo) {
      const url = URL.createObjectURL(file);
      setFileUrl(url);
      setDisplayType('video');
      return;
    }
    if (isAudio) {
      const url = URL.createObjectURL(file);
      setFileUrl(url);
      setDisplayType('audio');
      return;
    }

    const url = URL.createObjectURL(file);
    window.open(url, '_blank');
    window.setTimeout(() => URL.revokeObjectURL(url), 60000);
  }, [fileUrl]);

  useEffect(() => {
    const unsubscribe = subscribeFileOpen('file-opener', async ({ entryId }) => {
      const entry = await getEntry(entryId);
      if (!entry?.blob) return;
      const file = new File([entry.blob], entry.name, { type: entry.mime || entry.blob.type });
      await openFile(file);
    });
    return unsubscribe;
  }, [openFile]);

  const markdownHtml = useMemo(() => {
    if (displayType !== 'markdown' || !fileContent) return '';
    return renderMarkdownWithLatex(fileContent);
  }, [displayType, fileContent]);

  useEffect(() => {
    const node = markdownRef.current;
    if (!node) return;
    node.innerHTML = markdownHtml;
  }, [markdownHtml]);

  const isDocument = displayType === 'text' || displayType === 'markdown';

  return (
    <div className="file-opener-widget">
      <WidgetToolbar>
        <div className="file-opener-header">
          <FolderOpen size={18} />
          <span>{fileName || t('widgets.file_opener.title')}</span>
          <div className="file-opener-spacer" />
          <button
            onClick={handlePick}
            className="file-opener-icon-button"
            title={t('widgets.file_opener.open_button')}
            aria-label={t('widgets.file_opener.open_button')}
          >
            <FolderOpen size={16} />
          </button>
        </div>
      </WidgetToolbar>
      <div
        className={`file-opener-body${isDocument ? ' file-opener-body-doc' : ''}`}
        onClick={displayType === 'none' ? handlePick : undefined}
      >
        {displayType === 'none' && (
          <div className="file-opener-placeholder">
            <FolderOpen size={32} />
            <p>{t('widgets.file_opener.description')}</p>
            <p className="file-opener-hint">{t('widgets.file_opener.supported_formats')}</p>
          </div>
        )}
        {displayType === 'image' && fileUrl && (
          <img src={fileUrl} alt={fileName} className="file-opener-image" />
        )}
        {displayType === 'pdf' && fileUrl && (
          <object data={fileUrl} type="application/pdf" className="file-opener-embed">
            <div className="file-opener-placeholder">
              <FileText size={24} />
              <p>{t('widgets.file_opener.pdf_fallback')}</p>
            </div>
          </object>
        )}
        {displayType === 'html' && fileUrl && (
          <iframe
            className="file-opener-embed"
            src={fileUrl}
            title={fileName || t('widgets.file_opener.title')}
            sandbox="allow-same-origin allow-scripts allow-forms"
          />
        )}
        {displayType === 'video' && fileUrl && (
          <video className="file-opener-video" controls src={fileUrl} />
        )}
        {displayType === 'audio' && fileUrl && (
          <audio className="file-opener-audio" controls src={fileUrl} />
        )}
        {displayType === 'text' && (
          <pre className="file-opener-text">{fileContent}</pre>
        )}
        {displayType === 'markdown' && (
          <div className="file-opener-markdown prose" ref={markdownRef} />
        )}
      </div>
    </div>
  );
};

export { widgetConfig } from './widgetConfig';
