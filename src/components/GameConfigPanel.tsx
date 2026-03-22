import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import type { GameConfig, GameMode } from '@/lib/gameSession';

interface GameConfigPanelProps {
  mode: GameMode;
  onStartGame: (config: GameConfig) => void;
  onModeChange?: (mode: GameMode) => void;
  showModeSelector?: boolean;
  isGameActive: boolean;
}

const MIN_ELO = 1300;
const MAX_ELO = 2800;
const DEFAULT_ENGINE_ELO = 1500;
const DEFAULT_REVEAL_EVERY = 3;

const clampElo = (elo: number): number => {
  return Math.round(Math.max(MIN_ELO, Math.min(MAX_ELO, elo)));
};

const modeButtonClassName = (selected: boolean) => (
  selected
    ? 'border-[#8B4513] bg-[#8B4513] text-white hover:bg-[#8B4513]/90'
    : 'border-[#d9b99b] bg-white text-[#8B4513] hover:bg-[#fffaf4]'
);

export const GameConfigPanel = ({
  mode,
  onStartGame,
  onModeChange,
  showModeSelector = false,
  isGameActive,
}: GameConfigPanelProps) => {
  const [playerColor, setPlayerColor] = useState<'white' | 'black'>('white');
  const [engineElo, setEngineElo] = useState<number>(DEFAULT_ENGINE_ELO);
  const [engineEloInput, setEngineEloInput] = useState<string>(String(DEFAULT_ENGINE_ELO));
  const [revealEvery, setRevealEvery] = useState<number>(DEFAULT_REVEAL_EVERY);
  const [revealEveryInput, setRevealEveryInput] = useState<string>(String(DEFAULT_REVEAL_EVERY));
  const [revealEveryTouched, setRevealEveryTouched] = useState<boolean>(false);
  const [allowCheats, setAllowCheats] = useState<boolean>(true);
  const [hideMoveHistory, setHideMoveHistory] = useState<boolean>(false);

  const isRevealEveryValid = () => {
    if (!/^\d+$/.test(revealEveryInput)) {
      return false;
    }
    const parsed = Number(revealEveryInput);
    return Number.isFinite(parsed) && parsed >= 0;
  };

  const handleStartGame = () => {
    if (!isRevealEveryValid()) {
      setRevealEveryTouched(true);
      alert('Reveal frequency must be a whole number of at least 0');
      return;
    }

    const parsed = Number(revealEveryInput);
    if (parsed !== revealEvery) {
      setRevealEvery(parsed);
    }

    const config: GameConfig = mode === 'computer'
      ? {
          mode: 'computer',
          playerColor,
          engineElo,
          revealEvery: parsed,
          allowCheats,
          hideMoveHistory,
        }
      : {
          mode: 'pass-n-play',
          revealEvery: parsed,
          allowCheats,
          hideMoveHistory,
        };

    onStartGame(config);
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
    setEngineEloInput(String(clamped));
  };

  const commitRevealEveryInput = () => {
    if (!isRevealEveryValid()) {
      setRevealEveryInput(String(revealEvery));
      return;
    }
    const parsed = Number(revealEveryInput);
    setRevealEvery(parsed);
    setRevealEveryInput(String(parsed));
  };

  const configDescription = mode === 'computer'
    ? 'Set up your blindfold game against the computer'
    : 'Set up a local blindfold game for two players';

  return (
    <Card className="w-full border-2 border-[#d9b99b]">
      <CardHeader className="space-y-1 pb-2">
        <CardTitle className="text-xl">Game Configuration</CardTitle>
        <CardDescription className="text-xs">
          {configDescription}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 pt-2">
        {showModeSelector && (
          <div className="space-y-2">
            <Label>Choose Mode</Label>
            <div className="grid grid-cols-2 gap-2">
              <Button
                type="button"
                variant="outline"
                className={modeButtonClassName(mode === 'computer')}
                onClick={() => onModeChange?.('computer')}
              >
                Vs Computer
              </Button>
              <Button
                type="button"
                variant="outline"
                className={modeButtonClassName(mode === 'pass-n-play')}
                onClick={() => onModeChange?.('pass-n-play')}
              >
                Pass N Play
              </Button>
            </div>
          </div>
        )}

        <div className={`grid grid-cols-1 gap-3 ${mode === 'computer' ? 'sm:grid-cols-2' : ''}`}>
          {mode === 'computer' && (
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
          )}

          {mode === 'computer' && (
            <div className="space-y-2">
              <Label htmlFor="engine-elo">Engine Elo</Label>
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
                className="w-full"
              />
            </div>
          )}

          <div className={`space-y-2 ${mode === 'computer' ? 'sm:col-span-2' : ''}`}>
            <Label htmlFor="reveal-frequency">Board Reveal Frequency</Label>
            <Input
              id="reveal-frequency"
              type="number"
              min={0}
              step={1}
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
              placeholder="0 = never auto-reveal"
              className={isRevealEveryValid() || !revealEveryTouched ? '' : 'border-destructive focus-visible:ring-destructive'}
            />
          </div>
        </div>

        <div className="space-y-2 sm:grid sm:grid-cols-2 sm:gap-3 sm:space-y-0">
          <div className="flex items-center justify-between rounded-md border border-[#d9b99b] bg-white px-3 py-2">
            <Label htmlFor="allow-cheats" className="cursor-pointer">
              Allow Cheats
            </Label>
            <Switch
              id="allow-cheats"
              checked={allowCheats}
              onCheckedChange={setAllowCheats}
            />
          </div>
          <div className="flex items-center justify-between rounded-md border border-[#d9b99b] bg-white px-3 py-2">
            <Label htmlFor="hide-move-history" className="cursor-pointer">
              Hide Move History
            </Label>
            <Switch
              id="hide-move-history"
              checked={hideMoveHistory}
              onCheckedChange={setHideMoveHistory}
            />
          </div>
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
