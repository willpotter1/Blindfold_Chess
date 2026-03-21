import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import upDownArrowsIcon from '../../Visual/up-down-arrows-icon.png';

interface MoveListProps {
  moves: string[];
  startingTurnColor?: 'white' | 'black';
  className?: string;
}

export const MoveList = ({ moves, startingTurnColor = 'white', className }: MoveListProps) => {
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
    <Card className={cn('flex h-[380px] w-full flex-col', className)}>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle>Move History</CardTitle>
        <button
          type="button"
          className="inline-flex h-7 w-7 items-center justify-center rounded-sm border border-[#8B4513] bg-white p-1 hover:bg-zinc-50"
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
      <CardContent className="min-h-0 flex-1">
        <ScrollArea className="h-full w-full pr-4">
          {displayedMovePairs.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No moves yet
            </p>
          ) : (
            <div className="space-y-1">
              {displayedMovePairs.map((pair) => (
                <div
                  key={pair.number}
                  className="flex items-center gap-3 text-sm font-mono py-1 px-2 hover:bg-muted rounded"
                >
                  <span className="text-muted-foreground font-semibold w-8">
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
