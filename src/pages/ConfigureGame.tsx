import { useNavigate } from 'react-router-dom';
import { AppSidebar } from '@/components/AppSidebar';
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
      <AppSidebar />
      <div className="container mx-auto flex items-center px-4 py-10 md:flex-1">
        <div className="mx-auto w-full max-w-xl">
          <GameConfigPanel onStartGame={handleStartGame} isGameActive={false} />
        </div>
      </div>
    </div>
  );
};

export default ConfigureGame;
