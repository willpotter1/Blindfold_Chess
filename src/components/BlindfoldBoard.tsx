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
    <div className="inline-block rounded-xl shadow-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-3 border border-slate-700">
      <div className="grid grid-cols-8 gap-0 rounded-lg overflow-hidden border border-slate-700">
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
                  relative aspect-square flex items-center justify-center
                  ${isLight ? 'bg-amber-200' : 'bg-emerald-700'}
                  w-12 h-12 md:w-14 md:h-14 transition-colors duration-150
                `}
              >
                {pieceSrc && (
                  <img
                    src={pieceSrc}
                    alt={spriteKey || 'piece'}
                    className="w-10 h-10 md:w-12 md:h-12 select-none drop-shadow-[0_2px_2px_rgba(0,0,0,0.3)]"
                    draggable={false}
                  />
                )}
                
                {/* File labels (a-h) at bottom */}
                {rowIndex === 7 && (
                  <span className={`absolute bottom-0.5 right-1 text-[10px] font-semibold ${isLight ? 'text-emerald-900' : 'text-amber-100'}`}>
                    {file}
                  </span>
                )}
                
                {/* Rank labels (1-8) on left */}
                {colIndex === 0 && (
                  <span className={`absolute top-0.5 left-1 text-[10px] font-semibold ${isLight ? 'text-emerald-900' : 'text-amber-100'}`}>
                    {rank}
                  </span>
                )}
              </div>
            );
          })
        ))}
      </div>
    </div>
  );
};
