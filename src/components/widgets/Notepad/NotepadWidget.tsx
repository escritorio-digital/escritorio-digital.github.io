import React, { useRef } from 'react';
import { useEditor, EditorContent, Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Heading as TiptapHeadingExtension } from '@tiptap/extension-heading';
import { marked } from 'marked';
import TurndownService from 'turndown';
import { useLocalStorage } from '../../../hooks/useLocalStorage';
import type { WidgetConfig } from '../../../types';
import { useTranslation } from 'react-i18next';
import { withBaseUrl } from '../../../utils/assetPaths';
import './Notepad.css';
import {
  Bold,
  Italic,
  Strikethrough,
  List,
  ListOrdered,
  Upload,
  Download,
  Text,
  Heading1,
  Heading2,
  Heading3,
} from 'lucide-react';

const MenuBar: React.FC<{ editor: Editor | null; onUpload: () => void; onDownload: () => void; }> = ({ editor, onUpload, onDownload }) => {
  const { t } = useTranslation();
  if (!editor) {
    return null;
  }

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
  ];

  return (
    <div className="menubar flex items-center gap-1 p-2 bg-gray-100 border-b border-accent">
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
      <div className="flex-grow"></div>
      <button onClick={onUpload} className="p-2 rounded hover:bg-gray-200" title={t('widgets.notepad.menubar.upload')}>
          <Upload size={16} />
      </button>
      <button onClick={onDownload} className="p-2 rounded hover:bg-gray-200" title={t('widgets.notepad.menubar.download')}>
          <Download size={16} />
      </button>
    </div>
  );
};

export const NotepadWidget: React.FC = () => {
  const { t } = useTranslation();
  const [content, setContent] = useLocalStorage('notepad-content-html', t('widgets.notepad.initial_content'));
  const fileInputRef = useRef<HTMLInputElement>(null);
  const turndownService = new TurndownService();

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

  const handleDownload = () => {
    if (!editor) return;
    const htmlContent = editor.getHTML();
    const markdownContent = turndownService.turndown(htmlContent);

    const blob = new Blob([markdownContent], { type: 'text/markdown;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = t('widgets.notepad.default_filename');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && editor) {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const markdownContent = event.target?.result as string;
        const htmlContent = await marked.parse(markdownContent);
        editor.commands.setContent(htmlContent);
      };
      reader.readAsText(file);
    }
    if(e.target) e.target.value = '';
  };

  return (
    <div className="flex flex-col h-full w-full notepad-widget bg-white rounded-b-md overflow-hidden">
      <MenuBar editor={editor} onUpload={() => fileInputRef.current?.click()} onDownload={handleDownload} />
      <EditorContent editor={editor} className="flex-grow overflow-auto" />
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileUpload}
        accept=".md,.txt"
        className="hidden"
      />
    </div>
  );
};

const WidgetIcon: React.FC = () => {
    const { t } = useTranslation();
    return <img src={withBaseUrl('icons/Notepad.png')} alt={t('widgets.notepad.icon_alt')} width="52" height="52" />;
}

export const widgetConfig: Omit<WidgetConfig, 'component'> = {
  id: 'notepad',
  title: 'widgets.notepad.title',
  icon: <WidgetIcon />,
  defaultSize: { width: 500, height: 450 },
};
