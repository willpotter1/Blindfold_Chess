import { useEffect, useRef, useState } from 'react';
import { Chess } from 'chess.js';

interface BlindfoldBoardProps {
  fen: string;
  isVisible: boolean;
  isInteractive?: boolean;
  onMove?: (from: string, to: string) => Promise<boolean> | boolean;
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

export const BlindfoldBoard = ({ fen, isVisible, isInteractive = false, onMove }: BlindfoldBoardProps) => {
  const [selectedSquare, setSelectedSquare] = useState<string | null>(null);
  const boardRef = useRef<HTMLDivElement>(null);
  const chess = new Chess(fen);
  const board = chess.board();
  const showPieces = isVisible;

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
    <div className="inline-block w-full max-w-[560px] md:max-w-[600px] lg:max-w-[min(52vw,760px)]" ref={boardRef}>
      <div
        className="rounded-xl shadow-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 border border-slate-700 w-full aspect-square overflow-hidden"
      >
        <div className="grid grid-cols-8 grid-rows-8 gap-0 w-full h-full">
          {board.map((row, rowIndex) => (
            row.map((square, colIndex) => {
              const isLight = (rowIndex + colIndex) % 2 === 0;
              const spriteKey = square ? `${square.color}${square.type}` : null;
              const pieceSrc = showPieces && spriteKey ? pieceSprites[spriteKey] : null;
              const file = String.fromCharCode(97 + colIndex); // a-h
              const rank = 8 - rowIndex; // 8-1
              const algebraic = `${file}${rank}`;
              const isSelected = selectedSquare === algebraic;

              return (
                <div
                  key={`${rowIndex}-${colIndex}`}
                  className={`
                    relative aspect-square flex items-center justify-center overflow-hidden
                    ${isLight ? 'bg-[#844318]' : 'bg-[#d9b99b]'}
                    transition-colors duration-150
                    ${isSelected ? 'ring-4 ring-sky-400/70 ring-inset' : ''}
                    ${isInteractive ? 'cursor-pointer' : 'cursor-default'}
                  `}
                  onClick={() => handleSquareClick(algebraic)}
                >
                  {pieceSrc && (
                    <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10 w-[76%] h-[76%] grid place-items-center">
                      <img
                        src={pieceSrc}
                        alt={spriteKey || 'piece'}
                        className="h-full w-full object-contain select-none drop-shadow-[0_1px_2px_rgba(0,0,0,0.35)]"
                        draggable={false}
                      />
                    </div>
                  )}
                  
                {/* File labels (a-h) at bottom */}
                {rowIndex === 7 && (
                    <span className={`pointer-events-none absolute bottom-0 right-[3px] text-[10px] font-semibold z-20 ${isLight ? 'text-zinc-100' : 'text-zinc-300'}`}>
                      {file}
                    </span>
                  )}
                  
                  {/* Rank labels (1-8) on left */}
                  {colIndex === 0 && (
                    <span className={`pointer-events-none absolute top-[2px] left-[3px] text-[10px] font-semibold z-20 ${isLight ? 'text-zinc-100' : 'text-zinc-300'}`}>
                      {rank}
                    </span>
                  )}
                </div>
              );
            })
          ))}
        </div>
      </div>
    </div>
  );
};
