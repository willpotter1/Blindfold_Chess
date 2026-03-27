import { Chess } from 'chess.js';
import { buildOpeningExplorerData } from '@/lib/openingExplorerCore.js';
import type { OpeningCatalog, OpeningLookupRecord } from '@/lib/openings';

export const createOpeningExplorerRecord = ({
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

export const buildOpeningExplorerEligibleCounts = (records: OpeningLookupRecord[]) => {
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

  return { white, black };
};

export const buildOpeningExplorerFixture = () => {
  const baseRecords = [
    createOpeningExplorerRecord({
      id: 'record-1',
      eco: 'C00',
      name: 'French Defense',
      pgn: '1. e4 e6',
      sanMoves: ['e4', 'e6'],
    }),
    createOpeningExplorerRecord({
      id: 'record-2',
      eco: 'C00',
      name: 'French Defense',
      pgn: '1. e4 e6 2. d4 d5',
      sanMoves: ['e4', 'e6', 'd4', 'd5'],
    }),
    createOpeningExplorerRecord({
      id: 'record-3',
      eco: 'B20',
      name: 'Sicilian Defense',
      pgn: '1. e4 c5',
      sanMoves: ['e4', 'c5'],
    }),
    createOpeningExplorerRecord({
      id: 'record-4',
      eco: 'B10',
      name: 'Caro-Kann Defense',
      pgn: '1. e4 c6',
      sanMoves: ['e4', 'c6'],
    }),
    createOpeningExplorerRecord({
      id: 'record-5',
      eco: 'C50',
      name: 'Italian Game',
      pgn: '1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5',
      sanMoves: ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Bc5'],
    }),
    createOpeningExplorerRecord({
      id: 'record-6',
      eco: 'C60',
      name: 'Ruy Lopez',
      pgn: '1. e4 e5 2. Nf3 Nc6 3. Bb5 a6',
      sanMoves: ['e4', 'e5', 'Nf3', 'Nc6', 'Bb5', 'a6'],
    }),
    createOpeningExplorerRecord({
      id: 'record-7',
      eco: 'D30',
      name: "Queen's Gambit Declined",
      pgn: '1. d4 d5 2. c4 e6',
      sanMoves: ['d4', 'd5', 'c4', 'e6'],
    }),
  ];

  const groupedRecords = new Map<string, OpeningLookupRecord[]>();
  const chunkKeyByFamily = new Map([
    ['French Defense', 'french-defense'],
    ['Sicilian Defense', 'sicilian-defense'],
    ['Caro-Kann Defense', 'caro-kann-defense'],
    ['Italian Game', 'italian-game'],
    ['Ruy Lopez', 'ruy-lopez'],
    ["Queen's Gambit Declined", 'queens-gambit-declined'],
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
      eligibleRecordCounts: buildOpeningExplorerEligibleCounts(records),
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

  const explorer = buildOpeningExplorerData({
    catalog,
    records,
  });

  return {
    catalog,
    records,
    explorer,
  };
};

export const getOpeningExplorerNodeForSanMoves = (
  explorer: ReturnType<typeof buildOpeningExplorerFixture>['explorer'],
  sanMoves: string[],
) => {
  const chess = new Chess();

  sanMoves.forEach((san) => {
    chess.move(san);
  });

  const epd = chess.fen().split(' ').slice(0, 4).join(' ');
  const node = explorer.nodes.find((entry) => entry.id === epd) ?? null;

  if (!node) {
    throw new Error(`Missing explorer node for path ${sanMoves.join(' ')}`);
  }

  return node;
};
