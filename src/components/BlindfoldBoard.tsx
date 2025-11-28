import { Chess } from 'chess.js';

interface BlindfoldBoardProps {
  fen: string;
  isVisible: boolean;
}

// Locally served piece sprites (copied to /public/pieces)
const pieceSprites: Record<string, string> = {
  wk: '/pieces/wK.svg',
  wq: '/pieces/wQ.svg',
  wr: '/pieces/wR.svg',
  wb: '/pieces/wB.svg',
  wn: '/pieces/wN.svg',
  wp: '/pieces/wP.svg',
  bk: '/pieces/bK.svg',
  bq: '/pieces/bQ.svg',
  br: '/pieces/bR.svg',
  bb: '/pieces/bB.svg',
  bn: '/pieces/bN.svg',
  bp: '/pieces/bP.svg',
};

export const BlindfoldBoard = ({ fen, isVisible }: BlindfoldBoardProps) => {
  if (!isVisible) {
    return (
      <div className="flex items-center justify-center bg-card border-2 border-chess-border rounded-lg aspect-square max-w-[500px] w-full">
        <div className="text-center p-8">
          <div className="text-6xl mb-4">👁️‍🗨️</div>
          <h3 className="text-xl font-semibold mb-2">Board Hidden</h3>
          <p className="text-muted-foreground">
            Visualize the position in your mind
          </p>
        </div>
      </div>
    );
  }

  const chess = new Chess(fen);
  const board = chess.board();

  return (
    <div className="inline-block w-full max-w-[520px]">
      <div
        className="rounded-xl shadow-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-3 border border-slate-700 w-full aspect-square"
      >
        <div className="grid grid-cols-8 grid-rows-8 gap-0 rounded-lg overflow-hidden border border-slate-700 w-full h-full">
          {board.map((row, rowIndex) => (
            row.map((square, colIndex) => {
              const isLight = (rowIndex + colIndex) % 2 === 0;
              const spriteKey = square ? `${square.color}${square.type}` : null;
              const pieceSrc = spriteKey ? pieceSprites[spriteKey] : null;
              const file = String.fromCharCode(97 + colIndex); // a-h
              const rank = 8 - rowIndex; // 8-1

              return (
                <div
                  key={`${rowIndex}-${colIndex}`}
                  className={`
                    relative aspect-square flex items-center justify-center overflow-hidden
                    ${isLight ? 'bg-amber-200' : 'bg-emerald-700'}
                    transition-colors duration-150
                  `}
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
                    <span className={`pointer-events-none absolute bottom-0 right-[3px] text-[10px] font-semibold z-20 ${isLight ? 'text-emerald-900' : 'text-amber-100'}`}>
                      {file}
                    </span>
                  )}
                  
                  {/* Rank labels (1-8) on left */}
                  {colIndex === 0 && (
                    <span className={`pointer-events-none absolute top-[2px] left-[3px] text-[10px] font-semibold z-20 ${isLight ? 'text-emerald-900' : 'text-amber-100'}`}>
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
