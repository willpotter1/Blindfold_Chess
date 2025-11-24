import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export const InstructionsBox = () => {
  return (
    <Card className="bg-muted/50">
      <CardHeader>
        <CardTitle className="text-lg">📖 How to Use</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <div>
          <h4 className="font-semibold mb-1">Entering Moves</h4>
          <p className="text-muted-foreground">
            Type your move in algebraic notation (SAN), such as:
            <span className="block font-mono mt-1">e4, Nf3, exd5, O-O, Qxe6+, e8=Q</span>
          </p>
        </div>
        
        <div>
          <h4 className="font-semibold mb-1">Board Visibility</h4>
          <p className="text-muted-foreground">
            The board is hidden to train your blindfold visualization skills. 
            It will be revealed every <strong>N half-moves</strong> (plies), where one ply 
            is a single move by either player.
          </p>
        </div>
        
        <div>
          <h4 className="font-semibold mb-1">Training Goal</h4>
          <p className="text-muted-foreground">
            Practice keeping track of the game mentally by visualizing the position 
            without seeing the board. This develops your chess calculation and 
            memory skills.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};
