import { useCallback, useEffect, useRef, useState } from 'react';
import type { FC, CSSProperties } from 'react';
import { useEditor, EditorContent, Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Heading as TiptapHeadingExtension } from '@tiptap/extension-heading';
import { marked } from 'marked';
import TurndownService from 'turndown';
import { useLocalStorage } from '../../../hooks/useLocalStorage';
import { useTranslation } from 'react-i18next';
import './Notepad.css';
import { downloadBlob, saveToFileManager } from '../../../utils/fileSave';
import { getEntry } from '../../../utils/fileManagerDb';
import { subscribeFileOpen } from '../../../utils/fileOpenBus';
import { requestSaveDestination } from '../../../utils/saveDialog';
import { requestOpenFile } from '../../../utils/openDialog';
import {
  Bold,
  Italic,
  Strikethrough,
  List,
  ListOrdered,
  FolderOpen,
  Save,
  Text,
  Heading1,
  Heading2,
  Heading3,
  Clipboard,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';

const MenuBar: FC<{
  editor: Editor | null;
  onUpload: () => void;
  onDownload: () => void;
  zoomLevel: number;
  onZoomChange: (nextZoom: number) => void;
  onZoomReset: () => void;
}> = ({ editor, onUpload, onDownload, zoomLevel, onZoomChange, onZoomReset }) => {
  const { t } = useTranslation();
  const [isEditingZoom, setIsEditingZoom] = useState(false);
  const [zoomDraft, setZoomDraft] = useState(`${Math.round(zoomLevel * 100)}`);
  const zoomClickTimer = useRef<number | null>(null);

  useEffect(() => {
    if (!isEditingZoom) {
      setZoomDraft(`${Math.round(zoomLevel * 100)}`);
    }
  }, [zoomLevel, isEditingZoom]);

  if (!editor) {
    return null;
  }

  const handleCopy = async () => {
    const { from, to } = editor.state.selection;
    const selection = editor.state.doc.textBetween(from, to, '\n', '\n').trim();
    const text = selection || editor.state.doc.textBetween(0, editor.state.doc.content.size, '\n', '\n').trim();
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // silent fail: clipboard might be blocked
    }
  };

  const menuButtons = [
    { Icon: Bold, action: () => editor.chain().focus().toggleBold().run(), name: 'bold', title: t('widgets.notepad.menubar.bold') },
    { Icon: Italic, action: () => editor.chain().focus().toggleItalic().run(), name: 'italic', title: t('widgets.notepad.menubar.italic') },
    { Icon: Strikethrough, action: () => editor.chain().focus().toggleStrike().run(), name: 'strike', title: t('widgets.notepad.menubar.strike') },
    { Icon: List, action: () => editor.chain().focus().toggleBulletList().run(), name: 'bulletList', title: t('widgets.notepad.menubar.bullet_list') },
    { Icon: ListOrdered, action: () => editor.chain().focus().toggleOrderedList().run(), name: 'orderedList', title: t('widgets.notepad.menubar.ordered_list') },
    { Icon: Text, action: () => editor.chain().focus().setParagraph().run(), name: 'paragraph', title: t('widgets.notepad.menubar.paragraph') },
    { Icon: Heading1, action: () => editor.chain().focus().toggleHeading({ level: 1 }).run(), name: 'heading', level: 1, title: t('widgets.notepad.menubar.h1') },
    { Icon: Heading2, action: () => editor.chain().focus().toggleHeading({ level: 2 }).run(), name: 'heading', level: 2, title: t('widgets.notepad.menubar.h2') },
    { Icon: Heading3, action: () => editor.chain().focus().toggleHeading({ level: 3 }).run(), name: 'heading', level: 3, title: t('widgets.notepad.menubar.h3') },
    { Icon: Clipboard, action: handleCopy, name: 'copy', title: t('widgets.notepad.menubar.copy') },
  ];

  return (
    <div className="menubar flex flex-wrap items-center gap-1 p-2 bg-gray-100 border-b border-accent">
      {menuButtons.map(({ Icon, action, name, title, level }) => (
        <button
          key={name + (level || '')}
          onClick={action}
          className={`p-2 rounded hover:bg-gray-200 ${editor.isActive(name, level ? { level } : undefined) ? 'is-active' : ''}`}
          title={title}
        >
          <Icon size={16} />
        </button>
      ))}
      <div className="menubar-zoom">
        <button
          onClick={() => onZoomChange(zoomLevel - 0.1)}
          className="p-2 rounded hover:bg-gray-200"
          title={t('widgets.notepad.menubar.zoom_out')}
        >
          <ZoomOut size={16} />
        </button>
        <button
          onClick={() => onZoomChange(zoomLevel + 0.1)}
          className="p-2 rounded hover:bg-gray-200"
          title={t('widgets.notepad.menubar.zoom_in')}
        >
          <ZoomIn size={16} />
        </button>
        {isEditingZoom ? (
          <input
            type="number"
            min={75}
            max={500}
            step={1}
            value={zoomDraft}
            onChange={(event) => setZoomDraft(event.target.value)}
            onBlur={() => {
              const value = Number.parseFloat(zoomDraft);
              if (!Number.isNaN(value)) {
                onZoomChange(value / 100);
              }
              setIsEditingZoom(false);
            }}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                const value = Number.parseFloat(zoomDraft);
                if (!Number.isNaN(value)) {
                  onZoomChange(value / 100);
                }
                setIsEditingZoom(false);
              }
              if (event.key === 'Escape') {
                setIsEditingZoom(false);
              }
            }}
            className="zoom-input p-2 rounded border border-gray-300"
            title={t('widgets.notepad.menubar.zoom_reset')}
          />
        ) : (
          <button
            onClick={() => {
              if (zoomClickTimer.current) {
                window.clearTimeout(zoomClickTimer.current);
              }
              zoomClickTimer.current = window.setTimeout(() => {
                onZoomReset();
                zoomClickTimer.current = null;
              }, 200);
            }}
            onDoubleClick={() => {
              if (zoomClickTimer.current) {
                window.clearTimeout(zoomClickTimer.current);
                zoomClickTimer.current = null;
              }
              setIsEditingZoom(true);
            }}
            className="p-2 rounded hover:bg-gray-200"
            title={t('widgets.notepad.menubar.zoom_edit_hint')}
          >
            {Math.round(zoomLevel * 100)}%
          </button>
        )}
      </div>
      <div className="menubar-actions">
        <button onClick={onUpload} className="p-2 rounded hover:bg-gray-200" title={t('widgets.notepad.menubar.upload')}>
            <FolderOpen size={16} />
        </button>
        <button onClick={onDownload} className="p-2 rounded hover:bg-gray-200" title={t('widgets.notepad.menubar.download')}>
            <Save size={16} />
        </button>
      </div>
    </div>
  );
};

export const NotepadWidget: React.FC<{ instanceId?: string }> = ({ instanceId }) => {
  const { t } = useTranslation();
  const instanceIdRef = useRef(instanceId ?? `notepad-${Date.now()}-${Math.random().toString(16).slice(2)}`);
  const resolvedInstanceId = instanceId ?? instanceIdRef.current;
  const storageKey = `notepad-content-${resolvedInstanceId}`;
  const [content, setContent] = useLocalStorage(storageKey, t('widgets.notepad.initial_content'));
  const [lastSavedContent, setLastSavedContent] = useState(content);
  const [isDirty, setIsDirty] = useState(false);
  const [currentFilename, setCurrentFilename] = useState<string | null>(null);
  const [zoomLevel, setZoomLevel] = useState(1);
  const turndownService = new TurndownService();

  const handleZoomChange = (nextZoom: number) => {
    const clamped = Math.min(5, Math.max(0.75, nextZoom));
    setZoomLevel(clamped);
  };

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: false,
        codeBlock: false,
      }),
      TiptapHeadingExtension.configure({ levels: [1, 2, 3] }),
    ],
    content: content,
    onUpdate: ({ editor }) => {
      setContent(editor.getHTML());
    },
    editorProps: {
        attributes: {
          class: 'prose dark:prose-invert max-w-none',
        },
    },
  });

  const handleDownload = useCallback(async () => {
    if (!editor) return;
    const htmlContent = editor.getHTML();
    const markdownContent = turndownService.turndown(htmlContent);

    const blob = new Blob([markdownContent], { type: 'text/markdown;charset=utf-8;' });
    const filename = currentFilename || t('widgets.notepad.default_filename');
    const destination = await requestSaveDestination(filename);
    if (!destination) return;
    if (destination?.destination === 'file-manager') {
      await saveToFileManager({
        blob,
        filename: destination.filename,
        sourceWidgetId: 'notepad',
        sourceWidgetTitleKey: 'widgets.notepad.title',
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
        detail: { instanceId: resolvedInstanceId, widgetId: 'notepad', isDirty: false },
      })
    );
    setLastSavedContent(htmlContent);
    setIsDirty(false);
    window.dispatchEvent(new CustomEvent('widget-save-complete', { detail: { instanceId: resolvedInstanceId, widgetId: 'notepad' } }));
  }, [editor, resolvedInstanceId, t, turndownService]);

  const loadFromFile = async (file: File) => {
    if (!editor) return;
    const text = await file.text();
    const htmlContent = await marked.parse(text);
    editor.commands.setContent(htmlContent);
    setLastSavedContent(htmlContent);
    setIsDirty(false);
    window.dispatchEvent(
      new CustomEvent('widget-title-update', {
        detail: { instanceId: resolvedInstanceId, title: file.name },
      })
    );
    setCurrentFilename(file.name);
    window.dispatchEvent(
      new CustomEvent('widget-dirty-state', {
        detail: { instanceId: resolvedInstanceId, widgetId: 'notepad', isDirty: false },
      })
    );
  };

  const handleOpenFile = async () => {
    const result = await requestOpenFile({ accept: '.md,.txt' });
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

  useEffect(() => {
    if (!editor) return;
    const unsubscribe = subscribeFileOpen('notepad', async ({ entryId }) => {
      const entry = await getEntry(entryId);
      if (!entry?.blob) return;
      const content = await entry.blob.text();
      const htmlContent = await marked.parse(content);
      editor.commands.setContent(htmlContent);
      setLastSavedContent(htmlContent);
      setIsDirty(false);
      window.dispatchEvent(
        new CustomEvent('widget-title-update', {
          detail: { instanceId: resolvedInstanceId, title: entry.name },
        })
      );
      setCurrentFilename(entry.name);
      window.dispatchEvent(
        new CustomEvent('widget-dirty-state', {
          detail: { instanceId: resolvedInstanceId, widgetId: 'notepad', isDirty: false },
        })
      );
    });
    return unsubscribe;
  }, [editor]);

  useEffect(() => {
    const handler = (event: Event) => {
      const custom = event as CustomEvent<{ instanceId?: string; widgetId?: string }>;
      if (custom.detail?.instanceId !== resolvedInstanceId) return;
      if (custom.detail?.widgetId && custom.detail.widgetId !== 'notepad') return;
      handleDownload();
    };
    window.addEventListener('widget-save-request', handler as EventListener);
    return () => window.removeEventListener('widget-save-request', handler as EventListener);
  }, [handleDownload, resolvedInstanceId]);

  useEffect(() => {
    setIsDirty(content !== lastSavedContent);
  }, [content, lastSavedContent]);

  useEffect(() => {
    window.dispatchEvent(
      new CustomEvent('widget-dirty-state', {
        detail: { instanceId: resolvedInstanceId, widgetId: 'notepad', isDirty },
      })
    );
  }, [isDirty, resolvedInstanceId]);

  useEffect(() => {
    return () => {
      window.dispatchEvent(
        new CustomEvent('widget-dirty-state', {
          detail: { instanceId: resolvedInstanceId, widgetId: 'notepad', isDirty: false },
        })
      );
    };
  }, [resolvedInstanceId]);

  return (
    <div
      className="flex flex-col h-full w-full notepad-widget bg-white rounded-b-md overflow-hidden"
      style={{ ['--notepad-zoom' as string]: zoomLevel } as CSSProperties}
    >
      <MenuBar
        editor={editor}
        onUpload={handleOpenFile}
        onDownload={handleDownload}
        zoomLevel={zoomLevel}
        onZoomChange={handleZoomChange}
        onZoomReset={() => setZoomLevel(1)}
      />
      <EditorContent editor={editor} className="flex-grow overflow-auto" />
    </div>
  );
};

export { widgetConfig } from './widgetConfig';
