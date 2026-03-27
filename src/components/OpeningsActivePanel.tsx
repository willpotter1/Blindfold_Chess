import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

type OpeningsActivePanelProps = {
  playerMoveCount: number;
  depthPlayerMoves: number;
  activeRecordCount: number;
  status: string;
  className?: string;
};

const ActiveMetric = ({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) => (
  <div className="rounded-xl border-2 border-border bg-surface-white/75 px-3 py-3 text-center">
    <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-primary">{label}</div>
    <div className="mt-1.5 text-[clamp(1.7rem,2.1vw,2.4rem)] font-semibold leading-none text-foreground">{value}</div>
  </div>
);

export const OpeningsActivePanel = ({
  playerMoveCount,
  depthPlayerMoves,
  activeRecordCount,
  status,
  className,
}: OpeningsActivePanelProps) => {
  return (
    <Card className={cn('flex flex-col overflow-hidden border-2 border-border', className)}>
      <CardHeader className="space-y-1 pb-1.5">
        <CardTitle className="text-lg">Opening Round</CardTitle>
        <CardDescription className="text-sm leading-snug">
          Stay inside the selected opening pool and play the canonical response.
        </CardDescription>
      </CardHeader>

      <CardContent className="grid gap-3 pt-1.5">
        <div className="grid grid-cols-2 gap-2.5">
          <ActiveMetric label="Your Moves" value={`${playerMoveCount}/${depthPlayerMoves}`} />
          <ActiveMetric label="Active Lines" value={activeRecordCount} />
        </div>

        <div className="rounded-2xl border-2 border-border bg-surface-white/75 px-4 py-3.5">
          <div className="text-[11px] font-semibold uppercase tracking-[0.28em] text-primary">Status</div>
          <div className="mt-2 whitespace-pre-line text-sm leading-5 text-foreground">{status}</div>
        </div>
      </CardContent>
    </Card>
  );
};
