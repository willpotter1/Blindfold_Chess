import { afterEach, describe, expect, it, vi } from "vitest";
import { OPERA_GAME_HOLD_MS, OPERA_GAME_REPLAY, startLoopingReplay } from "./operaReplay";

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("startLoopingReplay", () => {
  it("loads the Opera Game, waits 5 seconds after mate, then restarts the replay", async () => {
    vi.useFakeTimers();

    const playResolvers: Array<() => void> = [];
    const board = {
      init: vi.fn().mockResolvedValue(undefined),
      loadReplay: vi.fn().mockResolvedValue(undefined),
      play: vi.fn().mockImplementation(() => (
        new Promise<void>((resolve) => {
          playResolvers.push(resolve);
        })
      )),
      pause: vi.fn().mockImplementation(async () => {
        playResolvers.shift()?.();
      }),
      reset: vi.fn().mockResolvedValue(undefined),
    };

    const stop = startLoopingReplay(board);

    await Promise.resolve();
    await Promise.resolve();

    expect(board.init).toHaveBeenCalledTimes(1);
    expect(board.loadReplay).toHaveBeenCalledWith(OPERA_GAME_REPLAY);
    expect(board.play).toHaveBeenCalledTimes(1);

    playResolvers.shift()?.();
    await Promise.resolve();

    await vi.advanceTimersByTimeAsync(OPERA_GAME_HOLD_MS - 1);
    expect(board.reset).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(1);
    expect(board.reset).toHaveBeenCalledTimes(1);
    expect(board.play).toHaveBeenCalledTimes(2);

    stop();
    await Promise.resolve();

    expect(board.pause).toHaveBeenCalledTimes(1);
  });
});
