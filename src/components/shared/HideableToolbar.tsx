import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import './HideableToolbar.css';

type HideableToolbarProps = {
  className?: string;
  children: ReactNode;
};

export const HideableToolbar = ({ className = '', children }: HideableToolbarProps) => {
  const { t } = useTranslation();
  const [isPinned, setIsPinned] = useState(true);
  const [isHovering, setIsHovering] = useState(false);
  const hideTimer = useRef<number | null>(null);

  const clearHideTimer = () => {
    if (hideTimer.current) {
      window.clearTimeout(hideTimer.current);
      hideTimer.current = null;
    }
  };

  const scheduleHide = () => {
    if (isPinned) return;
    clearHideTimer();
    hideTimer.current = window.setTimeout(() => {
      setIsHovering(false);
      hideTimer.current = null;
    }, 250);
  };

  useEffect(() => () => clearHideTimer(), []);

  const isVisible = isPinned || isHovering;

  return (
    <div className="hideable-toolbar">
      <div
        className="hideable-toolbar-trigger"
        onMouseEnter={() => {
          clearHideTimer();
          setIsHovering(true);
        }}
        onMouseLeave={scheduleHide}
      />
      <div
        className={`hideable-toolbar-bar ${className} ${isVisible ? '' : 'is-hidden'}`}
        onMouseEnter={() => {
          clearHideTimer();
          setIsHovering(true);
        }}
        onMouseLeave={scheduleHide}
      >
        {children}
        <button
          type="button"
          className="hideable-toolbar-toggle"
          onClick={() => {
            setIsPinned((prev) => !prev);
            setIsHovering((prev) => (isPinned ? prev : true));
          }}
          title={isPinned ? t('desktop.toolbar_hide') : t('desktop.toolbar_pin')}
          aria-label={isPinned ? t('desktop.toolbar_hide') : t('desktop.toolbar_pin')}
        >
          {isPinned ? <Eye size={16} /> : <EyeOff size={16} />}
        </button>
      </div>
    </div>
  );
};
