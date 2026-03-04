import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { GameConfigPanel } from '@/components/GameConfigPanel';

type GameConfig = {
  playerColor: 'white' | 'black';
  engineElo: number;
  revealEvery: number;
  allowCheats: boolean;
  hideMoveHistory: boolean;
};

const ConfigureGame = () => {
  const navigate = useNavigate();

  const handleStartGame = (playerColor: 'white' | 'black', engineElo: number, revealEvery: number, allowCheats: boolean, hideMoveHistory: boolean) => {
    const config: GameConfig = { playerColor, engineElo, revealEvery, allowCheats, hideMoveHistory };
    navigate('/', { state: { gameConfig: config } });
  };

  return (
    <div className="min-h-screen bg-white md:flex">
      <div className="w-full border-b bg-zinc-600 p-4 md:h-screen md:w-24 md:shrink-0 md:border-b-0 md:border-r">
        <div className="flex items-center justify-between md:h-full md:flex-col md:items-stretch">
          <Link to="/" className="md:self-center">
            <img
              src="/BBpawn.png"
              alt="BBpawn logo"
              className="h-14 w-14 object-contain md:h-20 md:w-20"
            />
          </Link>
          <div className="flex gap-2 md:flex-col">
            <Button asChild type="button" className="md:w-full">
              <Link to="/login">Log In</Link>
            </Button>
            <Button asChild type="button" className="md:w-full">
              <Link to="/signup">Sign Up</Link>
            </Button>
          </div>
        </div>
      </div>

      <div className="container mx-auto flex items-center px-4 py-10 md:flex-1">
        <div className="mx-auto w-full max-w-xl">
          <GameConfigPanel onStartGame={handleStartGame} isGameActive={false} />
        </div>
      </div>
    </div>
  );
};

export default ConfigureGame;
