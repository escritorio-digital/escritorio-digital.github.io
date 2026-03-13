import { Bell, BellRing, Maximize2, Minimize2 } from 'lucide-react';
import type { AlarmItem } from '../../../utils/alarmStore';

type DesktopStatusOverlaysProps = {
    showDateTime: boolean;
    showSystemStats: boolean;
    clockRef: React.RefObject<HTMLDivElement | null>;
    formattedDate: string;
    formattedTime: string;
    renderClockTime: (time: string) => React.ReactNode;
    activeAlarms: AlarmItem[];
    ringingAlarmCount: number;
    now: Date;
    formatRemainingTime: (ms: number) => string;
    isFullscreen: boolean;
    onToggleFullscreen: () => void | Promise<void>;
    onFullscreenContextMenu?: (event: React.MouseEvent<HTMLButtonElement>) => void;
    fullscreenEnterLabel: string;
    fullscreenExitLabel: string;
    clockBottom: number | null;
    statsRows: Array<{ label: string; value: string }>;
    getDefaultAlarmLabel: () => string;
    getTriggeredAlarmLabel: (count: number) => string;
};

export function DesktopStatusOverlays({
    showDateTime,
    showSystemStats,
    clockRef,
    formattedDate,
    formattedTime,
    renderClockTime,
    activeAlarms,
    ringingAlarmCount,
    now,
    formatRemainingTime,
    isFullscreen,
    onToggleFullscreen,
    onFullscreenContextMenu,
    fullscreenEnterLabel,
    fullscreenExitLabel,
    clockBottom,
    statsRows,
    getDefaultAlarmLabel,
    getTriggeredAlarmLabel,
}: DesktopStatusOverlaysProps) {
    return (
        <>
            <button
                onClick={onToggleFullscreen}
                onContextMenu={onFullscreenContextMenu}
                className="fixed top-4 left-4 z-[2] p-2 rounded-full text-white/80 bg-black/15 backdrop-blur-sm hover:bg-black/30 hover:text-white transition-colors"
                title={isFullscreen ? fullscreenExitLabel : fullscreenEnterLabel}
                aria-label={isFullscreen ? fullscreenExitLabel : fullscreenEnterLabel}
            >
                {isFullscreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
            </button>
            {showDateTime && (
                <div
                    ref={clockRef}
                    className="fixed top-4 right-4 z-[1] pointer-events-none select-none text-white bg-black/45 backdrop-blur-md rounded-2xl px-6 py-5 shadow-lg"
                >
                    <div className="text-lg opacity-90">{formattedDate}</div>
                    <div className="text-4xl font-semibold leading-tight">{renderClockTime(formattedTime)}</div>
                    {(ringingAlarmCount > 0 || activeAlarms.length > 0) && (
                        <div className="mt-2 flex flex-col gap-1 text-sm font-semibold text-white/90">
                            {ringingAlarmCount > 0 && (
                                <div className="flex items-center gap-2">
                                    <BellRing size={16} />
                                    <span>{getTriggeredAlarmLabel(ringingAlarmCount)}</span>
                                </div>
                            )}
                            {activeAlarms.slice(0, 3).map((alarm) => {
                                const label = alarm.label || getDefaultAlarmLabel();
                                return (
                                    <div key={alarm.id} className="flex items-center gap-2">
                                        <Bell size={14} />
                                        <span>{label}: {formatRemainingTime(alarm.targetTime - now.getTime())}</span>
                                    </div>
                                );
                            })}
                            {activeAlarms.length > 3 && (
                                <div className="flex items-center gap-2 pl-5 text-xs text-white/80">
                                    <span>+{activeAlarms.length - 3}</span>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}
            {showSystemStats && statsRows.length > 0 && (
                <div
                    className="fixed right-4 z-[1] pointer-events-none select-none text-white bg-black/45 backdrop-blur-md rounded-2xl px-5 py-4 shadow-lg min-w-[220px]"
                    style={{ top: showDateTime && clockBottom != null ? `${Math.round(clockBottom + 5)}px` : '1rem' }}
                >
                    <div className="space-y-1 text-sm">
                        {statsRows.map((row) => (
                            <div key={row.label} className="flex justify-between gap-4">
                                <span className="text-white/70">{row.label}</span>
                                <span className="text-white">{row.value}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </>
    );
}
