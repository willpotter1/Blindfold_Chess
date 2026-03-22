import { Chess } from 'chess.js';
import { describe, expect, it } from 'vitest';
import {
  buildInitialGameState,
  buildSavedGameConfig,
  getGameConfigFromState,
  getGameStatusText,
  shouldComputerAct,
  shouldShowBoardForState,
  type ComputerGameConfig,
  type PassNPlayGameConfig,
} from './gameSession';

const computerConfig: ComputerGameConfig = {
  mode: 'computer',
  playerColor: 'white',
  engineElo: 1500,
  revealEvery: 2,
  allowCheats: true,
  hideMoveHistory: false,
};

const passNPlayConfig: PassNPlayGameConfig = {
  mode: 'pass-n-play',
  revealEvery: 2,
  allowCheats: true,
  hideMoveHistory: false,
};

describe('gameSession initialization', () => {
  it('round-trips the computer config through initial state', () => {
    const game = new Chess();
    const state = buildInitialGameState(game, computerConfig);

    expect(state.mode).toBe('computer');
    expect(state.playerColor).toBe('white');
    expect(state.engineElo).toBe(1500);
    expect(state.playerMoveCount).toBe(0);
    expect(getGameConfigFromState(state)).toEqual(computerConfig);
  });

  it('round-trips the pass-and-play config through initial state', () => {
    const game = new Chess();
    const state = buildInitialGameState(game, passNPlayConfig);

    expect(state.mode).toBe('pass-n-play');
    expect(state.turnColor).toBe('white');
    expect(getGameConfigFromState(state)).toEqual(passNPlayConfig);
  });
});

describe('gameSession reveal logic', () => {
  it('keeps computer mode reveal counting tied to player moves', () => {
    const state = buildInitialGameState(new Chess(), computerConfig);

    expect(shouldShowBoardForState(state)).toBe(true);
    expect(shouldShowBoardForState({ ...state, playerMoveCount: 1 })).toBe(false);
    expect(shouldShowBoardForState({ ...state, playerMoveCount: 2 })).toBe(true);
  });

  it('keeps pass-and-play visible for both players during a reveal turn', () => {
    const state = buildInitialGameState(new Chess(), passNPlayConfig);

    expect(shouldShowBoardForState(state)).toBe(true);
    expect(shouldShowBoardForState({ ...state, halfMoveCount: 1, turnColor: 'black' })).toBe(true);
    expect(shouldShowBoardForState({ ...state, halfMoveCount: 2 })).toBe(false);
    expect(shouldShowBoardForState({ ...state, halfMoveCount: 4 })).toBe(true);
    expect(shouldShowBoardForState({ ...state, halfMoveCount: 5, turnColor: 'black' })).toBe(true);
  });
});

describe('gameSession engine gating', () => {
  it('only requests engine action when it is the computer turn in computer mode', () => {
    const whiteState = buildInitialGameState(new Chess(), computerConfig);
    const blackStartsState = buildInitialGameState(new Chess(), {
      ...computerConfig,
      playerColor: 'black',
    });
    const passState = {
      ...buildInitialGameState(new Chess(), passNPlayConfig),
      halfMoveCount: 1,
      turnColor: 'black' as const,
    };

    expect(shouldComputerAct(whiteState)).toBe(false);
    expect(shouldComputerAct(blackStartsState)).toBe(true);
    expect(shouldComputerAct(passState)).toBe(false);
  });
});

describe('gameSession status text', () => {
  it('reports pass-and-play turn text and check state', () => {
    const game = new Chess();
    game.move('e4');
    game.move('f6');
    game.move('Qh5+');

    const state = {
      ...buildInitialGameState(new Chess(), passNPlayConfig),
      fen: game.fen(),
      moves: ['e4', 'f6', 'Qh5+'],
      halfMoveCount: 3,
      isCheck: true,
      turnColor: 'black' as const,
    };

    expect(getGameStatusText(game, state)).toBe('Black to move\nBlack is in check');
  });

  it('keeps the last computer move status for computer games', () => {
    const game = new Chess();
    game.move('e4');
    game.move('e5');

    const state = {
      ...buildInitialGameState(new Chess(), computerConfig),
      fen: game.fen(),
      moves: ['e4', 'e5'],
      halfMoveCount: 2,
      playerMoveCount: 1,
      isCheck: false,
      turnColor: 'white' as const,
    };

    expect(getGameStatusText(game, state)).toBe('Last computer move: e5');
  });
});

describe('gameSession saved config payloads', () => {
  it('stores pass-and-play config without an engine Elo', () => {
    const state = buildInitialGameState(new Chess(), passNPlayConfig);

    expect(buildSavedGameConfig(state)).toEqual(passNPlayConfig);
    expect(buildSavedGameConfig(state)).not.toHaveProperty('engineElo');
  });

  it('stores computer config with engine Elo', () => {
    const state = buildInitialGameState(new Chess(), computerConfig);

    expect(buildSavedGameConfig(state)).toEqual(computerConfig);
  });
});
