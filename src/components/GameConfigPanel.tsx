import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';

interface GameConfigPanelProps {
  onStartGame: (playerColor: 'white' | 'black', difficulty: number, engineElo: number, revealEvery: number) => void;
  isGameActive: boolean;
}

const MIN_ELO = 1300;
const MAX_ELO = 2800;

const mapDifficultyToElo = (value: number): number => {
  const raw = MIN_ELO + ((value - 1) * (MAX_ELO - MIN_ELO)) / 9;
  return Math.round(Math.max(MIN_ELO, Math.min(MAX_ELO, raw)));
};

const mapEloToDifficulty = (elo: number): number => {
  const normalized = (elo - MIN_ELO) / (MAX_ELO - MIN_ELO);
  const scaled = 1 + normalized * 9;
  return Math.round(Math.max(1, Math.min(10, scaled)));
};

const clampElo = (elo: number): number => {
  return Math.round(Math.max(MIN_ELO, Math.min(MAX_ELO, elo)));
};

export const GameConfigPanel = ({ onStartGame, isGameActive }: GameConfigPanelProps) => {
  const [playerColor, setPlayerColor] = useState<'white' | 'black'>('white');
  const [difficulty, setDifficulty] = useState<number>(5);
  const [engineElo, setEngineElo] = useState<number>(mapDifficultyToElo(5));
  const [engineEloInput, setEngineEloInput] = useState<string>(String(mapDifficultyToElo(5)));
  const [revealEvery, setRevealEvery] = useState<number>(6);
  const [revealEveryInput, setRevealEveryInput] = useState<string>('6');
  const [revealEveryTouched, setRevealEveryTouched] = useState<boolean>(false);

  const parseRevealEvery = () => {
    const parsed = Number(revealEveryInput);
    return Number.isInteger(parsed) ? parsed : Number.NaN;
  };

  const isRevealEveryValid = () => {
    const parsed = parseRevealEvery();
    return Number.isFinite(parsed) && parsed >= 1;
  };

  const handleStartGame = () => {
    const parsed = parseRevealEvery();
    if (!Number.isFinite(parsed) || parsed < 1) {
      setRevealEveryTouched(true);
      alert('Reveal frequency must be a whole number of at least 1');
      return;
    }
    if (parsed !== revealEvery) {
      setRevealEvery(parsed);
    }
    onStartGame(playerColor, difficulty, engineElo, parsed);
  };

  const commitEloInput = () => {
    const parsed = Math.round(Number(engineEloInput));
    if (!Number.isFinite(parsed)) {
      // Revert to the last good value
      setEngineEloInput(String(engineElo));
      return;
    }
    const clamped = clampElo(parsed);
    setEngineElo(clamped);
    setDifficulty(mapEloToDifficulty(clamped));
    setEngineEloInput(String(clamped));
  };

  const commitRevealEveryInput = () => {
    const parsed = parseRevealEvery();
    if (!Number.isFinite(parsed) || parsed < 1) {
      setRevealEveryInput(String(revealEvery));
      return;
    }
    setRevealEvery(parsed);
    setRevealEveryInput(String(parsed));
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
          <Label htmlFor="engine-elo">Engine Elo</Label>
          <div className="flex items-center gap-2">
            <Input
              id="engine-elo"
              type="number"
              min={MIN_ELO}
              max={MAX_ELO}
              step={10}
              value={engineEloInput}
              onChange={(e) => setEngineEloInput(e.target.value)}
              onBlur={commitEloInput}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.currentTarget.blur();
                }
              }}
              className="w-28"
            />
          </div>
          <p className="text-xs text-muted-foreground">Min: {MIN_ELO}, Max: {MAX_ELO}</p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="reveal-frequency">Board Reveal Frequency</Label>
          <Input
            id="reveal-frequency"
            type="text"
            inputMode="numeric"
            value={revealEveryInput}
            onChange={(e) => {
              setRevealEveryInput(e.target.value);
              setRevealEveryTouched(true);
            }}
            onBlur={commitRevealEveryInput}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.currentTarget.blur();
              }
            }}
            placeholder="Show board every N moves"
            className={isRevealEveryValid() || !revealEveryTouched ? '' : 'border-destructive focus-visible:ring-destructive'}
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
