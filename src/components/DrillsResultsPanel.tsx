import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

type DrillsResultsPanelProps = {
  score: number;
  correctCount: number;
  wrongCount: number;
  totalAttempts: number;
  accuracyText: string;
  panelPadding: number;
  sectionGap: number;
  onPlayAgain: () => void;
  onNewConfig: () => void;
  className?: string;
};

const primaryButtonClassName = 'w-full border-2 border-primary bg-primary text-primary-foreground hover:bg-primary/90';
const secondaryButtonClassName = 'w-full border-2 border-border bg-surface-white/75 text-foreground hover:bg-accent';

const ResultsMetric = ({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) => (
  <div className="rounded-xl border-2 border-border bg-surface-white/75 p-4">
    <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-primary">{label}</div>
    <div className="mt-2 text-2xl font-semibold text-foreground">{value}</div>
  </div>
);

export const DrillsResultsPanel = ({
  score,
  correctCount,
  wrongCount,
  totalAttempts,
  accuracyText,
  panelPadding,
  sectionGap,
  onPlayAgain,
  onNewConfig,
  className,
}: DrillsResultsPanelProps) => {
  return (
    <Card className={cn('bg-surface-white/75 flex flex-col overflow-hidden', className)}>
      <CardHeader className="shrink-0 pb-0" style={{ padding: `${panelPadding}px` }}>
        <CardTitle className="text-xl">Results</CardTitle>
      </CardHeader>

      <CardContent
        className="pt-0"
        style={{
          paddingLeft: `${panelPadding}px`,
          paddingRight: `${panelPadding}px`,
          paddingBottom: `${panelPadding}px`,
        }}
      >
        <div
          className="flex flex-col"
          style={{
            gap: `${sectionGap}px`,
          }}
        >
          <div className="rounded-2xl border-2 border-primary bg-surface-white/75 px-5 py-6 text-center">
            <div className="text-[11px] font-semibold uppercase tracking-[0.28em] text-primary">Final Score</div>
            <div className="mt-3 text-5xl font-semibold leading-none text-foreground">{score}</div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <ResultsMetric label="Correct" value={correctCount} />
            <ResultsMetric label="Wrong" value={wrongCount} />
            <ResultsMetric label="Attempts" value={totalAttempts} />
            <ResultsMetric label="Accuracy" value={accuracyText} />
          </div>

          <div className="grid gap-2">
            <Button type="button" className={primaryButtonClassName} onClick={onPlayAgain}>
              Play Again
            </Button>
            <Button type="button" variant="outline" className={secondaryButtonClassName} onClick={onNewConfig}>
              New Config
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
