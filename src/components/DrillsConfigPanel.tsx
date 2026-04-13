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
  statusMessage?: string;
  statusTone?: 'default' | 'error';
  isStartDisabled?: boolean;
  onConfigChange: (config: VisionRoundConfig) => void;
  onStart: () => void;
  className?: string;
};

export const DrillsConfigPanel = ({
  config,
  statusMessage,
  statusTone = 'default',
  isStartDisabled = false,
  onConfigChange,
  onStart,
  className,
}: DrillsConfigPanelProps) => {
  return (
    <Card className={cn('bg-card flex flex-col overflow-hidden', className)}>
      <CardHeader className="shrink-0 space-y-1 pb-2">
        <CardTitle className="text-xl">Round Setup</CardTitle>
        <CardDescription className="text-xs">
          Set the drill type, orientation, coordinate labels, and round length.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4 pt-2">
        <div className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="drills-mode">Mode</Label>
            <Select
              value={config.mode}
              onValueChange={(value) => onConfigChange({ ...config, mode: value as VisionMode })}
            >
              <SelectTrigger id="drills-mode"><SelectValue /></SelectTrigger>
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
              onValueChange={(value) => onConfigChange({ ...config, perspective: value as BoardPerspective })}
            >
              <SelectTrigger id="drills-perspective"><SelectValue /></SelectTrigger>
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
                onValueChange={(value) => onConfigChange({ ...config, movesPieceDisplay: value as MovesPieceDisplay })}
              >
                <SelectTrigger id="drills-moves-piece-display"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="board">Show on board</SelectItem>
                  <SelectItem value="panel">List on right</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Show pieces on the board or list placements in the panel.
              </p>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="drills-round-length">Round Length</Label>
            <Select
              value={String(config.roundLengthSeconds)}
              onValueChange={(value) => onConfigChange({ ...config, roundLengthSeconds: Number(value) as RoundLengthSeconds })}
            >
              <SelectTrigger id="drills-round-length"><SelectValue /></SelectTrigger>
              <SelectContent>
                {roundLengthOptions.map((roundLength) => (
                  <SelectItem key={roundLength} value={String(roundLength)}>{roundLength}s</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex items-center justify-between rounded-xl border border-border/50 bg-secondary/30 px-4 py-3">
          <div className="pr-4">
            <Label htmlFor="drills-show-coordinates" className="cursor-pointer text-sm">
              Show Board Coordinates
            </Label>
          </div>
          <Switch
            id="drills-show-coordinates"
            checked={config.showCoordinates}
            onCheckedChange={(checked) => onConfigChange({ ...config, showCoordinates: checked })}
          />
        </div>

        {statusMessage && (
          <p className={statusTone === 'error' ? 'text-xs text-destructive' : 'text-xs text-muted-foreground'}>
            {statusMessage}
          </p>
        )}

        <Button
          type="button"
          size="lg"
          className="h-11 w-full rounded-lg bg-primary text-primary-foreground shadow-theme-soft hover:bg-primary/90"
          onClick={onStart}
          disabled={isStartDisabled}
        >
          Start Round
        </Button>
      </CardContent>
    </Card>
  );
};
