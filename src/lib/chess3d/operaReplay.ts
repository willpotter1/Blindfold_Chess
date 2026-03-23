import { STANDARD_START_FEN, type ChessBoardReplayInput } from "@/lib/chess3d/chess-board-runtime";

export const OPERA_GAME_REPLAY: ChessBoardReplayInput = {
  fen: STANDARD_START_FEN,
  format: "uci",
  moveDurationMs: 700,
  moves: [
    "e2e4", "e7e5", "g1f3", "d7d6", "d2d4", "c8g4", "d4e5", "g4f3", "d1f3",
    "d6e5", "f1c4", "g8f6", "f3b3", "d8e7", "b1c3", "c7c6", "c1g5", "b7b5",
    "c3b5", "c6b5", "c4b5", "b8d7", "e1c1", "a8d8", "d1d7", "d8d7", "h1d1",
    "e7e6", "b5d7", "f6d7", "b3b8", "d7b8", "d1d8",
  ],
};

export const OPERA_GAME_HOLD_MS = 5000;

type ReplayLoopOptions = {
  replay?: ChessBoardReplayInput;
  holdMs?: number;
};

type ReplayLoopRuntime = {
  init: () => Promise<void>;
  loadReplay: (input: ChessBoardReplayInput) => Promise<void>;
  play: () => Promise<void>;
  pause: () => Promise<void>;
  reset: () => Promise<void>;
};

const createAbortError = () => {
  const error = new Error("Replay loop aborted.");
  error.name = "AbortError";
  return error;
};

const isAbortError = (error: unknown) => (
  error instanceof Error && error.name === "AbortError"
);

const waitForDelay = (delayMs: number, signal: AbortSignal) => new Promise<void>((resolve, reject) => {
  if (signal.aborted) {
    reject(createAbortError());
    return;
  }

  const timeoutId = globalThis.setTimeout(() => {
    signal.removeEventListener("abort", handleAbort);
    resolve();
  }, delayMs);

  const handleAbort = () => {
    globalThis.clearTimeout(timeoutId);
    signal.removeEventListener("abort", handleAbort);
    reject(createAbortError());
  };

  signal.addEventListener("abort", handleAbort, { once: true });
});

export const runLoopingReplay = async (
  board: ReplayLoopRuntime,
  signal: AbortSignal,
  {
    replay = OPERA_GAME_REPLAY,
    holdMs = OPERA_GAME_HOLD_MS,
  }: ReplayLoopOptions = {},
) => {
  await board.init();
  await board.loadReplay(replay);

  while (!signal.aborted) {
    await board.play();

    if (signal.aborted) {
      return;
    }

    await waitForDelay(holdMs, signal);

    if (signal.aborted) {
      return;
    }

    await board.reset();
  }
};

export const startLoopingReplay = (
  board: ReplayLoopRuntime,
  options?: ReplayLoopOptions,
) => {
  const abortController = new AbortController();

  void runLoopingReplay(board, abortController.signal, options).catch((error) => {
    if (!isAbortError(error)) {
      console.error(error);
    }
  });

  return () => {
    abortController.abort();
    void board.pause();
  };
};
