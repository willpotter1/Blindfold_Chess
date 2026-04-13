import { X } from 'lucide-react';
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
  <div className={cn('flex min-h-0 flex-col gap-2 rounded-xl border border-border/50 bg-card p-3', className)}>
    <div className="flex items-center gap-2">
      <p className="text-[0.6rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground/60">Selected</p>
      <span className="text-[0.6rem] font-semibold text-muted-foreground">{selections.length}</span>
    </div>

    <div className="min-h-0 flex-1 overflow-y-auto">
      {explorer && selections.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
            {selections.map((selection) => {
              const ref = getOpeningExplorerDisplayRef(explorer, playerColor, selection.anchorRefId);
              const displayName = ref ? getOpeningExplorerDisplayNameForRef(explorer, ref.id, playerColor) : null;
              const label = selection.kind === 'opening' && selection.openingName
                ? selection.openingName
                : displayName || getOpeningExplorerSelectionLabel(explorer, selection, playerColor);

              return (
                <button
                  key={selection.id}
                  type="button"
                  className="group flex items-center gap-1 rounded-lg border border-border/50 bg-secondary/50 px-2 py-1 text-[0.65rem] font-medium text-foreground transition-colors hover:bg-secondary"
                  onClick={() => onRemoveSelection(selection.id)}
                  title={`Remove: ${label}`}
                >
                  <span className="max-w-[10rem] truncate">{label}</span>
                  <X size={10} className="shrink-0 text-muted-foreground group-hover:text-foreground" />
                </button>
              );
            })}
          </div>
      ) : (
        <p className="text-xs text-muted-foreground/50">
          No branches selected.
        </p>
      )}
    </div>
  </div>
);
