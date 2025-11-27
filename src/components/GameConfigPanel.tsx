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

  const mapDifficultyToElo = (value: number): number => {
    const minElo = 1320;
    const maxElo = 2800;
    const raw = minElo + ((value - 1) * (maxElo - minElo)) / 9;
    return Math.round(Math.max(minElo, Math.min(maxElo, raw)));
  };

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
            <Label htmlFor="difficulty">Engine Elo</Label>
            <span className="text-sm text-muted-foreground">{mapDifficultyToElo(difficulty)}</span>
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
            Scaled to UCI_Elo (approx 1320–2800)
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
            The board will be revealed every N of your moves
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
