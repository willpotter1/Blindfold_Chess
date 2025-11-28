import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';

interface MoveListProps {
  moves: string[];
}

export const MoveList = ({ moves }: MoveListProps) => {
  // Group moves into pairs (White, Black)
  const movePairs: Array<{ number: number; white?: string; black?: string }> = [];
  
  for (let i = 0; i < moves.length; i += 2) {
    movePairs.push({
      number: Math.floor(i / 2) + 1,
      white: moves[i],
      black: moves[i + 1],
    });
  }

  // Show latest moves at the top.
  const orderedPairs = [...movePairs].reverse();

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Move History</CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[300px] w-full pr-4">
          {movePairs.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No moves yet
            </p>
          ) : (
            <div className="space-y-1">
              {orderedPairs.map((pair) => (
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
