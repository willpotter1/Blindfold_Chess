import { Chess } from 'chess.js';
import { describe, expect, it } from 'vitest';
import { createOpeningLookup, type OpeningLookupData, type OpeningLookupRecord } from './openings';

const createRecord = ({
  id,
  eco,
  name,
  pgn,
  sanMoves,
  family = name.split(':')[0],
  epdOverride,
}: {
  id: string;
  eco: string;
  name: string;
  pgn: string;
  sanMoves: string[];
  family?: string;
  epdOverride?: string;
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
    epd: epdOverride ?? chess.fen().split(' ').slice(0, 4).join(' '),
    plyCount: uciMoves.length,
    playerMoveCounts: {
      white: Math.ceil(uciMoves.length / 2),
      black: Math.floor(uciMoves.length / 2),
    },
  };
};

const buildLookup = () => {
  const frenchCanonical = createRecord({
    id: 'record-1',
    eco: 'C00',
    name: 'French Defense',
    pgn: '1. e4 e6',
    sanMoves: ['e4', 'e6'],
  });
  const frenchLong = createRecord({
    id: 'record-2',
    eco: 'C00',
    name: 'French Defense',
    pgn: '1. e4 e6 2. d4 d5',
    sanMoves: ['e4', 'e6', 'd4', 'd5'],
  });
  const sicilian = createRecord({
    id: 'record-3',
    eco: 'B20',
    name: 'Sicilian Defense',
    pgn: '1. e4 c5',
    sanMoves: ['e4', 'c5'],
  });
  const qgd = createRecord({
    id: 'record-4',
    eco: 'D30',
    name: "Queen's Gambit Declined",
    pgn: '1. d4 d5 2. c4 e6',
    sanMoves: ['d4', 'd5', 'c4', 'e6'],
  });
  const duplicateShort = createRecord({
    id: 'record-5',
    eco: 'Z01',
    name: 'Collision Short',
    pgn: '1. a3',
    sanMoves: ['a3'],
    epdOverride: sicilian.epd,
  });
  const duplicateLong = createRecord({
    id: 'record-6',
    eco: 'Z02',
    name: 'Collision Long',
    pgn: '1. a3 a6 2. h3',
    sanMoves: ['a3', 'a6', 'h3'],
    epdOverride: sicilian.epd,
  });

  const records = [
    frenchCanonical,
    frenchLong,
    sicilian,
    qgd,
    duplicateShort,
    duplicateLong,
  ];

  const lookupByEpd = records.reduce<Record<string, string[]>>((accumulator, record) => {
    const ids = accumulator[record.epd] ?? [];
    ids.push(record.id);
    accumulator[record.epd] = ids;
    return accumulator;
  }, {});

  const data: OpeningLookupData = {
    meta: {
      generatedAt: '2026-03-23T00:00:00.000Z',
      sourceRepo: 'https://example.test',
      sourceRef: 'fixture',
      distFile: 'dist/all.tsv',
      recordCount: records.length,
      familyCount: 4,
    },
    families: [],
    records,
    lookupByEpd,
  };

  return {
    lookup: createOpeningLookup(data),
    records: {
      frenchCanonical,
      frenchLong,
      sicilian,
      qgd,
      duplicateShort,
      duplicateLong,
    },
  };
};

describe('openings lookup', () => {
  it('returns the canonical shortest line for a matched transposition record name', () => {
    const { lookup, records } = buildLookup();
    const fenWithDifferentCounters = `${records.frenchLong.epd} 19 42`;

    const result = lookup.getOpeningFromFen(fenWithDifferentCounters);

    expect(result).toEqual({
      eco: 'C00',
      name: 'French Defense',
      pgn: '1. e4 e6',
      uci: 'e2e4 e7e6',
    });
  });

  it('prefers the deepest candidate when multiple records share the same normalized position', () => {
    const { lookup, records } = buildLookup();
    const result = lookup.getOpeningFromFen(`${records.sicilian.epd} 0 7`);

    expect(result).toEqual({
      eco: 'Z02',
      name: 'Collision Long',
      pgn: '1. a3 a6 2. h3',
      uci: 'a2a3 a7a6 h2h3',
    });
  });

  it('classifies a transposed game by scanning backward through prior positions', () => {
    const { lookup } = buildLookup();
    const chess = new Chess();
    const history = [chess.fen()];

    ['d4', 'e6', 'c4', 'd5'].forEach((san) => {
      chess.move(san);
      history.push(chess.fen());
    });

    expect(lookup.classifyOpeningFromHistory(history)).toEqual({
      eco: 'D30',
      name: "Queen's Gambit Declined",
      pgn: '1. d4 d5 2. c4 e6',
      uci: 'd2d4 d7d5 c2c4 e7e6',
    });
  });

  it('returns null for invalid FEN input', () => {
    const { lookup } = buildLookup();

    expect(lookup.getOpeningFromFen('not a fen')).toBeNull();
  });
});
