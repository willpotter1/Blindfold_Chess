import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ArrowUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';

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
    <Card
      className={cn(
        'flex w-full min-h-0 flex-col bg-card',
        compact ? 'h-[min(280px,34vh)]' : 'h-[min(380px,42vh)]',
        className,
      )}
    >
      <CardHeader className={cn('flex-row items-center justify-between space-y-0 px-5 py-4', compact && 'px-4 py-3')}>
        <CardTitle className={cn('text-[clamp(1.15rem,1.6vw,1.85rem)]', compact && 'text-sm font-semibold leading-none')}>Moves</CardTitle>
        <button
          type="button"
          className={cn(
            'inline-flex items-center justify-center rounded-lg bg-secondary/60 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground',
            compact ? 'h-6 w-6' : 'h-7 w-7',
          )}
          onClick={() => setIsReversed((prev) => !prev)}
          aria-label="Reverse move history order"
          title="Reverse move history order"
        >
          <ArrowUpDown size={compact ? 12 : 14} strokeWidth={2} />
        </button>
      </CardHeader>
      <CardContent className={cn('min-h-0 flex-1 px-5 pb-5 pt-0', compact && 'px-4 pb-4')}>
        <ScrollArea className={cn('h-full w-full pr-4', compact && 'pr-2')}>
          {displayedMovePairs.length === 0 ? (
            <p className={cn('text-sm text-muted-foreground text-center py-8', compact && 'py-5 text-xs')}>
              No moves yet
            </p>
          ) : (
            <div className={cn('space-y-0.5', compact && 'space-y-0')}>
              {displayedMovePairs.map((pair) => (
                <div
                  key={pair.number}
                  className={cn(
                    'flex items-center gap-3 rounded-lg px-2 py-1 font-mono text-sm transition-colors hover:bg-secondary/50',
                    compact && 'gap-2 px-1.5 py-0.5 text-xs',
                  )}
                >
                  <span className={cn('w-7 text-muted-foreground/60 font-semibold', compact && 'w-5')}>
                    {pair.number}.
                  </span>
                  <span className="flex-1 font-medium">
                    {pair.white || '\u2014'}
                  </span>
                  <span className="flex-1 font-medium text-muted-foreground">
                    {pair.black || '\u2014'}
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
