import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import {
  getOpeningExplorerData,
  getOpeningExplorerDisplayRef,
  getOpeningExplorerSelectionLabel,
  getOpeningExplorerDisplayNameForRef,
} from '@/lib/openingExplorerCore.js';
import type { OpeningSelection } from '@/lib/openingTrainer';
import { cn } from '@/lib/utils';

type ExplorerData = Awaited<ReturnType<typeof getOpeningExplorerData>>;

type OpeningSelectionBasketProps = {
  explorer: ExplorerData | null;
  playerColor: 'white' | 'black';
  selections: OpeningSelection[];
  onRemoveSelection: (selectionId: string) => void;
  className?: string;
};

export const OpeningSelectionBasket = ({
  explorer,
  playerColor,
  selections,
  onRemoveSelection,
  className,
}: OpeningSelectionBasketProps) => (
  <div className={cn('flex min-h-0 flex-col rounded-2xl border-2 border-border bg-surface-white/75 p-3', className)}>
    <div className="flex items-center justify-between gap-3">
      <h3 className="text-sm font-semibold text-foreground">Selected Branches</h3>
      <div className="rounded-full border border-border bg-surface-strong/60 px-2.5 py-1 text-xs font-semibold text-primary">
        {selections.length} selected
      </div>
    </div>

    <div className="mt-3 min-h-0 flex-1">
      {explorer && selections.length > 0 ? (
        <ScrollArea className="h-full min-h-0">
          <div className="grid gap-2 pr-3">
            {selections.map((selection) => {
              const ref = getOpeningExplorerDisplayRef(explorer, playerColor, selection.anchorRefId);
              const displayName = ref ? getOpeningExplorerDisplayNameForRef(explorer, ref.id, playerColor) : null;

              return (
                <div
                  key={selection.id}
                  className="flex items-start justify-between gap-3 rounded-xl border border-border bg-surface-white px-3 py-2"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full border border-border bg-surface-strong/70 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">
                        {selection.kind === 'branch' ? 'Subtree' : 'Named opening'}
                      </span>
                      {selection.kind === 'opening' && selection.openingName && (
                        <span className="text-sm font-semibold text-foreground">{selection.openingName}</span>
                      )}
                      {selection.kind === 'branch' && displayName && (
                        <span className="text-sm font-semibold text-foreground">{displayName}</span>
                      )}
                    </div>

                    <p className="mt-1 text-sm text-foreground">
                      {getOpeningExplorerSelectionLabel(explorer, selection, playerColor)}
                    </p>
                  </div>

                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="shrink-0"
                    onClick={() => onRemoveSelection(selection.id)}
                  >
                    Remove
                  </Button>
                </div>
              );
            })}
          </div>
        </ScrollArea>
      ) : (
        <p className="text-sm text-muted-foreground">
          No branches selected yet. Browse the move tree and add a subtree or named opening.
        </p>
      )}
    </div>
  </div>
);
