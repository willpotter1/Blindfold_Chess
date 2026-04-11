import { useEffect, useRef, useState } from 'react';
import { Chess } from 'chess.js';
import {
  getFileLabelForColumn,
  getRankLabelForRow,
  visualPositionToSquare,
  type BoardPerspective,
} from '@/lib/visionTrainer';

interface BlindfoldBoardProps {
  fen: string;
  perspective: BoardPerspective;
  isVisible: boolean;
  isInteractive?: boolean;
  onMove?: (from: string, to: string) => Promise<boolean> | boolean;
  className?: string;
  highlightSourceSquare?: string | null;
  highlightTargetSquare?: string | null;
}

// Prefix assets with the deployed base (e.g. /Blindfold_Chess/) so they load in subpaths
const assetBase = import.meta.env.BASE_URL.replace(/\/$/, '');
const pieceSprites: Record<string, string> = {
  wk: `${assetBase}/pieces/wK.svg`,
  wq: `${assetBase}/pieces/wQ.svg`,
  wr: `${assetBase}/pieces/wR.svg`,
  wb: `${assetBase}/pieces/wB.svg`,
  wn: `${assetBase}/pieces/wN.svg`,
  wp: `${assetBase}/pieces/wP.svg`,
  bk: `${assetBase}/pieces/bK.svg`,
  bq: `${assetBase}/pieces/bQ.svg`,
  br: `${assetBase}/pieces/bR.svg`,
  bb: `${assetBase}/pieces/bB.svg`,
  bn: `${assetBase}/pieces/bN.svg`,
  bp: `${assetBase}/pieces/bP.svg`,
};

export const BlindfoldBoard = ({
  fen,
  perspective,
  isVisible,
  isInteractive = false,
  onMove,
  className,
  highlightSourceSquare,
  highlightTargetSquare,
}: BlindfoldBoardProps) => {
  const [selectedSquare, setSelectedSquare] = useState<string | null>(null);
  const boardRef = useRef<HTMLDivElement>(null);
  const chess = new Chess(fen);
  const showPieces = isVisible;
  const squares = Array.from({ length: 64 }, (_, index) => {
    const row = Math.floor(index / 8);
    const col = index % 8;
    const algebraic = visualPositionToSquare({ row, col }, perspective);
    const piece = chess.get(algebraic);

    return {
      row,
      col,
      algebraic,
      piece,
      isLightSquare: (row + col) % 2 === 0,
    };
  });

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (boardRef.current && !boardRef.current.contains(event.target as Node)) {
        setSelectedSquare(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, []);

  // Clear selection any time the board position changes
  useEffect(() => {
    setSelectedSquare(null);
  }, [fen]);

  const handleSquareClick = async (square: string) => {
    if (!onMove || !isInteractive) return;

    if (!selectedSquare) {
      setSelectedSquare(square);
      return;
    }

    // Clicking the same square clears the selection
    if (square === selectedSquare) {
      setSelectedSquare(null);
      return;
    }

    const moveResult = await onMove(selectedSquare, square);
    if (moveResult) {
      setSelectedSquare(null);
    } else {
      // Keep the selection so the player can try another destination
      setSelectedSquare(selectedSquare);
    }
  };

  return (
    <div className={className ?? "inline-block w-full max-w-[560px] md:max-w-[600px] lg:max-w-[min(52vw,760px)]"} ref={boardRef}>
      <div
        className="bg-theme-board-frame shadow-theme-strong rounded-xl w-full aspect-square overflow-hidden"
      >
        <div className="grid grid-cols-8 grid-rows-8 gap-0 w-full h-full">
          {squares.map(({ row, col, algebraic, piece, isLightSquare }) => {
              const spriteKey = piece ? `${piece.color}${piece.type}` : null;
              const pieceSrc = showPieces && spriteKey ? pieceSprites[spriteKey] : null;
              const isSelected = selectedSquare === algebraic;
              const isHintSource = highlightSourceSquare === algebraic;
              const isHintTarget = highlightTargetSquare === algebraic;

              return (
                <div
                  key={algebraic}
                  className={`
                    relative aspect-square flex items-center justify-center overflow-hidden
                    ${isLightSquare ? 'bg-board-light' : 'bg-board-dark'}
                    transition-colors duration-150
                    ${isSelected ? 'ring-4 ring-board-select/80 ring-inset' : ''}
                    ${isInteractive ? 'cursor-pointer' : 'cursor-default'}
                  `}
                  onClick={() => handleSquareClick(algebraic)}
                >
                  {isHintSource && (
                    <div className="pointer-events-none absolute inset-[5px] z-20 rounded-[0.45rem] border-4 border-board-highlight/90" />
                  )}
                  {isHintTarget && (
                    <div className="pointer-events-none absolute inset-[10px] z-20 rounded-[0.3rem] border-4 border-board-select/90" />
                  )}
                  {pieceSrc && (
                    <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10 grid h-[92%] w-[92%] place-items-center">
                      <img
                        src={pieceSrc}
                        alt={spriteKey || 'piece'}
                        className="shadow-theme-piece h-full w-full object-contain select-none"
                        draggable={false}
                      />
                    </div>
                  )}
                  
                {/* File labels (a-h) at bottom */}
                {row === 7 && (
                    <span className={`pointer-events-none absolute bottom-0 right-[3px] text-[10px] font-semibold z-20 ${isLightSquare ? 'text-board-label-light' : 'text-board-label-dark'}`}>
                      {getFileLabelForColumn(col, perspective)}
                    </span>
                  )}
                  
                  {/* Rank labels (1-8) on left */}
                  {col === 0 && (
                    <span className={`pointer-events-none absolute top-[2px] left-[3px] text-[10px] font-semibold z-20 ${isLightSquare ? 'text-board-label-light' : 'text-board-label-dark'}`}>
                      {getRankLabelForRow(row, perspective)}
                    </span>
                  )}
                </div>
              );
            })}
        </div>
      </div>
    </div>
  );
};
