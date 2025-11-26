import { initStockfish, sendCommand, terminateStockfish, waitForReady } from './stockfishWorker';

export type EngineSelfTestStep =
  | 'init'
  | 'uci'
  | 'uci-ready'
  | 'setoption'
  | 'setoption-ready'
  | 'position'
  | 'position-ready'
  | 'go';

export interface EngineSelfTestResult {
  ok: boolean;
  bestMove?: string;
  steps: Array<{
    name: EngineSelfTestStep;
    ok: boolean;
    detail?: string;
  }>;
  error?: string;
}

/**
 * Runs a lightweight end-to-end check that Stockfish loads and returns a move.
 * Designed for manual diagnostics in the browser console during development.
 */
export const runEngineSelfTest = async (): Promise<EngineSelfTestResult> => {
  const steps: EngineSelfTestResult['steps'] = [];
  let bestMove: string | undefined;

  const recordStep = async (name: EngineSelfTestStep, fn: () => Promise<void>) => {
    try {
      await fn();
      steps.push({ name, ok: true });
    } catch (err) {
      const detail = err instanceof Error ? err.message : String(err);
      steps.push({ name, ok: false, detail });
      throw err;
    }
  };

  try {
    // Fresh start for diagnostics so previous game state doesn't interfere.
    terminateStockfish();

    await recordStep('init', () => initStockfish());
    await recordStep('uci', () => sendCommand('uci'));
    await recordStep('uci-ready', () => waitForReady());
    await recordStep('setoption', () => sendCommand('setoption name Skill Level value 5'));
    await recordStep('setoption-ready', () => waitForReady());
    await recordStep('position', () => sendCommand('position startpos'));
    await recordStep('position-ready', () => waitForReady());

    await recordStep('go', async () => {
      const move = await sendCommand('go movetime 200', true);
      if (typeof move !== 'string' || move.length < 4) {
        throw new Error('Engine returned no move');
      }
      bestMove = move;
    });

    return { ok: true, steps, bestMove };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { ok: false, steps, bestMove, error: message };
  }
};

declare global {
  interface Window {
    runEngineSelfTest?: () => Promise<EngineSelfTestResult>;
    runEngineDebug?: () => Promise<EngineDebugResult>;
  }
}
