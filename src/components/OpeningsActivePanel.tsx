import { cn } from '@/lib/utils';

type OpeningsActivePanelProps = {
  playerMoveCount: number;
  depthPlayerMoves: number;
  activeRecordCount: number;
  status: string;
  className?: string;
};

export const OpeningsActivePanel = ({
  playerMoveCount,
  depthPlayerMoves,
  activeRecordCount,
  status,
  className,
}: OpeningsActivePanelProps) => {
  return (
    <div className={cn('space-y-3', className)}>
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-xl border border-border/50 bg-card px-3 py-3 text-center">
          <p className="text-[0.6rem] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Your Moves</p>
          <p className="mt-1.5 text-2xl font-semibold text-foreground">{playerMoveCount}/{depthPlayerMoves}</p>
        </div>
        <div className="rounded-xl border border-border/50 bg-card px-3 py-3 text-center">
          <p className="text-[0.6rem] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Active Lines</p>
          <p className="mt-1.5 text-2xl font-semibold text-foreground">{activeRecordCount}</p>
        </div>
      </div>

      <div className="rounded-xl border border-border/50 bg-card px-4 py-3">
        <p className="text-[0.6rem] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Status</p>
        <p className="mt-1.5 whitespace-pre-line text-sm leading-relaxed text-foreground">{status}</p>
      </div>
    </div>
  );
};
