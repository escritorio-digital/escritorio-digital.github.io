// src/components/widgets/LatexMarkdown/LatexMarkdownWidget.tsx

import { useState, useEffect, useRef } from 'react';
import type { FC } from 'react';
import { useTranslation } from 'react-i18next';
import { marked } from 'marked';
import katex from 'katex';
import { toPng } from 'html-to-image'; // para "Copiar como imagen"
import { Clipboard, Image as ImageIcon, FileText, FolderOpen, Save } from 'lucide-react';

import 'katex/dist/katex.min.css';
import './LatexMarkdownWidget.css';
import { downloadBlob, saveToFileManager } from '../../../utils/fileSave';
import { getEntry } from '../../../utils/fileManagerDb';
import { subscribeFileOpen } from '../../../utils/fileOpenBus';
import { requestSaveDestination } from '../../../utils/saveDialog';
import { requestOpenFile } from '../../../utils/openDialog';

type Mode = 'markdown' | 'latex';

/** Lee las @font-face de las hojas de estilo para incrustarlas cuando copiamos como imagen */
async function getFontEmbedCSS(): Promise<string> {
  let cssText = '';
  for (const sheet of Array.from(document.styleSheets)) {
    try {
      if (sheet.cssRules) {
        for (const rule of Array.from(sheet.cssRules)) {
          cssText += rule.cssText;
        }
      }
    } catch {
      // hojas con CORS: las ignoramos
    }
  }
  return cssText;
}

/** Renderiza el contenido (Markdown+KaTeX o KaTeX puro) en un elemento destino */
function renderContentInto(target: HTMLElement, mode: Mode, input: string) {
  target.innerHTML = '';
  if (mode === 'markdown') {
    const html = marked.parse(input) as string;
    target.innerHTML = html;

    // $$...$$ (display)
    target.innerHTML = target.innerHTML.replace(
      /\$\$([^$]+)\$\$/g,
      (_, latex) => katex.renderToString(latex.trim(), { throwOnError: false, displayMode: true })
    );
    // $...$ (inline)
    target.innerHTML = target.innerHTML.replace(
      /\$([^$]+)\$/g,
      (_, latex) => katex.renderToString(latex.trim(), { throwOnError: false, displayMode: false })
    );
  } else {
    katex.render(input, target, { throwOnError: true, displayMode: true });
  }
}

export const LatexMarkdownWidget: FC = () => {
  const { t, i18n, ready } = useTranslation();
  const [input, setInput] = useState<string>('# Teorema de Pitágoras\n\nEn un triángulo rectángulo, el cuadrado de la hipotenusa es igual a la suma de los cuadrados de los catetos.\n\n$$c = \\sqrt{a^2 + b^2}$$');
  
  // Actualizar contenido cuando cambie el idioma
  useEffect(() => {
    const sampleContent = t('widgets.latex_markdown.sample_content');
    if (sampleContent !== 'widgets.latex_markdown.sample_content') {
      setInput(sampleContent);
    }
  }, [t, i18n.language]);
  const [mode, setMode] = useState<Mode>('markdown');
  const [feedback, setFeedback] = useState<string>('');
  const previewRef = useRef<HTMLDivElement>(null);
  const printRef = useRef<HTMLDivElement>(null);

  // EFECTO: Mueve el nodo de impresión al body al montar el componente
  // para que no herede estilos y la estrategia de impresión sea más robusta.
  useEffect(() => {
    const node = printRef.current;
    if (!node) return;
    
    document.body.appendChild(node);
    
    return () => {
      if (node.parentNode) {
        node.parentNode.removeChild(node);
      }
    };
  }, []);

  const showFeedback = (message: string) => {
    setFeedback(message);
    setTimeout(() => setFeedback(''), 1800);
  };

  const handleCopySource = () => {
    navigator.clipboard
      .writeText(input)
      .then(() => showFeedback(t('widgets.latex_markdown.source_copied')))
      .catch(() => showFeedback(t('widgets.latex_markdown.copy_failed')));
  };

  const handleCopyAsImage = async () => {
    const element = previewRef.current;
    if (!element) return;

    const fontEmbedCSS = await getFontEmbedCSS();

    try {
      const dataUrl = await toPng(element, {
        backgroundColor: '#ffffff',
        fontEmbedCSS,
      });
      const blob = await (await fetch(dataUrl)).blob();
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
      showFeedback(t('widgets.latex_markdown.image_copied'));
    } catch {
      showFeedback(t('widgets.latex_markdown.copy_image_failed'));
    }
  };

  const handleSaveToFile = async () => {
    const extension = mode === 'latex' ? 'tex' : 'md';
    const mimeType = mode === 'latex' ? 'text/x-latex' : 'text/markdown';
    const blob = new Blob([input], { type: `${mimeType};charset=utf-8` });
    const filename = `documento.${extension}`;
    const destination = await requestSaveDestination(filename);
    if (destination?.destination === 'file-manager') {
      await saveToFileManager({
        blob,
        filename: destination.filename,
        sourceWidgetId: 'latex-markdown',
        sourceWidgetTitleKey: 'widgets.latex_markdown.title',
        parentId: destination.parentId,
      });
      return;
    }
    if (destination?.destination === 'download') {
      downloadBlob(blob, destination.filename);
    }
  };

  const loadFromFile = async (file: File) => {
    const text = await file.text();
    const lower = file.name.toLowerCase();
    setMode(lower.endsWith('.tex') ? 'latex' : 'markdown');
    setInput(text);
  };

  const handleOpenFile = async () => {
    const result = await requestOpenFile({ accept: '.md,.tex,.txt' });
    if (!result) return;
    if (result.source === 'local') {
      const [file] = result.files;
      if (file) await loadFromFile(file);
      return;
    }
    const [entryId] = result.entryIds;
    if (!entryId) return;
    const entry = await getEntry(entryId);
    if (!entry?.blob) return;
    const file = new File([entry.blob], entry.name, { type: entry.mime || entry.blob.type });
    await loadFromFile(file);
  };

  const handleExportAsPdfText = async () => {
    const dst = printRef.current;
    if (!dst) return;

    renderContentInto(dst, mode, input);

    try {
      await document.fonts?.ready;
    } catch {}
    await new Promise<void>((r) => requestAnimationFrame(() => r()));

    const cleanup = () => {
      dst.innerHTML = '';
      window.removeEventListener('afterprint', cleanup);
    };
    window.addEventListener('afterprint', cleanup);

    window.print();
  };

  useEffect(() => {
    const previewElement = previewRef.current;
    if (!previewElement) return;

    try {
      renderContentInto(previewElement, mode, input);
    } catch (error) {
      if (mode === 'latex' && error instanceof Error) {
        const title = t('widgets.latex_markdown.latex_mode_title');
        const description = t('widgets.latex_markdown.latex_mode_description');
        const howToProceed = t('widgets.latex_markdown.how_to_proceed');
        const isolatedFormula = t('widgets.latex_markdown.isolated_formula');
        const textWithFormulas = t('widgets.latex_markdown.text_with_formulas');
        const markdown = t('widgets.latex_markdown.markdown');
        
        previewElement.innerHTML = `
          <div class="friendly-error-pane">
            <h3>${title}</h3>
            <p>${description}</p>
            <h4>${howToProceed}</h4>
            <ul>
              <li>${isolatedFormula} <code>c = \\\\sqrt{a^2 + b^2}</code>.</li>
              <li>${textWithFormulas} <strong>${markdown}</strong>.</li>
            </ul>
          </div>
        `;
      } else if (error instanceof Error) {
        const syntaxError = t('widgets.latex_markdown.latex_syntax_error');
        previewElement.innerHTML = `<div class="error-message">${syntaxError} ${error.message}</div>`;
      } else {
        const genericError = t('widgets.latex_markdown.generic_error');
        previewElement.innerHTML = `<div class="error-message">${genericError}</div>`;
      }
    }
  }, [input, mode]);

  useEffect(() => {
    const unsubscribe = subscribeFileOpen('latex-markdown', async ({ entryId }) => {
      const entry = await getEntry(entryId);
      if (!entry?.blob) return;
      const content = await entry.blob.text();
      const lower = entry.name.toLowerCase();
      setMode(lower.endsWith('.tex') ? 'latex' : 'markdown');
      setInput(content);
    });
    return unsubscribe;
  }, []);

  // Si las traducciones no están listas, mostrar un loader simple
  if (!ready) {
    return <div className="flex items-center justify-center h-full">{t('loading')}</div>;
  }

  return (
    <>
      <div className="latex-markdown-widget">
        <div className="editor-pane">
          <div className="mode-selector">
            <button onClick={() => setMode('markdown')} className={mode === 'markdown' ? 'active' : ''}>
              Markdown
            </button>
            <button onClick={() => setMode('latex')} className={mode === 'latex' ? 'active' : ''}>
              LaTeX
            </button>
          </div>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            spellCheck="false"
            className="editor-textarea"
          />
        </div>
        <div className="preview-container">
          <div className="preview-toolbar">
            {feedback && <span className="feedback-message">{feedback}</span>}
            <button title={t('widgets.latex_markdown.copy_source')} onClick={handleCopySource}>
              <Clipboard size={18} />
            </button>
            <button title={t('widgets.latex_markdown.copy_image')} onClick={handleCopyAsImage}>
              <ImageIcon size={18} />
            </button>
            <button title={t('widgets.latex_markdown.open_file')} onClick={handleOpenFile}>
              <FolderOpen size={18} />
            </button>
            <button title={t('widgets.latex_markdown.save_file')} onClick={handleSaveToFile}>
              <Save size={18} />
            </button>
            <button title={t('widgets.latex_markdown.export_pdf')} onClick={handleExportAsPdfText}>
              <FileText size={18} />
            </button>
          </div>
          <div className="preview-pane prose" ref={previewRef} />
        </div>
      </div>

      {/* Este div se renderiza aquí, pero el useEffect lo mueve al body */}
      <div id="print-root" ref={printRef} className="prose"></div>
    </>
  );
};

export { widgetConfig } from './widgetConfig';
