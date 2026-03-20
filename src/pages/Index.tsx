import { useCallback, useEffect, useRef, useState } from 'react';
import { Chess } from 'chess.js';
import { useGameState, type GameState } from '@/hooks/useGameState';
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
import { getMaterialCountsFromFen, type MaterialCountByColor } from '@/lib/chess/material';
import SeoHead from '@/components/SeoHead';
import { Button } from '@/components/ui/button';
import { useLocation, useNavigate } from 'react-router-dom';
import { AppSidebar } from '@/components/AppSidebar';
import { useDesktopFitLayout } from '@/hooks/useDesktopFitLayout';
import { useDesktopGameLayout } from '@/hooks/useDesktopGameLayout';
import computerIcon from '../../Visual/robohead.png';
import playerIcon from '../../Visual/BBpawn.png';
import pawnsPlayingImage from '../../Visual/BBpawnsplaying2.png';

const SEO_TITLE = 'Blindfold Chess Trainer - Practice Chess Visualization';
const SEO_DESCRIPTION = 'Train your chess visualization skills by playing with limited board visibility. Improve your blindfold chess abilities against an AI opponent.';
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
  gameConfig?: {
    playerColor: 'white' | 'black';
    engineElo: number;
    revealEvery: number;
    allowCheats: boolean;
    hideMoveHistory: boolean;
  };
};

type TrainerParticipantRole = 'computer' | 'player';

const getOpposingColor = (color: 'white' | 'black'): 'white' | 'black' => (
  color === 'white' ? 'black' : 'white'
);

const getParticipantPieceColor = (
  gameState: GameState,
  role: TrainerParticipantRole,
): 'white' | 'black' => (
  role === 'player' ? gameState.playerColor : getOpposingColor(gameState.playerColor)
);

const buildParticipantSummary = (
  gameState: GameState,
  role: TrainerParticipantRole,
  materialCounts: MaterialCountByColor,
): ParticipantSummaryCardModel => {
  const pieceColor = getParticipantPieceColor(gameState, role);
  const opposingColor = getOpposingColor(pieceColor);
  const material = materialCounts[pieceColor];
  const opposingMaterial = materialCounts[opposingColor];

  return {
    label: role === 'computer' ? 'Computer' : 'Player',
    pieceColor,
    material,
    materialAdvantage: Math.max(material - opposingMaterial, 0),
    isToMove: !gameState.isOver && gameState.turnColor === pieceColor,
    iconSrc: role === 'computer' ? computerIcon : playerIcon,
    iconAlt: role === 'computer' ? 'Computer icon' : 'Player icon',
  };
};

const getParticipantSummaries = (gameState: GameState) => {
  const materialCounts = getMaterialCountsFromFen(gameState.fen);

  return {
    computer: buildParticipantSummary(gameState, 'computer', materialCounts),
    player: buildParticipantSummary(gameState, 'player', materialCounts),
  };
};

const Index = () => {
  const { gameState, startNewGame, resetGame, makeMove, makeMoveUci, shouldShowBoard, getGameStatus, getCurrentState, getPgn } = useGameState();
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

  useEffect(() => {
    if (!hasActiveGame) {
      setDesktopLeftSectionHeight(null);
      return;
    }

    const leftSectionNode = desktopLeftSectionRef.current;
    if (!leftSectionNode) return;

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
  }, [getCurrentState, makeMoveUci, toast]);

  const handleStartGame = useCallback(async (
    playerColor: 'white' | 'black',
    engineElo: number,
    revealEvery: number,
    allowCheats: boolean,
    hideMoveHistory: boolean
  ) => {
    setMoveError('');
    setIsManualBoardReveal(false);
    startNewGame(playerColor, engineElo, revealEvery, allowCheats, hideMoveHistory);

    // If player chose black, engine moves first
    if (playerColor === 'black') {
      await handleEngineMove();
    }
  }, [handleEngineMove, startNewGame]);

  useEffect(() => {
    const routeState = location.state as GameConfigState | null;
    const incomingConfig = routeState?.gameConfig;
    if (!incomingConfig || gameState) return;

    void handleStartGame(
      incomingConfig.playerColor,
      incomingConfig.engineElo,
      incomingConfig.revealEvery,
      incomingConfig.allowCheats,
      incomingConfig.hideMoveHistory ?? false
    );
    navigate('/', { replace: true, state: null });
  }, [location.state, gameState, navigate, handleStartGame]);

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
    if (!pgn) return;

    const encoded = encodeURIComponent(pgn);
    const url = `${CHESS_COM_ANALYSIS_URL}?pgn=${encoded}`;

    if (url.length <= MAX_CHESS_COM_URL_LENGTH) {
      window.open(url, '_blank', 'noopener,noreferrer');
      return;
    }

    try {
      const copied = await copyTextToClipboard(pgn);
      if (!copied) throw new Error('Clipboard copy failed');
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
    if (!pgn) return;

    try {
      const copied = await copyTextToClipboard(pgn);
      if (!copied) throw new Error('Clipboard copy failed');
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
    if (!pgn) return;

    try {
      const copied = await copyTextToClipboard(pgn);
      if (!copied) throw new Error('Clipboard copy failed');
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
    if (!pgn) return;

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
    if (!gameState) return;

    await handleStartGame(
      gameState.playerColor,
      gameState.engineElo,
      gameState.revealEvery,
      gameState.allowCheats,
      gameState.hideMoveHistory
    );
  };

  const handlePlayWithNewConfig = () => {
    setMoveError('');
    setIsManualBoardReveal(false);
    setIsEngineThinking(false);
    resetGame();
    navigate('/configure');
  };

  const statusText = gameState ? getGameStatus() : '';
  const participantSummaries = gameState ? getParticipantSummaries(gameState) : null;
  const showDesktopMoveHistory = Boolean(gameState && (gameState.isOver || !gameState.hideMoveHistory));

  const renderRevealButton = (className: string) => {
    if (!gameState || gameState.isOver || !gameState.allowCheats) return null;

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
    if (!gameState) return null;

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
        <StatusBar status={statusText} />
        <MoveInput
          onSubmitMove={handlePlayerMove}
          disabled={!isPlayerTurn}
          errorMessage={moveError}
        />
        {!gameState.hideMoveHistory && <MoveList moves={gameState.moves} />}
        {renderRevealButton('w-full border-2 border-[#d9b99b] bg-card text-card-foreground hover:bg-card')}
      </>
    );
  };

  const renderDesktopTrainerShell = () => {
    if (!gameState || !participantSummaries) return null;

    return (
      <div
        className={`h-full grid grid-rows-[auto_minmax(0,1fr)_auto] ${desktopShellGapClass}`}
        style={{ height: `${desktopLayout.rightColumnHeight}px` }}
      >
        <ParticipantSummaryCard participant={participantSummaries.computer} />

        <div
          className={`grid w-full self-center ${desktopShellGapClass} ${showDesktopMoveHistory ? '' : 'grid-cols-1'}`}
          style={showDesktopMoveHistory ? { gridTemplateColumns: `minmax(0,1fr) ${desktopHistoryWidth}px` } : undefined}
        >
          <div ref={desktopLeftSectionRef} className={`flex min-h-0 flex-col self-start ${desktopShellGapClass}`}>
            <StatusBar status={statusText} variant="compact" />

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
                  disabled={!isPlayerTurn}
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

        <ParticipantSummaryCard participant={participantSummaries.player} />
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
                        isVisible={isBoardVisible}
                        isInteractive={isPlayerTurn}
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
                      isVisible={isBoardVisible}
                      isInteractive={isPlayerTurn}
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
                  onStartGame={(playerColor, engineElo, revealEvery, allowCheats, hideMoveHistory) => {
                    void handleStartGame(playerColor, engineElo, revealEvery, allowCheats, hideMoveHistory);
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
