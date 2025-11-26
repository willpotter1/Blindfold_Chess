import { useState, useCallback, useRef } from 'react';
import { Chess } from 'chess.js';

export type GameState = {
  fen: string;
  moves: string[];
  halfMoveCount: number;
  playerColor: 'white' | 'black';
  difficulty: number;
  revealEvery: number;
  isOver: boolean;
  result: '1-0' | '0-1' | '1/2-1/2' | null;
  isCheck: boolean;
  turnColor: 'white' | 'black';
};

export const useGameState = () => {
  const [game, setGame] = useState<Chess | null>(null);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const gameRef = useRef<Chess | null>(null);
  const gameStateRef = useRef<GameState | null>(null);

  const startNewGame = useCallback((
    playerColor: 'white' | 'black',
    difficulty: number,
    revealEvery: number
  ) => {
    const newGame = new Chess();
    
    gameRef.current = newGame;
    setGame(newGame);
    const initialState: GameState = {
      fen: newGame.fen(),
      moves: [],
      halfMoveCount: 0,
      playerColor,
      difficulty,
      revealEvery,
      isOver: false,
      result: null,
      isCheck: newGame.inCheck(),
      turnColor: newGame.turn() === 'w' ? 'white' : 'black',
    };
    gameStateRef.current = initialState;
    setGameState(initialState);

    return newGame;
  }, []);

  const makeMove = useCallback((san: string): { success: boolean; error?: string } => {
    const currentGame = gameRef.current;
    const currentState = gameStateRef.current;

    if (!currentGame || !currentState) {
      return { success: false, error: 'Game not initialized' };
    }

    try {
      // Try to make the move - chess.js will throw on invalid moves
      const move = currentGame.move(san);
      
      if (!move) {
        return { success: false, error: 'Illegal move' };
      }

      // Update game state
      const newMoves = [...currentState.moves, move.san];
      const newHalfMoveCount = currentState.halfMoveCount + 1;
      
      // Check game status
      const isOver = currentGame.isGameOver();
      let result: '1-0' | '0-1' | '1/2-1/2' | null = null;
      
      if (isOver) {
        if (currentGame.isCheckmate()) {
          result = currentGame.turn() === 'w' ? '0-1' : '1-0';
        } else {
          result = '1/2-1/2';
        }
      }

      setGameState((prev) => {
        if (!prev) return prev;
        const nextState: GameState = {
          ...prev,
          fen: currentGame.fen(),
          moves: newMoves,
          halfMoveCount: newHalfMoveCount,
          isOver,
          result,
          isCheck: currentGame.inCheck(),
          turnColor: currentGame.turn() === 'w' ? 'white' : 'black',
        };
        gameStateRef.current = nextState;
        return nextState;
      });

      return { success: true };
    } catch (error) {
      return { success: false, error: 'Invalid move format' };
    }
  }, []);

  const makeMoveUci = useCallback((uciMove: string): boolean => {
    const currentGame = gameRef.current;
    const currentState = gameStateRef.current;

    if (!currentGame || !currentState) {
      return false;
    }

    try {
      // UCI moves are in format like "e2e4" or "e7e8q" for promotion
      const from = uciMove.substring(0, 2);
      const to = uciMove.substring(2, 4);
      const promotion = uciMove.length > 4 ? uciMove[4] : undefined;

      const move = currentGame.move({ from, to, promotion });
      
      if (!move) {
        return false;
      }

      // Update game state
      const newMoves = [...currentState.moves, move.san];
      const newHalfMoveCount = currentState.halfMoveCount + 1;
      
      // Check game status
      const isOver = currentGame.isGameOver();
      let result: '1-0' | '0-1' | '1/2-1/2' | null = null;
      
      if (isOver) {
        if (currentGame.isCheckmate()) {
          result = currentGame.turn() === 'w' ? '0-1' : '1-0';
        } else {
          result = '1/2-1/2';
        }
      }

      setGameState((prev) => {
        if (!prev) return prev;
        const nextState: GameState = {
          ...prev,
          fen: currentGame.fen(),
          moves: newMoves,
          halfMoveCount: newHalfMoveCount,
          isOver,
          result,
          isCheck: currentGame.inCheck(),
          turnColor: currentGame.turn() === 'w' ? 'white' : 'black',
        };
        gameStateRef.current = nextState;
        return nextState;
      });

      return true;
    } catch (error) {
      console.error('Error making UCI move:', error);
      return false;
    }
  }, []);

  const shouldShowBoard = useCallback((): boolean => {
    if (!gameState) return false;
    return (gameState.halfMoveCount % gameState.revealEvery === 0) || gameState.isOver;
  }, [gameState]);

  const getGameStatus = useCallback((): string => {
    if (!game || !gameState) return '';

    if (gameState.isOver) {
      if (game.isCheckmate()) {
        return `Checkmate! ${gameState.result}`;
      } else if (game.isStalemate()) {
        return 'Stalemate - Draw';
      } else if (game.isThreefoldRepetition()) {
        return 'Draw by threefold repetition';
      } else if (game.isInsufficientMaterial()) {
        return 'Draw by insufficient material';
      } else if (game.isDraw()) {
        return 'Draw by 50-move rule';
      }
    }

    if (gameState.isCheck) {
      return `${gameState.turnColor === 'white' ? 'White' : 'Black'} is in check`;
    }

    return `${gameState.turnColor === 'white' ? 'White' : 'Black'} to move`;
  }, [game, gameState]);

  return {
    gameState,
    startNewGame,
    makeMove,
    makeMoveUci,
    shouldShowBoard,
    getGameStatus,
    getCurrentState: () => gameStateRef.current,
  };
};
