import { useEffect, useRef, useState } from 'react';
import type { FC } from 'react';
import { useTranslation } from 'react-i18next';
import type { WidgetConfig } from '../../../types';
import { BookOpen } from 'lucide-react';
import { marked } from 'marked';
import './ProgramGuideWidget.css';

const resolveGuideUrl = (lang: string) => {
  const normalized = lang.split('-')[0];
  return normalized === 'es'
    ? '/Guia-Escritorio-Digital.md'
    : `/Guia-Escritorio-Digital.${normalized}.md`;
};

export const ProgramGuideWidget: FC = () => {
  const { t, i18n } = useTranslation();
  const [markdown, setMarkdown] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const loadGuide = async () => {
      setIsLoading(true);
      setHasError(false);
      const primaryUrl = resolveGuideUrl(i18n.language);
      try {
        const response = await fetch(primaryUrl, { cache: 'no-store' });
        if (!response.ok) {
          if (primaryUrl !== '/Guia-Escritorio-Digital.md') {
            const fallback = await fetch('/Guia-Escritorio-Digital.md', { cache: 'no-store' });
            if (!fallback.ok) throw new Error('fallback failed');
            setMarkdown(await fallback.text());
          } else {
            throw new Error('primary failed');
          }
        } else {
          setMarkdown(await response.text());
        }
      } catch {
        setHasError(true);
        setMarkdown('');
      } finally {
        setIsLoading(false);
      }
    };

    loadGuide();
  }, [i18n.language]);

  useEffect(() => {
    if (!contentRef.current) return;
    if (!markdown) {
      contentRef.current.innerHTML = '';
      return;
    }
    contentRef.current.innerHTML = marked.parse(markdown) as string;
  }, [markdown]);

  return (
    <div className="program-guide-widget">
      <header className="program-guide-header">
        <BookOpen size={20} />
        <h3>{t('widgets.program_guide.title')}</h3>
      </header>
      <div className="program-guide-body">
        {isLoading && <div className="program-guide-status">{t('loading')}</div>}
        {hasError && !isLoading && (
          <div className="program-guide-status">{t('widgets.program_guide.load_error')}</div>
        )}
        {!isLoading && !hasError && <div className="program-guide-content prose" ref={contentRef} />}
      </div>
    </div>
  );
};

export const widgetConfig: Omit<WidgetConfig, 'component'> = {
  id: 'program-guide',
  title: 'widgets.program_guide.title',
  icon: <BookOpen size={40} />,
  defaultSize: { width: 720, height: 520 },
};
