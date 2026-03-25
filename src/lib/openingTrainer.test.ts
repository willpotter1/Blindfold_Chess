import { Chess } from 'chess.js';
import { describe, expect, it } from 'vitest';
import {
  defaultOpeningTrainerConfig,
  getOpeningTrainerConfigStatus,
  startOpeningTrainerRound,
  submitOpeningTrainerSanMove,
  type OpeningTrainerConfig,
} from './openingTrainer';
import { createOpeningLookup, type OpeningCatalog, type OpeningLookupRecord } from './openings';

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
    lineId: '',
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

const buildEligibleRecordCounts = (records: OpeningLookupRecord[]) => {
  const whiteExactCounts = new Map<number, number>();
  const blackExactCounts = new Map<number, number>();
  let maxWhiteMoves = 0;
  let maxBlackMoves = 0;

  records.forEach((record) => {
    const whiteMoves = record.playerMoveCounts.white;
    const blackMoves = record.playerMoveCounts.black;

    whiteExactCounts.set(whiteMoves, (whiteExactCounts.get(whiteMoves) ?? 0) + 1);
    blackExactCounts.set(blackMoves, (blackExactCounts.get(blackMoves) ?? 0) + 1);
    maxWhiteMoves = Math.max(maxWhiteMoves, whiteMoves);
    maxBlackMoves = Math.max(maxBlackMoves, blackMoves);
  });

  const white = Array.from({ length: maxWhiteMoves + 1 }, () => 0);
  const black = Array.from({ length: maxBlackMoves + 1 }, () => 0);

  for (let depth = maxWhiteMoves; depth >= 0; depth -= 1) {
    white[depth] = (whiteExactCounts.get(depth) ?? 0) + (white[depth + 1] ?? 0);
  }

  for (let depth = maxBlackMoves; depth >= 0; depth -= 1) {
    black[depth] = (blackExactCounts.get(depth) ?? 0) + (black[depth + 1] ?? 0);
  }

  return {
    white,
    black,
  };
};

const buildLookup = () => {
  const baseRecords = [
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

  const groupedRecords = new Map<string, OpeningLookupRecord[]>();
  const chunkKeyByFamily = new Map([
    ['French Defense', 'french-defense'],
    ['Sicilian Defense', 'sicilian-defense'],
    ['Caro-Kann Defense', 'caro-kann-defense'],
  ]);

  baseRecords.forEach((record) => {
    const entries = groupedRecords.get(record.name) ?? [];
    entries.push(record);
    groupedRecords.set(record.name, entries);
  });

  const canonicalGroups = Array.from(groupedRecords.entries())
    .map(([name, records]) => ({
      name,
      records,
      canonicalRecord: [...records].sort((left, right) => (
        left.plyCount - right.plyCount ||
        left.eco.localeCompare(right.eco) ||
        left.uci.localeCompare(right.uci)
      ))[0],
    }))
    .sort((left, right) => (
      left.canonicalRecord.eco.localeCompare(right.canonicalRecord.eco) ||
      left.canonicalRecord.name.localeCompare(right.canonicalRecord.name)
    ));

  const lineIdByName = new Map<string, string>();
  const lines = canonicalGroups.map(({ name, records, canonicalRecord }, index) => {
    const lineId = `line-${index + 1}`;
    lineIdByName.set(name, lineId);

    return {
      id: lineId,
      name: canonicalRecord.name,
      family: canonicalRecord.family,
      chunkKey: chunkKeyByFamily.get(canonicalRecord.family) ?? canonicalRecord.family,
      recordCount: records.length,
      eligibleRecordCounts: buildEligibleRecordCounts(records),
    };
  });

  const records = baseRecords.map((record) => ({
    ...record,
    lineId: lineIdByName.get(record.name) ?? record.lineId,
  }));

  const familiesMap = new Map<string, { name: string; chunkKey: string; recordCount: number; positionCount: number; lineCount: number; lineIds: string[] }>();
  lines.forEach((line) => {
    const family = familiesMap.get(line.family) ?? {
      name: line.family,
      chunkKey: line.chunkKey,
      recordCount: 0,
      positionCount: 0,
      lineCount: 0,
      lineIds: [],
    };
    family.recordCount += line.recordCount;
    family.positionCount += line.recordCount;
    family.lineCount += 1;
    family.lineIds.push(line.id);
    familiesMap.set(line.family, family);
  });

  const catalog: OpeningCatalog = {
    meta: {
      generatedAt: '2026-03-23T00:00:00.000Z',
      sourceRepo: 'https://example.test',
      sourceRef: 'fixture',
      distFile: 'dist/all.tsv',
      recordCount: records.length,
      familyCount: familiesMap.size,
      lineCount: lines.length,
    },
    families: Array.from(familiesMap.values()),
    lines,
  };

  return {
    catalog,
    lookup: createOpeningLookup({
      catalog,
      records,
    }),
  };
};

const buildConfig = (lookupLineIds: string[], overrides: Partial<OpeningTrainerConfig> = {}): OpeningTrainerConfig => ({
  ...defaultOpeningTrainerConfig,
  selectedLineIds: lookupLineIds,
  selectedFamilyNames: [],
  depthPlayerMoves: 1,
  ...overrides,
});

describe('opening trainer core', () => {
  it('computes matching counts from the catalog without loading record data', () => {
    const { catalog } = buildLookup();
    const frenchConfig = buildConfig([], {
      selectedFamilyNames: ['French Defense'],
      depthPlayerMoves: 2,
      playerColor: 'white',
    });

    expect(getOpeningTrainerConfigStatus(catalog, frenchConfig)).toMatchObject({
      matchingLineCount: 1,
      matchingRecordCount: 1,
      isStartDisabled: false,
    });
  });

  it('auto-plays white first when the trainee is black', () => {
    const { lookup } = buildLookup();
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
    const { lookup } = buildLookup();
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
    const { lookup } = buildLookup();
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
    const { lookup } = buildLookup();
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
