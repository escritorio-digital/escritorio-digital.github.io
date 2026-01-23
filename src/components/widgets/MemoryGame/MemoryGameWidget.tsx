import { useState, useEffect } from 'react';
import type { FC } from 'react';
import { useTranslation } from 'react-i18next';
// 'Shuffle' ha sido eliminado de esta línea
import { Upload, RotateCcw } from 'lucide-react';
import { getEntry } from '../../../utils/fileManagerDb';
import { requestOpenFile } from '../../../utils/openDialog';
import './MemoryGame.css';
// Interfaz para representar cada carta
interface Card {
  id: number;
  pairId: number;
  content: string;
  isFlipped: boolean;
  isMatched: boolean;
}

// El componente principal del Memorama
export const MemoryGameWidget: FC = () => {
  const { t } = useTranslation();
  const [cards, setCards] = useState<Card[]>([]);
  const [flippedIndices, setFlippedIndices] = useState<number[]>([]);
  const [moves, setMoves] = useState(0);

  const setupGame = (imageFiles: FileList | File[]) => {
    const imagePromises: Promise<string>[] = [];
    Array.from(imageFiles).forEach(file => {
      if (file.type.startsWith('image/')) {
        imagePromises.push(new Promise((resolve) => {
          const reader = new FileReader();
          reader.onload = (e) => resolve(e.target?.result as string);
          reader.readAsDataURL(file);
        }));
      }
    });

    Promise.all(imagePromises).then(images => {
      const gameCards: Card[] = [];
      images.forEach((image, index) => {
        gameCards.push({ id: index * 2, pairId: index, content: image, isFlipped: false, isMatched: false });
        gameCards.push({ id: index * 2 + 1, pairId: index, content: image, isFlipped: false, isMatched: false });
      });

      for (let i = gameCards.length - 1; i > 0; i -= 1) {
        const j = Math.floor(Math.random() * (i + 1));
        [gameCards[i], gameCards[j]] = [gameCards[j], gameCards[i]];
      }
      setCards(gameCards);
      setMoves(0);
      setFlippedIndices([]);
    });
  };

  const handleOpenImages = async () => {
    const result = await requestOpenFile({ accept: 'image/*', multiple: true });
    if (!result) return;
    if (result.source === 'local') {
      if (result.files.length > 1) {
        setupGame(result.files);
      } else {
        alert(t('widgets.memory_game.min_images_alert'));
      }
      return;
    }
    const files: File[] = [];
    for (const entryId of result.entryIds) {
      const entry = await getEntry(entryId);
      if (!entry?.blob) continue;
      if (entry.mime && !entry.mime.startsWith('image/')) continue;
      files.push(new File([entry.blob], entry.name, { type: entry.mime || entry.blob.type }));
    }
    if (files.length > 1) {
      setupGame(files);
    } else {
      alert(t('widgets.memory_game.min_images_alert'));
    }
  };

  const handleCardClick = (index: number) => {
    if (cards[index].isFlipped || flippedIndices.length === 2) return;

    const newFlippedIndices = [...flippedIndices, index];
    setFlippedIndices(newFlippedIndices);
    
    const newCards = [...cards];
    newCards[index].isFlipped = true;
    setCards(newCards);
  };

  useEffect(() => {
    if (flippedIndices.length === 2) {
      setMoves(moves + 1);
      const [firstIndex, secondIndex] = flippedIndices;
      const firstCard = cards[firstIndex];
      const secondCard = cards[secondIndex];

      if (firstCard.pairId === secondCard.pairId) {
        const newCards = cards.map(card => 
          card.pairId === firstCard.pairId ? { ...card, isMatched: true } : card
        );
        setCards(newCards);
        setFlippedIndices([]);
      } else {
        setTimeout(() => {
          const newCards = [...cards];
          newCards[firstIndex].isFlipped = false;
          newCards[secondIndex].isFlipped = false;
          setCards(newCards);
          setFlippedIndices([]);
        }, 1000);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flippedIndices]);
  
  const isGameWon = cards.length > 0 && cards.every(c => c.isMatched);

  if (cards.length === 0) {
    return (
      <div className="memory-game-widget memory-empty">
        <div className="memory-placeholder">
          <div className="memory-placeholder-icon">
            <Upload size={56} />
          </div>
          <h3>{t('widgets.memory_game.upload_prompt')}</h3>
          <p>{t('widgets.memory_game.upload_rule')}</p>
          <button className="memory-upload-button" onClick={handleOpenImages}>
            <Upload size={18} />
            {t('widgets.memory_game.upload_button')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="memory-game-widget">
      <div className="game-board" style={{gridTemplateColumns: `repeat(${Math.ceil(Math.sqrt(cards.length))}, 1fr)`}}>
        {cards.map((card, index) => (
          <div 
            key={index} 
            className={`card ${card.isFlipped || card.isMatched ? 'flipped' : ''}`}
            onClick={() => handleCardClick(index)}
          >
            <div className="card-inner">
              <div className="card-front">?</div>
              <div className="card-back">
                <img src={card.content} alt={`par ${card.pairId}`} />
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="game-footer">
        <span>{t('widgets.memory_game.moves', { count: moves })}</span>
        <button onClick={() => setCards([])}><RotateCcw size={16}/> {t('widgets.memory_game.start_over')}</button>
      </div>
       {isGameWon && (
        <div className="game-won-overlay">
          <h2>{t('widgets.memory_game.win_title')}</h2>
          <p>{t('widgets.memory_game.win_message', { moves })}</p>
          <button onClick={() => setCards([])}>{t('widgets.memory_game.play_again')}</button>
        </div>
      )}
    </div>
  );
};

export { widgetConfig } from './widgetConfig';
