import type { PuzzleConfig, PuzzleRecord } from '@/lib/puzzles';
import { supabase } from '@/lib/supabase';
import type { TurnColor, VisionMovePosition } from '@/lib/visionTrainer';

export const PUZZLE_BATCH_SIZE = 24;
export const PUZZLE_QUEUE_REFILL_THRESHOLD = 5;

type PuzzleRow = {
  id: string;
  fen: string;
  moves: string[];
  rating: number;
  themes: string[];
  game_url: string | null;
};

type DrillMovePositionRow = {
  id: string;
  fen: string;
  san: string;
  from_square: string;
  to_square: string;
  turn_color: TurnColor;
};

type TrainingContentClient = NonNullable<typeof supabase>;

const ensureTrainingContentClient = (client: TrainingContentClient | null) => {
  if (!client) {
    throw new Error('Supabase is not configured for training content.');
  }

  return client;
};

const sortAndDedupeTextValues = (values: string[]) => (
  Array.from(new Set(values)).sort((left, right) => left.localeCompare(right))
);

const mapPuzzleRow = (row: PuzzleRow): PuzzleRecord => ({
  id: row.id,
  fen: row.fen,
  moves: row.moves,
  rating: row.rating,
  themes: row.themes,
  gameUrl: row.game_url ?? undefined,
});

const mapDrillMovePositionRow = (row: DrillMovePositionRow): VisionMovePosition => ({
  id: row.id,
  fen: row.fen,
  san: row.san,
  fromSquare: row.from_square,
  toSquare: row.to_square,
  turnColor: row.turn_color,
});

export const normalizePuzzleConfigForQuery = (config: PuzzleConfig): PuzzleConfig => ({
  ...config,
  selectedThemes: sortAndDedupeTextValues(config.selectedThemes),
});

const applyPuzzleFilters = <TQuery extends {
  gte: (column: string, value: number) => TQuery;
  lte: (column: string, value: number) => TQuery;
  overlaps: (column: string, value: string[]) => TQuery;
}>(query: TQuery, config: PuzzleConfig) => {
  const normalizedConfig = normalizePuzzleConfigForQuery(config);
  let filteredQuery = query
    .gte('rating', normalizedConfig.minRating)
    .lte('rating', normalizedConfig.maxRating);

  if (normalizedConfig.selectedThemes.length > 0) {
    filteredQuery = filteredQuery.overlaps('themes', normalizedConfig.selectedThemes);
  }

  return filteredQuery;
};

export const fetchPuzzleCount = async (
  config: PuzzleConfig,
  client: TrainingContentClient | null = supabase,
) => {
  const normalizedConfig = normalizePuzzleConfigForQuery(config);

  if (normalizedConfig.selectedThemes.length === 0) {
    return 0;
  }

  const trainingContentClient = ensureTrainingContentClient(client);
  const { count, error } = await applyPuzzleFilters(
    trainingContentClient
      .from('puzzles')
      .select('id', {
        count: 'exact',
        head: true,
      }),
    normalizedConfig,
  );

  if (error) {
    throw error;
  }

  return count ?? 0;
};

export const fetchPuzzleBatch = async (
  config: PuzzleConfig,
  excludeIds: string[] = [],
  batchSize = PUZZLE_BATCH_SIZE,
  client: TrainingContentClient | null = supabase,
) => {
  const normalizedConfig = normalizePuzzleConfigForQuery(config);

  if (normalizedConfig.selectedThemes.length === 0 || batchSize <= 0) {
    return [] as PuzzleRecord[];
  }

  const trainingContentClient = ensureTrainingContentClient(client);
  const { data, error } = await trainingContentClient.rpc('get_puzzle_batch', {
    min_rating: normalizedConfig.minRating,
    max_rating: normalizedConfig.maxRating,
    selected_themes: normalizedConfig.selectedThemes,
    exclude_ids: sortAndDedupeTextValues(excludeIds.filter(Boolean)),
    batch_size: batchSize,
  });

  if (error) {
    throw error;
  }

  return ((data ?? []) as PuzzleRow[]).map(mapPuzzleRow);
};

export const fetchMoveDrillPositions = async (
  turnColor: TurnColor,
  client: TrainingContentClient | null = supabase,
) => {
  const trainingContentClient = ensureTrainingContentClient(client);
  const { data, error } = await trainingContentClient
    .from('drill_move_positions')
    .select('id, fen, san, from_square, to_square, turn_color')
    .eq('turn_color', turnColor)
    .order('id', {
      ascending: true,
    });

  if (error) {
    throw error;
  }

  return ((data ?? []) as DrillMovePositionRow[]).map(mapDrillMovePositionRow);
};
