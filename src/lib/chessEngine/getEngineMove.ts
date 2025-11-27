import { initStockfish, sendCommand, waitForReady } from './stockfishWorker';

let isStockfishReady = false;

/**
 * Maps user difficulty (1-10) to an Elo value within Stockfish's UCI_Elo range.
 * Engine supports roughly 1320–3190; we clamp to a sensible upper bound.
 */
const mapDifficultyToElo = (difficulty: number): number => {
  const minElo = 1320;
  const maxElo = 2800;
  const raw = minElo + ((difficulty - 1) * (maxElo - minElo)) / 9;
  return Math.round(Math.max(minElo, Math.min(maxElo, raw)));
};

/**
 * Gets the best move from Stockfish for the given position
 * @param fen - The current position in FEN notation
 * @param difficulty - Difficulty level from 1 (easiest) to 10 (hardest)
 * @returns UCI move string (e.g., "e2e4")
 */
export const getEngineMove = async (fen: string, difficulty: number): Promise<string> => {
  try {
    console.log('[engine] request', { fen, difficulty });
    // Initialize Stockfish if not already done
    if (!isStockfishReady) {
      await initStockfish();
      isStockfishReady = true;
    }

    // Configure Stockfish based on Elo difficulty
    const targetElo = mapDifficultyToElo(difficulty);
    
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
    
    // Calculate move time based on difficulty (easier = faster, harder = more time to think)
    const moveTime = 100 + (difficulty * 100); // 200ms to 1100ms
    
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
