import { Chess, type Move } from 'chess.js';
import { normalizeSan } from '@/lib/chess/normalizeSan';
import {
  getCanonicalLineIdForRecord,
  getOpeningCanonicalInfoFromLine,
  type OpeningInfo,
  type OpeningLine,
  type OpeningLookup,
  type OpeningLookupRecord,
} from '@/lib/openings';

export type OpeningTrainerConfig = {
  selectedFamilyNames: string[];
  selectedLineIds: string[];
  playerColor: 'white' | 'black';
  depthPlayerMoves: number;
  revealEvery: number;
  allowCheats: boolean;
  hideMoveHistory: boolean;
};

export type OpeningTrainerConfigStatus = {
  matchingLineCount: number;
  matchingRecordCount: number;
  isStartDisabled: boolean;
  message: string;
  tone: 'default' | 'error';
};

export type OpeningTrainerRound = {
  config: OpeningTrainerConfig;
  currentFen: string;
  movesSan: string[];
  playedUciMoves: string[];
  playerMoveCount: number;
  activeRecordIds: string[];
  resolvedLineIds: string[];
  resolvedRecordIds: string[];
  phase: 'playing' | 'completed';
  opening: OpeningInfo | null;
  openingLineId: string | null;
  error: string;
  status: string;
};

type NextMoveChoice = {
  uci: string;
  recordIds: string[];
};

const DEFAULT_REVEAL_EVERY = 3;
const DEFAULT_DEPTH_PLAYER_MOVES = 3;
const START_FEN = new Chess().fen();

export const defaultOpeningTrainerConfig: OpeningTrainerConfig = {
  selectedFamilyNames: [],
  selectedLineIds: [],
  playerColor: 'white',
  depthPlayerMoves: DEFAULT_DEPTH_PLAYER_MOVES,
  revealEvery: DEFAULT_REVEAL_EVERY,
  allowCheats: true,
  hideMoveHistory: false,
};

const toUci = (move: Pick<Move, 'from' | 'to' | 'promotion'>) => (
  `${move.from}${move.to}${move.promotion ?? ''}`
);

const getTurnColorFromFen = (fen: string): 'white' | 'black' => (
  fen.split(' ')[1] === 'b' ? 'black' : 'white'
);

const getExpectedNextMoves = (
  lookup: OpeningLookup,
  activeRecordIds: string[],
  plyIndex: number,
): NextMoveChoice[] => {
  const nextMovesByUci = new Map<string, Set<string>>();

  for (const recordId of activeRecordIds) {
    const record = lookup.records.find((entry) => entry.id === recordId);
    if (!record) {
      continue;
    }

    const uciMoves = record.uci.trim().split(/\s+/).filter(Boolean);
    const nextMove = uciMoves[plyIndex];

    if (!nextMove) {
      continue;
    }

    const matchingRecordIds = nextMovesByUci.get(nextMove) ?? new Set<string>();
    matchingRecordIds.add(record.id);
    nextMovesByUci.set(nextMove, matchingRecordIds);
  }

  return Array.from(nextMovesByUci.entries())
    .map(([uci, recordIds]) => ({
      uci,
      recordIds: Array.from(recordIds),
    }))
    .sort((left, right) => left.uci.localeCompare(right.uci));
};

const getFallbackOpening = (
  lookup: OpeningLookup,
  activeRecordIds: string[],
): { opening: OpeningInfo | null; openingLineId: string | null } => {
  const records = activeRecordIds
    .map((recordId) => lookup.records.find((entry) => entry.id === recordId))
    .filter(Boolean)
    .sort((left, right) => {
      if (right.plyCount !== left.plyCount) {
        return right.plyCount - left.plyCount;
      }

      const ecoComparison = left.eco.localeCompare(right.eco);
      if (ecoComparison !== 0) {
        return ecoComparison;
      }

      return left.name.localeCompare(right.name);
    });
  const record = records[0];

  if (!record) {
    return { opening: null, openingLineId: null };
  }

  const lineId = getCanonicalLineIdForRecord(lookup, record);
  const line = lineId ? lookup.getLine(lineId) : null;

  return {
    opening: line ? getOpeningCanonicalInfoFromLine(line) : null,
    openingLineId: line?.id ?? null,
  };
};

const buildStatusText = (round: Pick<OpeningTrainerRound, 'config' | 'playerMoveCount' | 'activeRecordIds' | 'phase' | 'opening'>) => {
  if (round.phase === 'completed') {
    return round.opening ? `Solved: ${round.opening.name}` : 'Solved';
  }

  const moveLabel = `${round.playerMoveCount}/${round.config.depthPlayerMoves}`;
  const lineLabel = `${round.activeRecordIds.length} line${round.activeRecordIds.length === 1 ? '' : 's'} active`;

  return `Your moves: ${moveLabel}\n${lineLabel}`;
};

export const resolveOpeningTrainerPool = (
  lookup: OpeningLookup,
  config: OpeningTrainerConfig,
) => {
  const requestedLineIds = new Set<string>();

  config.selectedLineIds.forEach((lineId) => {
    if (lookup.getLine(lineId)) {
      requestedLineIds.add(lineId);
    }
  });

  for (const familyName of config.selectedFamilyNames) {
    lookup.getLinesForFamily(familyName).forEach((line) => {
      requestedLineIds.add(line.id);
    });
  }

  const filteredLineIds = Array.from(requestedLineIds).filter((lineId) => {
    const line = lookup.getLine(lineId);
    if (!line) {
      return false;
    }

    return line.playerMoveCounts[config.playerColor] >= config.depthPlayerMoves;
  });

  const filteredRecordIds = new Set<string>();

  filteredLineIds.forEach((lineId) => {
    lookup.getRecordsForLine(lineId)
      .filter((record) => record.playerMoveCounts[config.playerColor] >= config.depthPlayerMoves)
      .forEach((record) => {
        filteredRecordIds.add(record.id);
      });
  });

  return {
    lineIds: filteredLineIds.sort(),
    recordIds: Array.from(filteredRecordIds).sort(),
  };
};

export const getOpeningTrainerConfigStatus = (
  lookup: OpeningLookup | null,
  config: OpeningTrainerConfig,
): OpeningTrainerConfigStatus => {
  if (!lookup) {
    return {
      matchingLineCount: 0,
      matchingRecordCount: 0,
      isStartDisabled: true,
      message: 'Loading openings...',
      tone: 'default',
    };
  }

  const resolvedPool = resolveOpeningTrainerPool(lookup, config);

  if (config.selectedFamilyNames.length === 0 && config.selectedLineIds.length === 0) {
    return {
      matchingLineCount: 0,
      matchingRecordCount: 0,
      isStartDisabled: true,
      message: 'Select at least one family or variation.',
      tone: 'error',
    };
  }

  if (resolvedPool.recordIds.length === 0) {
    return {
      matchingLineCount: 0,
      matchingRecordCount: 0,
      isStartDisabled: true,
      message: 'No openings match the current color and depth.',
      tone: 'error',
    };
  }

  return {
    matchingLineCount: resolvedPool.lineIds.length,
    matchingRecordCount: resolvedPool.recordIds.length,
    isStartDisabled: false,
    message: `${resolvedPool.lineIds.length.toLocaleString()} variations and ${resolvedPool.recordIds.length.toLocaleString()} matching positions are available.`,
    tone: 'default',
  };
};

const applyUciToChess = (chess: Chess, uci: string) => chess.move({
  from: uci.slice(0, 2),
  to: uci.slice(2, 4),
  promotion: uci.slice(4, 5) || undefined,
});

const completeOpeningTrainerRound = (
  lookup: OpeningLookup,
  round: OpeningTrainerRound,
): OpeningTrainerRound => {
  const resolvedOpening = lookup.getOpeningFromFen(round.currentFen);

  if (resolvedOpening) {
    const openingLine = lookup.lines.find((line) => line.name === resolvedOpening.name) ?? null;

    return {
      ...round,
      phase: 'completed',
      opening: resolvedOpening,
      openingLineId: openingLine?.id ?? null,
      error: '',
      status: buildStatusText({
        ...round,
        phase: 'completed',
        opening: resolvedOpening,
      }),
    };
  }

  const fallback = getFallbackOpening(lookup, round.activeRecordIds);

  return {
    ...round,
    phase: 'completed',
    opening: fallback.opening,
    openingLineId: fallback.openingLineId,
    error: '',
    status: buildStatusText({
      ...round,
      phase: 'completed',
      opening: fallback.opening,
    }),
  };
};

const autoPlayOpponentMove = (
  lookup: OpeningLookup,
  round: OpeningTrainerRound,
  rng: () => number,
): OpeningTrainerRound => {
  const currentTurnColor = getTurnColorFromFen(round.currentFen);

  if (currentTurnColor === round.config.playerColor) {
    return {
      ...round,
      error: '',
      status: buildStatusText(round),
    };
  }

  const plyIndex = round.playedUciMoves.length;
  const nextChoices = getExpectedNextMoves(lookup, round.activeRecordIds, plyIndex);

  if (nextChoices.length === 0) {
    return completeOpeningTrainerRound(lookup, round);
  }

  const randomIndex = Math.min(nextChoices.length - 1, Math.floor(rng() * nextChoices.length));
  const selectedChoice = nextChoices[randomIndex];
  const chess = new Chess(round.currentFen);
  const appliedMove = applyUciToChess(chess, selectedChoice.uci);

  if (!appliedMove) {
    return {
      ...round,
      error: 'The opening reply could not be applied.',
      status: buildStatusText(round),
    };
  }

  const nextRound: OpeningTrainerRound = {
    ...round,
    currentFen: chess.fen(),
    movesSan: [...round.movesSan, appliedMove.san],
    playedUciMoves: [...round.playedUciMoves, selectedChoice.uci],
    activeRecordIds: round.activeRecordIds.filter((recordId) => selectedChoice.recordIds.includes(recordId)),
    error: '',
  };

  return {
    ...nextRound,
    status: buildStatusText(nextRound),
  };
};

export const startOpeningTrainerRound = (
  lookup: OpeningLookup,
  config: OpeningTrainerConfig,
  rng: () => number = Math.random,
): OpeningTrainerRound => {
  const resolvedPool = resolveOpeningTrainerPool(lookup, config);

  if (resolvedPool.recordIds.length === 0) {
    throw new Error('No openings match the current opening trainer configuration.');
  }

  const initialRound: OpeningTrainerRound = {
    config,
    currentFen: START_FEN,
    movesSan: [],
    playedUciMoves: [],
    playerMoveCount: 0,
    activeRecordIds: resolvedPool.recordIds,
    resolvedLineIds: resolvedPool.lineIds,
    resolvedRecordIds: resolvedPool.recordIds,
    phase: 'playing',
    opening: null,
    openingLineId: null,
    error: '',
    status: '',
  };

  const roundAfterAutoMove = autoPlayOpponentMove(lookup, initialRound, rng);

  return {
    ...roundAfterAutoMove,
    status: buildStatusText(roundAfterAutoMove),
  };
};

const submitResolvedMove = (
  lookup: OpeningLookup,
  round: OpeningTrainerRound,
  move: Move,
  rng: () => number,
) => {
  const actualUci = toUci(move);
  const plyIndex = round.playedUciMoves.length;
  const nextChoices = getExpectedNextMoves(lookup, round.activeRecordIds, plyIndex);
  const matchingChoice = nextChoices.find((choice) => choice.uci === actualUci);

  if (!matchingChoice) {
    return {
      ...round,
      error: 'Invalid move for the selected openings.',
      status: buildStatusText(round),
    };
  }

  const nextRound: OpeningTrainerRound = {
    ...round,
    currentFen: new Chess(round.currentFen).fen(),
    movesSan: [...round.movesSan, move.san],
    playedUciMoves: [...round.playedUciMoves, actualUci],
    activeRecordIds: round.activeRecordIds.filter((recordId) => matchingChoice.recordIds.includes(recordId)),
    playerMoveCount: round.playerMoveCount + 1,
    error: '',
  };

  const chessAfterMove = new Chess(round.currentFen);
  chessAfterMove.move({
    from: move.from,
    to: move.to,
    promotion: move.promotion,
  });
  nextRound.currentFen = chessAfterMove.fen();

  const roundAfterReply = autoPlayOpponentMove(lookup, {
    ...nextRound,
    status: buildStatusText(nextRound),
  }, rng);

  if (roundAfterReply.phase === 'completed') {
    return roundAfterReply;
  }

  if (roundAfterReply.playerMoveCount >= roundAfterReply.config.depthPlayerMoves) {
    return completeOpeningTrainerRound(lookup, roundAfterReply);
  }

  return {
    ...roundAfterReply,
    status: buildStatusText(roundAfterReply),
  };
};

export const submitOpeningTrainerSanMove = (
  lookup: OpeningLookup,
  round: OpeningTrainerRound,
  san: string,
  rng: () => number = Math.random,
) => {
  if (round.phase !== 'playing') {
    return {
      ...round,
      error: 'The round has already finished.',
      status: buildStatusText(round),
    };
  }

  if (getTurnColorFromFen(round.currentFen) !== round.config.playerColor) {
    return {
      ...round,
      error: 'Wait for the opening reply before moving.',
      status: buildStatusText(round),
    };
  }

  try {
    const chess = new Chess(round.currentFen);
    const move = chess.move(normalizeSan(san));

    if (!move) {
      return {
        ...round,
        error: 'Illegal move.',
        status: buildStatusText(round),
      };
    }

    return submitResolvedMove(lookup, round, move, rng);
  } catch {
    return {
      ...round,
      error: 'Invalid move format.',
      status: buildStatusText(round),
    };
  }
};

export const submitOpeningTrainerUciMove = (
  lookup: OpeningLookup,
  round: OpeningTrainerRound,
  uci: string,
  rng: () => number = Math.random,
) => {
  if (round.phase !== 'playing') {
    return {
      ...round,
      error: 'The round has already finished.',
      status: buildStatusText(round),
    };
  }

  if (getTurnColorFromFen(round.currentFen) !== round.config.playerColor) {
    return {
      ...round,
      error: 'Wait for the opening reply before moving.',
      status: buildStatusText(round),
    };
  }

  try {
    const chess = new Chess(round.currentFen);
    const move = applyUciToChess(chess, uci);

    if (!move) {
      return {
        ...round,
        error: 'Illegal move.',
        status: buildStatusText(round),
      };
    }

    return submitResolvedMove(lookup, round, move, rng);
  } catch {
    return {
      ...round,
      error: 'Invalid move.',
      status: buildStatusText(round),
    };
  }
};

export const getOpeningTrainerLinePool = (
  lookup: OpeningLookup,
  config: OpeningTrainerConfig,
): OpeningLine[] => resolveOpeningTrainerPool(lookup, config)
  .lineIds
  .map((lineId) => lookup.getLine(lineId))
  .filter(Boolean);

export const buildFenHistoryFromUciMoves = (uciMoves: string[]) => {
  const chess = new Chess();
  const history = [chess.fen()];

  for (const uciMove of uciMoves) {
    const move = applyUciToChess(chess, uciMove);

    if (!move) {
      break;
    }

    history.push(chess.fen());
  }

  return history;
};

export const buildOpeningTrainerStartSeed = (round: OpeningTrainerRound) => ({
  startingUciMoves: round.playedUciMoves,
  opening: round.opening,
});
