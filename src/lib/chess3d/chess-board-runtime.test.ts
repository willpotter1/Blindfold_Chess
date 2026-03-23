import { describe, expect, it, vi, type Mock } from "vitest";
import { ChessBoard3DRuntime } from "./chess-board-runtime";

type ReplayState = {
  moves: string[];
  currentIndex: number;
  initialFen: string;
};

type FakeRuntime = {
  replay: ReplayState;
  isPlaying: boolean;
  playSession: number;
  playPromise: Promise<void> | null;
  playPromiseSession: number | null;
  playPromiseResolver: (() => void) | null;
  stepForward: Mock<() => Promise<void>>;
  animationEpoch?: number;
  pause?: () => void;
  setPosition?: Mock<(fen: string) => void>;
  createPlayPromise: (session: number) => Promise<void>;
  resolvePlayPromise: (session: number) => void;
};

const play = ChessBoard3DRuntime.prototype.play as (this: FakeRuntime) => Promise<void>;
const pause = ChessBoard3DRuntime.prototype.pause as (this: FakeRuntime) => void;
const reset = ChessBoard3DRuntime.prototype.reset as (this: FakeRuntime) => void;
const createPlayPromise = ChessBoard3DRuntime.prototype.createPlayPromise as (
  this: FakeRuntime,
  session: number,
) => Promise<void>;
const resolvePlayPromise = ChessBoard3DRuntime.prototype.resolvePlayPromise as (
  this: FakeRuntime,
  session: number,
) => void;

const attachPlaybackMethods = (runtime: Omit<FakeRuntime, "createPlayPromise" | "resolvePlayPromise">): FakeRuntime => ({
  ...runtime,
  createPlayPromise,
  resolvePlayPromise,
});

describe("ChessBoard3DRuntime playback", () => {
  it("resolves play() when replay playback completes", async () => {
    const stepForward = vi.fn(async function step(this: { replay: ReplayState }) {
      this.replay.currentIndex += 1;
    });

    const runtime = attachPlaybackMethods({
      replay: {
        moves: ["m1", "m2"],
        currentIndex: 0,
        initialFen: "start",
      },
      isPlaying: false,
      playSession: 0,
      playPromise: null,
      playPromiseSession: null,
      playPromiseResolver: null,
      stepForward,
    });

    await play.call(runtime);

    expect(stepForward).toHaveBeenCalledTimes(2);
    expect(runtime.isPlaying).toBe(false);
    expect(runtime.playPromise).toBe(null);
  });

  it("resolves an in-flight play() when pause() is called", async () => {
    let resolveStep: (() => void) | null = null;
    const stepForward = vi.fn().mockImplementation(() => (
      new Promise<void>((resolve) => {
        resolveStep = resolve;
      })
    ));

    const runtime = attachPlaybackMethods({
      replay: {
        moves: ["m1"],
        currentIndex: 0,
        initialFen: "start",
      },
      isPlaying: false,
      playSession: 0,
      playPromise: null,
      playPromiseSession: null,
      playPromiseResolver: null,
      stepForward,
    });

    const playPromise = play.call(runtime);
    pause.call(runtime);

    await expect(playPromise).resolves.toBeUndefined();

    resolveStep?.();
    await Promise.resolve();
  });

  it("resolves an in-flight play() when reset() is called", async () => {
    let resolveStep: (() => void) | null = null;
    const stepForward = vi.fn().mockImplementation(() => (
      new Promise<void>((resolve) => {
        resolveStep = resolve;
      })
    ));
    const setPosition = vi.fn();

    const runtime = attachPlaybackMethods({
      replay: {
        moves: ["m1"],
        currentIndex: 0,
        initialFen: "initial-fen",
      },
      isPlaying: false,
      playSession: 0,
      playPromise: null,
      playPromiseSession: null,
      playPromiseResolver: null,
      animationEpoch: 0,
      stepForward,
      pause() {
        pause.call(runtime);
      },
      setPosition,
    });

    const playPromise = play.call(runtime);
    reset.call(runtime);

    await expect(playPromise).resolves.toBeUndefined();
    expect(setPosition).toHaveBeenCalledWith("initial-fen");

    resolveStep?.();
    await Promise.resolve();
  });
});
