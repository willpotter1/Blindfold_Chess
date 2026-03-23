import { describe, expect, it } from 'vitest';
import type { PuzzleRecord } from '@/lib/puzzles';
import {
  createPuzzleSessionQueue,
  mergePuzzleQueueBatch,
  resetSeenPuzzleIds,
  shouldResetSeenPuzzleIds,
  takeNextQueuedPuzzle,
} from './puzzleQueue';

const samplePuzzles: PuzzleRecord[] = [
  {
    id: 'puzzle-1',
    fen: '8/8/8/8/8/8/8/8 w - - 0 1',
    moves: ['e2e4', 'e7e5'],
    rating: 1400,
    themes: ['mateIn2'],
  },
  {
    id: 'puzzle-2',
    fen: '8/8/8/8/8/8/8/8 w - - 0 1',
    moves: ['d2d4', 'd7d5'],
    rating: 1450,
    themes: ['fork'],
  },
  {
    id: 'puzzle-3',
    fen: '8/8/8/8/8/8/8/8 w - - 0 1',
    moves: ['c2c4', 'c7c5'],
    rating: 1500,
    themes: ['pin'],
  },
  {
    id: 'puzzle-4',
    fen: '8/8/8/8/8/8/8/8 w - - 0 1',
    moves: ['g2g4', 'g7g5'],
    rating: 1550,
    themes: ['attraction'],
  },
];

describe('puzzleQueue helpers', () => {
  it('creates a session queue from a prefetched preview batch', () => {
    const queueState = createPuzzleSessionQueue([
      samplePuzzles[0],
      samplePuzzles[1],
      samplePuzzles[1],
      samplePuzzles[2],
    ], 'puzzle-1');

    expect(queueState.queuedPuzzles.map((puzzle) => puzzle.id)).toEqual(['puzzle-2', 'puzzle-3']);
    expect(queueState.seenPuzzleIds).toEqual(['puzzle-1', 'puzzle-2', 'puzzle-3']);
  });

  it('merges fetched batches without requeueing seen or current puzzles', () => {
    const initialQueueState = createPuzzleSessionQueue([
      samplePuzzles[0],
      samplePuzzles[1],
    ], 'puzzle-1');

    const mergedQueueState = mergePuzzleQueueBatch(
      initialQueueState,
      [samplePuzzles[1], samplePuzzles[2], samplePuzzles[3], samplePuzzles[3]],
      'puzzle-1',
    );

    expect(mergedQueueState.queuedPuzzles.map((puzzle) => puzzle.id)).toEqual([
      'puzzle-2',
      'puzzle-3',
      'puzzle-4',
    ]);
    expect(mergedQueueState.seenPuzzleIds).toEqual([
      'puzzle-1',
      'puzzle-2',
      'puzzle-3',
      'puzzle-4',
    ]);
  });

  it('takes the next queued puzzle and leaves the remainder intact', () => {
    const queueState = createPuzzleSessionQueue(samplePuzzles.slice(0, 3), 'puzzle-1');
    const result = takeNextQueuedPuzzle(queueState);

    expect(result.nextPuzzle?.id).toBe('puzzle-2');
    expect(result.queueState.queuedPuzzles.map((puzzle) => puzzle.id)).toEqual(['puzzle-3']);
  });

  it('detects when the filtered puzzle set has been exhausted and preserves the current puzzle on reset', () => {
    expect(shouldResetSeenPuzzleIds(4, ['puzzle-1', 'puzzle-2', 'puzzle-3', 'puzzle-4'])).toBe(true);
    expect(shouldResetSeenPuzzleIds(5, ['puzzle-1', 'puzzle-2', 'puzzle-3', 'puzzle-4'])).toBe(false);
    expect(resetSeenPuzzleIds('puzzle-3')).toEqual(['puzzle-3']);
    expect(resetSeenPuzzleIds(null)).toEqual([]);
  });
});
