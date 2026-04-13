import { RotateCcw, Settings, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { NumberInput } from '@/components/ui/number-input';
import { cn } from '@/lib/utils';
import type { OpeningInfo } from '@/lib/openings';

type OpeningsResultsPanelProps = {
  opening: OpeningInfo | null;
  continueEngineElo: number;
  continueRevealEvery: number;
  onContinueEngineEloChange: (elo: number) => void;
  onContinueRevealEveryChange: (value: number) => void;
  onRestart: () => void;
  onNewConfig: () => void;
  onContinue: () => void;
  className?: string;
};

export const OpeningsResultsPanel = ({
  opening,
  continueEngineElo,
  continueRevealEvery,
  onContinueEngineEloChange,
  onContinueRevealEveryChange,
  onRestart,
  onNewConfig,
  onContinue,
  className,
}: OpeningsResultsPanelProps) => {
  return (
    <Card className={cn('flex flex-col overflow-hidden', className)}>
      <CardHeader className="shrink-0 space-y-1 pb-2">
        <CardTitle className="text-xl">Opening Solved</CardTitle>
      </CardHeader>

      <CardContent className="space-y-4 pt-2">
        {/* Resolved opening */}
        <div className="rounded-xl border border-foreground/15 bg-card px-5 py-5 text-center">
          <p className="text-[0.6rem] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Resolved Opening</p>
          <p className="mt-2 text-xl font-semibold leading-tight text-foreground">
            {opening?.name ?? 'Opening not found'}
          </p>
          {opening && (
            <p className="mt-1 text-xs text-muted-foreground">{opening.eco}</p>
          )}
        </div>

        {/* Opening details */}
        {opening && (
          <div className="space-y-2">
            <div className="rounded-lg border border-border/50 bg-card px-3 py-2.5">
              <p className="text-[0.6rem] font-semibold uppercase tracking-[0.2em] text-muted-foreground">PGN</p>
              <p className="mt-1 text-xs leading-relaxed text-foreground">{opening.pgn}</p>
            </div>
            <div className="rounded-lg border border-border/50 bg-card px-3 py-2.5">
              <p className="text-[0.6rem] font-semibold uppercase tracking-[0.2em] text-muted-foreground">UCI</p>
              <p className="mt-1 break-all font-mono text-[0.65rem] leading-relaxed text-muted-foreground">{opening.uci}</p>
            </div>
          </div>
        )}

        {/* Continue game config */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="continue-elo" className="text-xs">Engine Elo</Label>
            <NumberInput
              id="continue-elo"
              min={1300}
              max={2800}
              step={50}
              value={continueEngineElo}
              onChange={(event) => onContinueEngineEloChange(Number(event.target.value))}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="continue-reveal-every" className="text-xs">Reveal Freq</Label>
            <NumberInput
              id="continue-reveal-every"
              min={0}
              step={1}
              value={continueRevealEvery}
              onChange={(event) => onContinueRevealEveryChange(Number(event.target.value))}
            />
          </div>
        </div>

        {/* Actions */}
        <div className="space-y-2">
          <Button type="button" className="h-10 w-full bg-primary text-sm text-primary-foreground hover:bg-primary/90" onClick={onContinue}>
            <Play size={14} className="mr-1.5" />Continue Game
          </Button>
          <div className="grid grid-cols-2 gap-2">
            <Button type="button" variant="outline" className="h-9 border border-border/50 bg-card text-xs text-foreground hover:bg-secondary" onClick={onRestart}>
              <RotateCcw size={13} className="mr-1" />Restart
            </Button>
            <Button type="button" variant="outline" className="h-9 border border-border/50 bg-card text-xs text-foreground hover:bg-secondary" onClick={onNewConfig}>
              <Settings size={13} className="mr-1" />New Config
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
