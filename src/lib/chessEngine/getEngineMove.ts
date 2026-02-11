import { initStockfish, sendCommand, waitForReady } from './stockfishWorker';

let isStockfishReady = false;

const MIN_ELO = 1300;
const MAX_ELO = 2800;

const clampElo = (elo: number): number => {
  return Math.round(Math.max(MIN_ELO, Math.min(MAX_ELO, elo)));
};

/**
 * Gets the best move from Stockfish for the given position
 * @param fen - The current position in FEN notation
 * @param engineElo - Explicit Elo setting (clamped to engine range)
 * @returns UCI move string (e.g., "e2e4")
 */
export const getEngineMove = async (fen: string, engineElo: number): Promise<string> => {
  try {
    console.log('[engine] request', { fen, engineElo });
    // Initialize Stockfish if not already done
    if (!isStockfishReady) {
      await initStockfish();
      isStockfishReady = true;
    }

    const targetElo = clampElo(engineElo);
    
    // Set UCI options
    await sendCommand('uci');
    await waitForReady();
    await sendCommand('setoption name UCI_LimitStrength value true');
    await waitForReady();
    await sendCommand(`setoption name UCI_Elo value ${targetElo}`);
    await waitForReady();
    // Keep Skill Level maxed so Elo cap is the main limiter
    await sendCommand('setoption name Skill Level value 20');
    await waitForReady();
    
    // Set position
    await sendCommand(`position fen ${fen}`);
    await waitForReady();
    
    // Scale think time by Elo so stronger settings get more time.
    const normalized = (targetElo - MIN_ELO) / (MAX_ELO - MIN_ELO);
    const moveTime = Math.round(200 + normalized * 900); // 200ms to 1100ms
    
    // Request best move
    const bestMove = await sendCommand(`go movetime ${moveTime}`, true);
    if (typeof bestMove !== 'string') {
      throw new Error('No move received from engine');
    }
    
    console.log('[engine] bestmove', bestMove);
    return bestMove;
  } catch (error) {
    console.error('Error getting engine move:', error);
    throw error;
  }
};
