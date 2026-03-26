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
  <div className="rounded-xl border-2 border-border bg-surface-white/75 p-4 text-center">
    <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-primary">{label}</div>
    <div className="mt-2 text-3xl font-semibold text-foreground">{value}</div>
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
      <CardHeader className="pb-2">
        <CardTitle className="text-xl">Opening Round</CardTitle>
        <CardDescription className="text-sm">
          Stay inside the selected opening pool and play the canonical response.
        </CardDescription>
      </CardHeader>

      <CardContent className="grid gap-4 pt-2">
        <div className="grid grid-cols-2 gap-3">
          <ActiveMetric label="Your Moves" value={`${playerMoveCount}/${depthPlayerMoves}`} />
          <ActiveMetric label="Active Lines" value={activeRecordCount} />
        </div>

        <div className="rounded-2xl border-2 border-border bg-surface-white/75 px-5 py-5">
          <div className="text-[11px] font-semibold uppercase tracking-[0.28em] text-primary">Status</div>
          <div className="mt-3 whitespace-pre-line text-sm leading-6 text-foreground">{status}</div>
        </div>
      </CardContent>
    </Card>
  );
};
