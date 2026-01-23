import { useEffect, useMemo, useState } from 'react';
import type { FC } from 'react';
import { useTranslation } from 'react-i18next';
import { getStoredAlarms, subscribeAlarmStore, updateStoredAlarms, type AlarmItem } from '../../../utils/alarmStore';
import './AlarmDisplay.css';

const formatRemaining = (ms: number): string => {
    const totalSeconds = Math.max(0, Math.floor(ms / 1000));
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    if (hours > 0) {
        return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    }
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
};

export const AlarmDisplayWidget: FC = () => {
    const { t } = useTranslation();
    const [alarms, setAlarms] = useState<AlarmItem[]>(() => getStoredAlarms());
    const [now, setNow] = useState(Date.now());

    useEffect(() => subscribeAlarmStore(setAlarms), []);

    useEffect(() => {
        const interval = window.setInterval(() => setNow(Date.now()), 1000);
        return () => window.clearInterval(interval);
    }, []);

    const activeAlarms = useMemo(() => {
        return alarms
            .filter((alarm) => !alarm.triggered)
            .sort((a, b) => a.targetTime - b.targetTime);
    }, [alarms]);
    const displayAlarms = activeAlarms.slice(0, 4);
    const remainingCount = Math.max(0, activeAlarms.length - displayAlarms.length);
    const triggeredAlarms = useMemo(() => alarms.filter((alarm) => alarm.triggered), [alarms]);
    const alertMessage = useMemo(() => {
        if (triggeredAlarms.length === 0) return null;
        if (triggeredAlarms.length === 1) {
            const label = triggeredAlarms[0].label || t('widgets.alarm.default_label');
            return t('widgets.alarm_display.alert_single', { label });
        }
        return t('widgets.alarm_display.alert_multi', { count: triggeredAlarms.length });
    }, [triggeredAlarms, t]);

    const updateLabel = (alarmId: string, nextLabel: string) => {
        updateStoredAlarms((prev) =>
            prev.map((alarm) => (alarm.id === alarmId ? { ...alarm, label: nextLabel } : alarm))
        );
    };

    return (
        <div className="alarm-display-widget">
            <div className="alarm-display-header">{t('widgets.alarm_display.title')}</div>
            {alertMessage && (
                <div className="alarm-display-alert">
                    <div className="alarm-display-alert-title">{t('widgets.alarm_display.alert_title')}</div>
                    <div className="alarm-display-alert-message">{alertMessage}</div>
                </div>
            )}
            {displayAlarms.length === 0 ? (
                <div className="alarm-display-empty">{t('widgets.alarm_display.none')}</div>
            ) : (
                <>
                    <div className="alarm-display-grid">
                        {displayAlarms.map((alarm) => {
                            const label = alarm.label || t('widgets.alarm.default_label');
                            const remaining = alarm.targetTime - now;
                            return (
                                <div key={alarm.id} className="alarm-display-card">
                                    <div className="alarm-display-time">{formatRemaining(remaining)}</div>
                                    <input
                                        className="alarm-display-label-input"
                                        value={label}
                                        onChange={(event) => updateLabel(alarm.id, event.target.value)}
                                        placeholder={t('widgets.alarm.default_label')}
                                    />
                                </div>
                            );
                        })}
                    </div>
                    {remainingCount > 0 && (
                        <div className="alarm-display-more">
                            {t('widgets.alarm_display.more_count', { count: remainingCount })}
                        </div>
                    )}
                </>
            )}
        </div>
    );
};

export { widgetConfig } from './widgetConfig';
