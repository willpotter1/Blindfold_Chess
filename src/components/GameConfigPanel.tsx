import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';

interface GameConfigPanelProps {
  onStartGame: (playerColor: 'white' | 'black', difficulty: number, revealEvery: number) => void;
  isGameActive: boolean;
}

export const GameConfigPanel = ({ onStartGame, isGameActive }: GameConfigPanelProps) => {
  const [playerColor, setPlayerColor] = useState<'white' | 'black'>('white');
  const [difficulty, setDifficulty] = useState<number>(5);
  const [revealEvery, setRevealEvery] = useState<number>(6);

  const handleStartGame = () => {
    if (revealEvery < 1) {
      alert('Reveal frequency must be at least 1');
      return;
    }
    onStartGame(playerColor, difficulty, revealEvery);
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Game Configuration</CardTitle>
        <CardDescription>
          Set up your blindfold chess training session
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="player-color">Play As</Label>
          <Select value={playerColor} onValueChange={(value) => setPlayerColor(value as 'white' | 'black')}>
            <SelectTrigger id="player-color">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="white">White</SelectItem>
              <SelectItem value="black">Black</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between">
            <Label htmlFor="difficulty">Engine Difficulty</Label>
            <span className="text-sm text-muted-foreground">{difficulty}/10</span>
          </div>
          <Slider
            id="difficulty"
            min={1}
            max={10}
            step={1}
            value={[difficulty]}
            onValueChange={(value) => setDifficulty(value[0])}
            className="w-full"
          />
          <p className="text-xs text-muted-foreground">
            1 = Beginner, 10 = Expert
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="reveal-frequency">Board Reveal Frequency</Label>
          <Input
            id="reveal-frequency"
            type="number"
            min={1}
            value={revealEvery}
            onChange={(e) => setRevealEvery(parseInt(e.target.value) || 1)}
            placeholder="Show board every N moves"
          />
          <p className="text-xs text-muted-foreground">
            The board will be revealed every N half-moves (plies)
          </p>
        </div>

        <Button 
          onClick={handleStartGame} 
          className="w-full"
          size="lg"
        >
          {isGameActive ? 'New Game' : 'Start Game'}
        </Button>
      </CardContent>
    </Card>
  );
};
