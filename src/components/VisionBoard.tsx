import { cn } from '@/lib/utils';
import {
  getFileLabelForColumn,
  getRankLabelForRow,
  type BoardPerspective,
  type VisionBoardPiece,
  visualPositionToSquare,
} from '@/lib/visionTrainer';

type SquareFeedback = {
  square: string;
  result: 'correct' | 'wrong';
} | null;

type VisionBoardProps = {
  perspective: BoardPerspective;
  showCoordinates: boolean;
  pieces?: readonly VisionBoardPiece[];
  selectedSquare?: string | null;
  onSquareClick?: (square: string) => void;
  disabled?: boolean;
  feedback?: SquareFeedback;
  className?: string;
};

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

export const VisionBoard = ({
  perspective,
  showCoordinates,
  pieces = [],
  selectedSquare = null,
  onSquareClick,
  disabled = false,
  feedback = null,
  className,
}: VisionBoardProps) => {
  const piecesBySquare = new Map(pieces.map((piece) => [piece.square, piece]));
  const squares = Array.from({ length: 64 }, (_, index) => {
    const row = Math.floor(index / 8);
    const col = index % 8;
    const square = visualPositionToSquare({ row, col }, perspective);
    const isLightSquare = (row + col) % 2 === 0;
    const isFeedbackSquare = feedback?.square === square;
    const piece = piecesBySquare.get(square);
    const feedbackClassName =
      feedback?.result === 'correct'
        ? 'bg-board-correct/70'
        : feedback?.result === 'wrong'
          ? 'bg-board-wrong/70'
          : '';

    return {
      row,
      col,
      square,
      piece,
      isLightSquare,
      isFeedbackSquare,
      isSelectedSquare: selectedSquare === square,
      feedbackClassName,
    };
  });

  return (
    <div className={cn('grid aspect-square grid-cols-8 overflow-hidden rounded-xl border-2 border-board-border', className)}>
      {squares.map(({
        row,
        col,
        square,
        piece,
        isLightSquare,
        isFeedbackSquare,
        isSelectedSquare,
        feedbackClassName,
      }) => (
        <button
          key={square}
          type="button"
          aria-label={`Square ${square}`}
          className={cn(
            'relative flex aspect-square items-center justify-center overflow-hidden p-0 transition-transform duration-100 focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-board-select/90 focus-visible:ring-offset-0',
            isLightSquare ? 'bg-board-light' : 'bg-board-dark',
            disabled ? 'cursor-default' : 'cursor-pointer active:scale-[0.985]',
            isSelectedSquare && 'ring-4 ring-inset ring-board-highlight/90',
          )}
          disabled={disabled}
          onClick={() => onSquareClick?.(square)}
        >
          {isFeedbackSquare && (
            <span className={cn('pointer-events-none absolute inset-0 z-[2]', feedbackClassName)} />
          )}

          {piece && (
            <span className="pointer-events-none absolute inset-[10%] z-[3] grid place-items-center">
              <img
                src={pieceSprites[piece.spriteKey]}
                alt={`${piece.color} ${piece.displayName}`}
                className="shadow-theme-piece h-full w-full object-contain"
                draggable={false}
              />
            </span>
          )}

          {showCoordinates && row === 7 && (
            <span
              className={cn(
                'pointer-events-none absolute bottom-1 right-1 z-[4] text-[11px] font-semibold sm:text-xs',
                isLightSquare ? 'text-board-label-light' : 'text-board-label-dark',
              )}
            >
              {getFileLabelForColumn(col, perspective)}
            </span>
          )}

          {showCoordinates && col === 0 && (
            <span
              className={cn(
                'pointer-events-none absolute left-1 top-1 z-[4] text-[11px] font-semibold sm:text-xs',
                isLightSquare ? 'text-board-label-light' : 'text-board-label-dark',
              )}
            >
              {getRankLabelForRow(row, perspective)}
            </span>
          )}
        </button>
      ))}
    </div>
  );
};
