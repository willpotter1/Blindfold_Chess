import { useCallback, useEffect, useState } from "react";
import { RotateCcw, Settings, ExternalLink, Copy, Download } from "lucide-react";
import { Chess, type Square } from "chess.js";
import { useGameState, type GameStartSeed } from "@/hooks/useGameState";
import { getEngineMove } from "@/lib/chessEngine/getEngineMove";
import { BlindfoldBoard } from "@/components/BlindfoldBoard";
import { LandingOperaReplay } from "@/components/LandingOperaReplay";
import { RotatingQuote } from "@/components/RotatingQuote";
import { MoveInput } from "@/components/MoveInput";
import { MoveList } from "@/components/MoveList";
import { StatusBar } from "@/components/StatusBar";
import {
  ParticipantSummaryCard,
  type ParticipantSummaryCardModel,
} from "@/components/ParticipantSummaryCard";
import { GameConfigPanel } from "@/components/GameConfigPanel";
import { useToast } from "@/hooks/use-toast";
import { runEngineSelfTest } from "@/lib/chessEngine/engineDiagnostics";
import { runEngineDebug } from "@/lib/chessEngine/engineDebug";
import {
  getCapturedPiecesByColorFromFen,
  type CapturedPiecesByColor,
} from "@/lib/chess/material";
import {
  getBoardPerspective,
  getGameConfigFromState,
  shouldComputerAct,
  type GameConfig,
  type GameMode,
  type GameState,
  type PieceColor,
} from "@/lib/gameSession";
import SeoHead from "@/components/SeoHead";
import { Button } from "@/components/ui/button";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { AppSidebar } from "@/components/AppSidebar";
import { useDesktopGameLayout } from "@/hooks/useDesktopGameLayout";
import { exportPgnToChessCom, exportPgnToLichess } from "@/lib/pgnExport";
import computerIcon from "../../../Visual/robohead.png";
import playerIcon from "../../../Visual/BBpawn.png";
import whitePlayerIcon from "../../../Visual/Whitepawn.png";
import blackPlayerIcon from "../../../Visual/Blackpawn.png";

const SEO_TITLE = "Blindchess.org - Free Blindfold Chess Trainer | Play Blind Chess Online";
const SEO_DESCRIPTION =
  "Train blindfold chess visualization for free. Play blind chess games against AI, configure board visibility, and improve your mental chess skills at blindchess.org.";
const SEO_CANONICAL_URL = "https://blindchess.org/";
const SEO_OG_IMAGE = "https://blindchess.org/circlepawnwb-512.png";
const ICON_BUTTON_CLASS = "h-8 w-full gap-1.5 border border-border/50 bg-card text-[0.7rem] text-muted-foreground hover:bg-secondary hover:text-foreground";

type GameConfigState = {
  gameConfig?: GameConfig;
  gameStartSeed?: GameStartSeed;
};

type ParticipantDescriptor = {
  label: string;
  pieceColor: PieceColor;
  iconSrc: string;
  iconAlt: string;
  materialAdvantage: number;
};

const getOpposingColor = (color: PieceColor): PieceColor =>
  color === "white" ? "black" : "white";

const PIECE_VALUES = {
  q: 9,
  r: 5,
  b: 3,
  n: 3,
  p: 1,
} as const;

const getCapturedMaterialValue = (
  capturedPieces: CapturedPiecesByColor[PieceColor],
) =>
  capturedPieces.reduce((total, piece) => total + PIECE_VALUES[piece.type], 0);

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
  materialAdvantage: participant.materialAdvantage,
});

const getPassNPlayIcon = (pieceColor: PieceColor) =>
  pieceColor === "white" ? whitePlayerIcon : blackPlayerIcon;

const getParticipantSummaries = (gameState: GameState) => {
  const capturedPiecesByColor = getCapturedPiecesByColorFromFen(gameState.fen);
  const whiteCapturedValue = getCapturedMaterialValue(
    capturedPiecesByColor.white,
  );
  const blackCapturedValue = getCapturedMaterialValue(
    capturedPiecesByColor.black,
  );
  const whiteMaterialAdvantage = whiteCapturedValue - blackCapturedValue;
  const blackMaterialAdvantage = blackCapturedValue - whiteCapturedValue;

  if (gameState.mode === "computer") {
    const computerColor = getOpposingColor(gameState.playerColor);

    return {
      top: buildParticipantSummary(
        gameState,
        {
          label: "Computer",
          pieceColor: computerColor,
          iconSrc: computerIcon,
          iconAlt: "Computer icon",
          materialAdvantage:
            computerColor === "white"
              ? whiteMaterialAdvantage
              : blackMaterialAdvantage,
        },
        capturedPiecesByColor,
      ),
      bottom: buildParticipantSummary(
        gameState,
        {
          label: "Player",
          pieceColor: gameState.playerColor,
          iconSrc: playerIcon,
          iconAlt: "Player icon",
          materialAdvantage:
            gameState.playerColor === "white"
              ? whiteMaterialAdvantage
              : blackMaterialAdvantage,
        },
        capturedPiecesByColor,
      ),
    };
  }

  const bottomColor = getBoardPerspective(gameState);
  const topColor = getOpposingColor(bottomColor);

  return {
    top: buildParticipantSummary(
      gameState,
      {
        label: topColor === "white" ? "White" : "Black",
        pieceColor: topColor,
        iconSrc: getPassNPlayIcon(topColor),
        iconAlt: `${topColor === "white" ? "White" : "Black"} player icon`,
        materialAdvantage:
          topColor === "white"
            ? whiteMaterialAdvantage
            : blackMaterialAdvantage,
      },
      capturedPiecesByColor,
    ),
    bottom: buildParticipantSummary(
      gameState,
      {
        label: bottomColor === "white" ? "White" : "Black",
        pieceColor: bottomColor,
        iconSrc: getPassNPlayIcon(bottomColor),
        iconAlt: `${bottomColor === "white" ? "White" : "Black"} player icon`,
        materialAdvantage:
          bottomColor === "white"
            ? whiteMaterialAdvantage
            : blackMaterialAdvantage,
      },
      capturedPiecesByColor,
    ),
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
  const [selectedGameMode, setSelectedGameMode] =
    useState<GameMode>("computer");
  const [isEngineThinking, setIsEngineThinking] = useState(false);
  const [moveError, setMoveError] = useState<string>("");
  const [isManualBoardReveal, setIsManualBoardReveal] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const { sessionId } = useParams<{ sessionId?: string }>();
  const hasActiveGame = Boolean(gameState);
  const showDesktopGameLayout = useDesktopGameLayout();

  useEffect(() => {
    if (sessionId && !gameState) {
      navigate("/", { replace: true });
    }
  }, [sessionId, gameState, navigate]);

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

  // Global spacebar to hold-reveal board
  useEffect(() => {
    if (!gameState || gameState.isOver || !gameState.allowCheats) {
      return;
    }

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
  }, [gameState]);

  const handleEngineMove = useCallback(async () => {
    const snapshot = getCurrentState();

    if (!shouldComputerAct(snapshot)) {
      return;
    }

    setIsEngineThinking(true);

    try {
      const engineMoveUci = await getEngineMove(
        snapshot.fen,
        snapshot.engineElo,
      );
      const success = makeMoveUci(engineMoveUci);

      if (!success) {
        console.error("Failed to make engine move");
        toast({
          title: "Engine Error",
          description: "The engine failed to make a move",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error getting engine move:", error);
      toast({
        title: "Engine Error",
        description: "Failed to get move from chess engine",
        variant: "destructive",
      });
    } finally {
      setIsEngineThinking(false);
    }
  }, [getCurrentState, makeMoveUci, toast]);

  const handleStartGame = useCallback(
    async (
      config: GameConfig,
      seed?: GameStartSeed,
      opts?: { skipNavigate?: boolean },
    ) => {
      setMoveError("");
      setIsManualBoardReveal(false);
      setIsEngineThinking(false);
      setSelectedGameMode(config.mode);

      const initialState = startNewGame(config, seed);

      if (!opts?.skipNavigate) {
        navigate(`/game/${crypto.randomUUID()}`, { replace: true });
      }

      if (shouldComputerAct(initialState)) {
        await handleEngineMove();
      }
    },
    [handleEngineMove, navigate, startNewGame],
  );

  useEffect(() => {
    const routeState = location.state as GameConfigState | null;
    const incomingConfig = routeState?.gameConfig;
    const incomingSeed = routeState?.gameStartSeed;

    if (!incomingConfig || gameState) {
      return;
    }

    void handleStartGame(incomingConfig, incomingSeed, { skipNavigate: true });
    window.history.replaceState(null, "", window.location.pathname);
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
    if (
      !gameState ||
      isEngineThinking ||
      gameState.isOver ||
      shouldComputerAct(gameState)
    ) {
      return;
    }

    setMoveError("");
    const result = makeMove(moveStr);

    if (!result.success) {
      setMoveError(result.error || "Invalid move");
      return;
    }

    queueComputerReply();
  };

  const handleBoardMove = async (
    from: string,
    to: string,
  ): Promise<boolean> => {
    if (
      !gameState ||
      isEngineThinking ||
      gameState.isOver ||
      shouldComputerAct(gameState)
    ) {
      return false;
    }

    setMoveError("");

    const chess = new Chess(gameState.fen);
    const legalFromMoves = chess.moves({ square: from as Square, verbose: true });
    const matchingMoves = legalFromMoves.filter((move) => move.to === to);

    if (matchingMoves.length === 0) {
      setMoveError("Invalid move");
      return false;
    }

    const selectedMove =
      matchingMoves.find((move) => move.promotion === "q") || matchingMoves[0];
    const uciMove = `${selectedMove.from}${selectedMove.to}${selectedMove.promotion ?? ""}`;
    const success = makeMoveUci(uciMove, {
      countPlayerMove: (gameState.mode as string) === "computer",
    });

    if (!success) {
      setMoveError("Invalid move");
      return false;
    }

    queueComputerReply();
    return true;
  };

  const isHumanTurn = Boolean(
    gameState &&
    !gameState.isOver &&
    !isEngineThinking &&
    !shouldComputerAct(gameState),
  );
  const boardPerspective = gameState ? getBoardPerspective(gameState) : "white";
  const isBoardVisible = Boolean(
    gameState && (shouldShowBoard() || isManualBoardReveal),
  );

  const handleLogoClick = () => {
    setMoveError("");
    setIsManualBoardReveal(false);
    setIsEngineThinking(false);
    resetGame();
    navigate("/", { replace: true });
  };

  const getValidatedPgn = (): string | null => {
    const pgn = getPgn().trim();

    if (!pgn) {
      toast({
        title: "Export failed",
        description: "No PGN is available for the current game.",
        variant: "destructive",
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

    const textArea = document.createElement("textarea");
    textArea.value = text;
    textArea.setAttribute("readonly", "");
    textArea.style.position = "fixed";
    textArea.style.opacity = "0";
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    const copied = document.execCommand("copy");
    document.body.removeChild(textArea);

    return copied;
  };

  const handleAnalyzeOnChessCom = async () => {
    await exportPgnToChessCom(getPgn(), toast);
  };

  const handleCopyPgn = async () => {
    const pgn = getValidatedPgn();

    if (!pgn) {
      return;
    }

    try {
      const copied = await copyTextToClipboard(pgn);

      if (!copied) {
        throw new Error("Clipboard copy failed");
      }

      toast({
        title: "PGN copied",
        description: "Game PGN copied to clipboard.",
      });
    } catch {
      toast({
        title: "Copy failed",
        description: "Could not copy PGN to clipboard.",
        variant: "destructive",
      });
    }
  };

  const handleAnalyzeOnLichess = async () => {
    await exportPgnToLichess(getPgn(), toast);
  };

  const handleDownloadPgn = () => {
    const pgn = getValidatedPgn();

    if (!pgn) {
      return;
    }

    const blob = new Blob([pgn], {
      type: "application/x-chess-pgn;charset=utf-8",
    });
    const objectUrl = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = objectUrl;
    anchor.download = "game.pgn";
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

    setMoveError("");
    setIsManualBoardReveal(false);
    setIsEngineThinking(false);
    resetGame();

    if (gameState.mode === "computer") {
      navigate("/configure");
      return;
    }

    navigate("/", { state: null });
  };

  const statusText = gameState ? getGameStatus() : "";
  const participantSummaries = gameState
    ? getParticipantSummaries(gameState)
    : null;
  const shouldShowStatusBar = Boolean(
    gameState && (gameState.mode === "computer" || gameState.isOver),
  );
  const showDesktopMoveHistory = Boolean(
    gameState && (gameState.isOver || !gameState.hideMoveHistory),
  );

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
          if (event.key === " ") {
            event.preventDefault();
            setIsManualBoardReveal(true);
          }
        }}
        onKeyUp={(event) => {
          if (event.key === " ") {
            setIsManualBoardReveal(false);
          }
        }}
        onBlur={() => setIsManualBoardReveal(false)}
      >
        <span>Show Board</span>
        <span className="mx-1.5 text-[0.6rem] text-muted-foreground/40">or press</span>
        <kbd className="rounded border border-border/50 bg-secondary px-1.5 py-0.5 text-[0.6rem] font-mono leading-none text-muted-foreground">
          Space
        </kbd>
      </Button>
    );
  };

  const renderMobileTrainerPanel = () => {
    if (!gameState) {
      return null;
    }

    const canReveal = !gameState.isOver && gameState.allowCheats;

    if (gameState.isOver) {
      return (
        <div className="space-y-3">
          <div className="rounded-xl border border-border/50 bg-card px-4 py-3 text-center text-base font-semibold text-foreground">
            {statusText}
          </div>

          {/* Primary actions */}
          <div className="grid grid-cols-2 gap-2">
            <Button type="button" className="h-10 w-full bg-primary text-sm text-primary-foreground hover:bg-primary/90" onClick={() => void handlePlayAgainWithSameRules()}>
              <RotateCcw size={14} className="mr-1.5" />Play Again
            </Button>
            <Button type="button" variant="outline" className="h-10 w-full border border-border/50 bg-card text-sm text-foreground hover:bg-secondary" onClick={handlePlayWithNewConfig}>
              <Settings size={14} className="mr-1.5" />New Config
            </Button>
          </div>

          {/* Export actions */}
          <div className="rounded-xl border border-border/50 bg-card p-2">
            <p className="mb-1.5 px-1 text-[0.6rem] font-semibold uppercase tracking-[0.15em] text-muted-foreground/50">Analyze</p>
            <div className="grid grid-cols-2 gap-1.5">
              <Button type="button" variant="ghost" className={ICON_BUTTON_CLASS} onClick={() => void handleAnalyzeOnChessCom()}><ExternalLink size={12} />Chess.com</Button>
              <Button type="button" variant="ghost" className={ICON_BUTTON_CLASS} onClick={() => void handleAnalyzeOnLichess()}><ExternalLink size={12} />Lichess</Button>
              <Button type="button" variant="ghost" className={ICON_BUTTON_CLASS} onClick={() => void handleCopyPgn()}><Copy size={12} />Copy PGN</Button>
              <Button type="button" variant="ghost" className={ICON_BUTTON_CLASS} onClick={handleDownloadPgn}><Download size={12} />Download</Button>
            </div>
          </div>

          <MoveList moves={gameState.moves} />
        </div>
      );
    }

    return (
      <div className="space-y-3">
        {shouldShowStatusBar && (
          <StatusBar status={statusText} variant="compact" condensed />
        )}

        <MoveInput
          onSubmitMove={handlePlayerMove}
          disabled={!isHumanTurn}
          errorMessage={moveError}
          variant="compact"
        />

        {canReveal && (
          renderRevealButton(
            "w-full h-9 border border-border/50 bg-card text-xs text-muted-foreground hover:bg-secondary hover:text-foreground",
          )
        )}

        {!gameState.hideMoveHistory && (
          <MoveList moves={gameState.moves} compact />
        )}
      </div>
    );
  };

  const renderDesktopTrainerShell = () => {
    if (!gameState || !participantSummaries) {
      return null;
    }

    const canReveal = !gameState.isOver && gameState.allowCheats;

    return (
      <div className="flex h-full flex-col gap-2.5">
        {/* Opponent + Player side by side */}
        <div className="grid grid-cols-2 gap-2">
          <ParticipantSummaryCard participant={participantSummaries.top} />
          <ParticipantSummaryCard participant={participantSummaries.bottom} />
        </div>

        {/* Status */}
        {shouldShowStatusBar && (
          <StatusBar status={statusText} variant="compact" />
        )}

        {/* Controls */}
        {gameState.isOver ? (
          <div className="space-y-2.5">
            {/* Primary actions */}
            <div className="grid grid-cols-2 gap-2">
              <Button type="button" className="h-9 w-full bg-primary text-sm text-primary-foreground hover:bg-primary/90" onClick={() => void handlePlayAgainWithSameRules()}>
                <RotateCcw size={14} className="mr-1.5" />Play Again
              </Button>
              <Button type="button" variant="outline" className="h-9 w-full border border-border/50 bg-card text-sm text-foreground hover:bg-secondary" onClick={handlePlayWithNewConfig}>
                <Settings size={14} className="mr-1.5" />New Config
              </Button>
            </div>

            {/* Export actions */}
            <div className="rounded-xl border border-border/50 bg-card p-2">
              <p className="mb-1.5 px-1 text-[0.6rem] font-semibold uppercase tracking-[0.15em] text-muted-foreground/50">Analyze</p>
              <div className="grid grid-cols-2 gap-1.5">
                <Button type="button" variant="ghost" className={ICON_BUTTON_CLASS} onClick={() => void handleAnalyzeOnChessCom()}><ExternalLink size={12} />Chess.com</Button>
                <Button type="button" variant="ghost" className={ICON_BUTTON_CLASS} onClick={() => void handleAnalyzeOnLichess()}><ExternalLink size={12} />Lichess</Button>
                <Button type="button" variant="ghost" className={ICON_BUTTON_CLASS} onClick={() => void handleCopyPgn()}><Copy size={12} />Copy PGN</Button>
                <Button type="button" variant="ghost" className={ICON_BUTTON_CLASS} onClick={handleDownloadPgn}><Download size={12} />Download</Button>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-2.5">
            <MoveInput
              onSubmitMove={handlePlayerMove}
              disabled={!isHumanTurn}
              errorMessage={moveError}
              variant="compact"
            />
            {canReveal && renderRevealButton(
              "w-full h-9 border border-border/50 bg-card text-xs text-muted-foreground hover:bg-secondary hover:text-foreground",
            )}
          </div>
        )}

        {/* Move history */}
        {showDesktopMoveHistory && <MoveList moves={gameState.moves} />}

      </div>
    );
  };

  return (
    <div
      className={`bg-background min-h-screen ${showDesktopGameLayout ? "md:flex" : ""}`}
    >
      <SeoHead
        title={SEO_TITLE}
        description={SEO_DESCRIPTION}
        canonicalUrl={SEO_CANONICAL_URL}
        ogImage={SEO_OG_IMAGE}
      />
      <AppSidebar
        onHomeClick={handleLogoClick}
        desktopMode={showDesktopGameLayout}
      />

      <div
        className={`mx-auto w-full px-4 ${showDesktopGameLayout ? "md:my-4 md:h-[calc(100vh-2rem)] md:flex-1 md:py-0" : gameState ? "py-6 md:flex-1 md:py-8" : "py-4 md:flex-1 md:py-4 lg:py-3"}`}
      >
        {gameState ? (
          <div className={showDesktopGameLayout ? "h-full" : ""}>
            {showDesktopGameLayout ? (
              <div className="mx-auto flex h-full w-full max-w-7xl items-center justify-center px-4">
                <div className="grid w-full items-center gap-5 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] xl:gap-8">
                  <div className="flex items-center justify-center">
                    <div className="w-full max-w-[min(75vh,700px)] xl:max-w-[min(80vh,780px)]">
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

                  <div className="self-stretch">
                    {renderDesktopTrainerShell()}
                  </div>
                </div>
              </div>
            ) : (
              <div className="mx-auto grid w-full max-w-[1800px] grid-cols-1 gap-3">
                <div className="flex flex-col items-center justify-start space-y-2.5">
                  {participantSummaries && (
                    <div className="grid w-full max-w-[560px] grid-cols-2 gap-2 md:max-w-[600px] lg:max-w-[min(52vw,760px)]">
                      <ParticipantSummaryCard
                        participant={participantSummaries.top}
                        compact
                      />
                      <ParticipantSummaryCard
                        participant={participantSummaries.bottom}
                        compact
                      />
                    </div>
                  )}
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
                  {renderMobileTrainerPanel()}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className={`mx-auto w-full max-w-5xl xl:max-w-6xl ${showDesktopGameLayout ? 'flex h-full items-center' : ''}`}>
            <div className="grid w-full items-center gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)] lg:gap-10 xl:gap-14">

              {/* ── Left: Hero text ── */}
              <div className="flex flex-col justify-center space-y-6 py-8 lg:py-10 xl:py-16">
                <div className="space-y-4 lg:space-y-5">
                  <p className="animate-fade-up delay-0 text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                    Blindfold Chess Trainer
                  </p>
                  <h1 className="animate-fade-up delay-100 text-display-balance text-[clamp(2.25rem,4.5vw,4rem)] font-semibold leading-[0.92] text-foreground xl:text-[clamp(2.75rem,5vw,4.5rem)]">
                    Blindchess.org
                  </h1>
                </div>

                <div className="animate-fade-up delay-300">
                  <RotatingQuote />
                </div>

                <div id="game-config-panel" className="animate-fade-up delay-400">
                  <GameConfigPanel
                    mode={selectedGameMode}
                    onModeChange={setSelectedGameMode}
                    showModeSelector
                    borderless
                    compactPortraitLayout
                    onStartGame={(config) => {
                      void handleStartGame(config);
                    }}
                    isGameActive={false}
                  />
                </div>
              </div>

              {/* ── Right: 3D board (desktop only) ── */}
              <div className="hidden animate-scale-in delay-300 items-center justify-center lg:flex lg:py-8 xl:py-12">
                <div className="w-full">
                  <LandingOperaReplay />
                </div>
              </div>

            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Index;
