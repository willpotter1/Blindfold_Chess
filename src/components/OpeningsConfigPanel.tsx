import { useEffect, useMemo, useState } from 'react';
import { Chess } from 'chess.js';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { BlindfoldBoard } from '@/components/BlindfoldBoard';
import { OpeningMoveTreeExplorer } from '@/components/OpeningMoveTreeExplorer';
import { OpeningSelectionBasket } from '@/components/OpeningSelectionBasket';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import {
  getOpeningExplorerData,
  getOpeningExplorerBreadcrumbText,
  getOpeningExplorerDisplayNameForRef,
  getOpeningExplorerDisplayRef,
} from '@/lib/openingExplorerCore.js';
import type { OpeningTrainerConfig } from '@/lib/openingTrainer';
import { cn } from '@/lib/utils';

type ExplorerData = Awaited<ReturnType<typeof getOpeningExplorerData>>;

type OpeningsConfigPanelProps = {
  config: OpeningTrainerConfig;
  explorer: ExplorerData | null;
  statusMessage: string;
  statusTone?: 'default' | 'error';
  isStartDisabled?: boolean;
  onConfigChange: (config: OpeningTrainerConfig) => void;
  onStart: () => void;
  className?: string;
};

const isWholeNumber = (value: string) => /^\d+$/.test(value);

const clampPositiveWholeNumber = (value: number, minimum: number) => Math.max(minimum, Math.round(value));

export const OpeningsConfigPanel = ({
  config,
  explorer,
  statusMessage,
  statusTone = 'default',
  isStartDisabled = false,
  onConfigChange,
  onStart,
  className,
}: OpeningsConfigPanelProps) => {
  const [depthInput, setDepthInput] = useState(String(config.depthPlayerMoves));
  const [revealEveryInput, setRevealEveryInput] = useState(String(config.revealEvery));
  const [focusedRefId, setFocusedRefId] = useState<string | null>(null);
  const [previewPlyIndex, setPreviewPlyIndex] = useState(0);

  useEffect(() => {
    setDepthInput(String(config.depthPlayerMoves));
    setRevealEveryInput(String(config.revealEvery));
  }, [config.depthPlayerMoves, config.revealEvery]);

  const previewDisplayRef = useMemo(
    () => (explorer && focusedRefId ? getOpeningExplorerDisplayRef(explorer, config.playerColor, focusedRefId) : null),
    [config.playerColor, explorer, focusedRefId],
  );

  const previewMoves = useMemo(
    () => previewDisplayRef?.pathUci.trim().split(/\s+/).filter(Boolean) ?? [],
    [previewDisplayRef],
  );

  useEffect(() => {
    setPreviewPlyIndex(previewMoves.length);
  }, [previewMoves]);

  const previewFen = useMemo(() => {
    const chess = new Chess();

    previewMoves.slice(0, previewPlyIndex).forEach((uciMove) => {
      chess.move({
        from: uciMove.slice(0, 2),
        to: uciMove.slice(2, 4),
        promotion: uciMove.slice(4, 5) || undefined,
      });
    });

    return chess.fen();
  }, [previewMoves, previewPlyIndex]);

  const previewOpeningName = useMemo(
    () => (explorer && focusedRefId ? getOpeningExplorerDisplayNameForRef(explorer, focusedRefId, config.playerColor) : null),
    [config.playerColor, explorer, focusedRefId],
  );

  const previewBreadcrumb = useMemo(
    () => (explorer && focusedRefId ? getOpeningExplorerBreadcrumbText(explorer, focusedRefId, config.playerColor) : ''),
    [config.playerColor, explorer, focusedRefId],
  );

  const commitDepthInput = () => {
    if (!isWholeNumber(depthInput)) {
      setDepthInput(String(config.depthPlayerMoves));
      return;
    }

    const nextDepth = clampPositiveWholeNumber(Number(depthInput), 1);
    setDepthInput(String(nextDepth));

    if (nextDepth !== config.depthPlayerMoves) {
      onConfigChange({
        ...config,
        depthPlayerMoves: nextDepth,
      });
    }
  };

  const commitRevealEveryInput = () => {
    if (!isWholeNumber(revealEveryInput)) {
      setRevealEveryInput(String(config.revealEvery));
      return;
    }

    const nextRevealEvery = clampPositiveWholeNumber(Number(revealEveryInput), 0);
    setRevealEveryInput(String(nextRevealEvery));

    if (nextRevealEvery !== config.revealEvery) {
      onConfigChange({
        ...config,
        revealEvery: nextRevealEvery,
      });
    }
  };

  return (
    <Card className={cn('flex h-full min-h-0 w-full flex-col overflow-hidden border border-border/50 bg-card', className)}>
      <CardHeader className="shrink-0 space-y-1 pb-2">
        <CardTitle className="text-xl">Opening Setup</CardTitle>
      </CardHeader>

      <CardContent className="grid min-h-0 flex-1 gap-3 overflow-auto pt-2 grid-cols-1 lg:grid-cols-[minmax(14rem,0.8fr)_minmax(12rem,0.85fr)_minmax(0,1.2fr)] lg:overflow-hidden">
        <div className="flex min-h-0 flex-col gap-3 overflow-hidden">
          <div className="grid grid-cols-1 gap-2.5">
            <div className="space-y-1.5">
              <Label htmlFor="opening-player-color" className="text-xs">Play As</Label>
              <Select
                value={config.playerColor}
                onValueChange={(value) =>
                  onConfigChange({
                    ...config,
                    playerColor: value as 'white' | 'black',
                  })
                }
              >
                <SelectTrigger id="opening-player-color"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="white">White</SelectItem>
                  <SelectItem value="black">Black</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div className="space-y-1.5">
                <Label htmlFor="opening-depth" className="text-xs">Depth</Label>
                <Input
                  id="opening-depth"
                  type="number"
                  min={1}
                  step={1}
                  value={depthInput}
                  onChange={(event) => setDepthInput(event.target.value)}
                  onBlur={commitDepthInput}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      event.currentTarget.blur();
                    }
                  }}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="opening-reveal-frequency" className="text-xs">Reveal Freq.</Label>
                <Input
                  id="opening-reveal-frequency"
                  type="number"
                  min={0}
                  step={1}
                  value={revealEveryInput}
                  onChange={(event) => setRevealEveryInput(event.target.value)}
                  onBlur={commitRevealEveryInput}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      event.currentTarget.blur();
                    }
                  }}
                  placeholder="0 = never"
                />
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-x-4 gap-y-2">
            <label htmlFor="opening-allow-cheats" className="flex cursor-pointer items-center gap-2">
              <Switch
                id="opening-allow-cheats"
                checked={config.allowCheats}
                onCheckedChange={(checked) =>
                  onConfigChange({ ...config, allowCheats: checked })
                }
              />
              <span className="text-xs font-medium text-foreground">Allow Cheats</span>
            </label>

            <label htmlFor="opening-hide-history" className="flex cursor-pointer items-center gap-2">
              <Switch
                id="opening-hide-history"
                checked={config.hideMoveHistory}
                onCheckedChange={(checked) =>
                  onConfigChange({ ...config, hideMoveHistory: checked })
                }
              />
              <span className="text-xs font-medium text-foreground">Hide History</span>
            </label>
          </div>

          <OpeningSelectionBasket
            explorer={explorer}
            playerColor={config.playerColor}
            selections={config.selections}
            onRemoveSelection={(selectionId) =>
              onConfigChange({
                ...config,
                selections: config.selections.filter((selection) => selection.id !== selectionId),
              })
            }
            className="min-h-0 flex-1"
          />

          <div className="grid shrink-0 gap-3">
            <p className={statusTone === 'error' ? 'text-sm text-destructive' : 'text-sm text-muted-foreground'}>
              {statusMessage}
            </p>

            <Button type="button" size="lg" onClick={onStart} disabled={isStartDisabled}>
              Start Opening Round
            </Button>
          </div>
        </div>

        <div className="flex min-h-0 flex-col items-center justify-center gap-3 overflow-hidden">
          <div className="flex w-full max-w-[22rem] min-h-0 flex-col items-center rounded-2xl border border-border/50 bg-card p-4 text-center">
            <div className="w-full space-y-1">
              <div className="text-[0.6rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Preview</div>
              <div className="min-h-[2.5rem] text-sm font-semibold text-foreground">
                {previewOpeningName || previewBreadcrumb || 'Select an opening branch'}
              </div>
              <div className="min-h-[2.5rem] text-xs leading-5 text-muted-foreground">
                {previewBreadcrumb || ' '}
              </div>
            </div>

            <div className="mt-3 flex w-full items-center justify-center">
              <BlindfoldBoard
                fen={previewFen}
                perspective={config.playerColor}
                isVisible
                className="w-full max-w-[18rem] lg:max-w-[20rem]"
              />
            </div>

            <div className="mt-3 grid w-full max-w-[20rem] grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => setPreviewPlyIndex((currentValue) => Math.max(0, currentValue - 1))}
                disabled={previewPlyIndex <= 0}
                aria-label="Preview previous move"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>

              <div className="text-center text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                {previewMoves.length > 0 ? `Move ${previewPlyIndex} / ${previewMoves.length}` : 'Start'}
              </div>

              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => setPreviewPlyIndex((currentValue) => Math.min(previewMoves.length, currentValue + 1))}
                disabled={previewPlyIndex >= previewMoves.length}
                aria-label="Preview next move"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        <OpeningMoveTreeExplorer
          explorer={explorer}
          playerColor={config.playerColor}
          selections={config.selections}
          onSelectionsChange={(nextSelections) =>
            onConfigChange({
              ...config,
              selections: nextSelections,
              })
            }
          onFocusedRefChange={setFocusedRefId}
          className="min-h-0 h-full"
        />
      </CardContent>
    </Card>
  );
};
