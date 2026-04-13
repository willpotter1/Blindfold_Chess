import { cn } from '@/lib/utils';
import { type VisionBoardPiece } from '@/lib/visionTrainer';

type DrillsActivePanelProps = {
  moveLabel: string;
  score: number;
  timeRemainingSeconds: number;
  piecePlacements?: readonly VisionBoardPiece[];
  className?: string;
};

const colorLabel = (color: VisionBoardPiece['color']) => (
  color === 'white' ? 'White' : 'Black'
);

export const DrillsActivePanel = ({
  moveLabel,
  score,
  timeRemainingSeconds,
  piecePlacements = [],
  className,
}: DrillsActivePanelProps) => {
  return (
    <div className={cn('flex flex-col gap-3', className)}>
      {/* Current prompt */}
      <div className="rounded-xl border border-border/50 bg-card px-4 py-5 text-center">
        <p className="text-[0.6rem] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Move</p>
        <p className="mt-2 text-4xl font-semibold leading-none text-foreground">{moveLabel}</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-xl border border-border/50 bg-card px-3 py-3 text-center">
          <p className="text-[0.6rem] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Score</p>
          <p className="mt-1.5 text-2xl font-semibold text-foreground">{score}</p>
        </div>
        <div className="rounded-xl border border-border/50 bg-card px-3 py-3 text-center">
          <p className="text-[0.6rem] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Time</p>
          <p className="mt-1.5 text-2xl font-semibold text-foreground">{timeRemainingSeconds}s</p>
        </div>
      </div>

      {/* Piece positions (moves mode only) */}
      {piecePlacements.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-[0.6rem] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Piece Positions</p>
          <div className="space-y-1">
            {piecePlacements.map((piece) => (
              <div
                key={`${piece.color}-${piece.type}-${piece.square}`}
                className="flex items-center justify-between rounded-lg border border-border/50 bg-card px-3 py-2"
              >
                <span className="text-xs font-medium text-foreground">
                  {colorLabel(piece.color)} {piece.displayName}
                </span>
                <span className="text-xs font-semibold font-mono uppercase text-muted-foreground">
                  {piece.square}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
