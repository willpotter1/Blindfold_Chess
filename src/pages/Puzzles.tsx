import { useEffect, useState } from 'react';
import SeoHead from '@/components/SeoHead';
import { AppSidebar } from '@/components/AppSidebar';
import { BlindfoldBoard } from '@/components/BlindfoldBoard';
import { MoveInput } from '@/components/MoveInput';
import { MoveList } from '@/components/MoveList';
import { PuzzleConfigPanel } from '@/components/PuzzleConfigPanel';
import { StatusBar } from '@/components/StatusBar';
import { Button } from '@/components/ui/button';
import { builtInPuzzles, curatedPuzzleThemeOptions } from '@/lib/puzzles';
import { usePuzzleState } from '@/hooks/usePuzzleState';

const SEO_TITLE = 'Blindfold Chess Trainer - Puzzle Practice';
const SEO_DESCRIPTION = 'Practice blindfold mate puzzles with the same board experience as the trainer and step through curated Lichess positions.';
const SEO_CANONICAL_URL = 'https://blindchess.org/puzzles';
const SEO_OG_IMAGE = 'https://blindchess.org/BBpawn.png';

const Puzzles = () => {
  const [isManualBoardReveal, setIsManualBoardReveal] = useState(false);
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
        <div className="mx-auto grid max-w-[1800px] grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_280px] xl:grid-cols-[minmax(0,1fr)_300px]">
          <div className="flex flex-col items-center justify-start space-y-4">
            {boardFen ? (
              <BlindfoldBoard
                fen={boardFen}
                isVisible={isBoardVisible}
                isInteractive={isSessionActive && !isSolved}
                onMove={(from, to) => submitBoardMove(from, to).success}
                highlightSourceSquare={isSessionActive ? hintSourceSquare : null}
                highlightTargetSquare={isSessionActive ? hintTargetSquare : null}
              />
            ) : (
              <div className="flex aspect-square w-full max-w-[560px] items-center justify-center rounded-xl border-2 border-dashed border-[#d9b99b] bg-card p-6 text-center text-sm text-muted-foreground md:max-w-[600px] lg:max-w-[min(52vw,760px)]">
                {configError || 'Loading puzzle preview...'}
              </div>
            )}
          </div>

          <div className="w-full space-y-4 lg:justify-self-end lg:origin-top lg:scale-[0.95]">
            {isSessionActive ? (
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

                {sessionConfig?.allowCheats && (
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full border-2 border-[#d9b99b] bg-card text-card-foreground hover:bg-card"
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
                )}

                {!sessionConfig?.hideMoveHistory && <MoveList moves={moves} />}
              </>
            ) : (
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
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Puzzles;
