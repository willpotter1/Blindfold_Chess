import { describe, expect, it } from 'vitest';
import { getGameModeLabel, getPgnResult, getPgnResultLabel } from './pgnExport';

describe('pgnExport helpers', () => {
  it('reads a win result from PGN headers', () => {
    const pgn = [
      '[Event "Blindfold Chess"]',
      '[Result "1-0"]',
      '',
      '1. e4 e5 2. Nf3 Nc6 1-0',
    ].join('\n');

    expect(getPgnResult(pgn)).toBe('1-0');
    expect(getPgnResultLabel(pgn)).toBe('White won');
  });

  it('reads draw results from PGN headers', () => {
    const pgn = [
      '[Event "Blindfold Chess"]',
      '[Result "1/2-1/2"]',
      '',
      '1. e4 e5 1/2-1/2',
    ].join('\n');

    expect(getPgnResult(pgn)).toBe('1/2-1/2');
    expect(getPgnResultLabel(pgn)).toBe('Draw');
  });

  it('falls back to unknown when result headers are missing', () => {
    const pgn = [
      '[Event "Blindfold Chess"]',
      '[White "Player"]',
      '',
      '1. e4 e5 *',
    ].join('\n');

    expect(getPgnResult(pgn)).toBeNull();
    expect(getPgnResultLabel(pgn)).toBe('Unknown');
  });

  it('formats saved game modes for display', () => {
    expect(getGameModeLabel('computer')).toBe('Vs computer');
    expect(getGameModeLabel('pass-n-play')).toBe('Pass n play');
  });
});
