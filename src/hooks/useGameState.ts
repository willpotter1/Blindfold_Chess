import { useState, useCallback } from 'react';
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

  const startNewGame = useCallback((
    playerColor: 'white' | 'black',
    difficulty: number,
    revealEvery: number
  ) => {
    const newGame = new Chess();
    
    setGame(newGame);
    setGameState({
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
    });

    return newGame;
  }, []);

  const makeMove = useCallback((san: string): { success: boolean; error?: string } => {
    if (!game || !gameState) {
      return { success: false, error: 'Game not initialized' };
    }

    try {
      // Try to make the move - chess.js will throw on invalid moves
      const move = game.move(san);
      
      if (!move) {
        return { success: false, error: 'Illegal move' };
      }

      // Update game state
      const newMoves = [...gameState.moves, move.san];
      const newHalfMoveCount = gameState.halfMoveCount + 1;
      
      // Check game status
      const isOver = game.isGameOver();
      let result: '1-0' | '0-1' | '1/2-1/2' | null = null;
      
      if (isOver) {
        if (game.isCheckmate()) {
          result = game.turn() === 'w' ? '0-1' : '1-0';
        } else {
          result = '1/2-1/2';
        }
      }

      setGameState({
        ...gameState,
        fen: game.fen(),
        moves: newMoves,
        halfMoveCount: newHalfMoveCount,
        isOver,
        result,
        isCheck: game.inCheck(),
        turnColor: game.turn() === 'w' ? 'white' : 'black',
      });

      return { success: true };
    } catch (error) {
      return { success: false, error: 'Invalid move format' };
    }
  }, [game, gameState]);

  const makeMoveUci = useCallback((uciMove: string): boolean => {
    if (!game || !gameState) {
      return false;
    }

    try {
      // UCI moves are in format like "e2e4" or "e7e8q" for promotion
      const from = uciMove.substring(0, 2);
      const to = uciMove.substring(2, 4);
      const promotion = uciMove.length > 4 ? uciMove[4] : undefined;

      const move = game.move({ from, to, promotion });
      
      if (!move) {
        return false;
      }

      // Update game state
      const newMoves = [...gameState.moves, move.san];
      const newHalfMoveCount = gameState.halfMoveCount + 1;
      
      // Check game status
      const isOver = game.isGameOver();
      let result: '1-0' | '0-1' | '1/2-1/2' | null = null;
      
      if (isOver) {
        if (game.isCheckmate()) {
          result = game.turn() === 'w' ? '0-1' : '1-0';
        } else {
          result = '1/2-1/2';
        }
      }

      setGameState({
        ...gameState,
        fen: game.fen(),
        moves: newMoves,
        halfMoveCount: newHalfMoveCount,
        isOver,
        result,
        isCheck: game.inCheck(),
        turnColor: game.turn() === 'w' ? 'white' : 'black',
      });

      return true;
    } catch (error) {
      console.error('Error making UCI move:', error);
      return false;
    }
  }, [game, gameState]);

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
  };
};
