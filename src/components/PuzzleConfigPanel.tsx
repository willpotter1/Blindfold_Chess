import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { puzzleRatingBounds, type PuzzleConfig, type PuzzleThemeOption } from '@/lib/puzzles';
import { cn } from '@/lib/utils';

type PuzzleConfigPanelProps = {
  config: PuzzleConfig;
  themeOptions: PuzzleThemeOption[];
  matchingPuzzleCount: number;
  statusMessage?: string;
  statusTone?: 'default' | 'error';
  errorMessage?: string;
  isStartDisabled?: boolean;
  onConfigChange: (config: PuzzleConfig) => void;
  onStart: () => void;
  className?: string;
};

const isWholeNumber = (value: string) => /^\d+$/.test(value);

const clampRating = (value: number) => Math.max(puzzleRatingBounds.min, Math.min(puzzleRatingBounds.max, Math.round(value)));

const clampRevealEvery = (value: number) => Math.max(0, Math.round(value));

export const PuzzleConfigPanel = ({
  config,
  themeOptions,
  matchingPuzzleCount,
  statusMessage,
  statusTone = 'default',
  errorMessage,
  isStartDisabled = false,
  onConfigChange,
  onStart,
  className,
}: PuzzleConfigPanelProps) => {
  const [minRatingInput, setMinRatingInput] = useState(String(config.minRating));
  const [maxRatingInput, setMaxRatingInput] = useState(String(config.maxRating));
  const [revealEveryInput, setRevealEveryInput] = useState(String(config.revealEvery));

  useEffect(() => {
    setMinRatingInput(String(config.minRating));
    setMaxRatingInput(String(config.maxRating));
    setRevealEveryInput(String(config.revealEvery));
  }, [config.maxRating, config.minRating, config.revealEvery]);

  const hasInvalidNumbers =
    !isWholeNumber(minRatingInput) ||
    !isWholeNumber(maxRatingInput) ||
    !isWholeNumber(revealEveryInput);

  const handleMinRatingChange = (value: string) => {
    setMinRatingInput(value);
    if (!isWholeNumber(value)) {
      return;
    }

    onConfigChange({
      ...config,
      minRating: Number(value),
    });
  };

  const handleMaxRatingChange = (value: string) => {
    setMaxRatingInput(value);
    if (!isWholeNumber(value)) {
      return;
    }

    onConfigChange({
      ...config,
      maxRating: Number(value),
    });
  };

  const handleRevealEveryChange = (value: string) => {
    setRevealEveryInput(value);
    if (!isWholeNumber(value)) {
      return;
    }

    onConfigChange({
      ...config,
      revealEvery: Number(value),
    });
  };

  const toggleTheme = (themeValue: string) => {
    const nextThemes = config.selectedThemes.includes(themeValue)
      ? config.selectedThemes.filter((theme) => theme !== themeValue)
      : [...config.selectedThemes, themeValue];

    onConfigChange({
      ...config,
      selectedThemes: nextThemes,
    });
  };

  const helperText = hasInvalidNumbers
    ? 'Rating range and reveal frequency must be whole numbers.'
    : errorMessage
      ? errorMessage
      : statusMessage
        ? statusMessage
      : `${matchingPuzzleCount.toLocaleString()} puzzle${matchingPuzzleCount === 1 ? '' : 's'} match the current filters.`;

  const helperTextClassName = hasInvalidNumbers || errorMessage || statusTone === 'error'
    ? 'text-sm text-destructive'
    : 'text-sm text-muted-foreground';

  return (
    <Card className={cn('bg-surface-white/75 flex h-full min-h-0 w-full flex-col overflow-hidden border-2 border-border', className)}>
      <CardHeader className="space-y-1 pb-2">
        <CardTitle className="text-xl">Puzzle Configuration</CardTitle>
        <CardDescription className="text-xs">
          Set up your blindfold puzzle training session
        </CardDescription>
      </CardHeader>
      <CardContent className="grid min-h-0 flex-1 grid-rows-[auto_auto_minmax(0,1fr)_auto] gap-4 pt-2">
        <div className="grid shrink-0 grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="puzzle-min-rating">Minimum Rating</Label>
            <Input
              id="puzzle-min-rating"
              type="number"
              min={puzzleRatingBounds.min}
              max={puzzleRatingBounds.max}
              step={1}
              className="bg-surface-strong/55"
              value={minRatingInput}
              onChange={(event) => handleMinRatingChange(event.target.value)}
              onBlur={() => {
                if (!isWholeNumber(minRatingInput)) {
                  setMinRatingInput(String(config.minRating));
                  return;
                }

                const nextMinRating = clampRating(Number(minRatingInput));
                setMinRatingInput(String(nextMinRating));
                if (nextMinRating !== config.minRating) {
                  onConfigChange({
                    ...config,
                    minRating: nextMinRating,
                  });
                }
              }}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="puzzle-max-rating">Maximum Rating</Label>
            <Input
              id="puzzle-max-rating"
              type="number"
              min={puzzleRatingBounds.min}
              max={puzzleRatingBounds.max}
              step={1}
              className="bg-surface-strong/55"
              value={maxRatingInput}
              onChange={(event) => handleMaxRatingChange(event.target.value)}
              onBlur={() => {
                if (!isWholeNumber(maxRatingInput)) {
                  setMaxRatingInput(String(config.maxRating));
                  return;
                }

                const nextMaxRating = clampRating(Number(maxRatingInput));
                setMaxRatingInput(String(nextMaxRating));
                if (nextMaxRating !== config.maxRating) {
                  onConfigChange({
                    ...config,
                    maxRating: nextMaxRating,
                  });
                }
              }}
            />
          </div>

          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="puzzle-reveal-frequency">Board Reveal Frequency</Label>
            <Input
              id="puzzle-reveal-frequency"
              type="number"
              min={0}
              step={1}
              className="bg-surface-strong/55"
              value={revealEveryInput}
              onChange={(event) => handleRevealEveryChange(event.target.value)}
              onBlur={() => {
                if (!isWholeNumber(revealEveryInput)) {
                  setRevealEveryInput(String(config.revealEvery));
                  return;
                }

                const nextRevealEvery = clampRevealEvery(Number(revealEveryInput));
                setRevealEveryInput(String(nextRevealEvery));
                if (nextRevealEvery !== config.revealEvery) {
                  onConfigChange({
                    ...config,
                    revealEvery: nextRevealEvery,
                  });
                }
              }}
              placeholder="0 = never auto-reveal"
            />
          </div>
        </div>

        <div className="shrink-0 space-y-2 sm:grid sm:grid-cols-2 sm:gap-3 sm:space-y-0">
          <div className="flex items-center justify-between rounded-md border-2 border-border bg-surface-white/75 px-3 py-2">
            <Label htmlFor="puzzle-allow-cheats" className="cursor-pointer">
              Allow Cheats
            </Label>
            <Switch
              id="puzzle-allow-cheats"
              checked={config.allowCheats}
              onCheckedChange={(checked) =>
                onConfigChange({
                  ...config,
                  allowCheats: checked,
                })
              }
            />
          </div>

          <div className="flex items-center justify-between rounded-md border-2 border-border bg-surface-white/75 px-3 py-2">
            <Label htmlFor="puzzle-hide-move-history" className="cursor-pointer">
              Hide Move History
            </Label>
            <Switch
              id="puzzle-hide-move-history"
              checked={config.hideMoveHistory}
              onCheckedChange={(checked) =>
                onConfigChange({
                  ...config,
                  hideMoveHistory: checked,
                })
              }
            />
          </div>
        </div>

        <div className="grid min-h-0 grid-rows-[auto_minmax(0,1fr)] gap-2">
          <Label>Puzzle Themes</Label>
          <div className="min-h-0 overflow-hidden rounded-md border-2 border-border bg-surface-white/75">
            <div className="h-full overflow-y-auto p-3">
              <div className="grid grid-cols-1 gap-x-6 gap-y-3 pr-1 sm:grid-cols-2">
                {themeOptions.map((theme) => (
                  <label
                    key={theme.value}
                    className="flex cursor-pointer items-center gap-2 text-sm"
                  >
                    <Checkbox
                      checked={config.selectedThemes.includes(theme.value)}
                      onCheckedChange={() => toggleTheme(theme.value)}
                    />
                    <span>{theme.label}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="grid shrink-0 gap-3 border-t-2 border-border pt-3">
          <p className={helperTextClassName}>{helperText}</p>

          <Button
            onClick={onStart}
            className="w-full border-2 border-primary bg-primary text-primary-foreground hover:bg-primary/90"
            size="lg"
            disabled={hasInvalidNumbers || isStartDisabled}
          >
            Start Puzzle
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
