import { describe, expect, it } from 'vitest';
import { visionMovePositions } from '@/data/visionMovePositions';
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

  it('builds white moves prompts from the white-to-move half of the legal position deck', () => {
    const deck = buildPromptDeck({
      ...defaultVisionRoundConfig,
      mode: 'moves',
      perspective: 'white',
    });

    expect(deck).toHaveLength(50);
    expect(deck.every((prompt) => prompt.mode === 'moves' && prompt.turnColor === 'white')).toBe(true);
    expect(deck.every((prompt) => isSimpleVisionMoveSan(prompt.label))).toBe(true);
  });

  it('builds black moves prompts from the black-to-move half of the legal position deck', () => {
    const deck = buildPromptDeck({
      ...defaultVisionRoundConfig,
      mode: 'moves',
      perspective: 'black',
    });

    expect(deck).toHaveLength(50);
    expect(deck.every((prompt) => prompt.mode === 'moves' && prompt.turnColor === 'black')).toBe(true);
    expect(deck.every((prompt) => isSimpleVisionMoveSan(prompt.label))).toBe(true);
  });
});

describe('vision move positions dataset', () => {
  it('contains exactly 100 unique positions split evenly by side to move', () => {
    expect(visionMovePositions).toHaveLength(100);
    expect(new Set(visionMovePositions.map((position) => position.id)).size).toBe(100);
    expect(visionMovePositions.filter((position) => position.turnColor === 'white')).toHaveLength(50);
    expect(visionMovePositions.filter((position) => position.turnColor === 'black')).toHaveLength(50);
  });

  it('stores simple legal SAN moves over positions with exactly six pieces', () => {
    for (const position of visionMovePositions) {
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
  }).find((prompt) => prompt.mode === 'moves');

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
