import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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

const primaryButtonClassName = 'w-full bg-[#8B4513] text-white hover:bg-[#8B4513]/90';
const secondaryButtonClassName = 'w-full border-2 border-[#d9b99b] bg-white text-zinc-900 hover:bg-zinc-50';

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
    <Card className={cn('flex flex-col overflow-hidden border-2 border-[#d9b99b]', className)}>
      <CardHeader className="pb-2">
        <CardTitle className="text-xl">Opening Solved</CardTitle>
        <CardDescription className="text-sm">
          Review the resolved opening, restart the drill, or continue into a full game.
        </CardDescription>
      </CardHeader>

      <CardContent className="grid gap-4 pt-2">
        <div className="rounded-2xl border-2 border-[#8B4513] bg-[#fff2e8] px-5 py-6 text-center">
          <div className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#8B4513]">Resolved Opening</div>
          <div className="mt-3 text-2xl font-semibold leading-tight text-black">
            {opening?.name ?? 'Opening not found'}
          </div>
          {opening && (
            <div className="mt-2 text-sm text-zinc-700">
              {opening.eco}
            </div>
          )}
        </div>

        {opening && (
          <div className="grid gap-3">
            <div className="rounded-xl border border-[#d9b99b] bg-white px-4 py-3">
              <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#8B4513]">Canonical PGN</div>
              <div className="mt-2 text-sm leading-6 text-black">{opening.pgn}</div>
            </div>

            <div className="rounded-xl border border-[#d9b99b] bg-white px-4 py-3">
              <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#8B4513]">Canonical UCI</div>
              <div className="mt-2 break-all font-mono text-xs leading-6 text-black">{opening.uci}</div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="continue-elo">Continue At Elo</Label>
            <Input
              id="continue-elo"
              type="number"
              min={1300}
              max={2800}
              step={10}
              value={continueEngineElo}
              onChange={(event) => onContinueEngineEloChange(Number(event.target.value))}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="continue-reveal-every">Reveal Frequency</Label>
            <Input
              id="continue-reveal-every"
              type="number"
              min={0}
              step={1}
              value={continueRevealEvery}
              onChange={(event) => onContinueRevealEveryChange(Number(event.target.value))}
            />
          </div>
        </div>

        <div className="grid gap-2">
          <Button type="button" className={primaryButtonClassName} onClick={onContinue}>
            Continue Game
          </Button>
          <Button type="button" variant="outline" className={secondaryButtonClassName} onClick={onRestart}>
            Restart Same Config
          </Button>
          <Button type="button" variant="outline" className={secondaryButtonClassName} onClick={onNewConfig}>
            New Config
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
