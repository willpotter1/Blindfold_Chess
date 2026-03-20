import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Switch } from '@/components/ui/switch';
import { puzzleRatingBounds, type PuzzleConfig, type PuzzleThemeOption } from '@/lib/puzzles';

type PuzzleConfigPanelProps = {
  config: PuzzleConfig;
  themeOptions: PuzzleThemeOption[];
  matchingPuzzleCount: number;
  errorMessage?: string;
  onConfigChange: (config: PuzzleConfig) => void;
  onStart: () => void;
};

const isWholeNumber = (value: string) => /^\d+$/.test(value);

const clampRating = (value: number) => Math.max(puzzleRatingBounds.min, Math.min(puzzleRatingBounds.max, Math.round(value)));

const clampRevealEvery = (value: number) => Math.max(0, Math.round(value));

export const PuzzleConfigPanel = ({
  config,
  themeOptions,
  matchingPuzzleCount,
  errorMessage,
  onConfigChange,
  onStart,
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
      : `${matchingPuzzleCount.toLocaleString()} puzzle${matchingPuzzleCount === 1 ? '' : 's'} match the current filters.`;

  const helperTextClassName = hasInvalidNumbers || errorMessage
    ? 'text-sm text-destructive'
    : 'text-sm text-muted-foreground';

  return (
    <Card className="w-full border-2 border-[#d9b99b]">
      <CardHeader className="space-y-1 pb-2">
        <CardTitle className="text-xl">Puzzle Configuration</CardTitle>
        <CardDescription className="text-xs">
          Set up your blindfold puzzle training session
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 pt-2">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="puzzle-min-rating">Minimum Rating</Label>
            <Input
              id="puzzle-min-rating"
              type="number"
              min={puzzleRatingBounds.min}
              max={puzzleRatingBounds.max}
              step={1}
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

        <div className="space-y-2 sm:grid sm:grid-cols-2 sm:gap-3 sm:space-y-0">
          <div className="flex items-center justify-between rounded-md border border-[#d9b99b] bg-white px-3 py-2">
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

          <div className="flex items-center justify-between rounded-md border border-[#d9b99b] bg-white px-3 py-2">
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

        <div className="space-y-2">
          <Label>Puzzle Themes</Label>
          <div className="rounded-md border border-[#d9b99b] bg-white">
            <ScrollArea className="h-48 w-full p-3">
              <div className="grid grid-cols-1 gap-3 pr-4 sm:grid-cols-2">
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
            </ScrollArea>
          </div>
        </div>

        <p className={helperTextClassName}>{helperText}</p>

        <Button
          onClick={onStart}
          className="w-full"
          size="lg"
          disabled={hasInvalidNumbers || Boolean(errorMessage)}
        >
          Start Puzzle
        </Button>
      </CardContent>
    </Card>
  );
};
