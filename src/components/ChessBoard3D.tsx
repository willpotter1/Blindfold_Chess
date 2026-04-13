import { forwardRef, useEffect, useImperativeHandle, useRef, useState, type MouseEvent } from "react";
import { cn } from "@/lib/utils";
import {
  ChessBoard3DRuntime,
  STANDARD_START_FEN,
  type ChessBoardReplayInput,
} from "@/lib/chess3d/chess-board-runtime";

const buildPublicAssetUrl = (assetPath: string) => (
  `${import.meta.env.BASE_URL}${assetPath.replace(/^\/+/, "")}`
);

export type ChessBoard3DHandle = {
  init: () => Promise<void>;
  setPosition: (fen?: string) => Promise<void>;
  loadReplay: (input: ChessBoardReplayInput) => Promise<void>;
  play: () => Promise<void>;
  pause: () => Promise<void>;
  stepForward: () => Promise<void>;
  reset: () => Promise<void>;
};

type ChessBoard3DProps = {
  fen?: string;
  piecesVisible?: boolean;
  isInteractive?: boolean;
  onMove?: (from: string, to: string) => Promise<boolean> | boolean;
  className?: string;
  mountClassName?: string;
  initialFen?: string;
  enableControls?: boolean;
  glbUrl?: string;
  hdriUrl?: string;
};

export const ChessBoard3D = forwardRef<ChessBoard3DHandle, ChessBoard3DProps>(({
  fen,
  piecesVisible = true,
  isInteractive = false,
  onMove,
  className,
  mountClassName,
  initialFen = STANDARD_START_FEN,
  enableControls = true,
  glbUrl = buildPublicAssetUrl("chess3d/chessdemo.glb"),
  hdriUrl = buildPublicAssetUrl("chess3d/nhdri.hdr"),
}, ref) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const runtimeRef = useRef<ChessBoard3DRuntime | null>(null);
  const initPromiseRef = useRef<Promise<ChessBoard3DRuntime> | null>(null);
  const latestFenRef = useRef(fen);
  const latestPiecesVisibleRef = useRef(piecesVisible);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [selectedSquare, setSelectedSquare] = useState<string | null>(null);

  const ensureRuntimeReady = async () => {
    if (!initPromiseRef.current) {
      throw new Error("ChessBoard3D is not mounted.");
    }

    return initPromiseRef.current;
  };

  useImperativeHandle(ref, () => ({
    init: async () => {
      await ensureRuntimeReady();
    },
    setPosition: async (nextFen = STANDARD_START_FEN) => {
      const runtime = await ensureRuntimeReady();
      runtime.setPosition(nextFen);
    },
    loadReplay: async (input) => {
      const runtime = await ensureRuntimeReady();
      runtime.loadReplay(input);
    },
    play: async () => {
      const runtime = await ensureRuntimeReady();
      await runtime.play();
    },
    pause: async () => {
      const runtime = await ensureRuntimeReady();
      runtime.pause();
    },
    stepForward: async () => {
      const runtime = await ensureRuntimeReady();
      await runtime.stepForward();
    },
    reset: async () => {
      const runtime = await ensureRuntimeReady();
      runtime.reset();
    },
  }), []);

  useEffect(() => {
    latestFenRef.current = fen;
    latestPiecesVisibleRef.current = piecesVisible;
  }, [fen, piecesVisible]);

  useEffect(() => {
    setSelectedSquare(null);
  }, [fen, isInteractive]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return undefined;
    }

    let cancelled = false;
    setLoadError(null);
    setIsReady(false);

    const runtime = new ChessBoard3DRuntime({
      container,
      glbUrl,
      hdriUrl,
      initialFen,
      enableControls,
    });

    runtimeRef.current = runtime;
    initPromiseRef.current = runtime.init()
      .then(() => {
        if (cancelled) {
          return runtime;
        }

        runtime.setPiecesVisible(latestPiecesVisibleRef.current);
        if (latestFenRef.current) {
          runtime.setPosition(latestFenRef.current);
        }
        setIsReady(true);
        return runtime;
      })
      .catch((error) => {
        if (!cancelled) {
          setLoadError(error instanceof Error ? error.message : String(error));
          setIsReady(false);
        }
        throw error;
      });

    return () => {
      cancelled = true;
      setIsReady(false);
      runtime.dispose();
      runtimeRef.current = null;
      initPromiseRef.current = null;
      // Clear any stale canvas left if dispose ran before init finished appending
      while (container.firstChild) {
        container.removeChild(container.firstChild);
      }
    };
  }, [enableControls, glbUrl, hdriUrl, initialFen]);

  useEffect(() => {
    if (!isReady || !runtimeRef.current) {
      return;
    }

    runtimeRef.current.setPiecesVisible(piecesVisible);
  }, [isReady, piecesVisible]);

  useEffect(() => {
    if (!fen) {
      return;
    }

    void ensureRuntimeReady()
      .then((runtime) => {
        runtime.setPosition(fen);
      })
      .catch(() => {
        // Init errors are already surfaced in component state.
      });
  }, [fen]);

  const handleBoardClick = async (event: MouseEvent<HTMLDivElement>) => {
    if (!isInteractive || !onMove || !isReady || !runtimeRef.current) {
      return;
    }

    const square = runtimeRef.current.getSquareFromClientPoint(event.clientX, event.clientY);
    if (!square) {
      return;
    }

    if (!selectedSquare) {
      setSelectedSquare(square);
      return;
    }

    if (square === selectedSquare) {
      setSelectedSquare(null);
      return;
    }

    const moveResult = await onMove(selectedSquare, square);
    if (moveResult) {
      setSelectedSquare(null);
    }
  };

  return (
    <div className={cn(
      "relative w-full overflow-hidden rounded-xl bg-card",
      isInteractive && isReady && !loadError ? "cursor-pointer" : undefined,
      className,
    )}
    onClick={(event) => {
      void handleBoardClick(event);
    }}
    >
      <div
        ref={containerRef}
        className={cn("aspect-square w-full", mountClassName)}
      />

      {!isReady && !loadError && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center px-6 text-center text-sm font-medium text-muted-foreground">
          Loading board…
        </div>
      )}

      {loadError && (
        <div className="absolute inset-0 flex items-center justify-center bg-card px-6 text-center text-sm text-muted-foreground">
          <p>3D board failed to load: {loadError}</p>
        </div>
      )}

      {selectedSquare && !loadError && (
        <div className="pointer-events-none absolute left-3 top-3 rounded-full bg-foreground/70 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-primary-foreground">
          {selectedSquare}
        </div>
      )}
    </div>
  );
});

ChessBoard3D.displayName = "ChessBoard3D";
