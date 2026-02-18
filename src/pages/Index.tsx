import { useEffect, useState } from 'react';
import { Chess } from 'chess.js';
import { useGameState } from '@/hooks/useGameState';
import { getEngineMove } from '@/lib/chessEngine/getEngineMove';
import { GameConfigPanel } from '@/components/GameConfigPanel';
import { BlindfoldBoard } from '@/components/BlindfoldBoard';
import { MoveInput } from '@/components/MoveInput';
import { MoveList } from '@/components/MoveList';
import { StatusBar } from '@/components/StatusBar';
import { useToast } from '@/hooks/use-toast';
import { runEngineSelfTest } from '@/lib/chessEngine/engineDiagnostics';
import { runEngineDebug } from '@/lib/chessEngine/engineDebug';
import SeoHead from '@/components/SeoHead';
import { Button } from '@/components/ui/button';

const SEO_TITLE = 'Blindfold Chess Trainer - Practice Chess Visualization';
const SEO_DESCRIPTION = 'Train your chess visualization skills by playing with limited board visibility. Improve your blindfold chess abilities against an AI opponent.';
const SEO_CANONICAL_URL = 'https://blindchess.org/';
const SEO_OG_IMAGE = 'https://blindchess.org/circlepawnwb-circle-512.png?v=5';

const Index = () => {
  const { gameState, startNewGame, makeMove, makeMoveUci, shouldShowBoard, getGameStatus, getCurrentState } = useGameState();
  const [isEngineThinking, setIsEngineThinking] = useState(false);
  const [moveError, setMoveError] = useState<string>('');
  const [isManualBoardReveal, setIsManualBoardReveal] = useState(false);
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
      const engineMoveUci = await getEngineMove(snapshot.fen, snapshot.engineElo);
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

  const handleStartGame = async (playerColor: 'white' | 'black', engineElo: number, revealEvery: number) => {
    setMoveError('');
    setIsManualBoardReveal(false);
    startNewGame(playerColor, engineElo, revealEvery);

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
    const uciMove = `${selectedMove.from}${selectedMove.to}${selectedMove.promotion ?? ''}`;
    const success = makeMoveUci(uciMove, { countPlayerMove: true });

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
  const isBoardVisible = Boolean(gameState && (shouldShowBoard() || isManualBoardReveal));

  return (
    <div className="min-h-screen bg-background">
      <SeoHead
        title={SEO_TITLE}
        description={SEO_DESCRIPTION}
        canonicalUrl={SEO_CANONICAL_URL}
        ogImage={SEO_OG_IMAGE}
      />
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex flex-row items-center justify-center gap-3 flex-wrap">
            <h1 className="text-4xl md:text-5xl font-bold text-foreground">
              Blindfold Chess Trainer
            </h1>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 max-w-7xl mx-auto">
          {/* Left Column - Config */}
          <div className="space-y-6">
            <GameConfigPanel 
              onStartGame={handleStartGame}
              isGameActive={!!gameState}
            />
          </div>

          {/* Middle Column - Board */}
          <div className="flex flex-col items-center justify-start space-y-4">
            {gameState ? (
              <>
                <BlindfoldBoard 
                  fen={gameState.fen} 
                  isVisible={isBoardVisible}
                  isInteractive={isPlayerTurn}
                  onMove={handleBoardMove}
                />
                <Button
                  type="button"
                  variant="secondary"
                  className="w-full max-w-[520px]"
                  onPointerDown={() => setIsManualBoardReveal(true)}
                  onPointerUp={() => setIsManualBoardReveal(false)}
                  onPointerLeave={() => setIsManualBoardReveal(false)}
                  onPointerCancel={() => setIsManualBoardReveal(false)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      setIsManualBoardReveal(true);
                    }
                  }}
                  onKeyUp={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      setIsManualBoardReveal(false);
                    }
                  }}
                  onBlur={() => setIsManualBoardReveal(false)}
                >
                  Hold to Show Board
                </Button>
                <StatusBar 
                  status={getGameStatus()}
                  result={gameState.result}
                />
              </>
            ) : (
              <div className="flex items-center justify-center bg-card border-2 border-dashed border-border rounded-lg aspect-square max-w-[500px] w-full">
                <div className="text-center p-8">
                  <img
                    src="/PawnWB.png"
                    alt="Pawn logo"
                    className="w-40 h-40 mx-auto mb-4 object-contain"
                  />
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
