import { useState, useEffect } from 'react';
import type { FC } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocalStorage } from '../../../hooks/useLocalStorage';
import { RotateCcw, X, Circle } from 'lucide-react';
import './TicTacToe.css';

type PlayerMark = 'X' | 'O';
type BoardCell = PlayerMark | null;

// El componente principal del Tic-Tac-Toe
export const TicTacToeWidget: FC = () => {
  const { t } = useTranslation();
  const [board, setBoard] = useState<BoardCell[]>(Array(9).fill(null));
  const [isXNext, setIsXNext] = useState(true);
  const [players, setPlayers] = useLocalStorage('tictactoe-players', { X: 'Jugador 1', O: 'Jugador 2' });
  
  // Actualizar nombres de jugadores por defecto cuando cambien las traducciones
  useEffect(() => {
    const player1 = t('widgets.tic_tac_toe.player_1');
    const player2 = t('widgets.tic_tac_toe.player_2');
    if (player1 !== 'widgets.tic_tac_toe.player_1' && player2 !== 'widgets.tic_tac_toe.player_2') {
      if (players.X === 'Jugador 1' && players.O === 'Jugador 2') {
        setPlayers({ X: player1, O: player2 });
      }
    }
  }, [t, players, setPlayers]);
  const [score, setScore] = useLocalStorage('tictactoe-score', { X: 0, O: 0 });
  const [winner, setWinner] = useState<string | null>(null);

  const handlePlayerNameChange = (player: 'X' | 'O', name: string) => {
    setPlayers({ ...players, [player]: name });
  };
  
  const calculateWinner = (squares: BoardCell[]): PlayerMark | null => {
    const lines = [
      [0, 1, 2], [3, 4, 5], [6, 7, 8], // Filas
      [0, 3, 6], [1, 4, 7], [2, 5, 8], // Columnas
      [0, 4, 8], [2, 4, 6],           // Diagonales
    ];
    for (let i = 0; i < lines.length; i++) {
      const [a, b, c] = lines[i];
      if (squares[a] && squares[a] === squares[b] && squares[a] === squares[c]) {
        return squares[a];
      }
    }
    return null;
  };

  useEffect(() => {
    const gameWinner = calculateWinner(board);
    if (gameWinner && !winner) {
      setWinner(gameWinner);
      setScore(prevScore => ({ ...prevScore, [gameWinner as 'X' | 'O']: prevScore[gameWinner as 'X' | 'O'] + 1 }));
    }
  }, [board, winner, setScore]);

  const handleClick = (i: number) => {
    if (winner || board[i]) return;
    const newBoard = [...board];
    newBoard[i] = isXNext ? 'X' : 'O';
    setBoard(newBoard);
    setIsXNext(!isXNext);
  };

  const resetRound = () => {
    setBoard(Array(9).fill(null));
    setWinner(null);
    setIsXNext(true); // X siempre empieza
  };

  const resetGame = () => {
    if (window.confirm(t('widgets.tic_tac_toe.reset_confirm'))) {
        resetRound();
        setScore({ X: 0, O: 0 });
        setPlayers({ X: t('widgets.tic_tac_toe.player_1'), O: t('widgets.tic_tac_toe.player_2') });
    }
  };

  const isDraw = !winner && board.every(Boolean);
  const status = winner 
    ? `${t('widgets.tic_tac_toe.winner')} ${players[winner as 'X' | 'O']}!`
    : isDraw 
    ? t('widgets.tic_tac_toe.draw') 
    : `${t('widgets.tic_tac_toe.next_turn')} ${players[isXNext ? 'X' : 'O']}`;

  return (
    <div className="tic-tac-toe-widget">
      <div className="game-info">
        <div className="player-input">
          <X size={16} className="text-blue-500" />
          <input type="text" value={players.X} onChange={e => handlePlayerNameChange('X', e.target.value)} />
          <span className="player-score">{score.X}</span>
        </div>
        <div className="player-input">
          <Circle size={16} className="text-red-500" />
          <input type="text" value={players.O} onChange={e => handlePlayerNameChange('O', e.target.value)} />
          <span className="player-score">{score.O}</span>
        </div>
      </div>
      
      {/* --- Contenedor Añadido --- */}
      <div className="game-board-container">
        <div className="game-board">
          {board.map((value, i) => (
            <button key={i} className="square" onClick={() => handleClick(i)} disabled={!!value || !!winner}>
              {value === 'X' && <X size={48} className="text-blue-500" />}
              {value === 'O' && <Circle size={48} className="text-red-500" />}
            </button>
          ))}
        </div>
      </div>

      <div className="game-footer">
        <p className="status">{status}</p>
        {(winner || isDraw) && <button onClick={resetRound} className="action-button">{t('widgets.tic_tac_toe.next_round')}</button>}
        <button onClick={resetGame} className="reset-game-button" title={t('widgets.tic_tac_toe.reset_all')}><RotateCcw size={16}/></button>
      </div>
    </div>
  );
};

export { widgetConfig } from './widgetConfig';
