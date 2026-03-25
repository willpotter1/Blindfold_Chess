import type { OpeningInfo } from '@/lib/openings';
import type { OpeningTrainerConfig } from '@/lib/openingTrainer';
import type { PuzzleConfig, PuzzleRecord } from '@/lib/puzzles';
import { trackAnalyticsEvent } from '@/lib/firebaseAnalytics';
import { supabase } from '@/lib/supabase';
import {
  getVisionAccuracy,
  getVisionScore,
  type VisionRoundConfig,
  type VisionRoundStats,
} from '@/lib/visionTrainer';

type SaveResult =
  | { ok: true; id: string }
  | { ok: false; reason: 'no_supabase' | 'not_signed_in' | 'error'; error?: unknown };

export type PuzzleAttemptResult = 'solved' | 'failed';

export type SavePuzzleAttemptInput = {
  puzzle: PuzzleRecord;
  config: PuzzleConfig;
  result: PuzzleAttemptResult;
  startedAt: string;
  completedAt?: string;
  playerMoveCount: number;
  wrongMoveCount: number;
};

export type SaveDrillRoundInput = {
  config: VisionRoundConfig;
  stats: VisionRoundStats;
  completedAt?: string;
};

export type SaveOpeningRoundInput = {
  opening: OpeningInfo;
  openingLineId: string;
  config: OpeningTrainerConfig;
  selectedFamilyNames: string[];
  selectedLineIds: string[];
  playedUciMoves: string[];
  startedAt: string;
  completedAt?: string;
};

export const buildPuzzleAttemptPayload = ({
  puzzle,
  config,
  result,
  startedAt,
  completedAt = new Date().toISOString(),
  playerMoveCount,
  wrongMoveCount,
}: SavePuzzleAttemptInput) => ({
  puzzle_id: puzzle.id,
  puzzle_rating: puzzle.rating,
  puzzle_themes: puzzle.themes,
  result,
  player_move_count: playerMoveCount,
  wrong_move_count: wrongMoveCount,
  min_rating: config.minRating,
  max_rating: config.maxRating,
  reveal_every: config.revealEvery,
  allow_cheats: config.allowCheats,
  hide_move_history: config.hideMoveHistory,
  selected_themes: config.selectedThemes,
  started_at: startedAt,
  completed_at: completedAt,
});

export const buildDrillRoundPayload = ({
  config,
  stats,
  completedAt = new Date().toISOString(),
}: SaveDrillRoundInput) => ({
  mode: config.mode,
  perspective: config.perspective,
  show_coordinates: config.showCoordinates,
  round_length_seconds: config.roundLengthSeconds,
  moves_piece_display: config.mode === 'moves' ? config.movesPieceDisplay : null,
  correct_count: stats.correctCount,
  wrong_count: stats.wrongCount,
  total_attempts: stats.totalAttempts,
  score: getVisionScore(stats),
  accuracy: getVisionAccuracy(stats),
  completed_at: completedAt,
});

export const buildOpeningRoundPayload = ({
  opening,
  openingLineId,
  config,
  selectedFamilyNames,
  selectedLineIds,
  playedUciMoves,
  startedAt,
  completedAt = new Date().toISOString(),
}: SaveOpeningRoundInput) => ({
  opening_line_id: openingLineId,
  opening_eco: opening.eco,
  opening_name: opening.name,
  opening_family: opening.name.split(':')[0].trim(),
  opening_pgn: opening.pgn,
  opening_uci: opening.uci,
  player_color: config.playerColor,
  depth_player_moves: config.depthPlayerMoves,
  reveal_every: config.revealEvery,
  allow_cheats: config.allowCheats,
  hide_move_history: config.hideMoveHistory,
  selected_family_names: selectedFamilyNames,
  selected_line_ids: selectedLineIds,
  played_uci_moves: playedUciMoves,
  started_at: startedAt,
  completed_at: completedAt,
});

const getSignedInUserId = async () => {
  if (!supabase) {
    console.info('Supabase not configured; skipping training save.');
    return { ok: false as const, reason: 'no_supabase' as const };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    console.info('Skipping training save because the user is not signed in.');
    return { ok: false as const, reason: 'not_signed_in' as const };
  }

  return { ok: true as const, userId: user.id };
};

export const savePuzzleAttempt = async (input: SavePuzzleAttemptInput): Promise<SaveResult> => {
  const authResult = await getSignedInUserId();
  if (!authResult.ok) {
    return authResult;
  }

  try {
    const { data, error } = await supabase!
      .from('puzzle_attempts')
      .insert({
        user_id: authResult.userId,
        ...buildPuzzleAttemptPayload(input),
      })
      .select('id')
      .single();

    if (error) {
      throw error;
    }

    console.info('Saved puzzle attempt:', data.id);
    void trackAnalyticsEvent('puzzle_attempt_saved', {
      result: input.result,
      puzzle_rating: input.puzzle.rating,
      min_rating: input.config.minRating,
      max_rating: input.config.maxRating,
      reveal_every: input.config.revealEvery,
      allow_cheats: input.config.allowCheats,
      hide_move_history: input.config.hideMoveHistory,
      selected_theme_count: input.config.selectedThemes.length,
      player_move_count: input.playerMoveCount,
      wrong_move_count: input.wrongMoveCount,
    });
    return { ok: true, id: data.id };
  } catch (error) {
    console.error('Failed to save puzzle attempt:', error);
    return { ok: false, reason: 'error', error };
  }
};

export const saveDrillRound = async (input: SaveDrillRoundInput): Promise<SaveResult> => {
  const authResult = await getSignedInUserId();
  if (!authResult.ok) {
    return authResult;
  }

  try {
    const { data, error } = await supabase!
      .from('drill_rounds')
      .insert({
        user_id: authResult.userId,
        ...buildDrillRoundPayload(input),
      })
      .select('id')
      .single();

    if (error) {
      throw error;
    }

    console.info('Saved drill round:', data.id);
    void trackAnalyticsEvent('drill_round_saved', {
      mode: input.config.mode,
      perspective: input.config.perspective,
      show_coordinates: input.config.showCoordinates,
      round_length_seconds: input.config.roundLengthSeconds,
      correct_count: input.stats.correctCount,
      wrong_count: input.stats.wrongCount,
      total_attempts: input.stats.totalAttempts,
      score: getVisionScore(input.stats),
      accuracy: getVisionAccuracy(input.stats),
    });
    return { ok: true, id: data.id };
  } catch (error) {
    console.error('Failed to save drill round:', error);
    return { ok: false, reason: 'error', error };
  }
};

export const saveOpeningRound = async (input: SaveOpeningRoundInput): Promise<SaveResult> => {
  const authResult = await getSignedInUserId();
  if (!authResult.ok) {
    return authResult;
  }

  try {
    const { data, error } = await supabase!
      .from('opening_rounds')
      .insert({
        user_id: authResult.userId,
        ...buildOpeningRoundPayload(input),
      })
      .select('id')
      .single();

    if (error) {
      throw error;
    }

    console.info('Saved opening round:', data.id);
    void trackAnalyticsEvent('opening_round_saved', {
      opening_line_id: input.openingLineId,
      opening_eco: input.opening.eco,
      opening_name: input.opening.name,
      player_color: input.config.playerColor,
      depth_player_moves: input.config.depthPlayerMoves,
      reveal_every: input.config.revealEvery,
      allow_cheats: input.config.allowCheats,
      hide_move_history: input.config.hideMoveHistory,
      selected_family_count: input.selectedFamilyNames.length,
      selected_line_count: input.selectedLineIds.length,
      played_move_count: input.playedUciMoves.length,
    });
    return { ok: true, id: data.id };
  } catch (error) {
    console.error('Failed to save opening round:', error);
    return { ok: false, reason: 'error', error };
  }
};
