import { useEffect, useState } from 'react';
import { Chess } from 'chess.js';
import { useGameState } from '@/hooks/useGameState';
import { getEngineMove } from '@/lib/chessEngine/getEngineMove';
import { BlindfoldBoard } from '@/components/BlindfoldBoard';
import { MoveInput } from '@/components/MoveInput';
import { MoveList } from '@/components/MoveList';
import { StatusBar } from '@/components/StatusBar';
import { GameConfigPanel } from '@/components/GameConfigPanel';
import { useToast } from '@/hooks/use-toast';
import { runEngineSelfTest } from '@/lib/chessEngine/engineDiagnostics';
import { runEngineDebug } from '@/lib/chessEngine/engineDebug';
import SeoHead from '@/components/SeoHead';
import { Button } from '@/components/ui/button';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import pawnsPlayingImage from '../../Visual/BBpawnsplaying2.png';
import emptyBoardIcon from '../../Visual/emptyboard3.png';
import profileIcon from '../../Visual/Brownprofile.png';
import whitePawnLogo from '../../Visual/Whitepawn.png';

const SEO_TITLE = 'Blindfold Chess Trainer - Practice Chess Visualization';
const SEO_DESCRIPTION = 'Train your chess visualization skills by playing with limited board visibility. Improve your blindfold chess abilities against an AI opponent.';
const SEO_CANONICAL_URL = 'https://blindchess.org/';
const SEO_OG_IMAGE = 'https://blindchess.org/BBpawn.png';
const CHESS_COM_ANALYSIS_URL = 'https://www.chess.com/analysis';
const LICHESS_PASTE_URL = 'https://lichess.org/paste';
const MAX_CHESS_COM_URL_LENGTH = 7000;
const EXPORT_BUTTON_CLASSNAME = 'h-10 w-full border-2 border-zinc-700 bg-white text-zinc-900 hover:bg-zinc-50';
const SIDEBAR_ICON_BUTTON_CLASSNAME = 'h-auto justify-start border-0 bg-transparent px-0 py-1 text-white shadow-none hover:bg-transparent md:w-full';
const SIDEBAR_ICON_SLOT_CLASSNAME = 'flex h-9 w-9 shrink-0 items-center justify-center';

type GameConfigState = {
  gameConfig?: {
    playerColor: 'white' | 'black';
    engineElo: number;
    revealEvery: number;
    allowCheats: boolean;
    hideMoveHistory: boolean;
  };
};

const Index = () => {
  const { gameState, startNewGame, resetGame, makeMove, makeMoveUci, shouldShowBoard, getGameStatus, getCurrentState, getPgn } = useGameState();
  const [isEngineThinking, setIsEngineThinking] = useState(false);
  const [moveError, setMoveError] = useState<string>('');
  const [isManualBoardReveal, setIsManualBoardReveal] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();

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

  const handleStartGame = async (
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
  };

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
  }, [location.state, gameState, navigate]);

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

  return (
    <div className="min-h-screen bg-white md:flex">
      <SeoHead
        title={SEO_TITLE}
        description={SEO_DESCRIPTION}
        canonicalUrl={SEO_CANONICAL_URL}
        ogImage={SEO_OG_IMAGE}
      />
      <div className="mx-4 mt-4 w-auto rounded-2xl bg-[#d9b99b] p-4 md:mb-4 md:mr-0 md:h-[calc(100vh-2rem)] md:w-44 md:shrink-0">
        <div className="flex items-center justify-between md:h-full md:flex-col md:items-stretch md:justify-start">
            <Link to="/" onClick={handleLogoClick} className="md:self-center">
              <img
              src={whitePawnLogo}
              alt="White pawn logo"
              className="h-14 w-14 object-contain md:h-20 md:w-20"
              />
            </Link>
          <div className="flex gap-2 md:mt-4 md:flex-col">
            <Button asChild type="button" className={SIDEBAR_ICON_BUTTON_CLASSNAME}>
              <Link to="/account" className="flex items-center justify-start gap-3">
                <span className={SIDEBAR_ICON_SLOT_CLASSNAME}>
                  <img src={profileIcon} alt="" aria-hidden="true" className="h-9 w-9 object-contain" />
                </span>
                <span className="text-lg font-bold">Account</span>
              </Link>
            </Button>
            <Button asChild type="button" className={SIDEBAR_ICON_BUTTON_CLASSNAME}>
              <Link to="/games" className="flex items-center justify-start gap-3">
                <span className={SIDEBAR_ICON_SLOT_CLASSNAME}>
                  <img src={emptyBoardIcon} alt="" aria-hidden="true" className="h-9 w-9 object-contain" />
                </span>
                <span className="text-lg font-bold">Games</span>
              </Link>
            </Button>
            <Button asChild type="button" className="md:w-full">
              <Link to="/about">Puzzles</Link>
            </Button>
            <Button asChild type="button" className="md:w-full">
              <Link to="/about">Openings</Link>
            </Button>
            <Button asChild type="button" className="md:w-full">
              <Link to="/about">About</Link>
            </Button>
          </div>
          <div className="flex gap-2 md:mt-auto md:flex-col">
            <Button asChild type="button" className="md:w-full">
              <Link to="/login">Log In</Link>
            </Button>
          </div>
        </div>
      </div>

      <div className="mx-auto w-full px-4 py-8 md:flex-1">
        {gameState ? (
          <div className="mx-auto grid max-w-[1800px] grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_280px] xl:grid-cols-[minmax(0,1fr)_300px]">
            <div className="flex flex-col items-center justify-start space-y-4">
              <BlindfoldBoard
                fen={gameState.fen}
                isVisible={isBoardVisible}
                isInteractive={isPlayerTurn}
                onMove={handleBoardMove}
              />
            </div>

            <div className="w-full space-y-4 lg:justify-self-end lg:origin-top lg:scale-[0.95]">
              {gameState.isOver ? (
                <>
                  <div className="rounded-md border-2 border-[#8B4513] bg-card p-2">
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                      <Button
                        type="button"
                        variant="outline"
                        className="h-10 w-full border-zinc-700 bg-white text-zinc-900 hover:bg-zinc-50"
                        onClick={handlePlayWithNewConfig}
                      >
                        New Config
                      </Button>
                      <Button
                        type="button"
                        className="h-10 w-full bg-emerald-600 text-white hover:bg-emerald-700"
                        onClick={() => void handlePlayAgainWithSameRules()}
                      >
                        Play Again
                      </Button>
                    </div>
                  </div>
                  <div className="rounded-md border-2 border-[#8B4513] bg-card p-2">
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
                  </div>
                  <MoveList moves={gameState.moves} />
                  <StatusBar
                    status={getGameStatus()}
                    result={gameState.result}
                  />
                </>
              ) : (
                <>
                  <MoveInput
                    onSubmitMove={handlePlayerMove}
                    disabled={!isPlayerTurn}
                    errorMessage={moveError}
                  />
                  {!gameState.hideMoveHistory && <MoveList moves={gameState.moves} />}
                  {gameState.allowCheats && (
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
                  <StatusBar
                    status={getGameStatus()}
                    result={gameState.result}
                  />
                </>
              )}
            </div>
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
