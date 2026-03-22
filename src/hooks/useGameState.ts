import { useState, useCallback, useRef } from 'react';
import { Chess } from 'chess.js';
import { saveCompletedGame } from '@/lib/saveGameResult';
import {
  buildInitialGameState,
  getGameStatusText,
  shouldShowBoardForState,
  type GameConfig,
  type GameState,
} from '@/lib/gameSession';
import { normalizeSan } from '@/lib/chess/normalizeSan';

export type { GameConfig, GameState } from '@/lib/gameSession';

const getPgnPlayerHeaders = (config: GameConfig) => {
  if (config.mode === 'computer') {
    const computerLabel = `Computer (${config.engineElo})`;

    return {
      White: config.playerColor === 'white' ? 'Player' : computerLabel,
      Black: config.playerColor === 'black' ? 'Player' : computerLabel,
    };
  }

  return {
    White: 'White',
    Black: 'Black',
  };
};

export const useGameState = () => {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const gameRef = useRef<Chess | null>(null);
  const gameStateRef = useRef<GameState | null>(null);
  const hasSavedResultRef = useRef(false);

  const startNewGame = useCallback((config: GameConfig) => {
    const newGame = new Chess();
    const today = new Date();
    const pgnDate = `${today.getFullYear()}.${String(today.getMonth() + 1).padStart(2, '0')}.${String(today.getDate()).padStart(2, '0')}`;
    const playerHeaders = getPgnPlayerHeaders(config);

    newGame.setHeader('Event', 'Blindfold Chess Trainer');
    newGame.setHeader('Site', 'https://blindchess.org');
    newGame.setHeader('Date', pgnDate);
    newGame.setHeader('Round', '?');
    newGame.setHeader('White', playerHeaders.White);
    newGame.setHeader('Black', playerHeaders.Black);
    newGame.setHeader('Result', '*');

    const initialState = buildInitialGameState(newGame, config);

    gameRef.current = newGame;
    gameStateRef.current = initialState;
    hasSavedResultRef.current = false;
    setGameState(initialState);

    return initialState;
  }, []);

  const commitUpdatedState = useCallback((
    currentGame: Chess,
    currentState: GameState,
    moveSan: string,
    options?: { countPlayerMove?: boolean },
  ) => {
    const newHalfMoveCount = currentState.halfMoveCount + 1;
    const newMoves = [...currentState.moves, moveSan];
    const isOver = currentGame.isGameOver();
    let result: GameState['result'] = null;

    if (isOver) {
      if (currentGame.isCheckmate()) {
        result = currentGame.turn() === 'w' ? '0-1' : '1-0';
      } else {
        result = '1/2-1/2';
      }
    }

    currentGame.setHeader('Result', result ?? '*');
    const completedPgn = currentGame.pgn({ newline: '\n', maxWidth: 0 });

    const baseNextState = {
      ...currentState,
      fen: currentGame.fen(),
      moves: newMoves,
      halfMoveCount: newHalfMoveCount,
      isOver,
      result,
      isCheck: currentGame.inCheck(),
      turnColor: currentGame.turn() === 'w' ? 'white' : 'black',
    };

    const nextState: GameState = currentState.mode === 'computer'
      ? {
          ...baseNextState,
          mode: 'computer',
          playerColor: currentState.playerColor,
          engineElo: currentState.engineElo,
          playerMoveCount: currentState.playerMoveCount + (options?.countPlayerMove ? 1 : 0),
        }
      : {
          ...baseNextState,
          mode: 'pass-n-play',
        };

    gameStateRef.current = nextState;
    setGameState(nextState);

    if (isOver && result && !hasSavedResultRef.current) {
      hasSavedResultRef.current = true;
      void saveCompletedGame(nextState, completedPgn);
    }

    return nextState;
  }, []);

  const makeMove = useCallback((san: string): { success: boolean; error?: string } => {
    const currentGame = gameRef.current;
    const currentState = gameStateRef.current;

    if (!currentGame || !currentState) {
      return { success: false, error: 'Game not initialized' };
    }

    try {
      const normalizedSan = normalizeSan(san);
      const move = currentGame.move(normalizedSan);

      if (!move) {
        return { success: false, error: 'Illegal move' };
      }

      commitUpdatedState(currentGame, currentState, move.san, {
        countPlayerMove: currentState.mode === 'computer',
      });

      return { success: true };
    } catch {
      return { success: false, error: 'Invalid move format' };
    }
  }, [commitUpdatedState]);

  const makeMoveUci = useCallback((uciMove: string, options?: { countPlayerMove?: boolean }): boolean => {
    const currentGame = gameRef.current;
    const currentState = gameStateRef.current;

    if (!currentGame || !currentState) {
      return false;
    }

    try {
      const from = uciMove.substring(0, 2);
      const to = uciMove.substring(2, 4);
      const promotion = uciMove.length > 4 ? uciMove[4] : undefined;
      const move = currentGame.move({ from, to, promotion });

      if (!move) {
        return false;
      }

      commitUpdatedState(currentGame, currentState, move.san, options);
      return true;
    } catch (error) {
      console.error('Error making UCI move:', error);
      return false;
    }
  }, [commitUpdatedState]);

  const shouldShowBoard = useCallback((): boolean => {
    if (!gameState) {
      return false;
    }

    return shouldShowBoardForState(gameState);
  }, [gameState]);

  const getGameStatus = useCallback((): string => {
    const currentGame = gameRef.current;
    const currentState = gameStateRef.current;

    if (!currentGame || !currentState) {
      return '';
    }

    return getGameStatusText(currentGame, currentState);
  }, []);

  const getPgn = useCallback((): string => {
    const currentGame = gameRef.current;

    if (!currentGame) {
      return '';
    }

    return currentGame.pgn({ newline: '\n', maxWidth: 0 });
  }, []);

  const resetGame = useCallback(() => {
    gameRef.current = null;
    gameStateRef.current = null;
    hasSavedResultRef.current = false;
    setGameState(null);
  }, []);

  return {
    gameState,
    startNewGame,
    resetGame,
    makeMove,
    makeMoveUci,
    shouldShowBoard,
    getGameStatus,
    getPgn,
    getCurrentState: () => gameStateRef.current,
  };
};
