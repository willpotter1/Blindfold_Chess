import type { Chess } from 'chess.js';
import type { BoardPerspective } from '@/lib/visionTrainer';

export type PieceColor = 'white' | 'black';
export type GameMode = 'computer' | 'pass-n-play';
export type GameResult = '1-0' | '0-1' | '1/2-1/2' | null;

type BaseGameConfig = {
  mode: GameMode;
  revealEvery: number;
  allowCheats: boolean;
  hideMoveHistory: boolean;
};

export type ComputerGameConfig = BaseGameConfig & {
  mode: 'computer';
  playerColor: PieceColor;
  engineElo: number;
};

export type PassNPlayGameConfig = BaseGameConfig & {
  mode: 'pass-n-play';
};

export type GameConfig = ComputerGameConfig | PassNPlayGameConfig;

type BaseGameState = {
  mode: GameMode;
  fen: string;
  moves: string[];
  halfMoveCount: number;
  revealEvery: number;
  allowCheats: boolean;
  hideMoveHistory: boolean;
  isOver: boolean;
  result: GameResult;
  isCheck: boolean;
  turnColor: PieceColor;
};

export type ComputerGameState = BaseGameState & {
  mode: 'computer';
  playerColor: PieceColor;
  engineElo: number;
  playerMoveCount: number;
};

export type PassNPlayGameState = BaseGameState & {
  mode: 'pass-n-play';
};

export type GameState = ComputerGameState | PassNPlayGameState;

export const isComputerGameConfig = (
  config: GameConfig,
): config is ComputerGameConfig => config.mode === 'computer';

export const isComputerGameState = (
  gameState: GameState,
): gameState is ComputerGameState => gameState.mode === 'computer';

export const buildInitialGameState = (
  game: Chess,
  config: GameConfig,
): GameState => {
  const baseState: BaseGameState = {
    mode: config.mode,
    fen: game.fen(),
    moves: [],
    halfMoveCount: 0,
    revealEvery: config.revealEvery,
    allowCheats: config.allowCheats,
    hideMoveHistory: config.hideMoveHistory,
    isOver: false,
    result: null,
    isCheck: game.inCheck(),
    turnColor: game.turn() === 'w' ? 'white' : 'black',
  };

  if (config.mode === 'computer') {
    return {
      ...baseState,
      mode: 'computer',
      playerColor: config.playerColor,
      engineElo: config.engineElo,
      playerMoveCount: 0,
    };
  }

  return {
    ...baseState,
    mode: 'pass-n-play',
  };
};

export const getGameConfigFromState = (gameState: GameState): GameConfig => {
  if (gameState.mode === 'computer') {
    return {
      mode: 'computer',
      playerColor: gameState.playerColor,
      engineElo: gameState.engineElo,
      revealEvery: gameState.revealEvery,
      allowCheats: gameState.allowCheats,
      hideMoveHistory: gameState.hideMoveHistory,
    };
  }

  return {
    mode: 'pass-n-play',
    revealEvery: gameState.revealEvery,
    allowCheats: gameState.allowCheats,
    hideMoveHistory: gameState.hideMoveHistory,
  };
};

export const buildSavedGameConfig = (gameState: GameState): GameConfig => (
  getGameConfigFromState(gameState)
);

export const getBoardPerspective = (gameState: GameState): BoardPerspective => (
  gameState.mode === 'pass-n-play' ? gameState.turnColor : 'white'
);

export const shouldShowBoardForState = (gameState: GameState): boolean => {
  if (gameState.revealEvery <= 0) {
    return gameState.isOver;
  }

  if (gameState.isOver) {
    return true;
  }

  if (gameState.mode === 'computer') {
    return gameState.playerMoveCount % gameState.revealEvery === 0;
  }

  if (gameState.halfMoveCount === 0) {
    return true;
  }

  const currentFullTurnIndex = Math.floor(gameState.halfMoveCount / 2);

  return currentFullTurnIndex % gameState.revealEvery === 0;
};

export const shouldComputerAct = (gameState: GameState | null): gameState is ComputerGameState => (
  Boolean(
    gameState &&
    gameState.mode === 'computer' &&
    !gameState.isOver &&
    gameState.turnColor !== gameState.playerColor
  )
);

const formatTurnColor = (color: PieceColor) => (
  color === 'white' ? 'White' : 'Black'
);

export const getGameStatusText = (game: Chess, gameState: GameState): string => {
  if (gameState.isOver) {
    if (game.isCheckmate()) {
      return `Checkmate! ${gameState.result}`;
    }

    if (game.isStalemate()) {
      return 'Stalemate - Draw';
    }

    if (game.isThreefoldRepetition()) {
      return 'Draw by threefold repetition';
    }

    if (game.isInsufficientMaterial()) {
      return 'Draw by insufficient material';
    }

    if (game.isDraw()) {
      return 'Draw by 50-move rule';
    }
  }

  if (gameState.mode === 'pass-n-play') {
    const primaryStatus = `${formatTurnColor(gameState.turnColor)} to move`;

    return gameState.isCheck
      ? `${primaryStatus}\n${formatTurnColor(gameState.turnColor)} is in check`
      : primaryStatus;
  }

  const engineMoveParity = gameState.playerColor === 'white' ? 1 : 0;
  let lastComputerMoveStatus = 'Last computer move: ';

  for (let index = gameState.moves.length - 1; index >= 0; index -= 1) {
    if (index % 2 === engineMoveParity) {
      lastComputerMoveStatus = `Last computer move: ${gameState.moves[index]}`;
      break;
    }
  }

  if (gameState.isCheck) {
    return `${lastComputerMoveStatus}\n${formatTurnColor(gameState.turnColor)} is in check`;
  }

  return lastComputerMoveStatus;
};
