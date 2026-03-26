import { useEffect, useMemo, useState } from 'react';
import { Chess } from 'chess.js';
import { useNavigate } from 'react-router-dom';
import { AppSidebar } from '@/components/AppSidebar';
import { BlindfoldBoard } from '@/components/BlindfoldBoard';
import { MoveInput } from '@/components/MoveInput';
import { MoveList } from '@/components/MoveList';
import { OpeningsActivePanel } from '@/components/OpeningsActivePanel';
import { OpeningsConfigPanel } from '@/components/OpeningsConfigPanel';
import { OpeningsResultsPanel } from '@/components/OpeningsResultsPanel';
import SeoHead from '@/components/SeoHead';
import { Button } from '@/components/ui/button';
import { useDesktopFitLayout } from '@/hooks/useDesktopFitLayout';
import { useDesktopGameLayout } from '@/hooks/useDesktopGameLayout';
import { useOpeningTrainerState } from '@/hooks/useOpeningTrainerState';
import type { ComputerGameConfig } from '@/lib/gameSession';
import { cn } from '@/lib/utils';

const SEO_TITLE = 'Blindfold Chess Trainer - Openings';
const SEO_DESCRIPTION = 'Drill opening lines from the official Lichess openings dataset, then continue into a full blindfold game.';
const SEO_CANONICAL_URL = 'https://blindchess.org/openings';
const SEO_OG_IMAGE = 'https://blindchess.org/BBpawn.png';
const DESKTOP_BOARD_SIZE = 760;
const DESKTOP_RIGHT_COLUMN_WIDTH = 420;
const DESKTOP_LAYOUT_GAP = 24;
const MOBILE_STATIC_BOARD_MAX_WIDTH = 640;
const STARTING_FEN = new Chess().fen();

const clampElo = (value: number) => {
  if (!Number.isFinite(value)) {
    return 1500;
  }

  return Math.max(1300, Math.min(2800, Math.round(value)));
};

const clampRevealEvery = (value: number) => {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.max(0, Math.round(value));
};

const shouldShowBoardForRound = (
  playerMoveCount: number,
  revealEvery: number,
  phase: 'session' | 'results',
) => {
  if (phase === 'results') {
    return true;
  }

  if (revealEvery <= 0) {
    return false;
  }

  return playerMoveCount % revealEvery === 0;
};

const Openings = () => {
  const navigate = useNavigate();
  const showDesktopGameLayout = useDesktopGameLayout();
  const [isManualBoardReveal, setIsManualBoardReveal] = useState(false);
  const {
    phase,
    config,
    catalog,
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

  const { containerRef: desktopFitRef, layout: desktopLayout } = useDesktopFitLayout({
    enabled: showDesktopGameLayout,
    baseBoardSize: DESKTOP_BOARD_SIZE,
    baseRightColumnWidth: DESKTOP_RIGHT_COLUMN_WIDTH,
    baseGap: DESKTOP_LAYOUT_GAP,
    rightWidthDamping: 0.55,
  });

  useEffect(() => {
    setIsManualBoardReveal(false);
  }, [phase, round?.playedUciMoves.length]);

  const boardFen = round?.currentFen ?? STARTING_FEN;
  const boardPerspective = config.playerColor;
  const showMoveHistory = Boolean(round && (phase === 'results' || !config.hideMoveHistory));
  const isBoardVisible = !round
    ? true
    : shouldShowBoardForRound(round.playerMoveCount, round.config.revealEvery, phase === 'results' ? 'results' : 'session') ||
      (round.config.allowCheats && isManualBoardReveal);
  const isPlayerTurn = Boolean(round && phase === 'session' && boardFen.split(' ')[1] === (config.playerColor === 'white' ? 'w' : 'b'));

  const handleBoardMove = async (from: string, to: string) => {
    if (!round || phase !== 'session') {
      return false;
    }

    const chess = new Chess(round.currentFen);
    const legalFromMoves = chess.moves({ square: from, verbose: true });
    const matchingMoves = legalFromMoves.filter((move) => move.to === to);

    if (matchingMoves.length === 0) {
      return false;
    }

    const selectedMove = matchingMoves.find((move) => move.promotion === 'q') ?? matchingMoves[0];
    const uciMove = `${selectedMove.from}${selectedMove.to}${selectedMove.promotion ?? ''}`;

    return submitUciMove(uciMove);
  };

  const handleContinueGame = () => {
    const gameStartSeed = getContinueGameStartSeed();

    if (!gameStartSeed) {
      return;
    }

    const gameConfig: ComputerGameConfig = {
      mode: 'computer',
      playerColor: config.playerColor,
      engineElo: clampElo(continueEngineElo),
      revealEvery: clampRevealEvery(continueRevealEvery),
      allowCheats: config.allowCheats,
      hideMoveHistory: config.hideMoveHistory,
    };

    navigate('/', {
      state: {
        gameConfig,
        gameStartSeed,
      },
    });
  };

  const revealButton = round?.config.allowCheats ? (
    <Button
      type="button"
      variant="outline"
      className="w-full border-2 border-border bg-surface-white/75 text-foreground hover:bg-accent"
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
  ) : null;

  const sidePanel = useMemo(() => {
    if (phase === 'config') {
      return (
        <OpeningsConfigPanel
          config={config}
          families={catalog?.families ?? []}
          lines={catalog?.lines ?? []}
          statusMessage={configStatus.message}
          statusTone={configStatus.tone}
          isStartDisabled={configStatus.isStartDisabled}
          onConfigChange={updateConfig}
          onStart={startRound}
          className="h-full"
        />
      );
    }

    if (!round) {
      return null;
    }

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

    return (
      <div className="grid gap-3">
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
        {revealButton}
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
    catalog?.families,
    catalog?.lines,
    phase,
    restartRound,
    returnToConfig,
    round,
    revealButton,
    setContinueEngineElo,
    setContinueRevealEvery,
    startRound,
    submitSanMove,
    updateConfig,
  ]);

  const renderDesktopLayout = () => (
    <div className="px-4 py-8">
      <div className="h-[calc(100dvh-4rem)]">
        <div
          ref={desktopFitRef}
          className="mx-auto flex h-full w-full max-w-[1680px] items-start justify-center pt-2"
        >
          <div
            className="grid items-start"
            style={{
              gridTemplateColumns: `${desktopLayout.boardSize}px ${desktopLayout.rightColumnWidth}px`,
              columnGap: `${desktopLayout.gap}px`,
            }}
          >
            <div className="flex items-center justify-center">
              <div style={{ width: `${desktopLayout.boardSize}px` }}>
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

            <div
              className="grid min-h-0 gap-3"
              style={{
                width: `${desktopLayout.rightColumnWidth}px`,
                height: phase === 'config' ? `${desktopLayout.boardSize}px` : undefined,
                gridTemplateRows: phase === 'config' ? 'minmax(0, 1fr)' : undefined,
              }}
            >
              {sidePanel}
              {showMoveHistory && round && (
                <MoveList moves={round.movesSan} startingTurnColor="white" />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderMobileLayout = () => (
    <div
      className={cn(
        'px-4 py-4',
        phase === 'session' && 'flex h-full min-h-0 flex-col overflow-hidden',
      )}
    >
      <div className="mx-auto grid w-full max-w-[760px] grid-cols-1 gap-4">
        <div className="flex justify-center">
          <div className="w-full" style={{ maxWidth: `${MOBILE_STATIC_BOARD_MAX_WIDTH}px` }}>
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

        {sidePanel}

        {showMoveHistory && round && (
          <MoveList moves={round.movesSan} startingTurnColor="white" />
        )}
      </div>
    </div>
  );

  return (
    <div className={cn('bg-stage-glow flex min-h-screen flex-col', showDesktopGameLayout && 'md:flex-row')}>
      <SeoHead
        title={SEO_TITLE}
        description={SEO_DESCRIPTION}
        canonicalUrl={SEO_CANONICAL_URL}
        ogImage={SEO_OG_IMAGE}
      />
      <AppSidebar desktopMode={showDesktopGameLayout} />

      <div className="flex-1 min-h-0">
        {showDesktopGameLayout ? renderDesktopLayout() : renderMobileLayout()}
      </div>
    </div>
  );
};

export default Openings;
