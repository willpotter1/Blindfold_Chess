import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import upDownArrowsIcon from '../../Visual/up-down-arrows-icon.png';

interface MoveListProps {
  moves: string[];
  startingTurnColor?: 'white' | 'black';
  className?: string;
  compact?: boolean;
}

export const MoveList = ({ moves, startingTurnColor = 'white', className, compact = false }: MoveListProps) => {
  const [isReversed, setIsReversed] = useState(false);

  const movePairs: Array<{ number: number; white?: string; black?: string }> = [];
  let nextMoveNumber = 1;
  let currentTurnColor = startingTurnColor;
  let pendingPair: { number: number; white?: string; black?: string } | null = null;

  for (const move of moves) {
    if (currentTurnColor === 'white') {
      pendingPair = {
        number: nextMoveNumber,
        white: move,
      };
      movePairs.push(pendingPair);
      currentTurnColor = 'black';
      continue;
    }

    if (!pendingPair) {
      pendingPair = { number: nextMoveNumber };
      movePairs.push(pendingPair);
    }

    pendingPair.black = move;
    pendingPair = null;
    nextMoveNumber += 1;
    currentTurnColor = 'white';
  }

  const displayedMovePairs = isReversed ? [...movePairs].reverse() : movePairs;

  return (
    <Card className={cn('flex h-[min(380px,42vh)] w-full min-h-0 flex-col bg-surface-white/75', compact && 'h-full', className)}>
      <CardHeader className={cn('flex-row items-center justify-between space-y-0 px-5 py-4', compact && 'px-4 py-3')}>
        <CardTitle className={cn('text-[clamp(1.15rem,1.6vw,1.85rem)]', compact && 'text-base leading-none')}>Move History</CardTitle>
        <button
          type="button"
          className={cn('inline-flex h-7 w-7 items-center justify-center rounded-sm border-2 border-primary bg-surface-white p-1 hover:bg-accent', compact && 'h-6 w-6')}
          onClick={() => setIsReversed((prev) => !prev)}
          aria-label="Reverse move history order"
          title="Reverse move history order"
        >
          <img
            src={upDownArrowsIcon}
            alt=""
            className="h-4 w-4 object-contain"
            draggable={false}
          />
        </button>
      </CardHeader>
      <CardContent className={cn('min-h-0 flex-1 px-5 pb-5 pt-0', compact && 'px-4 pb-4')}>
        <ScrollArea className={cn('h-full w-full pr-4', compact && 'pr-2')}>
          {displayedMovePairs.length === 0 ? (
            <p className={cn('text-sm text-muted-foreground text-center py-8', compact && 'py-5 text-xs')}>
              No moves yet
            </p>
          ) : (
            <div className={cn('space-y-1', compact && 'space-y-0.5')}>
              {displayedMovePairs.map((pair) => (
                <div
                  key={pair.number}
                  className={cn('flex items-center gap-3 text-sm font-mono py-1 px-2 hover:bg-muted rounded', compact && 'gap-2 px-1.5 py-0.5 text-xs')}
                >
                  <span className={cn('text-muted-foreground font-semibold w-8', compact && 'w-6')}>
                    {pair.number}.
                  </span>
                  <span className="flex-1 font-medium">
                    {pair.white || '—'}
                  </span>
                  <span className="flex-1 font-medium">
                    {pair.black || '—'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
};
