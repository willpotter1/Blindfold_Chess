import { Chess } from 'chess.js';

interface BlindfoldBoardProps {
  fen: string;
  isVisible: boolean;
}

const pieceSymbols: { [key: string]: string } = {
  'K': '♔', 'Q': '♕', 'R': '♖', 'B': '♗', 'N': '♘', 'P': '♙',
  'k': '♚', 'q': '♛', 'r': '♜', 'b': '♝', 'n': '♞', 'p': '♟',
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
    <div className="inline-block bg-chess-border p-3 rounded-lg shadow-lg">
      <div className="grid grid-cols-8 gap-0 border-2 border-chess-border">
        {board.map((row, rowIndex) => (
          row.map((square, colIndex) => {
            const isLight = (rowIndex + colIndex) % 2 === 0;
            const piece = square ? pieceSymbols[square.color === 'w' ? square.type.toUpperCase() : square.type] : '';
            const file = String.fromCharCode(97 + colIndex); // a-h
            const rank = 8 - rowIndex; // 8-1

            return (
              <div
                key={`${rowIndex}-${colIndex}`}
                className={`
                  relative aspect-square flex items-center justify-center
                  ${isLight ? 'bg-chess-light' : 'bg-chess-dark'}
                  w-12 h-12 md:w-14 md:h-14
                `}
              >
                <span className={`text-3xl md:text-4xl select-none ${square?.color === 'w' ? 'text-foreground' : 'text-gray-800'}`}>
                  {piece}
                </span>
                
                {/* File labels (a-h) at bottom */}
                {rowIndex === 7 && (
                  <span className={`absolute bottom-0.5 right-1 text-[10px] font-semibold ${isLight ? 'text-chess-dark' : 'text-chess-light'}`}>
                    {file}
                  </span>
                )}
                
                {/* Rank labels (1-8) on left */}
                {colIndex === 0 && (
                  <span className={`absolute top-0.5 left-1 text-[10px] font-semibold ${isLight ? 'text-chess-dark' : 'text-chess-light'}`}>
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
