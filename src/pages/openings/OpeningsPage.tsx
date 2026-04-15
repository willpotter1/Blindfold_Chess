import { useEffect, useMemo, useRef, useState } from 'react';
import { Chess, type Square } from 'chess.js';
import { useNavigate, useParams } from 'react-router-dom';
import { Eye } from 'lucide-react';
import { AppSidebar } from '@/components/AppSidebar';
import { BlindfoldBoard } from '@/components/BlindfoldBoard';
import { MoveInput } from '@/components/MoveInput';
import { MoveList } from '@/components/MoveList';
import { OpeningsActivePanel } from '@/components/OpeningsActivePanel';
import { OpeningsConfigPanel } from '@/components/OpeningsConfigPanel';
import { OpeningsResultsPanel } from '@/components/OpeningsResultsPanel';
import SeoHead from '@/components/SeoHead';
import { Button } from '@/components/ui/button';
import { useOpeningTrainerState } from '@/hooks/useOpeningTrainerState';
import type { ComputerGameConfig } from '@/lib/gameSession';
import { cn } from '@/lib/utils';

const SEO_TITLE = 'Blindfold Chess Openings - Practice Opening Lines | Blindchess.org';
const SEO_DESCRIPTION = 'Study and drill chess opening lines blindfolded using the Lichess openings dataset. Memorize openings through visualization and continue into full blind chess games at blindchess.org.';
const SEO_CANONICAL_URL = 'https://blindchess.org/openings';
const SEO_OG_IMAGE = 'https://blindchess.org/circlepawnwb-512.png';
const STARTING_FEN = new Chess().fen();

const clampElo = (value: number) => {
  if (!Number.isFinite(value)) return 1500;
  return Math.max(1300, Math.min(2800, Math.round(value)));
};

const clampRevealEvery = (value: number) => {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.round(value));
};

const shouldShowBoardForRound = (
  playerMoveCount: number,
  revealEvery: number,
  phase: 'session' | 'results',
) => {
  if (phase === 'results') return true;
  if (revealEvery <= 0) return false;
  return playerMoveCount % revealEvery === 0;
};

const Openings = () => {
  const navigate = useNavigate();
  const { sessionId } = useParams<{ sessionId?: string }>();
  const prevPhaseRef = useRef<string>('config');
  const [isManualBoardReveal, setIsManualBoardReveal] = useState(false);
  const {
    phase,
    config,
    explorer,
    round,
    configStatus,
    continueEngineElo,
    continueRevealEvery,
    updateConfig,
    startRound,
    restartRound,
    returnToConfig,
    submitSanMove,
    submitUciMove,
    setContinueEngineElo,
    setContinueRevealEvery,
    getContinueGameStartSeed,
  } = useOpeningTrainerState();

  useEffect(() => {
    if (phase === 'session' && prevPhaseRef.current === 'config') {
      navigate(`/openings/${crypto.randomUUID()}`, { replace: true });
    } else if (phase === 'config' && prevPhaseRef.current !== 'config') {
      navigate('/openings', { replace: true });
    }
    prevPhaseRef.current = phase;
  }, [phase, navigate]);

  useEffect(() => {
    if (sessionId && phase === 'config') {
      navigate('/openings', { replace: true });
    }
  }, [sessionId, phase, navigate]);

  useEffect(() => {
    setIsManualBoardReveal(false);
  }, [phase, round?.playedUciMoves.length]);

  const boardFen = round?.currentFen ?? STARTING_FEN;
  const boardPerspective = config.playerColor;
  const showBoard = phase !== 'config';
  const showMoveHistory = Boolean(round && (phase === 'results' || !config.hideMoveHistory));
  const canReveal = Boolean(round && phase === 'session' && round.config.allowCheats);
  const isBoardVisible = !round
    ? true
    : shouldShowBoardForRound(round.playerMoveCount, round.config.revealEvery, phase === 'results' ? 'results' : 'session') ||
      (round.config.allowCheats && isManualBoardReveal);
  const isPlayerTurn = Boolean(round && phase === 'session' && boardFen.split(' ')[1] === (config.playerColor === 'white' ? 'w' : 'b'));

  // Global spacebar reveal
  useEffect(() => {
    if (!canReveal) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== ' ' || e.repeat) return;
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      e.preventDefault();
      setIsManualBoardReveal(true);
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key !== ' ') return;
      setIsManualBoardReveal(false);
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [canReveal]);

  const handleBoardMove = async (from: string, to: string) => {
    if (!round || phase !== 'session') return false;

    const chess = new Chess(round.currentFen);
    const legalFromMoves = chess.moves({ square: from as Square, verbose: true });
    const matchingMoves = legalFromMoves.filter((move) => move.to === to);

    if (matchingMoves.length === 0) return false;

    const selectedMove = matchingMoves.find((move) => move.promotion === 'q') ?? matchingMoves[0];
    const uciMove = `${selectedMove.from}${selectedMove.to}${selectedMove.promotion ?? ''}`;

    return submitUciMove(uciMove);
  };

  const handleContinueGame = () => {
    const gameStartSeed = getContinueGameStartSeed();
    if (!gameStartSeed) return;

    const gameConfig: ComputerGameConfig = {
      mode: 'computer',
      playerColor: config.playerColor,
      engineElo: clampElo(continueEngineElo),
      revealEvery: clampRevealEvery(continueRevealEvery),
      allowCheats: config.allowCheats,
      hideMoveHistory: config.hideMoveHistory,
    };

    navigate(`/game/${crypto.randomUUID()}`, {
      state: { gameConfig, gameStartSeed },
    });
  };

  const renderRevealButton = () => {
    if (!canReveal) return null;

    return (
      <Button
        type="button"
        variant="outline"
        className="h-9 w-full border border-border/50 bg-card text-xs text-muted-foreground hover:bg-secondary hover:text-foreground"
        onPointerDown={() => setIsManualBoardReveal(true)}
        onPointerUp={() => setIsManualBoardReveal(false)}
        onPointerLeave={() => setIsManualBoardReveal(false)}
        onPointerCancel={() => setIsManualBoardReveal(false)}
        onKeyDown={(event) => {
          if (event.key === ' ') {
            event.preventDefault();
            setIsManualBoardReveal(true);
          }
        }}
        onKeyUp={(event) => {
          if (event.key === ' ') setIsManualBoardReveal(false);
        }}
        onBlur={() => setIsManualBoardReveal(false)}
      >
        <Eye size={14} className="mr-1" />
        <span>Show Board</span>
        <span className="mx-1.5 text-[0.6rem] text-muted-foreground/40">or press</span>
        <kbd className="rounded border border-border/50 bg-secondary px-1.5 py-0.5 text-[0.6rem] font-mono leading-none text-muted-foreground">Space</kbd>
      </Button>
    );
  };

  const sidePanel = useMemo(() => {
    if (phase === 'config') {
      return (
        <OpeningsConfigPanel
          config={config}
          explorer={explorer}
          statusMessage={configStatus.message}
          statusTone={configStatus.tone}
          isStartDisabled={configStatus.isStartDisabled}
          onConfigChange={updateConfig}
          onStart={startRound}
          className="h-full"
        />
      );
    }

    if (!round) return null;

    if (phase === 'results') {
      return (
        <OpeningsResultsPanel
          opening={round.opening}
          continueEngineElo={continueEngineElo}
          continueRevealEvery={continueRevealEvery}
          onContinueEngineEloChange={setContinueEngineElo}
          onContinueRevealEveryChange={setContinueRevealEvery}
          onRestart={restartRound}
          onNewConfig={returnToConfig}
          onContinue={handleContinueGame}
        />
      );
    }

    // Session phase
    return (
      <div className="flex h-full flex-col gap-2.5">
        <OpeningsActivePanel
          playerMoveCount={round.playerMoveCount}
          depthPlayerMoves={round.config.depthPlayerMoves}
          activeRecordCount={round.activeRecordIds.length}
          status={round.status}
        />

        <MoveInput
          onSubmitMove={submitSanMove}
          disabled={!isPlayerTurn}
          errorMessage={round.error}
          variant="compact"
        />

        {renderRevealButton()}

        {showMoveHistory && (
          <MoveList
            moves={round.movesSan}
            startingTurnColor="white"
          />
        )}
      </div>
    );
  }, [
    config,
    configStatus.isStartDisabled,
    configStatus.message,
    configStatus.tone,
    continueEngineElo,
    continueRevealEvery,
    handleContinueGame,
    isPlayerTurn,
    explorer,
    phase,
    restartRound,
    returnToConfig,
    round,
    canReveal,
    isManualBoardReveal,
    showMoveHistory,
    setContinueEngineElo,
    setContinueRevealEvery,
    startRound,
    submitSanMove,
    updateConfig,
  ]);

  return (
    <div className="bg-background flex min-h-screen flex-col md:flex-row">
      <SeoHead
        title={SEO_TITLE}
        description={SEO_DESCRIPTION}
        canonicalUrl={SEO_CANONICAL_URL}
        ogImage={SEO_OG_IMAGE}
      />
      <AppSidebar />

      <div className="min-h-0 px-4 py-4 pb-8 md:flex-1 lg:py-0 lg:pb-0">
        {showBoard ? (
          <div className="mx-auto w-full max-w-xl gap-4 grid grid-cols-1 md:max-w-3xl lg:max-w-7xl lg:h-[calc(100vh-2rem)] lg:my-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-center lg:gap-5 xl:gap-8">
            <div className="flex items-center justify-center">
              <div className="w-full lg:max-w-[min(75vh,680px)] xl:max-w-[min(78vh,720px)]">
                <BlindfoldBoard
                  fen={boardFen}
                  perspective={boardPerspective}
                  isVisible={isBoardVisible}
                  isInteractive={isPlayerTurn}
                  onMove={handleBoardMove}
                  className="w-full"
                />
              </div>
            </div>

            <div className="lg:self-center">
              {sidePanel}
            </div>

            {phase !== 'session' && showMoveHistory && round && (
              <div className="lg:col-span-2">
                <MoveList moves={round.movesSan} startingTurnColor="white" />
              </div>
            )}
          </div>
        ) : (
          <div className="mx-auto w-full max-w-xl md:max-w-3xl lg:max-w-6xl lg:flex lg:h-[calc(100vh-2rem)] lg:my-4 lg:items-center lg:justify-center">
            <div className="w-full lg:h-[min(88vh,800px)]">
              {sidePanel}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Openings;
