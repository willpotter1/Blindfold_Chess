import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import {
  type MovesPieceDisplay,
  roundLengthOptions,
  type BoardPerspective,
  type RoundLengthSeconds,
  type VisionMode,
  type VisionRoundConfig,
} from '@/lib/visionTrainer';

type DrillsConfigPanelProps = {
  config: VisionRoundConfig;
  panelPadding: number;
  sectionGap: number;
  statusMessage?: string;
  statusTone?: 'default' | 'error';
  isStartDisabled?: boolean;
  onConfigChange: (config: VisionRoundConfig) => void;
  onStart: () => void;
  className?: string;
};

const primaryButtonClassName = 'w-full border-2 border-primary bg-primary text-primary-foreground hover:bg-primary/90';

export const DrillsConfigPanel = ({
  config,
  panelPadding,
  sectionGap,
  statusMessage,
  statusTone = 'default',
  isStartDisabled = false,
  onConfigChange,
  onStart,
  className,
}: DrillsConfigPanelProps) => {
  const fieldGap = Math.max(10, Math.round(sectionGap * 0.72));

  return (
    <Card className={cn('bg-surface-white/75 flex flex-col overflow-hidden', className)}>
      <CardHeader className="shrink-0 pb-0" style={{ padding: `${panelPadding}px` }}>
        <CardTitle className="text-xl">Round Setup</CardTitle>
        <CardDescription className="text-sm">
          Set the drill type, orientation, coordinate labels, and round length.
        </CardDescription>
      </CardHeader>

      <CardContent
        className="pt-0"
        style={{
          paddingLeft: `${panelPadding}px`,
          paddingRight: `${panelPadding}px`,
          paddingBottom: `${panelPadding}px`,
        }}
      >
        <div className="grid content-start" style={{ gap: `${sectionGap}px` }}>
          <div className="grid" style={{ gap: `${fieldGap}px` }}>
            <div className="space-y-2">
              <Label htmlFor="drills-mode">Mode</Label>
              <Select
                value={config.mode}
                onValueChange={(value) =>
                  onConfigChange({
                    ...config,
                    mode: value as VisionMode,
                  })
                }
              >
                <SelectTrigger id="drills-mode" className="bg-surface-strong/55">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="coordinates">Coordinates</SelectItem>
                  <SelectItem value="moves">Moves</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="drills-perspective">Perspective</Label>
              <Select
                value={config.perspective}
                onValueChange={(value) =>
                  onConfigChange({
                    ...config,
                    perspective: value as BoardPerspective,
                  })
                }
              >
                <SelectTrigger id="drills-perspective" className="bg-surface-strong/55">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="white">White</SelectItem>
                  <SelectItem value="black">Black</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {config.mode === 'moves' && (
              <div className="space-y-2">
                <Label htmlFor="drills-moves-piece-display">Piece Positions</Label>
                <Select
                  value={config.movesPieceDisplay}
                  onValueChange={(value) =>
                    onConfigChange({
                      ...config,
                      movesPieceDisplay: value as MovesPieceDisplay,
                    })
                  }
                >
                  <SelectTrigger id="drills-moves-piece-display" className="bg-surface-strong/55">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="board">Show on board</SelectItem>
                    <SelectItem value="panel">List on right</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-sm text-muted-foreground">
                  In moves mode, either show the 6-piece position on the board or keep the board empty and list the placements on the right.
                </p>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="drills-round-length">Round Length</Label>
              <Select
                value={String(config.roundLengthSeconds)}
                onValueChange={(value) =>
                  onConfigChange({
                    ...config,
                    roundLengthSeconds: Number(value) as RoundLengthSeconds,
                  })
                }
              >
                <SelectTrigger id="drills-round-length" className="bg-surface-strong/55">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {roundLengthOptions.map((roundLength) => (
                    <SelectItem key={roundLength} value={String(roundLength)}>
                      {roundLength}s
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center justify-between rounded-xl border-2 border-border bg-surface-white/75 px-4 py-3">
            <div className="pr-4">
              <Label htmlFor="drills-show-coordinates" className="cursor-pointer">
                Show Board Coordinates
              </Label>
              <p className="mt-1 text-sm text-muted-foreground">
                Display rank and file labels that flip with the board perspective.
              </p>
            </div>

            <Switch
              id="drills-show-coordinates"
              checked={config.showCoordinates}
              onCheckedChange={(checked) =>
                onConfigChange({
                  ...config,
                  showCoordinates: checked,
                })
              }
            />
          </div>

          {statusMessage && (
            <p className={statusTone === 'error' ? 'text-sm text-destructive' : 'text-sm text-muted-foreground'}>
              {statusMessage}
            </p>
          )}

          <Button
            type="button"
            size="lg"
            className={primaryButtonClassName}
            onClick={onStart}
            disabled={isStartDisabled}
          >
            Start Round
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
