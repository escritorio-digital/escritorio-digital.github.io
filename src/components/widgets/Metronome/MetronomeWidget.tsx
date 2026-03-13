import { useState, useEffect, useRef } from 'react';
import type { FC } from 'react';
import { Play, Pause } from 'lucide-react';
import './Metronome.css';

type AudioContextWithWebkit = typeof window & {
  webkitAudioContext?: typeof AudioContext;
};

// El componente principal del Metrónomo
export const MetronomeWidget: FC = () => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [bpm, setBpm] = useState(120);
  const [beatsPerMeasure, setBeatsPerMeasure] = useState(4);
  const [currentBeat, setCurrentBeat] = useState(0);

  const audioContextRef = useRef<AudioContext | null>(null);
  const timerRef = useRef<number | null>(null);

  // Genera el sonido del "tick"
  const playTick = (isFirstBeat: boolean) => {
    if (!audioContextRef.current) {
        const AudioContext = window.AudioContext || (window as AudioContextWithWebkit).webkitAudioContext;
        audioContextRef.current = new AudioContext();
    }
    const context = audioContextRef.current;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(isFirstBeat ? 900 : 600, context.currentTime);
    gain.gain.setValueAtTime(1, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 0.05);

    oscillator.connect(gain);
    gain.connect(context.destination);
    
    oscillator.start(context.currentTime);
    oscillator.stop(context.currentTime + 0.05);
  };

  useEffect(() => {
    if (isPlaying) {
      const interval = (60 / bpm) * 1000;
      
      const tick = () => {
        setCurrentBeat(prev => {
          const nextBeat = (prev + 1) % beatsPerMeasure;
          playTick(nextBeat === 0);
          return nextBeat;
        });
      };

      // Inicia el primer tick inmediatamente y luego el intervalo
      playTick(currentBeat === 0);
      timerRef.current = window.setInterval(tick, interval);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      setCurrentBeat(0);
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPlaying, bpm, beatsPerMeasure]);

  const handleStartStop = () => {
    setIsPlaying(!isPlaying);
  };

  return (
    <div className="metronome-widget">
      <div className="bpm-display">
        <span className="bpm-value">{bpm}</span>
        <span className="bpm-label">BPM</span>
      </div>

      <div className="bpm-slider">
        <input
          type="range"
          min="40"
          max="240"
          value={bpm}
          onChange={(e) => setBpm(Number(e.target.value))}
          disabled={isPlaying}
        />
      </div>

      <div className="beat-indicators">
        {Array.from({ length: beatsPerMeasure }, (_, i) => (
          <div key={i} className={`beat-dot ${isPlaying && currentBeat === i ? 'active' : ''} ${isPlaying && currentBeat === i && i === 0 ? 'first-beat' : ''}`} />
        ))}
      </div>

      <div className="controls">
        <div className="measure-control">
          <button onClick={() => setBeatsPerMeasure(Math.max(1, beatsPerMeasure - 1))} disabled={isPlaying}>-</button>
          <span>{beatsPerMeasure}/4</span>
          <button onClick={() => setBeatsPerMeasure(Math.min(12, beatsPerMeasure + 1))} disabled={isPlaying}>+</button>
        </div>

        <button onClick={handleStartStop} className="play-button">
          {isPlaying ? <Pause size={32} /> : <Play size={32} />}
        </button>
      </div>
    </div>
  );
};

export { widgetConfig } from './widgetConfig';
