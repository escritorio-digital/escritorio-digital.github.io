import { useEffect, useMemo, useRef, useState } from 'react';
import type { FC } from 'react';
import { useTranslation } from 'react-i18next';
import { Bell, BellOff, Clock, Timer, Trash2, Plus } from 'lucide-react';
import {
    createAlarmItem,
    getStoredAlarms,
    subscribeAlarmStore,
    updateStoredAlarms,
    type AlarmItem,
    type AlarmMode,
} from '../../../utils/alarmStore';
import './Alarm.css';

const formatRemaining = (ms: number): string => {
    const totalSeconds = Math.max(0, Math.floor(ms / 1000));
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    const parts = [hours, minutes, seconds].map((value) => String(value).padStart(2, '0'));
    return parts.join(':');
};

const getNextTimeTarget = (timeValue: string): number | null => {
    const [hoursRaw, minutesRaw] = timeValue.split(':');
    const hours = Number.parseInt(hoursRaw ?? '', 10);
    const minutes = Number.parseInt(minutesRaw ?? '', 10);
    if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null;
    const now = new Date();
    const target = new Date(now);
    target.setHours(hours, minutes, 0, 0);
    if (target.getTime() <= now.getTime()) {
        target.setDate(target.getDate() + 1);
    }
    return target.getTime();
};

type AlarmWidgetProps = {
    instanceId?: string;
};

export const AlarmWidget: FC<AlarmWidgetProps> = ({ instanceId }) => {
    const { t, i18n } = useTranslation();
    const [mode, setMode] = useState<AlarmMode>('time');
    const [timeValue, setTimeValue] = useState('08:00');
    const [minutes, setMinutes] = useState(5);
    const [seconds, setSeconds] = useState(0);
    const [label, setLabel] = useState('');
    const [soundEnabled, setSoundEnabled] = useState(true);
    const [alarms, setAlarms] = useState<AlarmItem[]>(() => getStoredAlarms());
    const [error, setError] = useState<string | null>(null);
    const [now, setNow] = useState(Date.now());
    const rootRef = useRef<HTMLDivElement>(null);
    const contentRef = useRef<HTMLDivElement>(null);
    const lastResizeRef = useRef<number | null>(null);
    const resizeAttemptsRef = useRef(0);

    useEffect(() => subscribeAlarmStore(setAlarms), []);

    useEffect(() => {
        const interval = window.setInterval(() => setNow(Date.now()), 1000);
        return () => window.clearInterval(interval);
    }, []);

    const formattedAlarms = useMemo(() => {
        const formatter = new Intl.DateTimeFormat(i18n.language, {
            hour: '2-digit',
            minute: '2-digit',
            day: '2-digit',
            month: 'short',
        });
        return [...alarms]
            .sort((a, b) => a.targetTime - b.targetTime)
            .map((alarm) => ({
                ...alarm,
                formattedTime: formatter.format(new Date(alarm.targetTime)),
            }));
    }, [alarms, i18n.language]);

    const handleCreateAlarm = () => {
        setError(null);
        if (mode === 'time') {
            const targetTime = getNextTimeTarget(timeValue);
            if (!targetTime) {
                setError(t('widgets.alarm.invalid_time'));
                return;
            }
            updateStoredAlarms((prev) => [
                ...prev,
                createAlarmItem({
                    label: label.trim(),
                    targetTime,
                    soundEnabled,
                    mode,
                }),
            ]);
            return;
        }
        const totalSeconds = Math.max(0, minutes * 60 + seconds);
        if (totalSeconds <= 0) {
            setError(t('widgets.alarm.invalid_countdown'));
            return;
        }
        updateStoredAlarms((prev) => [
            ...prev,
            createAlarmItem({
                label: label.trim(),
                targetTime: Date.now() + totalSeconds * 1000,
                soundEnabled,
                mode,
            }),
        ]);
    };

    const toggleSound = (alarmId: string) => {
        updateStoredAlarms((prev) =>
            prev.map((alarm) =>
                alarm.id === alarmId ? { ...alarm, soundEnabled: !alarm.soundEnabled } : alarm
            )
        );
    };

    const updateLabel = (alarmId: string, nextLabel: string) => {
        updateStoredAlarms((prev) =>
            prev.map((alarm) => (alarm.id === alarmId ? { ...alarm, label: nextLabel } : alarm))
        );
    };

    const removeAlarm = (alarmId: string) => {
        updateStoredAlarms((prev) => prev.filter((alarm) => alarm.id !== alarmId));
    };

    const hasAlarms = formattedAlarms.length > 0;

    useEffect(() => {
        if (!instanceId) return;
        const root = rootRef.current;
        const content = contentRef.current;
        if (!root || !content) return;
        const windowNode = root.closest('.widget-window') as HTMLElement | null;
        if (!windowNode) return;

        const requestResize = () => {
            const rootHeight = root.clientHeight;
            const contentHeight = content.scrollHeight;
            if (contentHeight <= rootHeight + 6) return;
            const windowHeight = windowNode.getBoundingClientRect().height;
            const delta = contentHeight - rootHeight;
            const nextHeight = Math.ceil(windowHeight + delta + 16);
            if (lastResizeRef.current && Math.abs(nextHeight - lastResizeRef.current) < 6) return;
            lastResizeRef.current = nextHeight;
            window.dispatchEvent(
                new CustomEvent('widget-resize-request', {
                    detail: { instanceId, size: { height: nextHeight } },
                })
            );
        };

        const observer = new ResizeObserver(requestResize);
        observer.observe(content);
        requestResize();
        resizeAttemptsRef.current = 0;
        const retry = () => {
            resizeAttemptsRef.current += 1;
            requestResize();
            if (resizeAttemptsRef.current < 3) {
                window.setTimeout(retry, 80);
            }
        };
        const delayed = window.setTimeout(retry, 60);
        return () => {
            observer.disconnect();
            window.clearTimeout(delayed);
        };
    }, [instanceId, hasAlarms, mode]);

    return (
        <div className="alarm-widget" ref={rootRef}>
            <div className="alarm-content" ref={contentRef}>
                <div className="alarm-form">
                    <div className="alarm-section-title">{t('widgets.alarm.mode_label')}</div>
                    <div className="alarm-mode-toggle">
                        <button
                            type="button"
                            className={mode === 'time' ? 'active' : ''}
                            onClick={() => setMode('time')}
                        >
                            <Clock size={16} />
                            {t('widgets.alarm.mode_time')}
                        </button>
                        <button
                            type="button"
                            className={mode === 'countdown' ? 'active' : ''}
                            onClick={() => setMode('countdown')}
                        >
                            <Timer size={16} />
                            {t('widgets.alarm.mode_countdown')}
                        </button>
                    </div>

                    {mode === 'time' ? (
                        <label className="alarm-field">
                            <span>{t('widgets.alarm.time_label')}</span>
                            <input
                                type="time"
                                value={timeValue}
                                onChange={(event) => setTimeValue(event.target.value)}
                            />
                        </label>
                    ) : (
                        <div className="alarm-countdown-grid">
                            <label className="alarm-field">
                                <span>{t('widgets.alarm.countdown_minutes')}</span>
                                <input
                                    type="number"
                                    min={0}
                                    value={minutes}
                                    onChange={(event) => setMinutes(Math.max(0, Number(event.target.value) || 0))}
                                />
                            </label>
                            <label className="alarm-field">
                                <span>{t('widgets.alarm.countdown_seconds')}</span>
                                <input
                                    type="number"
                                    min={0}
                                    max={59}
                                    value={seconds}
                                    onChange={(event) => {
                                        const next = Math.max(0, Math.min(59, Number(event.target.value) || 0));
                                        setSeconds(next);
                                    }}
                                />
                            </label>
                        </div>
                    )}

                    <label className="alarm-field">
                        <span>{t('widgets.alarm.label_label')}</span>
                        <input
                            type="text"
                            value={label}
                            onChange={(event) => setLabel(event.target.value)}
                            placeholder={t('widgets.alarm.default_label')}
                        />
                    </label>

                    <label className="alarm-sound-toggle">
                        <input
                            type="checkbox"
                            checked={soundEnabled}
                            onChange={(event) => setSoundEnabled(event.target.checked)}
                        />
                        <span>{soundEnabled ? t('widgets.alarm.sound_on') : t('widgets.alarm.sound_off')}</span>
                    </label>

                    {error && <div className="alarm-error">{error}</div>}

                <button type="button" className="alarm-submit" onClick={handleCreateAlarm}>
                    <Plus size={16} />
                    {t('widgets.alarm.add_alarm')}
                </button>
                <button
                    type="button"
                    className="alarm-display-launch"
                    onClick={() => window.dispatchEvent(new CustomEvent('open-widget', { detail: { widgetId: 'alarm-display' } }))}
                >
                    {t('widgets.alarm.open_display')}
                </button>
                {!hasAlarms && <p className="alarm-empty-inline">{t('widgets.alarm.none')}</p>}
            </div>

                <div className="alarm-list">
                    <div className="alarm-section-title">{t('widgets.alarm.active_alarms')}</div>
                    {hasAlarms ? (
                        <div className="alarm-items">
                            {formattedAlarms.map((alarm) => {
                                const remaining = alarm.targetTime - now;
                                const labelText = alarm.label || t('widgets.alarm.default_label');
                                return (
                                    <div
                                        key={alarm.id}
                                        className={`alarm-item${alarm.triggered ? ' is-triggered' : ''}`}
                                    >
                                        <div className="alarm-item-main">
                                            <input
                                                className="alarm-item-title-input"
                                                value={labelText}
                                                onChange={(event) => updateLabel(alarm.id, event.target.value)}
                                                placeholder={t('widgets.alarm.default_label')}
                                            />
                                            <div className="alarm-item-meta">
                                                {alarm.triggered
                                                    ? t('widgets.alarm.triggered')
                                                    : t('widgets.alarm.remaining', { time: formatRemaining(remaining) })}
                                            </div>
                                            <div className="alarm-item-time">
                                                {t('widgets.alarm.scheduled_for', { time: alarm.formattedTime })}
                                            </div>
                                        </div>
                                        <div className="alarm-item-actions">
                                            <button
                                                type="button"
                                                className="alarm-action"
                                                onClick={() => toggleSound(alarm.id)}
                                                title={alarm.soundEnabled ? t('widgets.alarm.sound_on') : t('widgets.alarm.sound_off')}
                                            >
                                                {alarm.soundEnabled ? <Bell size={16} /> : <BellOff size={16} />}
                                            </button>
                                            <button
                                                type="button"
                                                className="alarm-action danger"
                                                onClick={() => removeAlarm(alarm.id)}
                                            >
                                                <Trash2 size={16} />
                                                {alarm.triggered ? t('widgets.alarm.dismiss') : t('widgets.alarm.delete')}
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="alarm-empty-panel">
                            <p>{t('widgets.alarm.empty_tip_title')}</p>
                            <ul>
                                <li>{t('widgets.alarm.empty_tip_persist')}</li>
                                <li>{t('widgets.alarm.empty_tip_profiles')}</li>
                                <li>{t('widgets.alarm.empty_tip_sound')}</li>
                                <li>{t('widgets.alarm.empty_tip_clock')}</li>
                            </ul>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export { widgetConfig } from './widgetConfig';
