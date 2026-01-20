import { useState, useEffect } from 'react';
import type { FC } from 'react';
import { useTranslation } from 'react-i18next';
import { Upload, Shuffle } from 'lucide-react';
import { getEntry } from '../../../utils/fileManagerDb';
import { requestOpenFile } from '../../../utils/openDialog';
import './SlidingPuzzle.css';

const isSolvable = (order: number[], gridSize: number): boolean => {
  let inversions = 0;
  const arr = order.filter(p => p !== gridSize * gridSize - 1);
  for (let i = 0; i < arr.length - 1; i++) {
    for (let j = i + 1; j < arr.length; j++) {
      if (arr[i] > arr[j]) {
        inversions++;
      }
    }
  }

  if (gridSize % 2 === 1) {
    return inversions % 2 === 0;
  } else {
    const emptyRowFromBottom = gridSize - Math.floor(order.indexOf(gridSize * gridSize - 1) / gridSize);
    return (inversions + emptyRowFromBottom) % 2 !== 0;
  }
};

export const SlidingPuzzleWidget: FC = () => {
  const { t } = useTranslation();
  const [image, setImage] = useState<string | null>(null);
  const [gridSize, setGridSize] = useState(3);
  const [pieces, setPieces] = useState<number[]>([]);
  const [isSolved, setIsSolved] = useState(false);
  
  const shufflePieces = () => {
    const totalPieces = gridSize * gridSize;
    const initialPieces = Array.from({ length: totalPieces }, (_, i) => i);

    let shuffled: number[];
    do {
      shuffled = [...initialPieces].sort(() => Math.random() - 0.5);
    } while (!isSolvable(shuffled, gridSize) || shuffled.every((p, i) => p === i));
    
    setPieces(shuffled);
    setIsSolved(false);
  };
  
  useEffect(() => {
    if (image) {
      shufflePieces();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [image, gridSize]);

  useEffect(() => {
    if (pieces.length === 0) return;
    const solved = pieces.every((pieceId, index) => pieceId === index);
    setIsSolved(solved);
  }, [pieces]);

  const loadImage = (file: File) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      setImage(event.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleOpenImage = async () => {
    const result = await requestOpenFile({ accept: 'image/*' });
    if (!result) return;
    if (result.source === 'local') {
      const [file] = result.files;
      if (file) loadImage(file);
      return;
    }
    const [entryId] = result.entryIds;
    if (!entryId) return;
    const entry = await getEntry(entryId);
    if (!entry?.blob) return;
    const file = new File([entry.blob], entry.name, { type: entry.mime || entry.blob.type });
    loadImage(file);
  };

  const handlePieceClick = (clickedIndex: number) => {
    if (isSolved) return;
    
    const emptyIndex = pieces.indexOf(gridSize * gridSize - 1);

    const isAdjacent = (i1: number, i2: number) => {
      const row1 = Math.floor(i1 / gridSize);
      const col1 = i1 % gridSize;
      const row2 = Math.floor(i2 / gridSize);
      const col2 = i2 % gridSize;
      return (row1 === row2 && Math.abs(col1 - col2) === 1) || (col1 === col2 && Math.abs(row1 - row2) === 1);
    };

    if (isAdjacent(clickedIndex, emptyIndex)) {
      const newPieces = [...pieces];
      [newPieces[clickedIndex], newPieces[emptyIndex]] = [newPieces[emptyIndex], newPieces[clickedIndex]];
      setPieces(newPieces);
    }
  };

  if (!image) {
    return (
      <div className="puzzle-placeholder">
        <Upload size={48} />
        <p>{t('widgets.sliding_puzzle.upload_prompt')}</p>
        <button className="puzzle-upload-button" onClick={handleOpenImage}>
          {t('widgets.sliding_puzzle.upload_prompt')}
        </button>
      </div>
    );
  }

  return (
    <div className="sliding-puzzle-widget">
      <div className="puzzle-board" style={{ gridTemplateColumns: `repeat(${gridSize}, 1fr)` }}>
        {pieces.map((pieceId, index) => {
          const isempty = pieceId === gridSize * gridSize - 1;
          const col = pieceId % gridSize;
          const row = Math.floor(pieceId / gridSize);

          return (
            <div
              key={index}
              className={`puzzle-piece ${isempty ? 'empty' : ''}`}
              onClick={() => handlePieceClick(index)}
            >
              {!isempty && (
                <div
                  className="piece-image"
                  style={{
                    backgroundImage: `url(${image})`,
                    backgroundSize: `${gridSize * 100}% ${gridSize * 100}%`,
                    backgroundPosition: `${col * 100 / (gridSize - 1)}% ${row * 100 / (gridSize - 1)}%`,
                  }}
                />
              )}
            </div>
          );
        })}
        {isSolved && <div className="solved-overlay">{t('widgets.sliding_puzzle.solved_overlay')}</div>}
      </div>
      <div className="puzzle-controls">
        <label>
          {t('widgets.sliding_puzzle.complexity_label')}
          <select value={gridSize} onChange={e => setGridSize(Number(e.target.value))}>
            <option value={3}>{t('widgets.sliding_puzzle.difficulty.easy')}</option>
            <option value={4}>{t('widgets.sliding_puzzle.difficulty.normal')}</option>
            <option value={5}>{t('widgets.sliding_puzzle.difficulty.hard')}</option>
          </select>
        </label>
        <button onClick={shufflePieces}><Shuffle size={16} /> {t('widgets.sliding_puzzle.shuffle_button')}</button>
      </div>
    </div>
  );
};

export { widgetConfig } from './widgetConfig';
