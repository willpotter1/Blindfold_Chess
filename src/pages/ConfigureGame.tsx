import { useNavigate } from 'react-router-dom';
import { AppSidebar } from '@/components/AppSidebar';
import { GameConfigPanel } from '@/components/GameConfigPanel';
import type { ComputerGameConfig } from '@/lib/gameSession';

const ConfigureGame = () => {
  const navigate = useNavigate();

  const handleStartGame = (config: ComputerGameConfig) => {
    navigate('/', { state: { gameConfig: config } });
  };

  return (
    <div className="bg-stage-glow min-h-screen md:flex">
      <AppSidebar />
      <div className="container mx-auto flex items-center px-4 py-10 pb-[calc(6.5rem+env(safe-area-inset-bottom))] md:flex-1 md:pb-10">
        <div className="mx-auto w-full max-w-xl">
          <GameConfigPanel mode="computer" onStartGame={handleStartGame} isGameActive={false} />
        </div>
      </div>
    </div>
  );
};

export default ConfigureGame;
