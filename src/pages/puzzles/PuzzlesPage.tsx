import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { RotateCcw, Settings, Lightbulb, Eye } from 'lucide-react';
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
import { usePuzzleState } from '@/hooks/usePuzzleState';
import computerIcon from '../../../Visual/robohead.png';
import playerIcon from '../../../Visual/BBpawn.png';

const SEO_TITLE = 'Blindfold Chess Puzzles - Solve Blind Chess Puzzles | Blindchess.org';
const SEO_DESCRIPTION = 'Solve blindfold chess puzzles without seeing the board. Practice checkmate patterns, tactics, and visualization with curated Lichess puzzle positions at blindchess.org.';
const SEO_CANONICAL_URL = 'https://blindchess.org/puzzles';
const SEO_OG_IMAGE = 'https://blindchess.org/circlepawnwb-512.png';

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
  const navigate = useNavigate();
  const { sessionId } = useParams<{ sessionId?: string }>();
  const prevPhaseRef = useRef<string>('config');
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
    if (phase === 'session' && prevPhaseRef.current === 'config') {
      navigate(`/puzzles/${crypto.randomUUID()}`, { replace: true });
    } else if (phase === 'config' && prevPhaseRef.current === 'session') {
      navigate('/puzzles', { replace: true });
    }
    prevPhaseRef.current = phase;
  }, [phase, navigate]);

  useEffect(() => {
    if (sessionId && phase === 'config') {
      navigate('/puzzles', { replace: true });
    }
  }, [sessionId, phase, navigate]);

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
  const showMoveHistory = Boolean(isSessionActive && !sessionConfig?.hideMoveHistory);
  const moveHistoryStartingTurnColor = currentPuzzle ? getTurnColorFromFen(currentPuzzle.fen) : 'white';
  const puzzleConfigStatusMessage = isConfigLoading ? 'Loading puzzles...' : undefined;
  const previewPlaceholderMessage = configError || (isConfigLoading ? 'Loading puzzle preview...' : 'No puzzle preview available.');
  const canReveal = isSessionActive && !isSolved && sessionConfig?.allowCheats;

  // Global spacebar to reveal board
  useEffect(() => {
    if (!isSessionActive || isSolved || !sessionConfig?.allowCheats) return;

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
  }, [isSessionActive, isSolved, sessionConfig?.allowCheats]);

  const renderRevealButton = (className: string) => {
    if (!canReveal) return null;

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
          if (event.key === ' ') {
            event.preventDefault();
            setIsManualBoardReveal(true);
          }
        }}
        onKeyUp={(event) => {
          if (event.key === ' ') {
            setIsManualBoardReveal(false);
          }
        }}
        onBlur={() => setIsManualBoardReveal(false)}
      >
        <Eye size={14} className="mr-1" />
        <span>Show Board</span>
        <span className="mx-1.5 text-[0.6rem] text-muted-foreground/40">or press</span>
        <kbd className="rounded border border-border/50 bg-secondary px-1.5 py-0.5 text-[0.6rem] font-mono leading-none text-muted-foreground">
          Space
        </kbd>
      </Button>
    );
  };

  const renderBoardOrPlaceholder = (interactive: boolean) => (
    boardFen ? (
      <BlindfoldBoard
        fen={boardFen}
        perspective="white"
        isVisible={isBoardVisible}
        isInteractive={interactive && !isSolved}
        onMove={interactive ? (from, to) => submitBoardMove(from, to).success : () => false}
        highlightSourceSquare={interactive ? hintSourceSquare : undefined}
        highlightTargetSquare={interactive ? hintTargetSquare : undefined}
        className="w-full"
      />
    ) : (
      <div className="flex aspect-square w-full items-center justify-center rounded-xl border border-dashed border-border/50 bg-card p-6 text-center text-sm text-muted-foreground">
        {previewPlaceholderMessage}
      </div>
    )
  );

  const renderDesktopPanel = () => {
    if (isSessionActive && participantSummaries) {
      return (
        <div className="flex h-full flex-col gap-2.5">
          {/* Participants */}
          <div className="grid grid-cols-2 gap-2">
            <ParticipantSummaryCard participant={participantSummaries.computer} />
            <ParticipantSummaryCard participant={participantSummaries.player} />
          </div>

          {/* Status */}
          <StatusBar status={status} variant="compact" />

          {/* Controls */}
          <div className="space-y-2.5">
            <MoveInput
              onSubmitMove={(move) => submitSanMove(move)}
              disabled={isSolved}
              errorMessage={error}
              variant="compact"
            />

            <div className="grid grid-cols-2 gap-2">
              <Button
                type="button"
                variant="outline"
                className="h-9 w-full border border-border/50 bg-card text-xs text-muted-foreground hover:bg-secondary hover:text-foreground"
                onClick={advanceHint}
                disabled={isSolved || hintStage === 2}
              >
                <Lightbulb size={13} className="mr-1" />{hintButtonLabel}
              </Button>

              {isSolved ? (
                <Button
                  type="button"
                  className="h-9 w-full bg-primary text-xs text-primary-foreground hover:bg-primary/90"
                  onClick={() => { setIsManualBoardReveal(false); loadNextPuzzle(); }}
                >
                  <RotateCcw size={13} className="mr-1" />Next Puzzle
                </Button>
              ) : (
                renderRevealButton('h-9 w-full border border-border/50 bg-card text-xs text-muted-foreground hover:bg-secondary hover:text-foreground')
              )}
            </div>

            {isSolved && (
              <Button
                type="button"
                variant="outline"
                className="h-9 w-full border border-border/50 bg-card text-xs text-muted-foreground hover:bg-secondary hover:text-foreground"
                onClick={() => { setIsManualBoardReveal(false); exitToConfig(); }}
              >
                <Settings size={13} className="mr-1" />New Config
              </Button>
            )}
          </div>

          {/* Move history */}
          {showMoveHistory && (
            <MoveList
              moves={moves}
              startingTurnColor={moveHistoryStartingTurnColor}
            />
          )}
        </div>
      );
    }

    // Config state
    return (
      <PuzzleConfigPanel
        config={config}
        themeOptions={curatedPuzzleThemeOptions}
        matchingPuzzleCount={previewPoolSize}
        errorMessage={configError}
        statusMessage={puzzleConfigStatusMessage}
        isStartDisabled={isConfigLoading || Boolean(configError) || !previewPuzzle}
        onConfigChange={updateConfig}
        onStart={() => { setIsManualBoardReveal(false); startSession(); }}
        className="h-full"
      />
    );
  };

  const renderMobilePanel = () => {
    if (isSessionActive) {
      return (
        <div className="space-y-3">
          <StatusBar status={status} variant="compact" condensed />

          <MoveInput
            onSubmitMove={(move) => submitSanMove(move)}
            disabled={isSolved}
            errorMessage={error}
            variant="compact"
          />

          <div className="grid grid-cols-2 gap-2">
            <Button
              type="button"
              variant="outline"
              className="h-9 w-full border border-border/50 bg-card text-xs text-muted-foreground hover:bg-secondary hover:text-foreground"
              onClick={advanceHint}
              disabled={isSolved || hintStage === 2}
            >
              <Lightbulb size={13} className="mr-1" />{hintButtonLabel}
            </Button>

            {isSolved ? (
              <Button
                type="button"
                className="h-9 w-full bg-primary text-xs text-primary-foreground hover:bg-primary/90"
                onClick={() => { setIsManualBoardReveal(false); loadNextPuzzle(); }}
              >
                <RotateCcw size={13} className="mr-1" />Next Puzzle
              </Button>
            ) : (
              renderRevealButton('h-9 w-full border border-border/50 bg-card text-xs text-muted-foreground hover:bg-secondary hover:text-foreground')
            )}
          </div>

          {isSolved && (
            <Button
              type="button"
              variant="outline"
              className="h-9 w-full border border-border/50 bg-card text-xs text-muted-foreground hover:bg-secondary hover:text-foreground"
              onClick={() => { setIsManualBoardReveal(false); exitToConfig(); }}
            >
              <Settings size={13} className="mr-1" />New Config
            </Button>
          )}

          {showMoveHistory && (
            <MoveList moves={moves} startingTurnColor={moveHistoryStartingTurnColor} />
          )}
        </div>
      );
    }

    // Config state
    return (
      <PuzzleConfigPanel
        config={config}
        themeOptions={curatedPuzzleThemeOptions}
        matchingPuzzleCount={previewPoolSize}
        errorMessage={configError}
        statusMessage={puzzleConfigStatusMessage}
        isStartDisabled={isConfigLoading || Boolean(configError) || !previewPuzzle}
        onConfigChange={updateConfig}
        onStart={() => { setIsManualBoardReveal(false); startSession(); }}
      />
    );
  };

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
        <div className="mx-auto w-full max-w-xl grid grid-cols-1 gap-4 md:max-w-2xl lg:max-w-7xl lg:h-[calc(100vh-2rem)] lg:my-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] lg:items-center lg:gap-5 xl:gap-8">
          <div className="flex items-center justify-center">
            <div className="w-full max-w-sm md:max-w-md lg:max-w-[min(75vh,700px)] xl:max-w-[min(80vh,780px)]">
              {renderBoardOrPlaceholder(isSessionActive)}
            </div>
          </div>
          <div className="lg:self-stretch">
            {isSessionActive ? renderDesktopPanel() : renderMobilePanel()}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Puzzles;
