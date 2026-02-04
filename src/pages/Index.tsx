import { useEffect, useState } from 'react';
import { Chess } from 'chess.js';
import { useGameState } from '@/hooks/useGameState';
import { getEngineMove } from '@/lib/chessEngine/getEngineMove';
import { GameConfigPanel } from '@/components/GameConfigPanel';
import { BlindfoldBoard } from '@/components/BlindfoldBoard';
import { MoveInput } from '@/components/MoveInput';
import { MoveList } from '@/components/MoveList';
import { StatusBar } from '@/components/StatusBar';
import { InstructionsBox } from '@/components/InstructionsBox';
import { useToast } from '@/hooks/use-toast';
import { runEngineSelfTest } from '@/lib/chessEngine/engineDiagnostics';
import { runEngineDebug } from '@/lib/chessEngine/engineDebug';

const Index = () => {
  const { gameState, startNewGame, makeMove, makeMoveUci, shouldShowBoard, getGameStatus, getCurrentState } = useGameState();
  const [isEngineThinking, setIsEngineThinking] = useState(false);
  const [moveError, setMoveError] = useState<string>('');
  const { toast } = useToast();

  useEffect(() => {
    if (import.meta.env.DEV) {
      // Expose a manual diagnostic helper in the console: await window.runEngineSelfTest()
      window.runEngineSelfTest = runEngineSelfTest;
      window.runEngineDebug = runEngineDebug;
    }
    return () => {
      if (import.meta.env.DEV) {
        delete window.runEngineSelfTest;
        delete window.runEngineDebug;
      }
    };
  }, []);

  const handleEngineMove = async () => {
    const snapshot = getCurrentState();
    if (!snapshot || snapshot.isOver) return;

    setIsEngineThinking(true);
    try {
      const engineMoveUci = await getEngineMove(snapshot.fen, snapshot.difficulty, snapshot.engineElo);
      const success = makeMoveUci(engineMoveUci);
      
      if (!success) {
        console.error('Failed to make engine move');
        toast({
          title: 'Engine Error',
          description: 'The engine failed to make a move',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error getting engine move:', error);
      toast({
        title: 'Engine Error',
        description: 'Failed to get move from chess engine',
        variant: 'destructive',
      });
    } finally {
      setIsEngineThinking(false);
    }
  };

  const handleStartGame = async (playerColor: 'white' | 'black', difficulty: number, engineElo: number, revealEvery: number) => {
    setMoveError('');
    startNewGame(playerColor, difficulty, engineElo, revealEvery);

    // If player chose black, engine moves first
    if (playerColor === 'black') {
      await handleEngineMove();
    }
  };

  const handlePlayerMove = async (moveStr: string) => {
    if (!gameState || isEngineThinking || gameState.isOver) return;

    setMoveError('');
    const result = makeMove(moveStr);

    if (!result.success) {
      setMoveError(result.error || 'Invalid move');
      return;
    }

    // After player's move, let engine respond
    // Use setTimeout to ensure state updates first
    setTimeout(async () => {
      const snapshot = getCurrentState();
      if (!snapshot?.isOver) {
        await handleEngineMove();
      }
    }, 100);
  };

  const handleBoardMove = async (from: string, to: string): Promise<boolean> => {
    if (!gameState || isEngineThinking || gameState.isOver) return false;

    setMoveError('');
    const chess = new Chess(gameState.fen);
    const legalFromMoves = chess.moves({ square: from, verbose: true });
    const matchingMoves = legalFromMoves.filter((move) => move.to === to);

    if (matchingMoves.length === 0) {
      setMoveError('Invalid move');
      return false;
    }

    const selectedMove = matchingMoves.find((move) => move.promotion === 'q') || matchingMoves[0];
    const success = makeMove(selectedMove.san).success;

    if (!success) {
      setMoveError('Invalid move');
      return false;
    }

    setTimeout(async () => {
      const snapshot = getCurrentState();
      if (!snapshot?.isOver) {
        await handleEngineMove();
      }
    }, 100);

    return true;
  };

  const isPlayerTurn = Boolean(
    gameState &&
    gameState.turnColor === gameState.playerColor &&
    !gameState.isOver &&
    !isEngineThinking
  );

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl md:text-5xl font-bold mb-2 text-foreground">
            ♟️ Blindfold Chess Trainer
          </h1>
          <p className="text-muted-foreground">
            Train your visualization skills by playing without seeing the board
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 max-w-7xl mx-auto">
          {/* Left Column - Config and Instructions */}
          <div className="space-y-6">
            <GameConfigPanel 
              onStartGame={handleStartGame}
              isGameActive={!!gameState}
            />
            <InstructionsBox />
          </div>

          {/* Middle Column - Board */}
          <div className="flex flex-col items-center justify-start space-y-4">
            {gameState ? (
              <>
                <BlindfoldBoard 
                  fen={gameState.fen} 
                  isVisible={shouldShowBoard()}
                  isInteractive={isPlayerTurn}
                  onMove={handleBoardMove}
                />
                <StatusBar 
                  status={getGameStatus()}
                  result={gameState.result}
                  isEngineThinking={isEngineThinking}
                />
              </>
            ) : (
              <div className="flex items-center justify-center bg-card border-2 border-dashed border-border rounded-lg aspect-square max-w-[500px] w-full">
                <div className="text-center p-8">
                  <div className="text-6xl mb-4">♟️</div>
                  <p className="text-muted-foreground">
                    Configure and start a new game to begin training
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Right Column - Moves and Input */}
          <div className="space-y-6">
            {gameState && (
              <>
                <MoveInput 
                  onSubmitMove={handlePlayerMove}
                  disabled={!isPlayerTurn}
                  errorMessage={moveError}
                />
                <MoveList moves={gameState.moves} />
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
