import { RotateCcw, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

type DrillsResultsPanelProps = {
  score: number;
  correctCount: number;
  wrongCount: number;
  totalAttempts: number;
  accuracyText: string;
  onPlayAgain: () => void;
  onNewConfig: () => void;
  className?: string;
};

export const DrillsResultsPanel = ({
  score,
  correctCount,
  wrongCount,
  totalAttempts,
  accuracyText,
  onPlayAgain,
  onNewConfig,
  className,
}: DrillsResultsPanelProps) => {
  return (
    <Card className={cn('bg-card flex flex-col overflow-hidden', className)}>
      <CardHeader className="shrink-0 space-y-1 pb-2">
        <CardTitle className="text-xl">Results</CardTitle>
      </CardHeader>

      <CardContent className="space-y-4 pt-2">
        {/* Final score */}
        <div className="rounded-xl border border-foreground/15 bg-card px-5 py-5 text-center">
          <p className="text-[0.6rem] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Final Score</p>
          <p className="mt-2 text-5xl font-semibold leading-none text-foreground">{score}</p>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-xl border border-border/50 bg-card px-3 py-3">
            <p className="text-[0.6rem] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Correct</p>
            <p className="mt-1.5 text-xl font-semibold text-foreground">{correctCount}</p>
          </div>
          <div className="rounded-xl border border-border/50 bg-card px-3 py-3">
            <p className="text-[0.6rem] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Wrong</p>
            <p className="mt-1.5 text-xl font-semibold text-foreground">{wrongCount}</p>
          </div>
          <div className="rounded-xl border border-border/50 bg-card px-3 py-3">
            <p className="text-[0.6rem] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Attempts</p>
            <p className="mt-1.5 text-xl font-semibold text-foreground">{totalAttempts}</p>
          </div>
          <div className="rounded-xl border border-border/50 bg-card px-3 py-3">
            <p className="text-[0.6rem] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Accuracy</p>
            <p className="mt-1.5 text-xl font-semibold text-foreground">{accuracyText}</p>
          </div>
        </div>

        {/* Actions */}
        <div className="grid grid-cols-2 gap-2">
          <Button type="button" className="h-9 bg-primary text-sm text-primary-foreground hover:bg-primary/90" onClick={onPlayAgain}>
            <RotateCcw size={14} className="mr-1.5" />Play Again
          </Button>
          <Button type="button" variant="outline" className="h-9 border border-border/50 bg-card text-sm text-foreground hover:bg-secondary" onClick={onNewConfig}>
            <Settings size={14} className="mr-1.5" />New Config
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
