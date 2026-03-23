import { Chess } from 'chess.js';

export type OpeningInfo = {
  eco: string;
  name: string;
  pgn: string;
  uci: string;
};

export type OpeningLookupRecord = OpeningInfo & {
  id: string;
  family: string;
  epd: string;
  plyCount: number;
  playerMoveCounts: {
    white: number;
    black: number;
  };
};

export type OpeningFamilySummary = {
  name: string;
  recordCount: number;
  lineCount: number;
};

export type OpeningLookupData = {
  meta: {
    generatedAt: string;
    sourceRepo: string;
    sourceRef: string;
    distFile: string;
    recordCount: number;
    familyCount: number;
  };
  families: OpeningFamilySummary[];
  records: OpeningLookupRecord[];
  lookupByEpd: Record<string, string[]>;
};

export type OpeningLine = OpeningInfo & {
  id: string;
  family: string;
  plyCount: number;
  playerMoveCounts: {
    white: number;
    black: number;
  };
  recordIds: string[];
  uciMoves: string[];
};

export type OpeningFamily = OpeningFamilySummary & {
  lineIds: string[];
};

export type OpeningLookup = {
  meta: OpeningLookupData['meta'];
  families: OpeningFamily[];
  lines: OpeningLine[];
  records: OpeningLookupRecord[];
  getOpeningFromFen: (fen: string) => OpeningInfo | null;
  classifyOpeningFromHistory: (fens: string[]) => OpeningInfo | null;
  getLine: (id: string) => OpeningLine | null;
  getLinesForFamily: (familyName: string) => OpeningLine[];
  getRecordsForLine: (lineId: string) => OpeningLookupRecord[];
};

type CanonicalOpeningLine = OpeningLine & {
  canonicalRecord: OpeningLookupRecord;
};

const OPENINGS_DATA_URL = `${import.meta.env.BASE_URL.replace(/\/$/, '')}/data/lichess-openings.lookup.json`;

const splitUciMoves = (uci: string) => uci.trim().split(/\s+/).filter(Boolean);

const compareSpecificity = (left: OpeningLookupRecord, right: OpeningLookupRecord) => {
  if (right.plyCount !== left.plyCount) {
    return right.plyCount - left.plyCount;
  }

  const ecoComparison = left.eco.localeCompare(right.eco);
  if (ecoComparison !== 0) {
    return ecoComparison;
  }

  const nameComparison = left.name.localeCompare(right.name);
  if (nameComparison !== 0) {
    return nameComparison;
  }

  return left.uci.localeCompare(right.uci);
};

const compareCanonicalPriority = (left: OpeningLookupRecord, right: OpeningLookupRecord) => {
  if (left.plyCount !== right.plyCount) {
    return left.plyCount - right.plyCount;
  }

  const ecoComparison = left.eco.localeCompare(right.eco);
  if (ecoComparison !== 0) {
    return ecoComparison;
  }

  return left.uci.localeCompare(right.uci);
};

export const normalizeFenToOpeningEpd = (fen: string) => {
  const chess = new Chess(fen);
  return chess.fen().split(' ').slice(0, 4).join(' ');
};

const groupRecordsByName = (records: OpeningLookupRecord[]) => {
  const recordsByName = new Map<string, OpeningLookupRecord[]>();

  for (const record of records) {
    const currentRecords = recordsByName.get(record.name) ?? [];
    currentRecords.push(record);
    recordsByName.set(record.name, currentRecords);
  }

  return recordsByName;
};

const buildCanonicalLines = (records: OpeningLookupRecord[]) => {
  const recordsByName = groupRecordsByName(records);
  const canonicalLines = new Map<string, CanonicalOpeningLine>();
  const lineIdByName = new Map<string, string>();

  const canonicalRecords = Array.from(recordsByName.entries())
    .map(([name, groupedRecords]) => ({
      name,
      records: groupedRecords,
      canonicalRecord: [...groupedRecords].sort(compareCanonicalPriority)[0],
    }))
    .sort((left, right) => {
      const ecoComparison = left.canonicalRecord.eco.localeCompare(right.canonicalRecord.eco);
      if (ecoComparison !== 0) {
        return ecoComparison;
      }

      return left.canonicalRecord.name.localeCompare(right.canonicalRecord.name);
    });

  canonicalRecords.forEach(({ name, records: groupedRecords, canonicalRecord }, index) => {
    const lineId = `line-${index + 1}`;
    lineIdByName.set(name, lineId);
    canonicalLines.set(lineId, {
      id: lineId,
      eco: canonicalRecord.eco,
      name: canonicalRecord.name,
      family: canonicalRecord.family,
      pgn: canonicalRecord.pgn,
      uci: canonicalRecord.uci,
      plyCount: canonicalRecord.plyCount,
      playerMoveCounts: canonicalRecord.playerMoveCounts,
      recordIds: groupedRecords.map((record) => record.id).sort(),
      uciMoves: splitUciMoves(canonicalRecord.uci),
      canonicalRecord,
    });
  });

  return {
    canonicalLines,
    lineIdByName,
  };
};

const createFamilies = (canonicalLines: CanonicalOpeningLine[]) => {
  const families = new Map<string, OpeningFamily>();

  for (const line of canonicalLines) {
    const family = families.get(line.family) ?? {
      name: line.family,
      recordCount: 0,
      lineCount: 0,
      lineIds: [],
    };
    family.lineIds.push(line.id);
    family.lineCount += 1;
    family.recordCount += line.recordIds.length;
    families.set(line.family, family);
  }

  return Array.from(families.values()).sort((left, right) => left.name.localeCompare(right.name));
};

export const createOpeningLookup = (data: OpeningLookupData): OpeningLookup => {
  const recordsById = new Map(data.records.map((record) => [record.id, record]));
  const { canonicalLines, lineIdByName } = buildCanonicalLines(data.records);
  const canonicalLineByName = new Map(
    Array.from(canonicalLines.values()).map((line) => [line.name, line]),
  );
  const lines = Array.from(canonicalLines.values()).map((line) => ({
    id: line.id,
    eco: line.eco,
    name: line.name,
    family: line.family,
    pgn: line.pgn,
    uci: line.uci,
    plyCount: line.plyCount,
    playerMoveCounts: line.playerMoveCounts,
    recordIds: line.recordIds,
    uciMoves: line.uciMoves,
  }));
  const lineById = new Map(lines.map((line) => [line.id, line]));
  const families = createFamilies(Array.from(canonicalLines.values()));

  const getCanonicalInfoForRecord = (record: OpeningLookupRecord): OpeningInfo | null => {
    const canonicalLine = canonicalLineByName.get(record.name);

    if (!canonicalLine) {
      return null;
    }

    return {
      eco: canonicalLine.eco,
      name: canonicalLine.name,
      pgn: canonicalLine.pgn,
      uci: canonicalLine.uci,
    };
  };

  const getOpeningFromFen = (fen: string): OpeningInfo | null => {
    try {
      const epd = normalizeFenToOpeningEpd(fen);
      const matchingIds = data.lookupByEpd[epd] ?? [];

      if (matchingIds.length === 0) {
        return null;
      }

      const matchingRecords = matchingIds
        .map((id) => recordsById.get(id))
        .filter(Boolean)
        .sort(compareSpecificity);
      const bestMatch = matchingRecords[0];

      return bestMatch ? getCanonicalInfoForRecord(bestMatch) : null;
    } catch {
      return null;
    }
  };

  const classifyOpeningFromHistory = (fens: string[]) => {
    for (let index = fens.length - 1; index >= 0; index -= 1) {
      const openingInfo = getOpeningFromFen(fens[index]);

      if (openingInfo) {
        return openingInfo;
      }
    }

    return null;
  };

  return {
    meta: data.meta,
    families,
    lines,
    records: data.records,
    getOpeningFromFen,
    classifyOpeningFromHistory,
    getLine: (id) => lineById.get(id) ?? null,
    getLinesForFamily: (familyName) => {
      const family = families.find((entry) => entry.name === familyName);

      if (!family) {
        return [];
      }

      return family.lineIds.map((lineId) => lineById.get(lineId)).filter(Boolean);
    },
    getRecordsForLine: (lineId) => {
      const line = lineById.get(lineId);

      if (!line) {
        return [];
      }

      return line.recordIds.map((recordId) => recordsById.get(recordId)).filter(Boolean);
    },
  };
};

let openingLookupPromise: Promise<OpeningLookup> | null = null;

export const getOpeningLookup = async () => {
  if (!openingLookupPromise) {
    openingLookupPromise = fetch(OPENINGS_DATA_URL)
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(`Failed to load openings data: ${response.status}`);
        }

        return response.json() as Promise<OpeningLookupData>;
      })
      .then((data) => createOpeningLookup(data));
  }

  return openingLookupPromise;
};

export const getOpeningLineIdByName = (lookup: OpeningLookup, openingName: string) => (
  lookup.lines.find((line) => line.name === openingName)?.id ?? null
);

export const getOpeningLineIdsByFamilyNames = (lookup: OpeningLookup, familyNames: string[]) => {
  const selectedFamilies = new Set(familyNames);

  return lookup.families
    .filter((family) => selectedFamilies.has(family.name))
    .flatMap((family) => family.lineIds);
};

export const getOpeningLineIdSet = (lookup: OpeningLookup, lineIds: string[]) => {
  const uniqueLineIds = new Set<string>();

  lineIds.forEach((lineId) => {
    if (lookup.getLine(lineId)) {
      uniqueLineIds.add(lineId);
    }
  });

  return uniqueLineIds;
};

export const getOpeningCanonicalInfoFromLine = (line: OpeningLine): OpeningInfo => ({
  eco: line.eco,
  name: line.name,
  pgn: line.pgn,
  uci: line.uci,
});

export const getOpeningLineNameIdMap = (lookup: OpeningLookup) => (
  new Map(lookup.lines.map((line) => [line.name, line.id]))
);

export const getCanonicalLineIdForRecord = (
  lookup: OpeningLookup,
  record: OpeningLookupRecord,
) => {
  const lineIdMap = getOpeningLineNameIdMap(lookup);
  return lineIdMap.get(record.name) ?? null;
};
