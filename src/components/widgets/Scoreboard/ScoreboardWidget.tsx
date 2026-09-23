import { useState } from 'react';
import type { FC } from 'react';
import { useLocalStorage } from '../../../hooks/useLocalStorage';
import { useTranslation } from 'react-i18next';
import { Plus, Minus, UserPlus, RotateCcw, Trash2 } from 'lucide-react';
import './Scoreboard.css';

interface Player {
  id: number;
  name: string;
  score: number;
}

export const ScoreboardWidget: FC = () => {
  const { t } = useTranslation();
  const [players, setPlayers] = useLocalStorage<Player[]>('scoreboard-players', []);
  const [newPlayerName, setNewPlayerName] = useState('');

  const addPlayer = () => {
    if (newPlayerName.trim() === '') return;
    const newPlayer: Player = {
      id: Date.now(),
      name: newPlayerName.trim(),
      score: 0,
    };
    setPlayers([...players, newPlayer]);
    setNewPlayerName('');
  };

  const removePlayer = (id: number) => {
    setPlayers(players.filter(p => p.id !== id));
  };

  const updateScore = (id: number, amount: number) => {
    setPlayers(players.map(p => 
      p.id === id ? { ...p, score: p.score + amount } : p
    ));
  };

  const resetAllScores = () => {
    if (window.confirm(t('widgets.scoreboard.reset_confirm'))) {
      setPlayers(players.map(p => ({ ...p, score: 0 })));
    }
  };

  return (
    <div className="scoreboard-widget">
      <div className="player-list">
        {players.length === 0 ? (
          <p className="empty-message">{t('widgets.scoreboard.empty_message')}</p>
        ) : (
          players.map(player => (
            <div key={player.id} className="player-row">
              <span className="player-name">{player.name}</span>
              <div className="player-controls">
                <button onClick={() => updateScore(player.id, -1)} className="score-button minus" title={t('widgets.scoreboard.subtract_point')}>
                  <Minus size={16} />
                </button>
                <span className="player-score">{player.score}</span>
                <button onClick={() => updateScore(player.id, 1)} className="score-button plus" title={t('widgets.scoreboard.add_point')}>
                  <Plus size={16} />
                </button>
                <button onClick={() => removePlayer(player.id)} className="remove-button" title={t('widgets.scoreboard.remove_player')}>
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
      <div className="scoreboard-footer">
        <div className="add-player-form">
          <input
            type="text"
            value={newPlayerName}
            onChange={(e) => setNewPlayerName(e.target.value)}
            placeholder={t('widgets.scoreboard.input_placeholder')}
            onKeyPress={(e) => e.key === 'Enter' && addPlayer()}
          />
          <button onClick={addPlayer}>
            <UserPlus size={18} /> {t('widgets.scoreboard.add_button')}
          </button>
        </div>
        <button onClick={resetAllScores} className="reset-button" title={t('widgets.scoreboard.reset_button_title')}>
          <RotateCcw size={18} />
        </button>
      </div>
    </div>
  );
};

export { widgetConfig } from './widgetConfig';
