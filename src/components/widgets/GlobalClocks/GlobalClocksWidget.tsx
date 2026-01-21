import { useState, useEffect } from 'react';
import type { FC } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocalStorage } from '../../../hooks/useLocalStorage';
import { Trash2 } from 'lucide-react';
import './GlobalClocks.css';

// --- Lista de Zonas Horarias (Formato IANA) ---
const TIMEZONES = [
  { cityKey: 'los_angeles', timezone: 'America/Los_Angeles' },
  { cityKey: 'new_york', timezone: 'America/New_York' },
  { cityKey: 'london', timezone: 'Europe/London' },
  { cityKey: 'paris', timezone: 'Europe/Paris' },
  { cityKey: 'madrid', timezone: 'Europe/Madrid' },
  { cityKey: 'tokyo', timezone: 'Asia/Tokyo' },
  { cityKey: 'sydney', timezone: 'Australia/Sydney' },
  { cityKey: 'mexico_city', timezone: 'America/Mexico_City' },
  { cityKey: 'buenos_aires', timezone: 'America/Argentina/Buenos_Aires' },
  { cityKey: 'moscow', timezone: 'Europe/Moscow' },
  { cityKey: 'dubai', timezone: 'Asia/Dubai' },
  { cityKey: 'shanghai', timezone: 'Asia/Shanghai' },
];

// Función para obtener la diferencia horaria en horas
const getOffset = (timeZone: string) => {
  const date = new Date();
  const utcDate = new Date(date.toLocaleString('en-US', { timeZone: 'UTC' }));
  const tzDate = new Date(date.toLocaleString('en-US', { timeZone }));
  return (tzDate.getTime() - utcDate.getTime()) / (1000 * 60 * 60);
};

// El componente principal del Reloj Mundial
export const GlobalClocksWidget: FC = () => {
  const { t } = useTranslation();
  const [selectedTimezones, setSelectedTimezones] = useLocalStorage<string[]>('global-clocks-selection', [
    'Europe/London',
    'Asia/Tokyo',
  ]);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [newTimezone, setNewTimezone] = useState<string>('America/New_York');

  const isColonOn = currentTime.getSeconds() % 2 === 0;
  const renderTime = (time: string) => {
    const parts = time.split(':');
    if (parts.length < 2) return time;
    return parts.flatMap((part, index) => {
      const chunk = <span key={`part-${index}`}>{part}</span>;
      if (index === 0) return [chunk];
      return [
        <span key={`colon-${index}`} className={`time-colon${isColonOn ? ' is-on' : ''}`}>:</span>,
        chunk,
      ];
    });
  };

  // Actualiza la hora cada segundo
  useEffect(() => {
    const timerId = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timerId);
  }, []);

  const addClock = () => {
    if (newTimezone && !selectedTimezones.includes(newTimezone)) {
      setSelectedTimezones([...selectedTimezones, newTimezone]);
    }
  };

  const removeClock = (timezone: string) => {
    setSelectedTimezones(selectedTimezones.filter(tz => tz !== timezone));
  };
  
  const localOffset = getOffset(Intl.DateTimeFormat().resolvedOptions().timeZone);

  return (
    <div className="global-clocks-widget">
      <div className="clocks-list">
        {/* Reloj Local del Usuario */}
        <div className="clock-row local">
          <div className="city-info">
            <span className="city-name">{t('widgets.global_clocks.your_local_time')}</span>
            <span className="offset">GMT{localOffset >= 0 ? '+' : ''}{localOffset}</span>
          </div>
          <span className="time-display">{renderTime(currentTime.toLocaleTimeString())}</span>
        </div>

        {/* Relojes Seleccionados */}
        {selectedTimezones.map(tz => {
          const cityData = TIMEZONES.find(t => t.timezone === tz);
          if (!cityData) return null;
          
          const offset = getOffset(tz);
          const offsetDiff = offset - localOffset;

          return (
            <div key={tz} className="clock-row">
              <div className="city-info">
                <span className="city-name">{t(`widgets.global_clocks.cities.${cityData.cityKey}`)}</span>
                <span className="offset">{offsetDiff >= 0 ? '+' : ''}{offsetDiff}h</span>
              </div>
              <span className="time-display">
                {renderTime(currentTime.toLocaleTimeString(undefined, { timeZone: tz }))}
              </span>
              <button onClick={() => removeClock(tz)} className="remove-clock-btn"><Trash2 size={16} /></button>
            </div>
          );
        })}
      </div>

      <div className="clocks-footer">
        <select value={newTimezone} onChange={e => setNewTimezone(e.target.value)}>
          {TIMEZONES.filter(tz => !selectedTimezones.includes(tz.timezone)).map(tz => (
            <option key={tz.timezone} value={tz.timezone}>{t(`widgets.global_clocks.cities.${tz.cityKey}`)}</option>
          ))}
        </select>
        <button onClick={addClock}>{t('widgets.global_clocks.add_clock')}</button>
      </div>
    </div>
  );
};

export { widgetConfig } from './widgetConfig';
