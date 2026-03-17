import { useState, useCallback, useRef } from 'react';
import { Chess } from 'chess.js';
import { saveCompletedGame } from '@/lib/saveGameResult';

export type GameState = {
  fen: string;
  moves: string[];
  halfMoveCount: number;
  playerMoveCount: number;
  playerColor: 'white' | 'black';
  engineElo: number;  // explicit UCI_Elo used for the engine
  revealEvery: number;
  allowCheats: boolean;
  hideMoveHistory: boolean;
  isOver: boolean;
  result: '1-0' | '0-1' | '1/2-1/2' | null;
  isCheck: boolean;
  turnColor: 'white' | 'black';
};

const normalizeSan = (input: string): string => {
  // Remove whitespace and normalize zeros to letter o (common in castling typos).
  let san = input.trim().replace(/\s+/g, '').replace(/0/g, 'o');

  // Handle castling in any case (e.g., o-o, O-O-O+, 0-0).
  const castleMatch = san.match(/^o-?o(-?o)?([+#])?$/i);
  if (castleMatch) {
    const isLong = Boolean(castleMatch[1]);
    const suffix = castleMatch[2] ?? '';
    return isLong ? `O-O-O${suffix}` : `O-O${suffix}`;
  }

  // Normalize capture indicator to lowercase.
  san = san.replace(/X/g, 'x');

  // Uppercase piece designators (but not pawn file letters) and promotion piece, lowercase files.
  const isPawnSan = /^[a-h](x|[1-8])/i.test(san);
  if (!isPawnSan) {
    san = san.replace(/^([kqrbn])/i, (m) => m.toUpperCase());
  }
  san = san.replace(/=([kqrbn])/i, (_, p) => `=${p.toUpperCase()}`);
  const head = san.slice(0, 1);
  const tail = san.slice(1).replace(/([a-h])/gi, (m) => m.toLowerCase());
  san = `${head}${tail}`;

  return san;
};

export const useGameState = () => {
  const [game, setGame] = useState<Chess | null>(null);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const gameRef = useRef<Chess | null>(null);
  const gameStateRef = useRef<GameState | null>(null);
  const hasSavedResultRef = useRef(false);

  const startNewGame = useCallback((
    playerColor: 'white' | 'black',
    engineElo: number,
    revealEvery: number,
    allowCheats: boolean,
    hideMoveHistory: boolean
  ) => {
    const newGame = new Chess();
    const today = new Date();
    const pgnDate = `${today.getFullYear()}.${String(today.getMonth() + 1).padStart(2, '0')}.${String(today.getDate()).padStart(2, '0')}`;
    const computerLabel = `Computer (${engineElo})`;

    newGame.setHeader('Event', 'Blindfold Chess Trainer');
    newGame.setHeader('Site', 'https://blindchess.org');
    newGame.setHeader('Date', pgnDate);
    newGame.setHeader('Round', '?');
    newGame.setHeader('White', playerColor === 'white' ? 'Player' : computerLabel);
    newGame.setHeader('Black', playerColor === 'black' ? 'Player' : computerLabel);
    newGame.setHeader('Result', '*');
    
    gameRef.current = newGame;
    hasSavedResultRef.current = false;
    setGame(newGame);
    const initialState: GameState = {
      fen: newGame.fen(),
      moves: [],
      halfMoveCount: 0,
      playerMoveCount: 0,
      playerColor,
      engineElo,
      revealEvery,
      allowCheats,
      hideMoveHistory,
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
      const normalizedSan = normalizeSan(san);
      // Try to make the move - chess.js will throw on invalid moves
      const move = currentGame.move(normalizedSan);
      
      if (!move) {
        return { success: false, error: 'Illegal move' };
      }

      // Update game state
      const newMoves = [...currentState.moves, move.san];
      const newHalfMoveCount = currentState.halfMoveCount + 1;
      const newPlayerMoveCount = currentState.playerMoveCount + 1;
      
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
      currentGame.setHeader('Result', result ?? '*');
      const completedPgn = currentGame.pgn({ newline: '\n', maxWidth: 0 });

      setGameState((prev) => {
        if (!prev) return prev;
        const nextState: GameState = {
          ...prev,
          fen: currentGame.fen(),
          moves: newMoves,
          halfMoveCount: newHalfMoveCount,
          playerMoveCount: newPlayerMoveCount,
          isOver,
          result,
          isCheck: currentGame.inCheck(),
          turnColor: currentGame.turn() === 'w' ? 'white' : 'black',
        };
        gameStateRef.current = nextState;

        if (isOver && result && !hasSavedResultRef.current) {
          hasSavedResultRef.current = true;
          void saveCompletedGame(nextState, completedPgn);
        }

        return nextState;
      });

      return { success: true };
    } catch (error) {
      return { success: false, error: 'Invalid move format' };
    }
  }, []);

  const makeMoveUci = useCallback((uciMove: string, options?: { countPlayerMove?: boolean }): boolean => {
    const currentGame = gameRef.current;
    const currentState = gameStateRef.current;

    if (!currentGame || !currentState) {
      return false;
    }

    const countPlayerMove = options?.countPlayerMove ?? false;

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
      const newPlayerMoveCount = currentState.playerMoveCount + (countPlayerMove ? 1 : 0);
      
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
      currentGame.setHeader('Result', result ?? '*');
      const completedPgn = currentGame.pgn({ newline: '\n', maxWidth: 0 });

      setGameState((prev) => {
        if (!prev) return prev;
        const nextState: GameState = {
          ...prev,
          fen: currentGame.fen(),
          moves: newMoves,
          halfMoveCount: newHalfMoveCount,
          playerMoveCount: newPlayerMoveCount,
          isOver,
          result,
          isCheck: currentGame.inCheck(),
          turnColor: currentGame.turn() === 'w' ? 'white' : 'black',
        };
        gameStateRef.current = nextState;

        if (isOver && result && !hasSavedResultRef.current) {
          hasSavedResultRef.current = true;
          void saveCompletedGame(nextState, completedPgn);
        }

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
    if (gameState.revealEvery <= 0) {
      return gameState.isOver;
    }
    // Reveal based on the number of moves the player has made (not total plies)
    return (gameState.playerMoveCount % gameState.revealEvery === 0) || gameState.isOver;
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

    const engineMoveParity = gameState.playerColor === 'white' ? 1 : 0;
    let lastComputerMoveStatus = 'Last computer move: ';
    for (let i = gameState.moves.length - 1; i >= 0; i -= 1) {
      if (i % 2 === engineMoveParity) {
        lastComputerMoveStatus = `Last computer move: ${gameState.moves[i]}`;
        break;
      }
    }

    if (gameState.isCheck) {
      return `${lastComputerMoveStatus}\n${gameState.turnColor === 'white' ? 'White' : 'Black'} is in check`;
    }

    return lastComputerMoveStatus;
  }, [game, gameState]);

  const getPgn = useCallback((): string => {
    const currentGame = gameRef.current;
    if (!currentGame) return '';
    return currentGame.pgn({ newline: '\n', maxWidth: 0 });
  }, []);

  const resetGame = useCallback(() => {
    gameRef.current = null;
    gameStateRef.current = null;
    hasSavedResultRef.current = false;
    setGame(null);
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
