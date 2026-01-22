import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { FC } from 'react';
import { useTranslation } from 'react-i18next';
import { marked } from 'marked';
import katex from 'katex';
import {
    Bold,
    Italic,
    Strikethrough,
    List,
    ListOrdered,
    Quote,
    Code,
    Code2,
    Heading1,
    Heading2,
    Heading3,
    Link2,
    Sigma,
    Clipboard,
    FolderOpen,
    Save,
    FileText,
    Eye,
    Columns2,
    Text,
    FileCode2,
} from 'lucide-react';

import 'katex/dist/katex.min.css';
import './MarkdownTextEditorWidget.css';
import { downloadBlob, saveToFileManager } from '../../../utils/fileSave';
import { getEntry } from '../../../utils/fileManagerDb';
import { subscribeFileOpen } from '../../../utils/fileOpenBus';
import { requestSaveDestination } from '../../../utils/saveDialog';
import { requestOpenFile } from '../../../utils/openDialog';
import { WidgetToolbar } from '../../core/WidgetToolbar';

const EDICUATEX_ORIGIN = 'https://edicuatex.github.io';

type EdicuatexMessage = {
    type?: string;
    latex?: string;
    wrapped?: string;
    delimiter?: string;
};

type ViewMode = 'split' | 'editor' | 'preview';

function renderMarkdownInto(
    target: HTMLElement,
    input: string,
    options: { katexOutput?: 'html' | 'mathml' | 'htmlAndMathml' } = {}
) {
    const tokens: Array<{ token: string; html: string }> = [];
    const pushToken = (latex: string, displayMode: boolean) => {
        const html = katex.renderToString(latex.trim(), {
            throwOnError: false,
            displayMode,
            output: options.katexOutput,
        });
        const token = `%%MATH_${tokens.length}%%`;
        tokens.push({ token, html });
        return token;
    };
    let working = input;

    working = working.replace(/\\\[((?:.|\n)+?)\\\]/g, (_, latex) => pushToken(latex, true));
    working = working.replace(/\$\$([\s\S]+?)\$\$/g, (_, latex) => pushToken(latex, true));
    working = working.replace(/\\\((.+?)\\\)/g, (_, latex) => pushToken(latex, false));
    working = working.replace(/\$([\s\S]+?)\$/g, (_, latex) => pushToken(latex, false));

    let html = marked.parse(working) as string;
    tokens.forEach(({ token, html: mathHtml }) => {
        html = html.replace(token, mathHtml);
    });

    target.innerHTML = html;
}

export const MarkdownTextEditorWidget: FC<{ instanceId?: string }> = ({ instanceId }) => {
    const { t, i18n, ready } = useTranslation();
    const instanceIdRef = useRef(
        instanceId ?? `markdown-text-editor-${Date.now()}-${Math.random().toString(16).slice(2)}`
    );
    const resolvedInstanceId = instanceId ?? instanceIdRef.current;
    const [input, setInput] = useState<string>(
        t('widgets.markdown_text_editor.sample_content')
    );
    const [feedback, setFeedback] = useState<string>('');
    const [lastSavedSnapshot, setLastSavedSnapshot] = useState<string>('');
    const [viewMode, setViewMode] = useState<ViewMode>('split');
    const [currentFilename, setCurrentFilename] = useState<string | null>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const previewRef = useRef<HTMLDivElement>(null);
    const printRef = useRef<HTMLDivElement>(null);
    const formulaWindowRef = useRef<Window | null>(null);

    const edicuatexBaseUrl = useMemo(() => {
        const url = new URL(`${EDICUATEX_ORIGIN}/index.html`);
        url.searchParams.set('pm', '1');
        url.searchParams.set('origin', window.location.origin);
        return url;
    }, []);

    useEffect(() => {
        const sampleContent = t('widgets.markdown_text_editor.sample_content');
        if (sampleContent !== 'widgets.markdown_text_editor.sample_content') {
            setInput(sampleContent);
        }
    }, [t, i18n.language]);

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


    const updateSelection = (selectionStart: number, selectionEnd: number) => {
        const textarea = textareaRef.current;
        if (!textarea) return;
        requestAnimationFrame(() => {
            textarea.focus();
            textarea.setSelectionRange(selectionStart, selectionEnd);
        });
    };

    const applyWrap = (before: string, after: string, placeholder: string) => {
        const textarea = textareaRef.current;
        if (!textarea) return;
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const selected = input.slice(start, end);
        const content = selected || placeholder;
        const nextValue = `${input.slice(0, start)}${before}${content}${after}${input.slice(end)}`;
        setInput(nextValue);
        updateSelection(start + before.length, start + before.length + content.length);
    };

    const applyLinePrefix = (prefix: string) => {
        const textarea = textareaRef.current;
        if (!textarea) return;
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const value = input;
        const blockStart = value.lastIndexOf('\n', start - 1) + 1;
        const blockEndIndex = value.indexOf('\n', end);
        const blockEnd = blockEndIndex === -1 ? value.length : blockEndIndex;
        const block = value.slice(blockStart, blockEnd);
        const lines = block.split('\n');
        const shouldRemove = lines.every((line) => line.startsWith(prefix));
        const nextBlock = lines
            .map((line) => (shouldRemove ? line.slice(prefix.length) : `${prefix}${line}`))
            .join('\n');
        const nextValue = `${value.slice(0, blockStart)}${nextBlock}${value.slice(blockEnd)}`;
        setInput(nextValue);
        const cursor = blockStart + nextBlock.length;
        updateSelection(cursor, cursor);
    };

    const applyHeading = (level: number) => {
        const prefix = `${'#'.repeat(level)} `;
        const textarea = textareaRef.current;
        if (!textarea) return;
        const start = textarea.selectionStart;
        const value = input;
        const lineStart = value.lastIndexOf('\n', start - 1) + 1;
        const lineEndIndex = value.indexOf('\n', start);
        const lineEnd = lineEndIndex === -1 ? value.length : lineEndIndex;
        const line = value.slice(lineStart, lineEnd);
        const hasPrefix = line.startsWith(prefix);
        const nextLine = hasPrefix ? line.slice(prefix.length) : `${prefix}${line}`;
        const nextValue = `${value.slice(0, lineStart)}${nextLine}${value.slice(lineEnd)}`;
        setInput(nextValue);
        const cursor = lineStart + nextLine.length;
        updateSelection(cursor, cursor);
    };

    const applyCodeBlock = () => {
        const textarea = textareaRef.current;
        if (!textarea) return;
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const selected = input.slice(start, end) || t('widgets.markdown_text_editor.placeholders.code');
        const before = '```\n';
        const after = '\n```';
        const nextValue = `${input.slice(0, start)}${before}${selected}${after}${input.slice(end)}`;
        setInput(nextValue);
        updateSelection(start + before.length, start + before.length + selected.length);
    };

    const applyLink = () => {
        const textarea = textareaRef.current;
        if (!textarea) return;
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const selected = input.slice(start, end) || t('widgets.markdown_text_editor.placeholders.link_text');
        const url = window.prompt(t('widgets.markdown_text_editor.prompts.link_url'));
        if (!url) return;
        const linkText = `[${selected}](${url})`;
        const nextValue = `${input.slice(0, start)}${linkText}${input.slice(end)}`;
        setInput(nextValue);
        updateSelection(start + 1, start + 1 + selected.length);
    };

    const insertAtCursor = useCallback((text: string) => {
        const textarea = textareaRef.current;
        if (!textarea) return;
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        setInput((prev) => `${prev.slice(0, start)}${text}${prev.slice(end)}`);
        updateSelection(start + text.length, start + text.length);
    }, []);

    const handleCopySource = () => {
        navigator.clipboard
            .writeText(input)
            .then(() => showFeedback(t('widgets.markdown_text_editor.source_copied')))
            .catch(() => showFeedback(t('widgets.markdown_text_editor.copy_failed')));
    };

    const handleCopyHtml = () => {
        const container = document.createElement('div');
        try {
            renderMarkdownInto(container, input, { katexOutput: 'html' });
        } catch (error) {
            const message = error instanceof Error ? error.message : t('widgets.markdown_text_editor.preview_error');
            container.innerHTML = `<div class="error-message">${message}</div>`;
        }
        const collectKatexCss = () => {
            let cssText = '';
            for (const sheet of Array.from(document.styleSheets)) {
                try {
                    const rules = Array.from(sheet.cssRules || []);
                    for (const rule of rules) {
                        if (rule.cssText.includes('.katex')) {
                            cssText += rule.cssText;
                        }
                    }
                } catch {
                    // ignore cross-origin stylesheets
                }
            }
            return cssText.trim();
        };
        const katexCss = collectKatexCss();
        const htmlToCopy = katexCss ? `<style>${katexCss}</style>${container.innerHTML}` : container.innerHTML;
        navigator.clipboard
            .writeText(htmlToCopy)
            .then(() => showFeedback(t('widgets.markdown_text_editor.html_copied')))
            .catch(() => showFeedback(t('widgets.markdown_text_editor.copy_failed')));
    };

    const handleSaveToFile = async () => {
        const blob = new Blob([input], { type: 'text/markdown;charset=utf-8' });
        const filename = currentFilename || t('widgets.markdown_text_editor.default_filename');
        const destination = await requestSaveDestination(filename, { sourceWidgetId: 'markdown-text-editor' });
        if (!destination) return;
        if (destination?.destination === 'file-manager') {
            await saveToFileManager({
                blob,
                filename: destination.filename,
                sourceWidgetId: 'markdown-text-editor',
                sourceWidgetTitleKey: 'widgets.markdown_text_editor.title',
                parentId: destination.parentId,
            });
        } else if (destination?.destination === 'download') {
            downloadBlob(blob, destination.filename);
        }
        window.dispatchEvent(
            new CustomEvent('widget-title-update', {
                detail: { instanceId: resolvedInstanceId, title: destination.filename },
            })
        );
        setCurrentFilename(destination.filename);
        window.dispatchEvent(
            new CustomEvent('widget-dirty-state', {
                detail: { instanceId: resolvedInstanceId, widgetId: 'markdown-text-editor', isDirty: false },
            })
        );
        const snapshot = JSON.stringify({ input });
        setLastSavedSnapshot(snapshot);
        window.dispatchEvent(
            new CustomEvent('widget-save-complete', {
                detail: { instanceId: resolvedInstanceId, widgetId: 'markdown-text-editor' },
            })
        );
    };

    const loadFromFile = async (file: File) => {
        const text = await file.text();
        setInput(text);
        setLastSavedSnapshot(JSON.stringify({ input: text }));
        window.dispatchEvent(
            new CustomEvent('widget-title-update', {
                detail: { instanceId: resolvedInstanceId, title: file.name },
            })
        );
        setCurrentFilename(file.name);
        window.dispatchEvent(
            new CustomEvent('widget-dirty-state', {
                detail: { instanceId: resolvedInstanceId, widgetId: 'markdown-text-editor', isDirty: false },
            })
        );
    };

    const handleOpenFile = async () => {
        const result = await requestOpenFile({ accept: '.md,.txt', sourceWidgetId: 'markdown-text-editor' });
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

    const handleExportAsPdf = async () => {
        const dst = printRef.current;
        if (!dst) return;
        renderMarkdownInto(dst, input);
        try {
            await document.fonts?.ready;
        } catch {
            // ignore
        }
        await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
        const cleanup = () => {
            dst.innerHTML = '';
            window.removeEventListener('afterprint', cleanup);
        };
        window.addEventListener('afterprint', cleanup);
        window.print();
    };

    const handleOpenFormulaEditor = () => {
        const selection = textareaRef.current
            ? textareaRef.current.value.slice(
                textareaRef.current.selectionStart,
                textareaRef.current.selectionEnd
            ).trim()
            : '';
        const url = new URL(edicuatexBaseUrl.toString());
        if (selection) {
            url.searchParams.set('sel', selection);
        }

        if (formulaWindowRef.current && !formulaWindowRef.current.closed) {
            formulaWindowRef.current.focus();
            return;
        }
        const nextWindow = window.open(
            url.toString(),
            'edicuatex',
            'width=1100,height=800,menubar=no,toolbar=no,location=no,status=no'
        );
        if (!nextWindow) {
            showFeedback(t('widgets.markdown_text_editor.popup_blocked'));
            return;
        }
        formulaWindowRef.current = nextWindow;
    };

    useEffect(() => {
        const handleMessage = (event: MessageEvent<EdicuatexMessage>) => {
            if (event.origin !== EDICUATEX_ORIGIN) return;
            if (!event.data || event.data.type !== 'edicuatex:result') return;
            const payload = event.data;
            const fallback = payload.latex ? `$$${payload.latex}$$` : '';
            const formula = payload.wrapped || fallback;
            if (!formula) return;
            insertAtCursor(formula);
            if (formulaWindowRef.current && !formulaWindowRef.current.closed) {
                formulaWindowRef.current.close();
            }
            formulaWindowRef.current = null;
        };
        window.addEventListener('message', handleMessage);
        return () => window.removeEventListener('message', handleMessage);
    }, [insertAtCursor]);

    useEffect(() => {
        const previewElement = previewRef.current;
        if (!previewElement) return;
        try {
            renderMarkdownInto(previewElement, input);
        } catch (error) {
            const message = error instanceof Error ? error.message : t('widgets.markdown_text_editor.preview_error');
            previewElement.innerHTML = `<div class="error-message">${message}</div>`;
        }
    }, [input, t]);

    useEffect(() => {
        if (!lastSavedSnapshot) {
            setLastSavedSnapshot(JSON.stringify({ input }));
        }
    }, [input, lastSavedSnapshot]);

    useEffect(() => {
        const unsubscribe = subscribeFileOpen('markdown-text-editor', async ({ entryId }) => {
            const entry = await getEntry(entryId);
            if (!entry?.blob) return;
            const content = await entry.blob.text();
            setInput(content);
            setLastSavedSnapshot(JSON.stringify({ input: content }));
            window.dispatchEvent(
                new CustomEvent('widget-title-update', {
                    detail: { instanceId: resolvedInstanceId, title: entry.name },
                })
            );
            setCurrentFilename(entry.name);
            window.dispatchEvent(
                new CustomEvent('widget-dirty-state', {
                    detail: { instanceId: resolvedInstanceId, widgetId: 'markdown-text-editor', isDirty: false },
                })
            );
        });
        return unsubscribe;
    }, []);

    useEffect(() => {
        const snapshot = JSON.stringify({ input });
        const isDirty = lastSavedSnapshot !== '' && snapshot !== lastSavedSnapshot;
        window.dispatchEvent(
            new CustomEvent('widget-dirty-state', {
                detail: { instanceId: resolvedInstanceId, widgetId: 'markdown-text-editor', isDirty },
            })
        );
    }, [input, lastSavedSnapshot, resolvedInstanceId]);

    useEffect(() => {
        const handler = (event: Event) => {
            const custom = event as CustomEvent<{ instanceId?: string; widgetId?: string }>;
            if (custom.detail?.instanceId !== resolvedInstanceId) return;
            if (custom.detail?.widgetId && custom.detail.widgetId !== 'markdown-text-editor') return;
            handleSaveToFile();
        };
        window.addEventListener('widget-save-request', handler as EventListener);
        return () => window.removeEventListener('widget-save-request', handler as EventListener);
    }, [handleSaveToFile, resolvedInstanceId]);

    useEffect(() => {
        return () => {
            window.dispatchEvent(
                new CustomEvent('widget-dirty-state', {
                    detail: { instanceId: resolvedInstanceId, widgetId: 'markdown-text-editor', isDirty: false },
                })
            );
        };
    }, [resolvedInstanceId]);

    if (!ready) {
        return <div className="flex items-center justify-center h-full">{t('loading')}</div>;
    }

    return (
        <>
            <div
                className={`markdown-text-editor-widget view-${viewMode}`}
            >
                <WidgetToolbar>
                    <div className="markdown-toolbar">
                        <div className="markdown-toolbar-group">
                        <button type="button" title={t('widgets.markdown_text_editor.toolbar.bold')} onClick={() => applyWrap('**', '**', t('widgets.markdown_text_editor.placeholders.text'))}>
                            <Bold size={16} />
                        </button>
                        <button type="button" title={t('widgets.markdown_text_editor.toolbar.italic')} onClick={() => applyWrap('*', '*', t('widgets.markdown_text_editor.placeholders.text'))}>
                            <Italic size={16} />
                        </button>
                        <button type="button" title={t('widgets.markdown_text_editor.toolbar.strike')} onClick={() => applyWrap('~~', '~~', t('widgets.markdown_text_editor.placeholders.text'))}>
                            <Strikethrough size={16} />
                        </button>
                        <button type="button" title={t('widgets.markdown_text_editor.toolbar.h1')} onClick={() => applyHeading(1)}>
                            <Heading1 size={16} />
                        </button>
                        <button type="button" title={t('widgets.markdown_text_editor.toolbar.h2')} onClick={() => applyHeading(2)}>
                            <Heading2 size={16} />
                        </button>
                        <button type="button" title={t('widgets.markdown_text_editor.toolbar.h3')} onClick={() => applyHeading(3)}>
                            <Heading3 size={16} />
                        </button>
                        <button type="button" title={t('widgets.markdown_text_editor.toolbar.bullet_list')} onClick={() => applyLinePrefix('- ')}>
                            <List size={16} />
                        </button>
                        <button type="button" title={t('widgets.markdown_text_editor.toolbar.ordered_list')} onClick={() => applyLinePrefix('1. ')}>
                            <ListOrdered size={16} />
                        </button>
                        <button type="button" title={t('widgets.markdown_text_editor.toolbar.quote')} onClick={() => applyLinePrefix('> ')}>
                            <Quote size={16} />
                        </button>
                        <button type="button" title={t('widgets.markdown_text_editor.toolbar.inline_code')} onClick={() => applyWrap('`', '`', t('widgets.markdown_text_editor.placeholders.code'))}>
                            <Code size={16} />
                        </button>
                        <button type="button" title={t('widgets.markdown_text_editor.toolbar.code_block')} onClick={applyCodeBlock}>
                            <Code2 size={16} />
                        </button>
                        <button type="button" title={t('widgets.markdown_text_editor.toolbar.link')} onClick={applyLink}>
                            <Link2 size={16} />
                        </button>
                        </div>
                        <div className="markdown-toolbar-group">
                        {feedback && <span className="feedback-message">{feedback}</span>}
                        <button
                            type="button"
                            title={t('widgets.markdown_text_editor.toolbar.view_split')}
                            onClick={() => setViewMode('split')}
                            className={viewMode === 'split' ? 'is-active' : ''}
                        >
                            <Columns2 size={16} />
                        </button>
                        <button
                            type="button"
                            title={t('widgets.markdown_text_editor.toolbar.view_editor')}
                            onClick={() => setViewMode('editor')}
                            className={viewMode === 'editor' ? 'is-active' : ''}
                        >
                            <Text size={16} />
                        </button>
                        <button
                            type="button"
                            title={t('widgets.markdown_text_editor.toolbar.view_preview')}
                            onClick={() => setViewMode('preview')}
                            className={viewMode === 'preview' ? 'is-active' : ''}
                        >
                            <Eye size={16} />
                        </button>
                        {/* Zoom moved to window menu */}
                        <button type="button" title={t('widgets.markdown_text_editor.toolbar.formula')} onClick={handleOpenFormulaEditor}>
                            <Sigma size={16} />
                        </button>
                        <button type="button" title={t('widgets.markdown_text_editor.toolbar.copy_source')} onClick={handleCopySource}>
                            <Clipboard size={16} />
                        </button>
                        <button type="button" title={t('widgets.markdown_text_editor.toolbar.copy_html')} onClick={handleCopyHtml}>
                            <FileCode2 size={16} />
                        </button>
                        <button type="button" title={t('widgets.markdown_text_editor.toolbar.open_file')} onClick={handleOpenFile}>
                            <FolderOpen size={16} />
                        </button>
                        <button type="button" title={t('widgets.markdown_text_editor.toolbar.save_file')} onClick={handleSaveToFile}>
                            <Save size={16} />
                        </button>
                        <button type="button" title={t('widgets.markdown_text_editor.toolbar.export_pdf')} onClick={handleExportAsPdf}>
                            <FileText size={16} />
                        </button>
                        </div>
                    </div>
                </WidgetToolbar>

                <div className="markdown-body">
                    <div className="markdown-pane markdown-editor-pane">
                        <div className="markdown-pane-header">{t('widgets.markdown_text_editor.editor_title')}</div>
                        <textarea
                            ref={textareaRef}
                            value={input}
                            onChange={(event) => setInput(event.target.value)}
                            spellCheck
                            className="editor-textarea"
                        />
                    </div>
                    <div className="markdown-pane markdown-preview-pane">
                        <div className="markdown-pane-header">{t('widgets.markdown_text_editor.preview_title')}</div>
                        <div className="preview-pane prose" ref={previewRef} />
                    </div>
                </div>
            </div>

            <div id="markdown-text-editor-print" ref={printRef} className="prose"></div>

        </>
    );
};

export { widgetConfig } from './widgetConfig';
