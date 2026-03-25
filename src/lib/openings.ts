import { Chess } from 'chess.js';

export type OpeningInfo = {
  eco: string;
  name: string;
  pgn: string;
  uci: string;
};

export type OpeningLookupMeta = {
  generatedAt: string;
  sourceRepo: string;
  sourceRef: string;
  distFile: string;
  recordCount: number;
  familyCount: number;
  lineCount: number;
};

export type OpeningLookupRecord = OpeningInfo & {
  id: string;
  lineId: string;
  family: string;
  epd: string;
  plyCount: number;
  playerMoveCounts: {
    white: number;
    black: number;
  };
};

export type OpeningTrainingSelection = {
  selectedFamilyNames: string[];
  selectedLineIds: string[];
  playerColor: 'white' | 'black';
  depthPlayerMoves: number;
};

export type OpeningEligibleRecordCounts = {
  white: number[];
  black: number[];
};

export type OpeningCatalogLine = {
  id: string;
  name: string;
  family: string;
  chunkKey: string;
  recordCount: number;
  eligibleRecordCounts: OpeningEligibleRecordCounts;
};

export type OpeningLine = OpeningInfo & OpeningCatalogLine & {
  plyCount: number;
  playerMoveCounts: {
    white: number;
    black: number;
  };
};

export type OpeningFamilySummary = {
  name: string;
  chunkKey: string;
  recordCount: number;
  positionCount: number;
  lineCount: number;
};

export type OpeningFamily = OpeningFamilySummary & {
  lineIds: string[];
};

export type OpeningCatalog = {
  meta: OpeningLookupMeta;
  families: OpeningFamily[];
  lines: OpeningCatalogLine[];
};

type OpeningChunkData = {
  meta: {
    generatedAt: string;
    sourceRef: string;
    familyName: string;
    chunkKey: string;
    recordCount: number;
    lineCount: number;
  };
  records: OpeningLookupRecord[];
};

export type OpeningLookup = {
  meta: OpeningLookupMeta;
  families: OpeningFamily[];
  lines: OpeningLine[];
  records: OpeningLookupRecord[];
  getOpeningFromFen: (fen: string) => OpeningInfo | null;
  classifyOpeningFromHistory: (fens: string[]) => OpeningInfo | null;
  getLine: (id: string) => OpeningLine | null;
  getLinesForFamily: (familyName: string) => OpeningLine[];
  getRecordsForLine: (lineId: string) => OpeningLookupRecord[];
};

const baseUrl = import.meta.env.BASE_URL.replace(/\/$/, '');
const OPENINGS_CATALOG_URL = `${baseUrl}/data/lichess-openings.lookup.json`;
const OPENINGS_CHUNK_BASE_URL = `${baseUrl}/data/lichess-openings.chunks`;

const sortAndDedupeTextValues = (values: string[]) => (
  Array.from(new Set(values.filter(Boolean))).sort((left, right) => left.localeCompare(right))
);

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

const getOpeningChunkUrl = (chunkKey: string) => `${OPENINGS_CHUNK_BASE_URL}/${chunkKey}.json`;

export const normalizeFenToOpeningEpd = (fen: string) => {
  const chess = new Chess(fen);
  return chess.fen().split(' ').slice(0, 4).join(' ');
};

let openingCatalogPromise: Promise<OpeningCatalog> | null = null;
const openingChunkPromises = new Map<string, Promise<OpeningLookupRecord[]>>();

export const resetOpeningAssetCachesForTests = () => {
  openingCatalogPromise = null;
  openingChunkPromises.clear();
};

export const getOpeningCatalog = async () => {
  if (!openingCatalogPromise) {
    openingCatalogPromise = fetch(OPENINGS_CATALOG_URL).then(async (response) => {
      if (!response.ok) {
        throw new Error(`Failed to load openings catalog: ${response.status}`);
      }

      return response.json() as Promise<OpeningCatalog>;
    });
  }

  return openingCatalogPromise;
};

const loadOpeningChunkRecords = async (chunkKey: string) => {
  const existingPromise = openingChunkPromises.get(chunkKey);

  if (existingPromise) {
    return existingPromise;
  }

  const nextPromise = fetch(getOpeningChunkUrl(chunkKey))
    .then(async (response) => {
      if (!response.ok) {
        throw new Error(`Failed to load opening chunk ${chunkKey}: ${response.status}`);
      }

      return response.json() as Promise<OpeningChunkData>;
    })
    .then((payload) => payload.records);

  openingChunkPromises.set(chunkKey, nextPromise);
  return nextPromise;
};

const resolveOpeningChunkKeys = (
  catalog: OpeningCatalog,
  selection: OpeningTrainingSelection,
) => {
  const chunkKeys = new Set<string>();
  const familiesByName = new Map(catalog.families.map((family) => [family.name, family]));
  const linesById = new Map(catalog.lines.map((line) => [line.id, line]));

  selection.selectedFamilyNames.forEach((familyName) => {
    const family = familiesByName.get(familyName);

    if (family) {
      chunkKeys.add(family.chunkKey);
    }
  });

  selection.selectedLineIds.forEach((lineId) => {
    const line = linesById.get(lineId);

    if (line) {
      chunkKeys.add(line.chunkKey);
    }
  });

  return Array.from(chunkKeys).sort((left, right) => left.localeCompare(right));
};

export const loadOpeningTrainingRecords = async (
  selection: OpeningTrainingSelection,
  catalogOverride?: OpeningCatalog,
) => {
  const catalog = catalogOverride ?? await getOpeningCatalog();
  const chunkKeys = resolveOpeningChunkKeys(catalog, selection);

  if (chunkKeys.length === 0) {
    return [] as OpeningLookupRecord[];
  }

  const selectedFamilies = new Set(sortAndDedupeTextValues(selection.selectedFamilyNames));
  const selectedLineIds = new Set(sortAndDedupeTextValues(selection.selectedLineIds));
  const loadedChunks = await Promise.all(chunkKeys.map((chunkKey) => loadOpeningChunkRecords(chunkKey)));
  const dedupedRecords = new Map<string, OpeningLookupRecord>();

  loadedChunks.flat().forEach((record) => {
    if (!selectedFamilies.has(record.family) && !selectedLineIds.has(record.lineId)) {
      return;
    }

    if (record.playerMoveCounts[selection.playerColor] < selection.depthPlayerMoves) {
      return;
    }

    dedupedRecords.set(record.id, record);
  });

  return Array.from(dedupedRecords.values()).sort((left, right) => left.id.localeCompare(right.id));
};

export const createOpeningLookup = ({
  catalog,
  records,
}: {
  catalog: OpeningCatalog;
  records: OpeningLookupRecord[];
}): OpeningLookup => {
  const families = [...catalog.families].sort((left, right) => left.name.localeCompare(right.name));
  const recordsById = new Map(records.map((record) => [record.id, record]));
  const recordIdsByLineId = new Map<string, string[]>();
  const recordIdsByEpd = new Map<string, string[]>();

  for (const record of records) {
    const recordIdsForLine = recordIdsByLineId.get(record.lineId) ?? [];
    recordIdsForLine.push(record.id);
    recordIdsByLineId.set(record.lineId, recordIdsForLine);

    const recordIdsForEpd = recordIdsByEpd.get(record.epd) ?? [];
    recordIdsForEpd.push(record.id);
    recordIdsByEpd.set(record.epd, recordIdsForEpd);
  }

  for (const recordIds of recordIdsByEpd.values()) {
    recordIds.sort((leftId, rightId) => (
      compareSpecificity(recordsById.get(leftId)!, recordsById.get(rightId)!)
    ));
  }

  const lineById = new Map(
    catalog.lines
      .map((catalogLine) => {
        const lineRecords = (recordIdsByLineId.get(catalogLine.id) ?? [])
          .map((recordId) => recordsById.get(recordId))
          .filter((record): record is OpeningLookupRecord => Boolean(record));

        if (lineRecords.length === 0) {
          return null;
        }

        const canonicalRecord = [...lineRecords].sort(compareCanonicalPriority)[0];

        return [catalogLine.id, {
          ...catalogLine,
          eco: canonicalRecord.eco,
          name: canonicalRecord.name,
          pgn: canonicalRecord.pgn,
          uci: canonicalRecord.uci,
          plyCount: canonicalRecord.plyCount,
          playerMoveCounts: canonicalRecord.playerMoveCounts,
        } satisfies OpeningLine] as const;
      })
      .filter((entry): entry is readonly [string, OpeningLine] => Boolean(entry)),
  );
  const lines = Array.from(lineById.values());

  const getCanonicalInfoForRecord = (record: OpeningLookupRecord): OpeningInfo | null => {
    const line = lineById.get(record.lineId);

    if (!line) {
      return null;
    }

    return getOpeningCanonicalInfoFromLine(line);
  };

  const getOpeningFromFen = (fen: string): OpeningInfo | null => {
    try {
      const epd = normalizeFenToOpeningEpd(fen);
      const matchingIds = recordIdsByEpd.get(epd) ?? [];

      if (matchingIds.length === 0) {
        return null;
      }

      const bestMatch = recordsById.get(matchingIds[0]);
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
    meta: catalog.meta,
    families,
    lines,
    records,
    getOpeningFromFen,
    classifyOpeningFromHistory,
    getLine: (id) => lineById.get(id) ?? null,
    getLinesForFamily: (familyName) => {
      const family = families.find((entry) => entry.name === familyName);

      if (!family) {
        return [];
      }

      return family.lineIds
        .map((lineId) => lineById.get(lineId))
        .filter((line): line is OpeningLine => Boolean(line));
    },
    getRecordsForLine: (lineId) => (
      (recordIdsByLineId.get(lineId) ?? [])
        .map((recordId) => recordsById.get(recordId))
        .filter((record): record is OpeningLookupRecord => Boolean(record))
    ),
  };
};

export const getOpeningLineIdByName = (lookup: Pick<OpeningLookup, 'lines'>, openingName: string) => (
  lookup.lines.find((line) => line.name === openingName)?.id ?? null
);

export const getOpeningLineIdsByFamilyNames = (
  lookup: Pick<OpeningLookup, 'families'>,
  familyNames: string[],
) => {
  const selectedFamilies = new Set(familyNames);

  return lookup.families
    .filter((family) => selectedFamilies.has(family.name))
    .flatMap((family) => family.lineIds);
};

export const getOpeningLineIdSet = (
  lookup: Pick<OpeningLookup, 'getLine'>,
  lineIds: string[],
) => {
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

export const getOpeningLineNameIdMap = (lookup: Pick<OpeningLookup, 'lines'>) => (
  new Map(lookup.lines.map((line) => [line.name, line.id]))
);

export const getCanonicalLineIdForRecord = (
  lookup: Pick<OpeningLookup, 'getLine' | 'lines'>,
  record: OpeningLookupRecord,
) => {
  if (lookup.getLine(record.lineId)) {
    return record.lineId;
  }

  const lineIdMap = getOpeningLineNameIdMap(lookup);
  return lineIdMap.get(record.name) ?? null;
};
