import type { PuzzleRecord } from '@/lib/puzzles';

export type PuzzleQueueState = {
  queuedPuzzles: PuzzleRecord[];
  seenPuzzleIds: string[];
};

const dedupePuzzlesById = (puzzles: readonly PuzzleRecord[]) => {
  const seenPuzzleIds = new Set<string>();

  return puzzles.filter((puzzle) => {
    if (seenPuzzleIds.has(puzzle.id)) {
      return false;
    }

    seenPuzzleIds.add(puzzle.id);
    return true;
  });
};

export const createPuzzleSessionQueue = (
  initialBatch: readonly PuzzleRecord[],
  currentPuzzleId: string,
): PuzzleQueueState => {
  const dedupedBatch = dedupePuzzlesById(initialBatch);

  return {
    queuedPuzzles: dedupedBatch.filter((puzzle) => puzzle.id !== currentPuzzleId),
    seenPuzzleIds: dedupedBatch.map((puzzle) => puzzle.id),
  };
};

export const mergePuzzleQueueBatch = (
  queueState: PuzzleQueueState,
  fetchedBatch: readonly PuzzleRecord[],
  currentPuzzleId: string | null,
): PuzzleQueueState => {
  const nextQueuedPuzzles = [...queueState.queuedPuzzles];
  const blockedPuzzleIds = new Set<string>([
    ...queueState.seenPuzzleIds,
    ...queueState.queuedPuzzles.map((puzzle) => puzzle.id),
  ]);

  if (currentPuzzleId) {
    blockedPuzzleIds.add(currentPuzzleId);
  }

  const acceptedPuzzles = dedupePuzzlesById(fetchedBatch).filter((puzzle) => !blockedPuzzleIds.has(puzzle.id));
  nextQueuedPuzzles.push(...acceptedPuzzles);

  return {
    queuedPuzzles: nextQueuedPuzzles,
    seenPuzzleIds: [...queueState.seenPuzzleIds, ...acceptedPuzzles.map((puzzle) => puzzle.id)],
  };
};

export const takeNextQueuedPuzzle = (queueState: PuzzleQueueState) => {
  const [nextPuzzle = null, ...remainingQueuedPuzzles] = queueState.queuedPuzzles;

  return {
    nextPuzzle,
    queueState: {
      ...queueState,
      queuedPuzzles: remainingQueuedPuzzles,
    },
  };
};

export const shouldResetSeenPuzzleIds = (matchingPuzzleCount: number, seenPuzzleIds: readonly string[]) => (
  matchingPuzzleCount > 0 && seenPuzzleIds.length >= matchingPuzzleCount
);

export const resetSeenPuzzleIds = (currentPuzzleId: string | null) => (
  currentPuzzleId ? [currentPuzzleId] : []
);
