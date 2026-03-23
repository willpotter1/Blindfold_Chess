import { Chess } from 'chess.js';
import { describe, expect, it } from 'vitest';
import {
  defaultOpeningTrainerConfig,
  startOpeningTrainerRound,
  submitOpeningTrainerSanMove,
  type OpeningTrainerConfig,
} from './openingTrainer';
import { createOpeningLookup, type OpeningLookupData, type OpeningLookupRecord } from './openings';

const createRecord = ({
  id,
  eco,
  name,
  pgn,
  sanMoves,
  family = name.split(':')[0],
}: {
  id: string;
  eco: string;
  name: string;
  pgn: string;
  sanMoves: string[];
  family?: string;
}): OpeningLookupRecord => {
  const chess = new Chess();
  const uciMoves: string[] = [];

  sanMoves.forEach((san) => {
    const move = chess.move(san);
    if (!move) {
      throw new Error(`Invalid SAN in test fixture: ${san}`);
    }
    uciMoves.push(`${move.from}${move.to}${move.promotion ?? ''}`);
  });

  return {
    id,
    eco,
    name,
    family,
    pgn,
    uci: uciMoves.join(' '),
    epd: chess.fen().split(' ').slice(0, 4).join(' '),
    plyCount: uciMoves.length,
    playerMoveCounts: {
      white: Math.ceil(uciMoves.length / 2),
      black: Math.floor(uciMoves.length / 2),
    },
  };
};

const buildLookup = () => {
  const records = [
    createRecord({
      id: 'record-1',
      eco: 'C00',
      name: 'French Defense',
      pgn: '1. e4 e6',
      sanMoves: ['e4', 'e6'],
    }),
    createRecord({
      id: 'record-2',
      eco: 'C00',
      name: 'French Defense',
      pgn: '1. e4 e6 2. d4 d5',
      sanMoves: ['e4', 'e6', 'd4', 'd5'],
    }),
    createRecord({
      id: 'record-3',
      eco: 'B20',
      name: 'Sicilian Defense',
      pgn: '1. e4 c5',
      sanMoves: ['e4', 'c5'],
    }),
    createRecord({
      id: 'record-4',
      eco: 'B10',
      name: 'Caro-Kann Defense',
      pgn: '1. e4 c6',
      sanMoves: ['e4', 'c6'],
    }),
  ];

  const data: OpeningLookupData = {
    meta: {
      generatedAt: '2026-03-23T00:00:00.000Z',
      sourceRepo: 'https://example.test',
      sourceRef: 'fixture',
      distFile: 'dist/all.tsv',
      recordCount: records.length,
      familyCount: 3,
    },
    families: [],
    records,
    lookupByEpd: records.reduce<Record<string, string[]>>((accumulator, record) => {
      const ids = accumulator[record.epd] ?? [];
      ids.push(record.id);
      accumulator[record.epd] = ids;
      return accumulator;
    }, {}),
  };

  return createOpeningLookup(data);
};

const buildConfig = (lookupLineIds: string[], overrides: Partial<OpeningTrainerConfig> = {}): OpeningTrainerConfig => ({
  ...defaultOpeningTrainerConfig,
  selectedLineIds: lookupLineIds,
  selectedFamilyNames: [],
  depthPlayerMoves: 1,
  ...overrides,
});

describe('opening trainer core', () => {
  it('auto-plays white first when the trainee is black', () => {
    const lookup = buildLookup();
    const frenchLineId = lookup.lines.find((line) => line.name === 'French Defense')?.id;

    if (!frenchLineId) {
      throw new Error('Missing French Defense line in test fixture.');
    }

    const round = startOpeningTrainerRound(lookup, buildConfig([frenchLineId], { playerColor: 'black' }), () => 0);

    expect(round.movesSan).toEqual(['e4']);
    expect(round.playedUciMoves).toEqual(['e2e4']);
    expect(round.phase).toBe('playing');
  });

  it('rejects a move that does not stay inside the selected opening pool', () => {
    const lookup = buildLookup();
    const frenchLineId = lookup.lines.find((line) => line.name === 'French Defense')?.id;

    if (!frenchLineId) {
      throw new Error('Missing French Defense line in test fixture.');
    }

    const round = startOpeningTrainerRound(lookup, buildConfig([frenchLineId], { playerColor: 'black' }), () => 0);
    const nextRound = submitOpeningTrainerSanMove(lookup, round, 'c5');

    expect(nextRound.error).toBe('Invalid move for the selected openings.');
    expect(nextRound.playedUciMoves).toEqual(['e2e4']);
    expect(nextRound.phase).toBe('playing');
  });

  it('narrows the active pool and randomizes over unique opponent replies', () => {
    const lookup = buildLookup();
    const frenchLineId = lookup.lines.find((line) => line.name === 'French Defense')?.id;
    const caroLineId = lookup.lines.find((line) => line.name === 'Caro-Kann Defense')?.id;

    if (!frenchLineId || !caroLineId) {
      throw new Error('Missing line ids in test fixture.');
    }

    const round = startOpeningTrainerRound(lookup, buildConfig([frenchLineId, caroLineId], { playerColor: 'white' }), () => 0);
    const nextRound = submitOpeningTrainerSanMove(lookup, round, 'e4', () => 0);

    expect(nextRound.movesSan).toEqual(['e4', 'c6']);
    expect(nextRound.phase).toBe('completed');
    expect(nextRound.opening?.name).toBe('Caro-Kann Defense');
  });

  it('falls back to the deepest remaining active line when the final board has no direct lookup match', () => {
    const lookup = buildLookup();
    const frenchLineId = lookup.lines.find((line) => line.name === 'French Defense')?.id;

    if (!frenchLineId) {
      throw new Error('Missing French Defense line in test fixture.');
    }

    const round = startOpeningTrainerRound(lookup, buildConfig([frenchLineId], { playerColor: 'black' }), () => 0);
    const completedRound = submitOpeningTrainerSanMove(lookup, round, 'e6', () => 0);

    expect(completedRound.phase).toBe('completed');
    expect(completedRound.opening?.name).toBe('French Defense');
  });
});
