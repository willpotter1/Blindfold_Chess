import { initStockfish, sendCommand } from './stockfishWorker';

let isStockfishReady = false;

/**
 * Maps user difficulty (1-10) to Stockfish skill level (0-20)
 */
const mapDifficultyToSkillLevel = (difficulty: number): number => {
  return Math.round((difficulty - 1) * (20 / 9));
};

/**
 * Gets the best move from Stockfish for the given position
 * @param fen - The current position in FEN notation
 * @param difficulty - Difficulty level from 1 (easiest) to 10 (hardest)
 * @returns UCI move string (e.g., "e2e4")
 */
export const getEngineMove = async (fen: string, difficulty: number): Promise<string> => {
  try {
    // Initialize Stockfish if not already done
    if (!isStockfishReady) {
      await initStockfish();
      isStockfishReady = true;
    }

    // Configure Stockfish based on difficulty
    const skillLevel = mapDifficultyToSkillLevel(difficulty);
    
    // Set UCI options
    await sendCommand('uci');
    await sendCommand(`setoption name Skill Level value ${skillLevel}`);
    
    // Set position
    await sendCommand(`position fen ${fen}`);
    
    // Calculate move time based on difficulty (easier = faster, harder = more time to think)
    const moveTime = 100 + (difficulty * 100); // 200ms to 1100ms
    
    // Request best move
    const bestMove = await sendCommand(`go movetime ${moveTime}`);
    
    return bestMove;
  } catch (error) {
    console.error('Error getting engine move:', error);
    throw error;
  }
};
