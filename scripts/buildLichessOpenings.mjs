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
const OUTPUT_PUBLIC_PATH = path.join(ROOT_DIR, 'public', 'data', 'lichess-openings.lookup.json');
const OUTPUT_PROCESSED_PATH = path.join(ROOT_DIR, 'data', 'processed', 'lichess-openings.lookup.json');

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

const getFamilyName = (name) => {
  const separatorIndex = name.indexOf(':');

  return separatorIndex === -1 ? name : name.slice(0, separatorIndex).trim();
};

const normalizeEpd = (value) => {
  const parts = value.trim().split(/\s+/);

  if (parts.length < 4) {
    throw new Error(`Invalid EPD value: ${value}`);
  }

  return parts.slice(0, 4).join(' ');
};

const getPlyCount = (uci) => {
  const moves = uci.trim().split(/\s+/).filter(Boolean);
  return moves.length;
};

const getPlayerMoveCounts = (plyCount) => ({
  white: Math.ceil(plyCount / 2),
  black: Math.floor(plyCount / 2),
});

const compareSpecificity = (left, right) => {
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

const buildPayload = (records, metadata) => {
  const lookupByEpd = {};
  const familiesMap = new Map();
  const recordsById = new Map(records.map((record) => [record.id, record]));

  for (const record of records) {
    const currentIds = lookupByEpd[record.epd] ?? [];
    currentIds.push(record.id);
    lookupByEpd[record.epd] = currentIds;

    const currentFamily = familiesMap.get(record.family) ?? {
      name: record.family,
      recordCount: 0,
      lineNames: new Set(),
    };
    currentFamily.recordCount += 1;
    currentFamily.lineNames.add(record.name);
    familiesMap.set(record.family, currentFamily);
  }

  for (const ids of Object.values(lookupByEpd)) {
    ids.sort((leftId, rightId) => compareSpecificity(recordsById.get(leftId), recordsById.get(rightId)));
  }

  const families = Array.from(familiesMap.values())
    .map((family) => ({
      name: family.name,
      recordCount: family.recordCount,
      lineCount: family.lineNames.size,
    }))
    .sort((left, right) => left.name.localeCompare(right.name));

  return {
    meta: {
      ...metadata,
      recordCount: records.length,
      familyCount: families.length,
    },
    families,
    records,
    lookupByEpd,
  };
};

const writeJsonFile = (filePath, value) => {
  mkdirSync(path.dirname(filePath), { recursive: true });
  writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
};

const args = parseArgs(process.argv.slice(2));
const sourceManifest = readJsonFile(SOURCE_MANIFEST_PATH);
const sourceDirArg = args['source-dir'];
const refOverride = args.ref;
const workingRef = refOverride ?? sourceManifest.ref;

let tempSourceDir = null;
let sourceDir = sourceDirArg ? path.resolve(sourceDirArg) : null;

try {
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
  const records = parseDistFile(readFileSync(distFilePath, 'utf8'));
  const payload = buildPayload(records, {
    generatedAt: new Date().toISOString(),
    sourceRepo: sourceManifest.repoUrl,
    sourceRef: actualRef,
    distFile: 'dist/all.tsv',
  });

  writeJsonFile(OUTPUT_PUBLIC_PATH, payload);
  writeJsonFile(OUTPUT_PROCESSED_PATH, payload);

  console.log(`Wrote ${records.length} opening records to ${OUTPUT_PUBLIC_PATH}`);
  console.log(`Wrote ${records.length} opening records to ${OUTPUT_PROCESSED_PATH}`);
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
} finally {
  if (tempSourceDir) {
    rmSync(tempSourceDir, { recursive: true, force: true });
  }
}
