import { describe, expect, it } from 'vitest';
import { defaultPuzzleConfig } from '@/lib/puzzles';
import { defaultVisionRoundConfig } from '@/lib/visionTrainer';
import {
  buildDrillRoundPayload,
  buildPuzzleAttemptPayload,
} from './trainingResults';

describe('trainingResults payload builders', () => {
  it('builds puzzle attempt payloads from the saved puzzle snapshot', () => {
    const payload = buildPuzzleAttemptPayload({
      puzzle: {
        id: 'puzzle-1',
        fen: '8/8/8/8/8/8/8/8 w - - 0 1',
        moves: ['e2e4', 'e7e5'],
        rating: 1540,
        themes: ['mateIn2', 'middlegame'],
      },
      config: {
        ...defaultPuzzleConfig,
        minRating: 1200,
        maxRating: 1800,
        revealEvery: 2,
        allowCheats: false,
        hideMoveHistory: true,
        selectedThemes: ['mateIn2'],
      },
      result: 'failed',
      startedAt: '2026-03-23T00:10:00.000Z',
      completedAt: '2026-03-23T00:10:45.000Z',
      playerMoveCount: 2,
      wrongMoveCount: 3,
    });

    expect(payload).toEqual({
      puzzle_id: 'puzzle-1',
      puzzle_rating: 1540,
      puzzle_themes: ['mateIn2', 'middlegame'],
      result: 'failed',
      player_move_count: 2,
      wrong_move_count: 3,
      min_rating: 1200,
      max_rating: 1800,
      reveal_every: 2,
      allow_cheats: false,
      hide_move_history: true,
      selected_themes: ['mateIn2'],
      started_at: '2026-03-23T00:10:00.000Z',
      completed_at: '2026-03-23T00:10:45.000Z',
    });
  });

  it('builds drill round payloads with score and accuracy derived from stats', () => {
    const payload = buildDrillRoundPayload({
      config: {
        ...defaultVisionRoundConfig,
        mode: 'moves',
        perspective: 'black',
        showCoordinates: false,
        roundLengthSeconds: 120,
        movesPieceDisplay: 'panel',
      },
      stats: {
        correctCount: 9,
        wrongCount: 3,
        totalAttempts: 12,
      },
      completedAt: '2026-03-23T00:12:00.000Z',
    });

    expect(payload).toEqual({
      mode: 'moves',
      perspective: 'black',
      show_coordinates: false,
      round_length_seconds: 120,
      moves_piece_display: 'panel',
      correct_count: 9,
      wrong_count: 3,
      total_attempts: 12,
      score: 9,
      accuracy: 0.75,
      completed_at: '2026-03-23T00:12:00.000Z',
    });
  });

  it('stores null moves piece display for coordinate rounds', () => {
    const payload = buildDrillRoundPayload({
      config: defaultVisionRoundConfig,
      stats: {
        correctCount: 0,
        wrongCount: 0,
        totalAttempts: 0,
      },
      completedAt: '2026-03-23T00:13:00.000Z',
    });

    expect(payload.moves_piece_display).toBeNull();
    expect(payload.accuracy).toBe(0);
    expect(payload.score).toBe(0);
  });
});
