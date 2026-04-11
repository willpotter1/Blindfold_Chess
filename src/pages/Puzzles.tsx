import { useEffect, useState } from 'react';
import SeoHead from '@/components/SeoHead';
import { AppSidebar } from '@/components/AppSidebar';
import { BlindfoldBoard } from '@/components/BlindfoldBoard';
import { MoveInput } from '@/components/MoveInput';
import { MoveList } from '@/components/MoveList';
import { PuzzleConfigPanel } from '@/components/PuzzleConfigPanel';
import { StatusBar } from '@/components/StatusBar';
import { ParticipantSummaryCard, type ParticipantSummaryCardModel } from '@/components/ParticipantSummaryCard';
import { Button } from '@/components/ui/button';
import { getCapturedPiecesByColorFromFen, type CapturedPiecesByColor } from '@/lib/chess/material';
import { curatedPuzzleThemeOptions, preparePuzzle, type PreparedPuzzleRecord } from '@/lib/puzzles';
import { useDesktopFitLayout } from '@/hooks/useDesktopFitLayout';
import { useDesktopGameLayout } from '@/hooks/useDesktopGameLayout';
import { usePuzzleState } from '@/hooks/usePuzzleState';
import computerIcon from '../../Visual/robohead.png';
import playerIcon from '../../Visual/BBpawn.png';

const SEO_TITLE = 'Blindfold Chess Trainer - Puzzle Practice';
const SEO_DESCRIPTION = 'Practice blindfold mate puzzles with the same board experience as the trainer and step through curated Lichess positions.';
const SEO_CANONICAL_URL = 'https://blindchess.org/puzzles';
const SEO_OG_IMAGE = 'https://blindchess.org/BBpawn.png';
const DESKTOP_BOARD_SIZE = 760;
const DESKTOP_RIGHT_COLUMN_WIDTH = 441;
const DESKTOP_LAYOUT_GAP = 32;

type PuzzleParticipantRole = 'computer' | 'player';

const getOpposingColor = (color: 'white' | 'black'): 'white' | 'black' => (
  color === 'white' ? 'black' : 'white'
);

const getTurnColorFromFen = (fen: string): 'white' | 'black' => (
  fen.split(' ')[1] === 'b' ? 'black' : 'white'
);

const buildPuzzleParticipantSummary = (
  puzzle: PreparedPuzzleRecord,
  currentFen: string,
  isSolved: boolean,
  role: PuzzleParticipantRole,
  capturedPiecesByColor: CapturedPiecesByColor,
): ParticipantSummaryCardModel => {
  const playerColor = puzzle.playerColor;
  const pieceColor = role === 'player' ? playerColor : getOpposingColor(playerColor);

  return {
    label: role === 'computer' ? 'Computer' : 'Player',
    pieceColor,
    capturedPieces: capturedPiecesByColor[pieceColor],
    isToMove: !isSolved && getTurnColorFromFen(currentFen) === pieceColor,
    iconSrc: role === 'computer' ? computerIcon : playerIcon,
    iconAlt: role === 'computer' ? 'Computer icon' : 'Player icon',
  };
};

const getPuzzleParticipantSummaries = (puzzle: PreparedPuzzleRecord, currentFen: string, isSolved: boolean) => {
  const capturedPiecesByColor = getCapturedPiecesByColorFromFen(currentFen);

  return {
    computer: buildPuzzleParticipantSummary(puzzle, currentFen, isSolved, 'computer', capturedPiecesByColor),
    player: buildPuzzleParticipantSummary(puzzle, currentFen, isSolved, 'player', capturedPiecesByColor),
  };
};

const Puzzles = () => {
  const [isManualBoardReveal, setIsManualBoardReveal] = useState(false);
  const showDesktopGameLayout = useDesktopGameLayout();
  const { containerRef: desktopFitRef, layout: desktopLayout } = useDesktopFitLayout({
    enabled: showDesktopGameLayout,
    baseBoardSize: DESKTOP_BOARD_SIZE,
    baseRightColumnWidth: DESKTOP_RIGHT_COLUMN_WIDTH,
    baseGap: DESKTOP_LAYOUT_GAP,
  });
  const desktopHistoryWidth = Math.max(170, Math.round(desktopLayout.rightColumnWidth * 0.43));
  const desktopShellGapClass = desktopLayout.scale < 0.88 ? 'gap-3' : 'gap-3.5';
  const {
    phase,
    config,
    previewPuzzle,
    previewPoolSize,
    isConfigLoading,
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
  } = usePuzzleState();

  useEffect(() => {
    setIsManualBoardReveal(false);
  }, [currentPuzzle?.id, phase]);

  const previewPreparedPuzzle = previewPuzzle ? preparePuzzle(previewPuzzle) : null;
  const currentPreparedPuzzle = currentPuzzle ? preparePuzzle(currentPuzzle) : null;
  const isSessionActive = phase === 'session' && Boolean(currentPuzzle);
  const boardFen = isSessionActive ? fen : previewPreparedPuzzle?.playableFen ?? '';
  const isBoardVisible = isSessionActive
    ? shouldShowBoard() || (sessionConfig?.allowCheats && isManualBoardReveal)
    : true;
  const hintButtonLabel = hintStage === 0 ? 'Hint' : hintStage === 1 ? 'Show Destination' : 'Hint Shown';
  const participantSummaries =
    isSessionActive && currentPreparedPuzzle ? getPuzzleParticipantSummaries(currentPreparedPuzzle, fen, isSolved) : null;
  const showDesktopMoveHistory = Boolean(isSessionActive && !sessionConfig?.hideMoveHistory);
  const moveHistoryStartingTurnColor = currentPuzzle ? getTurnColorFromFen(currentPuzzle.fen) : 'white';
  const puzzleConfigStatusMessage = isConfigLoading ? 'Loading puzzles...' : undefined;
  const previewPlaceholderMessage = configError || (isConfigLoading ? 'Loading puzzle preview...' : 'No puzzle preview available.');

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

    const desktopActionColumnWidth = Math.max(136, Math.round(desktopLayout.rightColumnWidth * 0.34));

    return (
      <div
        className={`grid h-full min-h-0 grid-rows-[auto_auto_minmax(0,1fr)] ${desktopShellGapClass}`}
        style={{ height: `${desktopLayout.rightColumnHeight}px` }}
      >
        <div className={`grid grid-cols-2 ${desktopShellGapClass}`}>
          <ParticipantSummaryCard participant={participantSummaries.computer} className="bg-surface-white/75" />
          <ParticipantSummaryCard participant={participantSummaries.player} className="bg-surface-white/75" />
        </div>

        <div
          className={`grid min-h-0 w-full ${desktopShellGapClass} ${showDesktopMoveHistory ? '' : 'grid-cols-1'}`}
          style={showDesktopMoveHistory ? { gridTemplateColumns: `minmax(0,1fr) ${desktopHistoryWidth}px` } : undefined}
        >
          <div className={`grid min-h-0 ${desktopShellGapClass}`} style={{ gridTemplateRows: 'auto auto' }}>
            <StatusBar status={status} variant="compact" className="bg-surface-white/75" />

            <div
              className={`grid min-h-0 ${desktopShellGapClass}`}
              style={{ gridTemplateColumns: `minmax(0,1fr) ${desktopActionColumnWidth}px` }}
            >
              <MoveInput
                onSubmitMove={(move) => {
                  submitSanMove(move);
                }}
                disabled={isSolved}
                errorMessage={error}
                variant="compact"
                className="bg-surface-white/75 min-h-0"
              />

              <div className={`grid auto-rows-fr ${desktopShellGapClass}`}>
                {isSolved && (
                  <>
                    <Button
                      type="button"
                      variant="outline"
                      className="h-full min-h-0 w-full border-2 border-border bg-surface-white text-foreground hover:bg-accent"
                      onClick={() => {
                        setIsManualBoardReveal(false);
                        exitToConfig();
                      }}
                    >
                      New Config
                    </Button>
                    <Button
                      type="button"
                      className="h-full min-h-0 w-full border-2 border-primary bg-primary text-primary-foreground hover:bg-primary/90"
                      onClick={() => {
                        setIsManualBoardReveal(false);
                        loadNextPuzzle();
                      }}
                    >
                      Next
                    </Button>
                  </>
                )}

                <Button
                  type="button"
                  variant="outline"
                  className="h-full min-h-0 w-full border-2 border-border bg-surface-white/75 text-foreground hover:bg-accent"
                  onClick={advanceHint}
                  disabled={isSolved || hintStage === 2}
                >
                  {hintButtonLabel}
                </Button>

                {renderRevealButton('h-full min-h-0 w-full border-2 border-border bg-surface-white/75 text-foreground hover:bg-accent')}
              </div>
            </div>
          </div>

          {showDesktopMoveHistory && (
            <div className="min-h-0">
              <MoveList
                moves={moves}
                startingTurnColor={moveHistoryStartingTurnColor}
                className="h-full min-h-0 bg-surface-white/75"
              />
            </div>
          )}
        </div>

      </div>
    );
  };

  return (
    <div className={`bg-stage-glow min-h-screen ${showDesktopGameLayout ? 'md:flex' : ''}`}>
      <SeoHead
        title={SEO_TITLE}
        description={SEO_DESCRIPTION}
        canonicalUrl={SEO_CANONICAL_URL}
        ogImage={SEO_OG_IMAGE}
      />
      <AppSidebar desktopMode={showDesktopGameLayout} />

      <div className={`mx-auto w-full px-4 ${showDesktopGameLayout ? 'md:my-4 md:h-[calc(100vh-2rem)] md:flex-1 md:py-0' : 'py-8 md:flex-1'}`}>
        {isSessionActive ? (
          <div className={showDesktopGameLayout ? 'h-full' : ''}>
            {showDesktopGameLayout ? (
              <div ref={desktopFitRef} className="mx-auto flex h-full w-full max-w-[1800px] items-center justify-center">
                <div
                  className="grid items-center"
                  style={{
                    gridTemplateColumns: `${desktopLayout.boardSize}px ${desktopLayout.rightColumnWidth}px`,
                    columnGap: `${desktopLayout.gap}px`,
                  }}
                >
                  <div className="flex items-center justify-center">
                    <div style={{ width: `${desktopLayout.boardSize}px` }}>
                      {boardFen ? (
                        <BlindfoldBoard
                          fen={boardFen}
                          perspective="white"
                          isVisible={isBoardVisible}
                          isInteractive={!isSolved}
                          onMove={(from, to) => submitBoardMove(from, to).success}
                          highlightSourceSquare={hintSourceSquare}
                          highlightTargetSquare={hintTargetSquare}
                          className="w-full"
                        />
                      ) : (
                        <div className="flex aspect-square w-full items-center justify-center rounded-xl border-2 border-dashed border-border bg-surface-white/75 p-6 text-center text-sm text-muted-foreground">
                          {previewPlaceholderMessage}
                        </div>
                      )}
                    </div>
                  </div>

                  <div style={{ width: `${desktopLayout.rightColumnWidth}px` }}>
                    {renderDesktopPuzzleShell()}
                  </div>
                </div>
              </div>
            ) : (
              <div className="mx-auto grid w-full max-w-[1800px] grid-cols-1 gap-4">
                <div className="flex flex-col items-center justify-start space-y-4">
                  <div className="mx-auto w-full max-w-[560px] md:max-w-[600px] lg:max-w-[min(52vw,760px)]">
                    {boardFen ? (
                      <BlindfoldBoard
                        fen={boardFen}
                        perspective="white"
                        isVisible={isBoardVisible}
                        isInteractive={!isSolved}
                        onMove={(from, to) => submitBoardMove(from, to).success}
                        highlightSourceSquare={hintSourceSquare}
                        highlightTargetSquare={hintTargetSquare}
                      />
                    ) : (
                      <div className="flex aspect-square w-full items-center justify-center rounded-xl border-2 border-dashed border-border bg-surface-white/75 p-6 text-center text-sm text-muted-foreground">
                        {previewPlaceholderMessage}
                      </div>
                    )}
                  </div>
                </div>

                <div className="w-full space-y-4">
                {!showDesktopGameLayout && (
                  <>
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
                        className="h-10 w-full border-2 border-border bg-surface-white text-foreground hover:bg-accent"
                        onClick={() => {
                          setIsManualBoardReveal(false);
                          exitToConfig();
                        }}
                      >
                        New Config
                      </Button>
                      <Button
                        type="button"
                        className="h-10 w-full border-2 border-primary bg-primary text-primary-foreground hover:bg-primary/90"
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
                    className="w-full border-2 border-border bg-surface-white text-foreground hover:bg-accent"
                    onClick={advanceHint}
                    disabled={isSolved || hintStage === 2}
                  >
                    {hintButtonLabel}
                  </Button>

                  {renderRevealButton('w-full border-2 border-border bg-surface-white/75 text-foreground hover:bg-accent')}

                  {!sessionConfig?.hideMoveHistory && <MoveList moves={moves} startingTurnColor={moveHistoryStartingTurnColor} />}
                  </>
                )}

                </div>
              </div>
            )}
          </div>
        ) : (
          <div className={showDesktopGameLayout ? 'h-full' : ''}>
            {showDesktopGameLayout ? (
              <div ref={desktopFitRef} className="mx-auto flex h-full w-full max-w-[1800px] items-center justify-center">
                <div
                  className="grid items-center"
                  style={{
                    gridTemplateColumns: `${desktopLayout.boardSize}px ${desktopLayout.rightColumnWidth}px`,
                    columnGap: `${desktopLayout.gap}px`,
                  }}
                >
                  <div className="flex items-center justify-center">
                    <div style={{ width: `${desktopLayout.boardSize}px` }}>
                      {boardFen ? (
                        <BlindfoldBoard
                          fen={boardFen}
                          perspective="white"
                          isVisible={isBoardVisible}
                          isInteractive={false}
                          onMove={() => false}
                          className="w-full"
                        />
                      ) : (
                        <div className="flex aspect-square w-full items-center justify-center rounded-xl border-2 border-dashed border-border bg-surface-white/75 p-6 text-center text-sm text-muted-foreground">
                          {previewPlaceholderMessage}
                        </div>
                      )}
                    </div>
                  </div>

                  <div style={{ width: `${desktopLayout.rightColumnWidth}px` }}>
                    <div style={{ height: `${desktopLayout.rightColumnHeight}px` }}>
                      <PuzzleConfigPanel
                        config={config}
                        themeOptions={curatedPuzzleThemeOptions}
                        matchingPuzzleCount={previewPoolSize}
                        errorMessage={configError}
                        statusMessage={puzzleConfigStatusMessage}
                        isStartDisabled={isConfigLoading || Boolean(configError) || !previewPuzzle}
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
            ) : (
              <div className="mx-auto grid w-full max-w-[1800px] grid-cols-1 gap-4">
                <div className="flex flex-col items-center justify-start space-y-4">
                  <div className="mx-auto w-full max-w-[560px] md:max-w-[600px] lg:max-w-[min(52vw,760px)]">
                    {boardFen ? (
                      <BlindfoldBoard
                        fen={boardFen}
                        perspective="white"
                        isVisible={isBoardVisible}
                        isInteractive={false}
                        onMove={() => false}
                      />
                    ) : (
                      <div className="flex aspect-square w-full items-center justify-center rounded-xl border-2 border-dashed border-border bg-surface-white/75 p-6 text-center text-sm text-muted-foreground">
                        {previewPlaceholderMessage}
                      </div>
                    )}
                  </div>
                </div>

                <div className="w-full space-y-4">
                  <PuzzleConfigPanel
                    config={config}
                    themeOptions={curatedPuzzleThemeOptions}
                    matchingPuzzleCount={previewPoolSize}
                    errorMessage={configError}
                    statusMessage={puzzleConfigStatusMessage}
                    isStartDisabled={isConfigLoading || Boolean(configError) || !previewPuzzle}
                    onConfigChange={updateConfig}
                    onStart={() => {
                      setIsManualBoardReveal(false);
                      startSession();
                    }}
                    className="h-full"
                  />
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Puzzles;
