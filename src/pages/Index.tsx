import { useCallback, useEffect, useRef, useState } from 'react';
import { Chess } from 'chess.js';
import { useGameState } from '@/hooks/useGameState';
import { getEngineMove } from '@/lib/chessEngine/getEngineMove';
import { BlindfoldBoard } from '@/components/BlindfoldBoard';
import { MoveInput } from '@/components/MoveInput';
import { MoveList } from '@/components/MoveList';
import { StatusBar } from '@/components/StatusBar';
import { ParticipantSummaryCard, type ParticipantSummaryCardModel } from '@/components/ParticipantSummaryCard';
import { GameConfigPanel } from '@/components/GameConfigPanel';
import { useToast } from '@/hooks/use-toast';
import { runEngineSelfTest } from '@/lib/chessEngine/engineDiagnostics';
import { runEngineDebug } from '@/lib/chessEngine/engineDebug';
import { getCapturedPiecesByColorFromFen, type CapturedPiecesByColor } from '@/lib/chess/material';
import {
  getBoardPerspective,
  getGameConfigFromState,
  shouldComputerAct,
  type GameConfig,
  type GameMode,
  type GameState,
  type PieceColor,
} from '@/lib/gameSession';
import SeoHead from '@/components/SeoHead';
import { Button } from '@/components/ui/button';
import { useLocation, useNavigate } from 'react-router-dom';
import { AppSidebar } from '@/components/AppSidebar';
import { useDesktopFitLayout } from '@/hooks/useDesktopFitLayout';
import { useDesktopGameLayout } from '@/hooks/useDesktopGameLayout';
import computerIcon from '../../Visual/robohead.png';
import playerIcon from '../../Visual/BBpawn.png';
import whitePlayerIcon from '../../Visual/Whitepawn.png';
import blackPlayerIcon from '../../Visual/Blackpawn.png';
import pawnsPlayingImage from '../../Visual/BBpawnsplaying2.png';

const SEO_TITLE = 'Blindfold Chess Trainer - Practice Chess Visualization';
const SEO_DESCRIPTION = 'Train your chess visualization skills against the computer or another player locally with limited board visibility.';
const SEO_CANONICAL_URL = 'https://blindchess.org/';
const SEO_OG_IMAGE = 'https://blindchess.org/BBpawn.png';
const CHESS_COM_ANALYSIS_URL = 'https://www.chess.com/analysis';
const LICHESS_PASTE_URL = 'https://lichess.org/paste';
const MAX_CHESS_COM_URL_LENGTH = 7000;
const EXPORT_BUTTON_CLASSNAME = 'h-10 w-full border-2 border-[#d9b99b] bg-white text-zinc-900 hover:bg-zinc-50';
const DESKTOP_BOARD_SIZE = 760;
const DESKTOP_RIGHT_COLUMN_WIDTH = 441;
const DESKTOP_LAYOUT_GAP = 32;

type GameConfigState = {
  gameConfig?: GameConfig;
};

type ParticipantDescriptor = {
  label: string;
  pieceColor: PieceColor;
  iconSrc: string;
  iconAlt: string;
};

const getOpposingColor = (color: PieceColor): PieceColor => (
  color === 'white' ? 'black' : 'white'
);

const buildParticipantSummary = (
  gameState: GameState,
  participant: ParticipantDescriptor,
  capturedPiecesByColor: CapturedPiecesByColor,
): ParticipantSummaryCardModel => ({
  label: participant.label,
  pieceColor: participant.pieceColor,
  capturedPieces: capturedPiecesByColor[participant.pieceColor],
  isToMove: !gameState.isOver && gameState.turnColor === participant.pieceColor,
  iconSrc: participant.iconSrc,
  iconAlt: participant.iconAlt,
});

const getPassNPlayIcon = (pieceColor: PieceColor) => (
  pieceColor === 'white' ? whitePlayerIcon : blackPlayerIcon
);

const getParticipantSummaries = (gameState: GameState) => {
  const capturedPiecesByColor = getCapturedPiecesByColorFromFen(gameState.fen);

  if (gameState.mode === 'computer') {
    const computerColor = getOpposingColor(gameState.playerColor);

    return {
      top: buildParticipantSummary(gameState, {
        label: 'Computer',
        pieceColor: computerColor,
        iconSrc: computerIcon,
        iconAlt: 'Computer icon',
      }, capturedPiecesByColor),
      bottom: buildParticipantSummary(gameState, {
        label: 'Player',
        pieceColor: gameState.playerColor,
        iconSrc: playerIcon,
        iconAlt: 'Player icon',
      }, capturedPiecesByColor),
    };
  }

  const bottomColor = getBoardPerspective(gameState);
  const topColor = getOpposingColor(bottomColor);

  return {
    top: buildParticipantSummary(gameState, {
      label: topColor === 'white' ? 'White' : 'Black',
      pieceColor: topColor,
      iconSrc: getPassNPlayIcon(topColor),
      iconAlt: `${topColor === 'white' ? 'White' : 'Black'} player icon`,
    }, capturedPiecesByColor),
    bottom: buildParticipantSummary(gameState, {
      label: bottomColor === 'white' ? 'White' : 'Black',
      pieceColor: bottomColor,
      iconSrc: getPassNPlayIcon(bottomColor),
      iconAlt: `${bottomColor === 'white' ? 'White' : 'Black'} player icon`,
    }, capturedPiecesByColor),
  };
};

const Index = () => {
  const {
    gameState,
    startNewGame,
    resetGame,
    makeMove,
    makeMoveUci,
    shouldShowBoard,
    getGameStatus,
    getCurrentState,
    getPgn,
  } = useGameState();
  const [selectedGameMode, setSelectedGameMode] = useState<GameMode>('computer');
  const [isEngineThinking, setIsEngineThinking] = useState(false);
  const [moveError, setMoveError] = useState<string>('');
  const [isManualBoardReveal, setIsManualBoardReveal] = useState(false);
  const [desktopLeftSectionHeight, setDesktopLeftSectionHeight] = useState<number | null>(null);
  const desktopLeftSectionRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const hasActiveGame = Boolean(gameState);
  const showDesktopGameLayout = useDesktopGameLayout();
  const { containerRef: desktopFitRef, layout: desktopLayout } = useDesktopFitLayout({
    enabled: showDesktopGameLayout,
    baseBoardSize: DESKTOP_BOARD_SIZE,
    baseRightColumnWidth: DESKTOP_RIGHT_COLUMN_WIDTH,
    baseGap: DESKTOP_LAYOUT_GAP,
  });
  const desktopHistoryWidth = Math.max(170, Math.round(desktopLayout.rightColumnWidth * 0.43));
  const desktopShellGapClass = desktopLayout.scale < 0.88 ? 'gap-3' : 'gap-3.5';

  useEffect(() => {
    if (import.meta.env.DEV) {
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

  useEffect(() => {
    if (!hasActiveGame) {
      setDesktopLeftSectionHeight(null);
      return;
    }

    const leftSectionNode = desktopLeftSectionRef.current;
    if (!leftSectionNode) {
      return;
    }

    const updateLeftSectionHeight = () => {
      setDesktopLeftSectionHeight(leftSectionNode.offsetHeight);
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
  }, [hasActiveGame]);

  const handleEngineMove = useCallback(async () => {
    const snapshot = getCurrentState();

    if (!shouldComputerAct(snapshot)) {
      return;
    }

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
  }, [getCurrentState, makeMoveUci, toast]);

  const handleStartGame = useCallback(async (config: GameConfig) => {
    setMoveError('');
    setIsManualBoardReveal(false);
    setIsEngineThinking(false);
    setSelectedGameMode(config.mode);

    const initialState = startNewGame(config);

    if (shouldComputerAct(initialState)) {
      await handleEngineMove();
    }
  }, [handleEngineMove, startNewGame]);

  useEffect(() => {
    const routeState = location.state as GameConfigState | null;
    const incomingConfig = routeState?.gameConfig;

    if (!incomingConfig || gameState) {
      return;
    }

    void handleStartGame(incomingConfig);
    navigate('/', { replace: true, state: null });
  }, [location.state, gameState, navigate, handleStartGame]);

  const queueComputerReply = useCallback(() => {
    window.setTimeout(async () => {
      const snapshot = getCurrentState();

      if (shouldComputerAct(snapshot)) {
        await handleEngineMove();
      }
    }, 100);
  }, [getCurrentState, handleEngineMove]);

  const handlePlayerMove = async (moveStr: string) => {
    if (!gameState || isEngineThinking || gameState.isOver || shouldComputerAct(gameState)) {
      return;
    }

    setMoveError('');
    const result = makeMove(moveStr);

    if (!result.success) {
      setMoveError(result.error || 'Invalid move');
      return;
    }

    queueComputerReply();
  };

  const handleBoardMove = async (from: string, to: string): Promise<boolean> => {
    if (!gameState || isEngineThinking || gameState.isOver || shouldComputerAct(gameState)) {
      return false;
    }

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
    const success = makeMoveUci(uciMove, {
      countPlayerMove: gameState.mode === 'computer',
    });

    if (!success) {
      setMoveError('Invalid move');
      return false;
    }

    queueComputerReply();
    return true;
  };

  const isHumanTurn = Boolean(
    gameState &&
    !gameState.isOver &&
    !isEngineThinking &&
    !shouldComputerAct(gameState)
  );
  const boardPerspective = gameState ? getBoardPerspective(gameState) : 'white';
  const isBoardVisible = Boolean(gameState && (shouldShowBoard() || isManualBoardReveal));

  const handleLogoClick = () => {
    setMoveError('');
    setIsManualBoardReveal(false);
    setIsEngineThinking(false);
    resetGame();
  };

  const getValidatedPgn = (): string | null => {
    const pgn = getPgn().trim();

    if (!pgn) {
      toast({
        title: 'Export failed',
        description: 'No PGN is available for the current game.',
        variant: 'destructive',
      });
      return null;
    }

    return pgn;
  };

  const copyTextToClipboard = async (text: string): Promise<boolean> => {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }

    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.setAttribute('readonly', '');
    textArea.style.position = 'fixed';
    textArea.style.opacity = '0';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    const copied = document.execCommand('copy');
    document.body.removeChild(textArea);

    return copied;
  };

  const handleAnalyzeOnChessCom = async () => {
    const pgn = getValidatedPgn();

    if (!pgn) {
      return;
    }

    const encoded = encodeURIComponent(pgn);
    const url = `${CHESS_COM_ANALYSIS_URL}?pgn=${encoded}`;

    if (url.length <= MAX_CHESS_COM_URL_LENGTH) {
      window.open(url, '_blank', 'noopener,noreferrer');
      return;
    }

    try {
      const copied = await copyTextToClipboard(pgn);

      if (!copied) {
        throw new Error('Clipboard copy failed');
      }
    } catch {
      toast({
        title: 'Export failed',
        description: 'Could not copy PGN to clipboard automatically.',
        variant: 'destructive',
      });
      return;
    }

    window.open(CHESS_COM_ANALYSIS_URL, '_blank', 'noopener,noreferrer');
    toast({
      title: 'PGN copied',
      description: "PGN copied. On Chess.com click 'Load From FEN/PGN(s)' and paste, then Load.",
    });
  };

  const handleCopyPgn = async () => {
    const pgn = getValidatedPgn();

    if (!pgn) {
      return;
    }

    try {
      const copied = await copyTextToClipboard(pgn);

      if (!copied) {
        throw new Error('Clipboard copy failed');
      }

      toast({
        title: 'PGN copied',
        description: 'Game PGN copied to clipboard.',
      });
    } catch {
      toast({
        title: 'Copy failed',
        description: 'Could not copy PGN to clipboard.',
        variant: 'destructive',
      });
    }
  };

  const handleAnalyzeOnLichess = async () => {
    const pgn = getValidatedPgn();

    if (!pgn) {
      return;
    }

    try {
      const copied = await copyTextToClipboard(pgn);

      if (!copied) {
        throw new Error('Clipboard copy failed');
      }
    } catch {
      toast({
        title: 'Export failed',
        description: 'Could not copy PGN to clipboard automatically.',
        variant: 'destructive',
      });
      return;
    }

    window.open(LICHESS_PASTE_URL, '_blank', 'noopener,noreferrer');
    toast({
      title: 'PGN copied',
      description: 'PGN copied. Paste it into Lichess and click Import.',
    });
  };

  const handleDownloadPgn = () => {
    const pgn = getValidatedPgn();

    if (!pgn) {
      return;
    }

    const blob = new Blob([pgn], { type: 'application/x-chess-pgn;charset=utf-8' });
    const objectUrl = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = objectUrl;
    anchor.download = 'game.pgn';
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(objectUrl);
  };

  const handlePlayAgainWithSameRules = async () => {
    if (!gameState) {
      return;
    }

    await handleStartGame(getGameConfigFromState(gameState));
  };

  const handlePlayWithNewConfig = () => {
    if (!gameState) {
      return;
    }

    setMoveError('');
    setIsManualBoardReveal(false);
    setIsEngineThinking(false);
    resetGame();

    if (gameState.mode === 'computer') {
      navigate('/configure');
      return;
    }

    navigate('/', { state: null });
  };

  const statusText = gameState ? getGameStatus() : '';
  const participantSummaries = gameState ? getParticipantSummaries(gameState) : null;
  const shouldShowStatusBar = Boolean(gameState && (gameState.mode === 'computer' || gameState.isOver));
  const showDesktopMoveHistory = Boolean(gameState && (gameState.isOver || !gameState.hideMoveHistory));

  const renderRevealButton = (className: string) => {
    if (!gameState || gameState.isOver || !gameState.allowCheats) {
      return null;
    }

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

  const renderLegacyTrainerPanel = () => {
    if (!gameState) {
      return null;
    }

    if (gameState.isOver) {
      return (
        <>
          <div className="rounded-md border-2 border-[#d9b99b] bg-card p-3 text-center text-lg font-semibold text-[#8B4513]">
            <p>{statusText}</p>
          </div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <Button
              type="button"
              variant="outline"
              className="h-10 w-full border-2 border-[#d9b99b] bg-white text-zinc-900 hover:bg-zinc-50"
              onClick={handlePlayWithNewConfig}
            >
              New Config
            </Button>
            <Button
              type="button"
              className="h-10 w-full bg-[#8B4513] text-white hover:bg-[#8B4513]/90"
              onClick={() => void handlePlayAgainWithSameRules()}
            >
              Play Again
            </Button>
          </div>
          <div className="space-y-2">
            <Button
              type="button"
              variant="outline"
              className={EXPORT_BUTTON_CLASSNAME}
              onClick={() => void handleAnalyzeOnChessCom()}
            >
              Analyze on Chess.com
            </Button>
            <Button
              type="button"
              variant="outline"
              className={EXPORT_BUTTON_CLASSNAME}
              onClick={() => void handleAnalyzeOnLichess()}
            >
              Copy to Clipboard & Open Lichess
            </Button>
            <Button
              type="button"
              variant="outline"
              className={EXPORT_BUTTON_CLASSNAME}
              onClick={() => void handleCopyPgn()}
            >
              Copy PGN
            </Button>
            <Button
              type="button"
              variant="outline"
              className={EXPORT_BUTTON_CLASSNAME}
              onClick={handleDownloadPgn}
            >
              Download PGN
            </Button>
          </div>
          <MoveList moves={gameState.moves} />
        </>
      );
    }

    return (
      <>
        {shouldShowStatusBar && <StatusBar status={statusText} />}
        <MoveInput
          onSubmitMove={handlePlayerMove}
          disabled={!isHumanTurn}
          errorMessage={moveError}
        />
        {!gameState.hideMoveHistory && <MoveList moves={gameState.moves} />}
        {renderRevealButton('w-full border-2 border-[#d9b99b] bg-card text-card-foreground hover:bg-card')}
      </>
    );
  };

  const renderDesktopTrainerShell = () => {
    if (!gameState || !participantSummaries) {
      return null;
    }

    return (
      <div
        className={`h-full grid grid-rows-[auto_minmax(0,1fr)_auto] ${desktopShellGapClass}`}
        style={{ height: `${desktopLayout.rightColumnHeight}px` }}
      >
        <ParticipantSummaryCard participant={participantSummaries.top} />

        <div
          className={`grid w-full self-center ${desktopShellGapClass} ${showDesktopMoveHistory ? '' : 'grid-cols-1'}`}
          style={showDesktopMoveHistory ? { gridTemplateColumns: `minmax(0,1fr) ${desktopHistoryWidth}px` } : undefined}
        >
          <div ref={desktopLeftSectionRef} className={`flex min-h-0 flex-col self-start ${desktopShellGapClass}`}>
            {shouldShowStatusBar && <StatusBar status={statusText} variant="compact" />}

            {gameState.isOver ? (
              <>
                <div className="grid grid-cols-1 gap-2 2xl:grid-cols-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="h-10 w-full border-2 border-[#d9b99b] bg-white text-zinc-900 hover:bg-zinc-50"
                    onClick={handlePlayWithNewConfig}
                  >
                    New Config
                  </Button>
                  <Button
                    type="button"
                    className="h-10 w-full bg-[#8B4513] text-white hover:bg-[#8B4513]/90"
                    onClick={() => void handlePlayAgainWithSameRules()}
                  >
                    Play Again
                  </Button>
                </div>

                <div className="grid grid-cols-1 gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    className={EXPORT_BUTTON_CLASSNAME}
                    onClick={() => void handleAnalyzeOnChessCom()}
                  >
                    Analyze on Chess.com
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className={EXPORT_BUTTON_CLASSNAME}
                    onClick={() => void handleAnalyzeOnLichess()}
                  >
                    Copy to Clipboard & Open Lichess
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className={EXPORT_BUTTON_CLASSNAME}
                    onClick={() => void handleCopyPgn()}
                  >
                    Copy PGN
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className={EXPORT_BUTTON_CLASSNAME}
                    onClick={handleDownloadPgn}
                  >
                    Download PGN
                  </Button>
                </div>
              </>
            ) : (
              <>
                <MoveInput
                  onSubmitMove={handlePlayerMove}
                  disabled={!isHumanTurn}
                  errorMessage={moveError}
                  variant="compact"
                />

                {renderRevealButton('w-full border-2 border-[#d9b99b] bg-card text-card-foreground hover:bg-card')}
              </>
            )}
          </div>

          {showDesktopMoveHistory && (
            <div
              className="self-start"
              style={desktopLeftSectionHeight ? { height: `${desktopLeftSectionHeight}px` } : undefined}
            >
              <MoveList moves={gameState.moves} className="h-full min-h-0" />
            </div>
          )}
        </div>

        <ParticipantSummaryCard participant={participantSummaries.bottom} />
      </div>
    );
  };

  return (
    <div className={`min-h-screen bg-white ${showDesktopGameLayout ? 'md:flex' : ''}`}>
      <SeoHead
        title={SEO_TITLE}
        description={SEO_DESCRIPTION}
        canonicalUrl={SEO_CANONICAL_URL}
        ogImage={SEO_OG_IMAGE}
      />
      <AppSidebar onHomeClick={handleLogoClick} desktopMode={showDesktopGameLayout} />

      <div className="mx-auto w-full px-4 py-8 md:flex-1">
        {gameState ? (
          <div className={showDesktopGameLayout ? 'h-[calc(100dvh-4rem)]' : ''}>
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
                      <BlindfoldBoard
                        fen={gameState.fen}
                        perspective={boardPerspective}
                        isVisible={isBoardVisible}
                        isInteractive={isHumanTurn}
                        onMove={handleBoardMove}
                        className="w-full"
                      />
                    </div>
                  </div>

                  <div style={{ width: `${desktopLayout.rightColumnWidth}px` }}>
                    {renderDesktopTrainerShell()}
                  </div>
                </div>
              </div>
            ) : (
              <div className="mx-auto grid w-full max-w-[1800px] grid-cols-1 gap-4">
                <div className="flex flex-col items-center justify-start space-y-4">
                  <div className="mx-auto w-full max-w-[560px] md:max-w-[600px] lg:max-w-[min(52vw,760px)]">
                    <BlindfoldBoard
                      fen={gameState.fen}
                      perspective={boardPerspective}
                      isVisible={isBoardVisible}
                      isInteractive={isHumanTurn}
                      onMove={handleBoardMove}
                    />
                  </div>
                </div>

                <div className="w-full space-y-4">
                  {renderLegacyTrainerPanel()}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="flex min-h-[calc(100vh-8rem)] flex-col">
            <div className="pb-6 pt-2 text-center">
              <h1 className="text-5xl font-extrabold tracking-tight text-[#8B4513] md:text-7xl">
                Learn Blindchess
              </h1>
              <p className="mt-2 text-center text-xs text-[#d9b99b] md:text-sm">
                “Calculation is visualization.” - Gary Kasparov
              </p>
            </div>
            <div className="mx-auto grid w-full max-w-6xl flex-1 grid-cols-1 items-center gap-8 lg:grid-cols-2">
              <div className="flex justify-center">
                <img
                  src={pawnsPlayingImage}
                  alt="Pawns playing chess"
                  className="w-full max-w-3xl rounded-lg object-contain"
                />
              </div>
              <div className="mx-auto w-full max-w-lg">
                <GameConfigPanel
                  mode={selectedGameMode}
                  onModeChange={setSelectedGameMode}
                  showModeSelector
                  onStartGame={(config) => {
                    void handleStartGame(config);
                  }}
                  isGameActive={false}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Index;
