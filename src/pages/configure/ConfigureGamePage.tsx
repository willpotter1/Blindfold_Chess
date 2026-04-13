import { useNavigate } from 'react-router-dom';
import { AppSidebar } from '@/components/AppSidebar';
import { GameConfigPanel } from '@/components/GameConfigPanel';
import type { ComputerGameConfig } from '@/lib/gameSession';

const ConfigureGame = () => {
  const navigate = useNavigate();

  const handleStartGame = (config: ComputerGameConfig) => {
    navigate(`/game/${crypto.randomUUID()}`, { state: { gameConfig: config } });
  };

  return (
    <div className="bg-background min-h-screen md:flex">
      <AppSidebar />
      <div className="container mx-auto flex items-center px-4 py-10 md:flex-1">
        <div className="mx-auto w-full max-w-xl">
          <GameConfigPanel mode="computer" onStartGame={handleStartGame} isGameActive={false} />
        </div>
      </div>
    </div>
  );
};

export default ConfigureGame;
