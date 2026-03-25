import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Chess } from 'chess.js';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createOpeningLookup,
  loadOpeningTrainingRecords,
  resetOpeningAssetCachesForTests,
  type OpeningCatalog,
  type OpeningLookupRecord,
} from './openings';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '..', '..');

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
    lineId: '',
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

const buildLookupFixture = () => {
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

  const baseRecords = [
    frenchCanonical,
    frenchLong,
    sicilian,
    qgd,
    duplicateShort,
    duplicateLong,
  ];
  const chunkKeyByFamily = new Map([
    ['French Defense', 'french-defense'],
    ['Sicilian Defense', 'sicilian-defense'],
    ["Queen's Gambit Declined", 'queens-gambit-declined'],
    ['Collision Short', 'collision-short'],
    ['Collision Long', 'collision-long'],
  ]);
  const groupedRecords = new Map<string, OpeningLookupRecord[]>();

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

  const familiesMap = new Map<string, {
    name: string;
    chunkKey: string;
    recordCount: number;
    positionCount: number;
    lineCount: number;
    lineIds: string[];
  }>();

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
    records,
  };
};

beforeEach(() => {
  resetOpeningAssetCachesForTests();
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('openings lookup', () => {
  it('returns the canonical shortest line for a matched transposition record name', () => {
    const { lookup, records } = buildLookupFixture();
    const frenchLong = records.find((record) => record.name === 'French Defense' && record.plyCount === 4);

    if (!frenchLong) {
      throw new Error('Missing French Defense long record in test fixture.');
    }

    const result = lookup.getOpeningFromFen(`${frenchLong.epd} 19 42`);

    expect(result).toEqual({
      eco: 'C00',
      name: 'French Defense',
      pgn: '1. e4 e6',
      uci: 'e2e4 e7e6',
    });
  });

  it('prefers the deepest candidate when multiple records share the same normalized position', () => {
    const { lookup, records } = buildLookupFixture();
    const sicilian = records.find((record) => record.name === 'Sicilian Defense');

    if (!sicilian) {
      throw new Error('Missing Sicilian Defense record in test fixture.');
    }

    const result = lookup.getOpeningFromFen(`${sicilian.epd} 0 7`);

    expect(result).toEqual({
      eco: 'Z02',
      name: 'Collision Long',
      pgn: '1. a3 a6 2. h3',
      uci: 'a2a3 a7a6 h2h3',
    });
  });

  it('classifies a transposed game by scanning backward through prior positions', () => {
    const { lookup } = buildLookupFixture();
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
    const { lookup } = buildLookupFixture();

    expect(lookup.getOpeningFromFen('not a fen')).toBeNull();
  });

  it('loads only the required family chunks and filters records client-side', async () => {
    const { catalog, records } = buildLookupFixture();
    const familyRecords = catalog.families.reduce<Record<string, OpeningLookupRecord[]>>((accumulator, family) => {
      accumulator[family.chunkKey] = records.filter((record) => record.family === family.name);
      return accumulator;
    }, {});
    const fetchMock = vi.fn(async (input: string | URL | Request) => {
      const chunkKey = String(input).split('/').pop()?.replace(/\.json$/, '');

      if (!chunkKey || !familyRecords[chunkKey]) {
        return {
          ok: false,
          status: 404,
          json: async () => ({}),
        };
      }

      return {
        ok: true,
        status: 200,
        json: async () => ({
          meta: {
            generatedAt: 'fixture',
            sourceRef: 'fixture',
            familyName: catalog.families.find((family) => family.chunkKey === chunkKey)?.name ?? '',
            chunkKey,
            recordCount: familyRecords[chunkKey].length,
            lineCount: 1,
          },
          records: familyRecords[chunkKey],
        }),
      };
    });

    vi.stubGlobal('fetch', fetchMock);

    const sicilianLineId = catalog.lines.find((line) => line.name === 'Sicilian Defense')?.id;

    if (!sicilianLineId) {
      throw new Error('Missing Sicilian Defense line in test fixture.');
    }

    const loadedRecords = await loadOpeningTrainingRecords({
      selectedFamilyNames: ['French Defense'],
      selectedLineIds: [sicilianLineId],
      playerColor: 'black',
      depthPlayerMoves: 1,
    }, catalog);

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls.map(([url]) => String(url)).sort()).toEqual([
      '/data/lichess-openings.chunks/french-defense.json',
      '/data/lichess-openings.chunks/sicilian-defense.json',
    ]);
    expect(loadedRecords.map((record) => record.id)).toEqual(['record-1', 'record-2', 'record-3']);
  });

  it('writes a generated catalog where every line resolves to an existing family chunk', () => {
    const catalogPath = path.join(PROJECT_ROOT, 'public', 'data', 'lichess-openings.lookup.json');
    const chunkDirectoryPath = path.join(PROJECT_ROOT, 'public', 'data', 'lichess-openings.chunks');
    const catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf8')) as OpeningCatalog;
    const familyByName = new Map(catalog.families.map((family) => [family.name, family]));

    expect(catalog.families.length).toBeGreaterThan(0);
    expect(catalog.lines.length).toBeGreaterThan(0);

    catalog.lines.forEach((line) => {
      const family = familyByName.get(line.family);

      expect(family?.chunkKey).toBe(line.chunkKey);
      expect(fs.existsSync(path.join(chunkDirectoryPath, `${line.chunkKey}.json`))).toBe(true);
    });
  });
});
