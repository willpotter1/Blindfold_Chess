import { useEffect, useRef, useState, type CSSProperties } from 'react';
import SeoHead from '@/components/SeoHead';
import { AppSidebar } from '@/components/AppSidebar';
import { BlindfoldBoard } from '@/components/BlindfoldBoard';
import { MoveInput } from '@/components/MoveInput';
import { MoveList } from '@/components/MoveList';
import { PuzzleConfigPanel } from '@/components/PuzzleConfigPanel';
import { StatusBar } from '@/components/StatusBar';
import { ParticipantSummaryCard, type ParticipantSummaryCardModel } from '@/components/ParticipantSummaryCard';
import { Button } from '@/components/ui/button';
import { getMaterialCountsFromFen, type MaterialCountByColor } from '@/lib/chess/material';
import { builtInPuzzles, curatedPuzzleThemeOptions, type PuzzleRecord } from '@/lib/puzzles';
import { usePuzzleState } from '@/hooks/usePuzzleState';
import computerIcon from '../../Visual/robohead.png';
import playerIcon from '../../Visual/BBpawn.png';

const SEO_TITLE = 'Blindfold Chess Trainer - Puzzle Practice';
const SEO_DESCRIPTION = 'Practice blindfold mate puzzles with the same board experience as the trainer and step through curated Lichess positions.';
const SEO_CANONICAL_URL = 'https://blindchess.org/puzzles';
const SEO_OG_IMAGE = 'https://blindchess.org/BBpawn.png';

type PuzzleParticipantRole = 'computer' | 'player';

const getOpposingColor = (color: 'white' | 'black'): 'white' | 'black' => (
  color === 'white' ? 'black' : 'white'
);

const getTurnColorFromFen = (fen: string): 'white' | 'black' => (
  fen.split(' ')[1] === 'b' ? 'black' : 'white'
);

const getPuzzlePlayerColor = (puzzle: PuzzleRecord): 'white' | 'black' => (
  getTurnColorFromFen(puzzle.fen)
);

const buildPuzzleParticipantSummary = (
  puzzle: PuzzleRecord,
  currentFen: string,
  isSolved: boolean,
  role: PuzzleParticipantRole,
  materialCounts: MaterialCountByColor,
): ParticipantSummaryCardModel => {
  const playerColor = getPuzzlePlayerColor(puzzle);
  const pieceColor = role === 'player' ? playerColor : getOpposingColor(playerColor);
  const opposingColor = getOpposingColor(pieceColor);

  return {
    label: role === 'computer' ? 'Computer' : 'Player',
    pieceColor,
    material: materialCounts[pieceColor],
    materialAdvantage: Math.max(materialCounts[pieceColor] - materialCounts[opposingColor], 0),
    isToMove: !isSolved && getTurnColorFromFen(currentFen) === pieceColor,
    iconSrc: role === 'computer' ? computerIcon : playerIcon,
    iconAlt: role === 'computer' ? 'Computer icon' : 'Player icon',
  };
};

const getPuzzleParticipantSummaries = (puzzle: PuzzleRecord, currentFen: string, isSolved: boolean) => {
  const materialCounts = getMaterialCountsFromFen(currentFen);

  return {
    computer: buildPuzzleParticipantSummary(puzzle, currentFen, isSolved, 'computer', materialCounts),
    player: buildPuzzleParticipantSummary(puzzle, currentFen, isSolved, 'player', materialCounts),
  };
};

const Puzzles = () => {
  const [isManualBoardReveal, setIsManualBoardReveal] = useState(false);
  const [desktopBoardHeight, setDesktopBoardHeight] = useState<number | null>(null);
  const [desktopLeftSectionHeight, setDesktopLeftSectionHeight] = useState<number | null>(null);
  const desktopBoardRef = useRef<HTMLDivElement>(null);
  const desktopLeftSectionRef = useRef<HTMLDivElement>(null);
  const {
    phase,
    config,
    previewPuzzle,
    previewPoolSize,
    configError,
    currentPuzzle,
    sessionConfig,
    fen,
    moves,
    error,
    status,
    isSolved,
    hintStage,
    hintSourceSquare,
    hintTargetSquare,
    updateConfig,
    startSession,
    exitToConfig,
    submitSanMove,
    submitBoardMove,
    loadNextPuzzle,
    shouldShowBoard,
    advanceHint,
  } = usePuzzleState(builtInPuzzles);

  useEffect(() => {
    setIsManualBoardReveal(false);
  }, [currentPuzzle?.id, phase]);

  const isSessionActive = phase === 'session' && Boolean(currentPuzzle);
  const boardFen = isSessionActive ? fen : previewPuzzle?.fen ?? '';
  const isBoardVisible = isSessionActive
    ? shouldShowBoard() || (sessionConfig?.allowCheats && isManualBoardReveal)
    : true;
  const hintButtonLabel = hintStage === 0 ? 'Hint' : hintStage === 1 ? 'Show Destination' : 'Hint Shown';
  const participantSummaries =
    isSessionActive && currentPuzzle ? getPuzzleParticipantSummaries(currentPuzzle, fen, isSolved) : null;
  const showDesktopMoveHistory = Boolean(isSessionActive && !sessionConfig?.hideMoveHistory);
  const desktopConfigPanelStyle = desktopBoardHeight
    ? ({ '--puzzle-config-height': `${desktopBoardHeight}px` } as CSSProperties)
    : undefined;

  useEffect(() => {
    const boardNode = desktopBoardRef.current;
    if (!boardNode) {
      setDesktopBoardHeight(null);
      return;
    }

    const updateBoardHeight = () => {
      setDesktopBoardHeight(Math.round(boardNode.getBoundingClientRect().height));
    };

    updateBoardHeight();

    if (typeof ResizeObserver === 'undefined') {
      return undefined;
    }

    const resizeObserver = new ResizeObserver(() => {
      updateBoardHeight();
    });

    resizeObserver.observe(boardNode);

    return () => {
      resizeObserver.disconnect();
    };
  }, [boardFen, configError, isSessionActive]);

  useEffect(() => {
    if (!isSessionActive) {
      setDesktopLeftSectionHeight(null);
      return;
    }

    const leftSectionNode = desktopLeftSectionRef.current;
    if (!leftSectionNode) return;

    const updateLeftSectionHeight = () => {
      setDesktopLeftSectionHeight(Math.round(leftSectionNode.getBoundingClientRect().height));
    };

    updateLeftSectionHeight();

    if (typeof ResizeObserver === 'undefined') {
      return undefined;
    }

    const resizeObserver = new ResizeObserver(() => {
      updateLeftSectionHeight();
    });

    resizeObserver.observe(leftSectionNode);

    return () => {
      resizeObserver.disconnect();
    };
  }, [isSessionActive]);

  const renderRevealButton = (className: string) => {
    if (!sessionConfig?.allowCheats) return null;

    return (
      <Button
        type="button"
        variant="outline"
        className={className}
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
    );
  };

  const renderDesktopPuzzleShell = () => {
    if (!isSessionActive || !participantSummaries) return null;

    return (
      <div
        className="hidden h-full xl:grid xl:grid-rows-[auto_minmax(0,1fr)_auto] xl:gap-3.5"
        style={desktopBoardHeight ? { height: `${desktopBoardHeight}px` } : undefined}
      >
        <ParticipantSummaryCard participant={participantSummaries.computer} />

        <div className={`grid w-full self-center gap-3.5 ${showDesktopMoveHistory ? 'grid-cols-[minmax(0,1fr)_190px] 2xl:grid-cols-[minmax(0,1fr)_210px]' : 'grid-cols-1'}`}>
          <div ref={desktopLeftSectionRef} className="flex min-h-0 flex-col gap-3.5 self-start">
            <StatusBar status={status} variant="compact" />

            <MoveInput
              onSubmitMove={(move) => {
                submitSanMove(move);
              }}
              disabled={isSolved}
              errorMessage={error}
              variant="compact"
            />

            {isSolved && (
              <div className="grid grid-cols-1 gap-2 2xl:grid-cols-2">
                <Button
                  type="button"
                  variant="outline"
                  className="h-10 w-full border-2 border-[#d9b99b] bg-white text-zinc-900 hover:bg-zinc-50"
                  onClick={() => {
                    setIsManualBoardReveal(false);
                    exitToConfig();
                  }}
                >
                  New Config
                </Button>
                <Button
                  type="button"
                  className="h-10 w-full bg-[#8B4513] text-white hover:bg-[#8B4513]/90"
                  onClick={() => {
                    setIsManualBoardReveal(false);
                    loadNextPuzzle();
                  }}
                >
                  Next Puzzle
                </Button>
              </div>
            )}

            <Button
              type="button"
              variant="outline"
              className="w-full border-2 border-[#d9b99b] bg-white text-zinc-900 hover:bg-zinc-50"
              onClick={advanceHint}
              disabled={isSolved || hintStage === 2}
            >
              {hintButtonLabel}
            </Button>

            {renderRevealButton('w-full border-2 border-[#d9b99b] bg-card text-card-foreground hover:bg-card')}
          </div>

          {showDesktopMoveHistory && (
            <div
              className="self-start"
              style={desktopLeftSectionHeight ? { height: `${desktopLeftSectionHeight}px` } : undefined}
            >
              <MoveList moves={moves} className="h-full min-h-0" />
            </div>
          )}
        </div>

        <ParticipantSummaryCard participant={participantSummaries.player} />
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-white md:flex">
      <SeoHead
        title={SEO_TITLE}
        description={SEO_DESCRIPTION}
        canonicalUrl={SEO_CANONICAL_URL}
        ogImage={SEO_OG_IMAGE}
      />
      <AppSidebar />

      <div className="mx-auto w-full px-4 py-8 md:flex-1">
        {isSessionActive ? (
          <div className="lg:flex lg:min-h-[calc(100vh-4rem)] lg:items-center">
            <div className="mx-auto grid w-full max-w-[1800px] grid-cols-1 gap-4 lg:items-center lg:grid-cols-[minmax(0,1fr)_280px] xl:gap-8 xl:items-stretch xl:grid-cols-[minmax(0,1fr)_minmax(378px,441px)] 2xl:grid-cols-[minmax(0,1fr)_minmax(396px,468px)]">
              <div className="flex flex-col items-center justify-start space-y-4 lg:justify-center xl:h-full xl:items-center xl:justify-center">
                <div ref={desktopBoardRef} className="mx-auto w-full max-w-[560px] md:max-w-[600px] lg:max-w-[min(52vw,760px)]">
                  {boardFen ? (
                    <BlindfoldBoard
                      fen={boardFen}
                      isVisible={isBoardVisible}
                      isInteractive={!isSolved}
                      onMove={(from, to) => submitBoardMove(from, to).success}
                      highlightSourceSquare={hintSourceSquare}
                      highlightTargetSquare={hintTargetSquare}
                    />
                  ) : (
                    <div className="flex aspect-square w-full items-center justify-center rounded-xl border-2 border-dashed border-[#d9b99b] bg-card p-6 text-center text-sm text-muted-foreground">
                      {configError || 'Loading puzzle preview...'}
                    </div>
                  )}
                </div>
              </div>

              <div className="w-full space-y-4 lg:justify-self-end lg:origin-top lg:scale-[0.95] xl:h-full xl:max-w-[468px] xl:scale-100 xl:space-y-0">
                <div className="xl:hidden">
                  <StatusBar status={status} />

                  <MoveInput
                    onSubmitMove={(move) => {
                      submitSanMove(move);
                    }}
                    disabled={isSolved}
                    errorMessage={error}
                  />

                  {isSolved && (
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                      <Button
                        type="button"
                        variant="outline"
                        className="h-10 w-full border-2 border-[#d9b99b] bg-white text-zinc-900 hover:bg-zinc-50"
                        onClick={() => {
                          setIsManualBoardReveal(false);
                          exitToConfig();
                        }}
                      >
                        New Config
                      </Button>
                      <Button
                        type="button"
                        className="h-10 w-full bg-[#8B4513] text-white hover:bg-[#8B4513]/90"
                        onClick={() => {
                          setIsManualBoardReveal(false);
                          loadNextPuzzle();
                        }}
                      >
                        Next Puzzle
                      </Button>
                    </div>
                  )}

                  <Button
                    type="button"
                    variant="outline"
                    className="w-full border-2 border-[#d9b99b] bg-white text-zinc-900 hover:bg-zinc-50"
                    onClick={advanceHint}
                    disabled={isSolved || hintStage === 2}
                  >
                    {hintButtonLabel}
                  </Button>

                  {renderRevealButton('w-full border-2 border-[#d9b99b] bg-card text-card-foreground hover:bg-card')}

                  {!sessionConfig?.hideMoveHistory && <MoveList moves={moves} />}
                </div>

                {renderDesktopPuzzleShell()}
              </div>
            </div>
          </div>
        ) : (
          <div className="lg:flex lg:min-h-[calc(100vh-4rem)] lg:items-center">
            <div className="mx-auto grid w-full max-w-[1800px] grid-cols-1 gap-4 lg:items-center lg:grid-cols-[minmax(0,1fr)_280px] xl:gap-8 xl:items-stretch xl:grid-cols-[minmax(0,1fr)_minmax(378px,441px)] 2xl:grid-cols-[minmax(0,1fr)_minmax(396px,468px)]">
              <div className="flex flex-col items-center justify-start space-y-4 lg:justify-center xl:h-full xl:items-center xl:justify-center">
                <div ref={desktopBoardRef} className="mx-auto w-full max-w-[560px] md:max-w-[600px] lg:max-w-[min(52vw,760px)]">
                  {boardFen ? (
                    <BlindfoldBoard
                      fen={boardFen}
                      isVisible={isBoardVisible}
                      isInteractive={false}
                      onMove={() => false}
                    />
                  ) : (
                    <div className="flex aspect-square w-full items-center justify-center rounded-xl border-2 border-dashed border-[#d9b99b] bg-card p-6 text-center text-sm text-muted-foreground">
                      {configError || 'Loading puzzle preview...'}
                    </div>
                  )}
                </div>
              </div>

              <div className="w-full space-y-4 lg:justify-self-end lg:origin-top lg:scale-[0.95] xl:max-w-[468px] xl:scale-100 xl:space-y-0">
                <div
                  className="xl:h-[var(--puzzle-config-height)]"
                  style={desktopConfigPanelStyle}
                >
                  <PuzzleConfigPanel
                    config={config}
                    themeOptions={curatedPuzzleThemeOptions}
                    matchingPuzzleCount={previewPoolSize}
                    errorMessage={configError}
                    onConfigChange={updateConfig}
                    onStart={() => {
                      setIsManualBoardReveal(false);
                      startSession();
                    }}
                    className="h-full"
                  />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Puzzles;
