import { useState, useEffect, useRef } from 'react';
import type { FC } from 'react'; // <-- Se ha separado la importación del tipo FC
import { useTranslation } from 'react-i18next';
import { Mic, MicOff } from 'lucide-react';
import './SoundMeter.css';
import { WidgetToolbar } from '../../core/WidgetToolbar';
import { useLocalStorage } from '../../../hooks/useLocalStorage';

// ... (El resto del archivo no necesita cambios)
type NoiseLevel = 'silence' | 'conversation' | 'noise';

interface LevelInfo {
  labelKey: string;
  emoji: string;
  className: string;
}

const LEVEL_CONFIG: Record<NoiseLevel, LevelInfo> = {
  silence: {
    labelKey: 'widgets.sound_meter.silence',
    emoji: '🤫',
    className: 'level-silence',
  },
  conversation: {
    labelKey: 'widgets.sound_meter.conversation',
    emoji: '🗣️',
    className: 'level-conversation',
  },
  noise: {
    labelKey: 'widgets.sound_meter.noise',
    emoji: '💥',
    className: 'level-noise',
  },
};

export const SoundMeterWidget: FC = () => {
  const { t } = useTranslation();
  const [currentLevel, setCurrentLevel] = useState<NoiseLevel>('silence');
  const [permission, setPermission] = useState<'granted' | 'denied' | 'prompt'>('prompt');
  const [isActive, setIsActive] = useState(false);
  const [sensitivity, setSensitivity] = useLocalStorage<number>('sound-meter-sensitivity', 50);
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const smoothedLevelRef = useRef<number>(0);
  const levelHoldRef = useRef<NoiseLevel>('silence');
  const lastLevelChangeRef = useRef<number>(0);
  
  const animationFrameRef = useRef<number | undefined>(undefined);

  const getLevelFromVolume = (volume: number): NoiseLevel => {
    const noiseThreshold = 30 + (80 - sensitivity);
    const silenceThreshold = Math.max(6, noiseThreshold * 0.4);
    if (volume < silenceThreshold) return 'silence';
    if (volume < noiseThreshold) return 'conversation';
    return 'noise';
  };
  
  const startMeter = async () => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        alert(t('widgets.sound_meter.no_audio_support'));
        setPermission('denied');
        return;
      }
      
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      streamRef.current = stream;
      
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      audioContextRef.current = new AudioContext();
      const analyser = audioContextRef.current.createAnalyser();
      analyser.fftSize = 1024;
      analyser.smoothingTimeConstant = 0.85;
      
      const source = audioContextRef.current.createMediaStreamSource(stream);
      source.connect(analyser);
      
      setPermission('granted');
      setIsActive(true);
      
      const dataArray = new Uint8Array(analyser.fftSize);
      
      const updateVolume = () => {
        analyser.getByteTimeDomainData(dataArray);
        let sumSquares = 0;
        for (let i = 0; i < dataArray.length; i += 1) {
          const normalized = (dataArray[i] - 128) / 128;
          sumSquares += normalized * normalized;
        }
        const rms = Math.sqrt(sumSquares / dataArray.length);
        const gain = 0.7 + (sensitivity / 100) * 0.9;
        const level = Math.min(100, rms * 120 * gain);
        const smoothed = smoothedLevelRef.current * 0.85 + level * 0.15;
        smoothedLevelRef.current = smoothed;
        const nextLevel = getLevelFromVolume(smoothed);
        const now = Date.now();
        if (nextLevel !== levelHoldRef.current && now - lastLevelChangeRef.current > 700) {
          levelHoldRef.current = nextLevel;
          lastLevelChangeRef.current = now;
        }
        setCurrentLevel(levelHoldRef.current);
        animationFrameRef.current = requestAnimationFrame(updateVolume);
      };
      
      updateVolume();

    } catch (err) {
      console.error(t('widgets.sound_meter.microphone_error'), err);
      setPermission('denied');
      setIsActive(false);
    }
  };

  const stopMeter = () => {
    if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    if (streamRef.current) streamRef.current.getTracks().forEach(track => track.stop());
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close();
    }
    setIsActive(false);
  };

  useEffect(() => {
    return () => stopMeter();
  }, []);

  const renderContent = () => {
    if (permission === 'granted') {
      const levelKey = isActive ? currentLevel : 'silence';
      const { labelKey, emoji, className } = LEVEL_CONFIG[levelKey];
      return (
        <div className={`level-card ${className}`}>
          <span className="emoji">{emoji}</span>
          <span className="label">{t(labelKey)}</span>
        </div>
      );
    }
    
    return (
      <div className="permission-screen">
        {permission === 'denied' ? (
          <>
            <MicOff size={48} className="text-red-500" />
            <p>{t('widgets.sound_meter.access_denied')}</p>
            <small>{t('widgets.sound_meter.enable_browser_settings')}</small>
          </>
        ) : (
          <>
            <Mic size={48} />
            <p>{t('widgets.sound_meter.permission_needed')}</p>
          </>
        )}
      </div>
    );
  };

  return (
    <div className="sound-meter-widget">
      <WidgetToolbar>
        <button
          type="button"
          onClick={() => (isActive ? stopMeter() : startMeter())}
          className="sound-meter-toggle"
          title={isActive ? t('widgets.sound_meter.deactivate_meter') : t('widgets.sound_meter.activate_meter')}
        >
          {isActive ? <MicOff size={18} /> : <Mic size={18} />}
          <span>{isActive ? t('widgets.sound_meter.deactivate_meter') : t('widgets.sound_meter.activate_meter')}</span>
        </button>
        <div className="sound-meter-threshold">
          <label htmlFor="sound-meter-threshold">{t('widgets.sound_meter.sensitivity_label')}</label>
          <input
            id="sound-meter-threshold"
            type="range"
            min="0"
            max="100"
            value={sensitivity}
            onChange={(event) => setSensitivity(Number(event.target.value))}
          />
          <span className="sound-meter-threshold-value">{sensitivity}</span>
        </div>
      </WidgetToolbar>
      {renderContent()}
    </div>
  );
};

export { widgetConfig } from './widgetConfig';
