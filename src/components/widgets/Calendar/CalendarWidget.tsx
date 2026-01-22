import { useState, useMemo } from 'react'; // Corregido: 'React' no es necesario
import type { FC } from 'react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../../context/ThemeContext';
import { ChevronLeft, ChevronRight } from 'lucide-react';

// A. El Componente de React con toda la lógica
export const CalendarWidget: FC = () => {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const [currentDate, setCurrentDate] = useState(new Date());

  const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
  const lastDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);

  const startingDayOfWeek = (firstDayOfMonth.getDay() + 6) % 7; // 0 = Lunes, 6 = Domingo
  const daysInMonth = lastDayOfMonth.getDate();

  const calendarDays = useMemo(() => {
    const days = [];
    // Días del mes anterior para rellenar
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push({ day: null, isPlaceholder: true });
    }
    // Días del mes actual
    for (let i = 1; i <= daysInMonth; i++) {
      const today = new Date();
      const isToday = i === today.getDate() &&
                      currentDate.getMonth() === today.getMonth() &&
                      currentDate.getFullYear() === today.getFullYear();
      days.push({ day: i, isToday });
    }
    return days;
  }, [currentDate, daysInMonth, startingDayOfWeek]);

  const goToPreviousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const goToNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const isWidgetBgDark = useMemo(() => {
    const color = theme['--color-widget-bg'];
    if (!color) return true;
    const hexMatch = color.trim().match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
    if (hexMatch) {
      const hex = hexMatch[1];
      const full = hex.length === 3
        ? hex.split('').map((ch) => ch + ch).join('')
        : hex;
      const r = Number.parseInt(full.slice(0, 2), 16);
      const g = Number.parseInt(full.slice(2, 4), 16);
      const b = Number.parseInt(full.slice(4, 6), 16);
      const luminance = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
      return luminance < 0.55;
    }
    const rgbMatch = color.trim().match(/^rgba?\(([^)]+)\)$/i);
    if (rgbMatch) {
      const parts = rgbMatch[1].split(',').map((part) => Number.parseFloat(part.trim()));
      if (parts.length >= 3 && parts.every((val) => Number.isFinite(val))) {
        const [r, g, b] = parts;
        const luminance = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
        return luminance < 0.55;
      }
    }
    return true;
  }, [theme]);

  return (
    <div className={`calendar-widget ${isWidgetBgDark ? 'calendar-widget--dark' : 'calendar-widget--light'}`}>
      <div className="calendar-header">
        <button onClick={goToPreviousMonth} className="calendar-nav-button">
          <ChevronLeft size={20} />
        </button>
        <h3 className="calendar-title">
          {((t('widgets.calendar.months', { returnObjects: true }) as string[]) || ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'])[currentDate.getMonth()]} {currentDate.getFullYear()}
        </h3>
        <button onClick={goToNextMonth} className="calendar-nav-button">
          <ChevronRight size={20} />
        </button>
      </div>
      <div className="calendar-days">
        {((t('widgets.calendar.days', { returnObjects: true }) as string[]) || ['Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sá', 'Do']).map((day, index) => (
          <span key={index}>{day}</span>
        ))}
      </div>
      <div className="calendar-grid">
        {calendarDays.map((d, index) => (
          <div
            key={index}
            className={`calendar-cell ${d.isPlaceholder ? '' : 'calendar-cell--hover'} ${d.isToday ? 'calendar-cell--today' : ''}`}
          >
            {d.day}
          </div>
        ))}
      </div>
    </div>
  );
};

// B. El objeto de configuración que permite la detección automática

export { widgetConfig } from './widgetConfig';
