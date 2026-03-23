import { describe, expect, it } from 'vitest';
import type { VisionMovePosition } from './visionTrainer';
import {
  buildPromptDeck,
  defaultVisionRoundConfig,
  generateAllSquares,
  getPiecePlacementsFromFen,
  isSimpleVisionMoveSan,
  resolveMovesPromptClick,
  squareToVisualPosition,
  validateVisionMovePosition,
  visualPositionToSquare,
} from './visionTrainer';

const sampleMovePositions: VisionMovePosition[] = [
  {
    id: 'moves-white-001',
    fen: '8/2N4B/8/2p5/8/2q5/4k1K1/8 w - - 0 1',
    san: 'Nd5',
    fromSquare: 'c7',
    toSquare: 'd5',
    turnColor: 'white',
  },
  {
    id: 'moves-white-002',
    fen: '7K/4N3/1P2p3/7k/8/8/5q2/8 w - - 0 1',
    san: 'b7',
    fromSquare: 'b6',
    toSquare: 'b7',
    turnColor: 'white',
  },
  {
    id: 'moves-black-001',
    fen: '8/8/6K1/p2Q4/2P5/kr6/8/8 b - - 0 1',
    san: 'a4',
    fromSquare: 'a5',
    toSquare: 'a4',
    turnColor: 'black',
  },
  {
    id: 'moves-black-002',
    fen: '2N5/8/4p1K1/5B2/8/8/3pk3/8 b - - 0 1',
    san: 'exf5',
    fromSquare: 'e6',
    toSquare: 'f5',
    turnColor: 'black',
  },
];

describe('visionTrainer utilities', () => {
  it('generates all 64 unique squares', () => {
    const squares = generateAllSquares();

    expect(squares).toHaveLength(64);
    expect(new Set(squares).size).toBe(64);
    expect(squares).toContain('a1');
    expect(squares).toContain('h8');
  });

  it('maps visual positions to squares for both perspectives', () => {
    expect(visualPositionToSquare({ row: 7, col: 0 }, 'white')).toBe('a1');
    expect(visualPositionToSquare({ row: 7, col: 0 }, 'black')).toBe('h8');
  });

  it('round-trips square mapping for representative squares', () => {
    const representativeSquares = ['a1', 'e4', 'b7', 'h8'];

    for (const perspective of ['white', 'black'] as const) {
      for (const square of representativeSquares) {
        const visualPosition = squareToVisualPosition(square, perspective);

        expect(visualPositionToSquare(visualPosition, perspective)).toBe(square);
      }
    }
  });

  it('builds coordinate prompts without piece prefixes', () => {
    const deck = buildPromptDeck(defaultVisionRoundConfig);

    expect(deck).toHaveLength(64);
    expect(deck.every((prompt) => prompt.mode === 'coordinates' && /^[a-h][1-8]$/.test(prompt.label))).toBe(true);
  });

  it('builds white moves prompts from injected move positions', () => {
    const deck = buildPromptDeck({
      ...defaultVisionRoundConfig,
      mode: 'moves',
      perspective: 'white',
    }, sampleMovePositions);

    expect(deck).toHaveLength(2);
    expect(deck.every((prompt) => prompt.mode === 'moves' && prompt.turnColor === 'white')).toBe(true);
    expect(deck.every((prompt) => isSimpleVisionMoveSan(prompt.label))).toBe(true);
  });

  it('builds black moves prompts from injected move positions', () => {
    const deck = buildPromptDeck({
      ...defaultVisionRoundConfig,
      mode: 'moves',
      perspective: 'black',
    }, sampleMovePositions);

    expect(deck).toHaveLength(2);
    expect(deck.every((prompt) => prompt.mode === 'moves' && prompt.turnColor === 'black')).toBe(true);
    expect(deck.every((prompt) => isSimpleVisionMoveSan(prompt.label))).toBe(true);
  });
});

describe('vision move position validation', () => {
  it('accepts simple legal SAN moves over six-piece positions', () => {
    for (const position of sampleMovePositions) {
      expect(getPiecePlacementsFromFen(position.fen)).toHaveLength(6);
      expect(isSimpleVisionMoveSan(position.san)).toBe(true);

      const validation = validateVisionMovePosition(position);

      if (!validation.isValid) {
        throw new Error(`${position.id}: ${validation.reason}`);
      }
    }
  });
});

describe('moves prompt click resolution', () => {
  const sampleMovesPrompt = buildPromptDeck({
    ...defaultVisionRoundConfig,
    mode: 'moves',
    perspective: 'white',
  }, sampleMovePositions).find((prompt) => prompt.mode === 'moves');

  if (!sampleMovesPrompt || sampleMovesPrompt.mode !== 'moves') {
    throw new Error('Expected a moves prompt for test coverage.');
  }

  const wrongSquare = generateAllSquares().find((square) => (
    square !== sampleMovesPrompt.fromSquare && square !== sampleMovesPrompt.toSquare
  ));

  if (!wrongSquare) {
    throw new Error('Expected a distinct wrong square for test coverage.');
  }

  it('marks a wrong first click as a resolved wrong attempt', () => {
    expect(resolveMovesPromptClick(sampleMovesPrompt, null, wrongSquare)).toEqual({
      kind: 'resolved',
      result: 'wrong',
      feedbackSquare: wrongSquare,
      shouldCountAttempt: true,
    });
  });

  it('turns a correct first click into a pending from-square selection', () => {
    expect(resolveMovesPromptClick(sampleMovesPrompt, null, sampleMovesPrompt.fromSquare)).toEqual({
      kind: 'select-from',
      selectedFromSquare: sampleMovesPrompt.fromSquare,
      shouldCountAttempt: false,
    });
  });

  it('marks a wrong second click as a resolved wrong attempt', () => {
    expect(resolveMovesPromptClick(sampleMovesPrompt, sampleMovesPrompt.fromSquare, wrongSquare)).toEqual({
      kind: 'resolved',
      result: 'wrong',
      feedbackSquare: wrongSquare,
      shouldCountAttempt: true,
    });
  });

  it('marks a correct second click as a resolved correct attempt', () => {
    expect(resolveMovesPromptClick(sampleMovesPrompt, sampleMovesPrompt.fromSquare, sampleMovesPrompt.toSquare)).toEqual({
      kind: 'resolved',
      result: 'correct',
      feedbackSquare: sampleMovesPrompt.toSquare,
      shouldCountAttempt: true,
    });
  });
});
