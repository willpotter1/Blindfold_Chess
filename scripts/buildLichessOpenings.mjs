#!/usr/bin/env node

import { execFileSync } from 'node:child_process';
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');
const SOURCE_MANIFEST_PATH = path.join(ROOT_DIR, 'data', 'lichess-openings-source.json');
const OUTPUT_PUBLIC_CATALOG_PATH = path.join(ROOT_DIR, 'public', 'data', 'lichess-openings.lookup.json');
const OUTPUT_PUBLIC_CHUNKS_DIR = path.join(ROOT_DIR, 'public', 'data', 'lichess-openings.chunks');
const OUTPUT_PROCESSED_CATALOG_PATH = path.join(ROOT_DIR, 'data', 'processed', 'lichess-openings.lookup.json');
const OUTPUT_PROCESSED_RECORDS_PATH = path.join(ROOT_DIR, 'data', 'processed', 'lichess-openings.records.json');
const OUTPUT_PROCESSED_CHUNKS_DIR = path.join(ROOT_DIR, 'data', 'processed', 'lichess-openings.chunks');

const parseArgs = (argv) => {
  const parsed = {};

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];

    if (!token.startsWith('--')) {
      continue;
    }

    const key = token.slice(2);
    const nextValue = argv[index + 1];

    if (!nextValue || nextValue.startsWith('--')) {
      parsed[key] = 'true';
      continue;
    }

    parsed[key] = nextValue;
    index += 1;
  }

  return parsed;
};

const readJsonFile = (filePath) => JSON.parse(readFileSync(filePath, 'utf8'));

const writeJsonFile = (filePath, value) => {
  mkdirSync(path.dirname(filePath), { recursive: true });
  writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
};

const resetDirectory = (directoryPath) => {
  rmSync(directoryPath, { recursive: true, force: true });
  mkdirSync(directoryPath, { recursive: true });
};

const run = (command, args, options = {}) => execFileSync(command, args, {
  cwd: options.cwd,
  env: options.env,
  stdio: options.captureOutput ? 'pipe' : 'inherit',
  encoding: options.captureOutput ? 'utf8' : undefined,
});

const ensurePythonChessInstalled = () => {
  try {
    run('python3', ['-c', 'import chess'], { captureOutput: true });
  } catch {
    throw new Error('python-chess is required to build dist/all.tsv. Install it with `pip3 install chess`.');
  }
};

const splitUciMoves = (uci) => uci.trim().split(/\s+/).filter(Boolean);

const getFamilyName = (name) => {
  const separatorIndex = name.indexOf(':');
  return separatorIndex === -1 ? name.trim() : name.slice(0, separatorIndex).trim();
};

const normalizeEpd = (value) => {
  const parts = value.trim().split(/\s+/);

  if (parts.length < 4) {
    throw new Error(`Invalid EPD value: ${value}`);
  }

  return parts.slice(0, 4).join(' ');
};

const getPlyCount = (uci) => splitUciMoves(uci).length;

const getPlayerMoveCounts = (plyCount) => ({
  white: Math.ceil(plyCount / 2),
  black: Math.floor(plyCount / 2),
});

const compareCanonicalPriority = (left, right) => {
  if (left.plyCount !== right.plyCount) {
    return left.plyCount - right.plyCount;
  }

  const ecoComparison = left.eco.localeCompare(right.eco);
  if (ecoComparison !== 0) {
    return ecoComparison;
  }

  return left.uci.localeCompare(right.uci);
};

const slugifyFamilyName = (familyName) => {
  const slug = familyName
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  return slug || 'opening-family';
};

const buildFamilyChunkKeyMap = (familyNames) => {
  const chunkKeyByFamilyName = new Map();
  const usedChunkKeys = new Set();

  familyNames
    .slice()
    .sort((left, right) => left.localeCompare(right))
    .forEach((familyName) => {
      const baseChunkKey = slugifyFamilyName(familyName);
      let chunkKey = baseChunkKey;
      let suffix = 2;

      while (usedChunkKeys.has(chunkKey)) {
        chunkKey = `${baseChunkKey}-${suffix}`;
        suffix += 1;
      }

      usedChunkKeys.add(chunkKey);
      chunkKeyByFamilyName.set(familyName, chunkKey);
    });

  return chunkKeyByFamilyName;
};

const parseDistFile = (tsvText) => {
  const lines = tsvText.split(/\r?\n/).filter(Boolean);

  if (lines.length === 0) {
    throw new Error('dist/all.tsv is empty.');
  }

  const header = lines.shift();
  if (header !== 'eco\tname\tpgn\tuci\tepd') {
    throw new Error(`Unexpected TSV header: ${header}`);
  }

  return lines.map((line, index) => {
    const [eco, name, pgn, uci, epd] = line.split('\t');

    if (!eco || !name || !pgn || !uci || !epd) {
      throw new Error(`Malformed TSV row at line ${index + 2}`);
    }

    const plyCount = getPlyCount(uci);

    return {
      id: `record-${index + 1}`,
      eco,
      name,
      family: getFamilyName(name),
      pgn,
      uci,
      epd: normalizeEpd(epd),
      plyCount,
      playerMoveCounts: getPlayerMoveCounts(plyCount),
    };
  });
};

const parseExistingLookup = (lookupJson) => {
  if (!lookupJson || !Array.isArray(lookupJson.records)) {
    throw new Error('The existing lookup JSON must include a top-level `records` array.');
  }

  return lookupJson.records.map((record, index) => {
    const uci = String(record.uci ?? '').trim();
    const plyCount = Number.isFinite(record.plyCount) ? record.plyCount : getPlyCount(uci);
    const playerMoveCounts = record.playerMoveCounts ?? getPlayerMoveCounts(plyCount);

    return {
      id: String(record.id ?? `record-${index + 1}`),
      eco: String(record.eco),
      name: String(record.name),
      family: String(record.family ?? getFamilyName(String(record.name))),
      pgn: String(record.pgn),
      uci,
      epd: normalizeEpd(String(record.epd)),
      plyCount,
      playerMoveCounts: {
        white: Number(playerMoveCounts.white),
        black: Number(playerMoveCounts.black),
      },
    };
  });
};

const buildEligibleRecordCounts = (records) => {
  const whiteExactCounts = new Map();
  const blackExactCounts = new Map();
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

const buildCatalogAndRecords = (baseRecords, metadata) => {
  const recordsByName = new Map();

  for (const record of baseRecords) {
    const currentRecords = recordsByName.get(record.name) ?? [];
    currentRecords.push(record);
    recordsByName.set(record.name, currentRecords);
  }

  const familyNames = Array.from(new Set(baseRecords.map((record) => record.family)));
  const familyChunkKeyByName = buildFamilyChunkKeyMap(familyNames);

  const canonicalGroups = Array.from(recordsByName.entries())
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

  const lineIdByName = new Map();
  const lines = canonicalGroups.map(({ name, records, canonicalRecord }, index) => {
    const lineId = `line-${index + 1}`;
    lineIdByName.set(name, lineId);

    return {
      id: lineId,
      name: canonicalRecord.name,
      family: canonicalRecord.family,
      chunkKey: familyChunkKeyByName.get(canonicalRecord.family),
      recordCount: records.length,
      eligibleRecordCounts: buildEligibleRecordCounts(records),
    };
  });

  const records = baseRecords.map((record) => ({
    ...record,
    lineId: lineIdByName.get(record.name),
  }));

  const familiesMap = new Map();

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

  const families = Array.from(familiesMap.values())
    .map((family) => ({
      ...family,
      lineIds: family.lineIds.sort(),
    }))
    .sort((left, right) => left.name.localeCompare(right.name));

  const meta = {
    ...metadata,
    recordCount: records.length,
    familyCount: families.length,
    lineCount: lines.length,
  };

  const recordsByFamily = new Map();

  records.forEach((record) => {
    const familyRecords = recordsByFamily.get(record.family) ?? [];
    familyRecords.push(record);
    recordsByFamily.set(record.family, familyRecords);
  });

  const chunks = families.map((family) => ({
    chunkKey: family.chunkKey,
    familyName: family.name,
    payload: {
      meta: {
        generatedAt: meta.generatedAt,
        sourceRef: meta.sourceRef,
        familyName: family.name,
        chunkKey: family.chunkKey,
        recordCount: family.recordCount,
        lineCount: family.lineCount,
      },
      records: (recordsByFamily.get(family.name) ?? [])
        .slice()
        .sort((left, right) => left.id.localeCompare(right.id)),
    },
  }));

  return {
    catalog: {
      meta,
      families,
      lines,
    },
    records: {
      meta,
      records,
    },
    chunks,
  };
};

const args = parseArgs(process.argv.slice(2));
const sourceManifest = readJsonFile(SOURCE_MANIFEST_PATH);
const sourceDirArg = args['source-dir'];
const existingLookupArg = args['existing-lookup'];
const refOverride = args.ref;
const workingRef = refOverride ?? sourceManifest.ref;

let tempSourceDir = null;
let sourceDir = sourceDirArg ? path.resolve(sourceDirArg) : null;

try {
  let baseRecords;
  let metadata;

  if (existingLookupArg) {
    const existingLookupPath = path.resolve(existingLookupArg);
    const existingLookup = readJsonFile(existingLookupPath);

    baseRecords = parseExistingLookup(existingLookup);
    metadata = {
      generatedAt: new Date().toISOString(),
      sourceRepo: existingLookup.meta?.sourceRepo ?? sourceManifest.repoUrl,
      sourceRef: existingLookup.meta?.sourceRef ?? workingRef ?? 'unknown',
      distFile: existingLookup.meta?.distFile ?? 'dist/all.tsv',
    };
  } else {
    if (!sourceDir) {
      tempSourceDir = mkdtempSync(path.join(tmpdir(), 'lichess-openings-'));
      sourceDir = tempSourceDir;
      run('git', ['clone', sourceManifest.repoUrl, sourceDir]);
    }

    if (workingRef) {
      run('git', ['-C', sourceDir, 'checkout', workingRef]);
    }

    const distFilePath = path.join(sourceDir, 'dist', 'all.tsv');

    if (!existsSync(distFilePath)) {
      ensurePythonChessInstalled();
      run('make', ['-C', sourceDir, 'dist/all.tsv']);
    }

    const actualRef = run('git', ['-C', sourceDir, 'rev-parse', 'HEAD'], { captureOutput: true }).trim();
    baseRecords = parseDistFile(readFileSync(distFilePath, 'utf8'));
    metadata = {
      generatedAt: new Date().toISOString(),
      sourceRepo: sourceManifest.repoUrl,
      sourceRef: actualRef,
      distFile: 'dist/all.tsv',
    };
  }

  const payload = buildCatalogAndRecords(baseRecords, metadata);

  writeJsonFile(OUTPUT_PUBLIC_CATALOG_PATH, payload.catalog);
  writeJsonFile(OUTPUT_PROCESSED_CATALOG_PATH, payload.catalog);
  writeJsonFile(OUTPUT_PROCESSED_RECORDS_PATH, payload.records);

  resetDirectory(OUTPUT_PUBLIC_CHUNKS_DIR);
  resetDirectory(OUTPUT_PROCESSED_CHUNKS_DIR);

  payload.chunks.forEach((chunk) => {
    writeJsonFile(path.join(OUTPUT_PUBLIC_CHUNKS_DIR, `${chunk.chunkKey}.json`), chunk.payload);
    writeJsonFile(path.join(OUTPUT_PROCESSED_CHUNKS_DIR, `${chunk.chunkKey}.json`), chunk.payload);
  });

  console.log(`Wrote openings catalog to ${OUTPUT_PUBLIC_CATALOG_PATH}`);
  console.log(`Wrote openings catalog copy to ${OUTPUT_PROCESSED_CATALOG_PATH}`);
  console.log(`Wrote openings records to ${OUTPUT_PROCESSED_RECORDS_PATH}`);
  console.log(`Wrote ${payload.chunks.length} opening chunks to ${OUTPUT_PUBLIC_CHUNKS_DIR}`);
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
} finally {
  if (tempSourceDir) {
    rmSync(tempSourceDir, { recursive: true, force: true });
  }
}
