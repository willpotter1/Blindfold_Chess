import { describe, expect, it, vi } from 'vitest';
import { defaultPuzzleConfig } from '@/lib/puzzles';
import {
  fetchMoveDrillPositions,
  fetchPuzzleBatch,
  fetchPuzzleCount,
  normalizePuzzleConfigForQuery,
} from './trainingContent';

type PuzzleCountClient = NonNullable<Parameters<typeof fetchPuzzleCount>[1]>;
type PuzzleBatchClient = NonNullable<Parameters<typeof fetchPuzzleBatch>[3]>;
type MoveDrillClient = NonNullable<Parameters<typeof fetchMoveDrillPositions>[1]>;

const createPromiseQuery = <T,>(result: T) => {
  const query = Promise.resolve(result) as Promise<T> & {
    select: ReturnType<typeof vi.fn>;
    gte: ReturnType<typeof vi.fn>;
    lte: ReturnType<typeof vi.fn>;
    overlaps: ReturnType<typeof vi.fn>;
    eq: ReturnType<typeof vi.fn>;
    order: ReturnType<typeof vi.fn>;
  };

  query.select = vi.fn().mockReturnValue(query);
  query.gte = vi.fn().mockReturnValue(query);
  query.lte = vi.fn().mockReturnValue(query);
  query.overlaps = vi.fn().mockReturnValue(query);
  query.eq = vi.fn().mockReturnValue(query);
  query.order = vi.fn().mockReturnValue(query);
  return query;
};

describe('trainingContent', () => {
  it('normalizes selected themes for stable puzzle queries', () => {
    expect(normalizePuzzleConfigForQuery({
      ...defaultPuzzleConfig,
      selectedThemes: ['fork', 'mateIn2', 'fork', 'attraction'],
    }).selectedThemes).toEqual(['attraction', 'fork', 'mateIn2']);
  });

  it('applies rating and theme filters when counting puzzles', async () => {
    const query = createPromiseQuery({ count: 42, error: null });
    const client = {
      from: vi.fn().mockReturnValue(query),
    } as Pick<PuzzleCountClient, 'from'> as PuzzleCountClient;

    const count = await fetchPuzzleCount({
      ...defaultPuzzleConfig,
      minRating: 1300,
      maxRating: 1500,
      selectedThemes: ['fork', 'mateIn2', 'fork'],
    }, client);

    expect(count).toBe(42);
    expect(client.from).toHaveBeenCalledWith('puzzles');
    expect(query.select).toHaveBeenCalledWith('id', {
      count: 'exact',
      head: true,
    });
    expect(query.gte).toHaveBeenCalledWith('rating', 1300);
    expect(query.lte).toHaveBeenCalledWith('rating', 1500);
    expect(query.overlaps).toHaveBeenCalledWith('themes', ['fork', 'mateIn2']);
  });

  it('passes exclusion ids to the puzzle batch RPC and maps rows', async () => {
    const client = {
      rpc: vi.fn().mockResolvedValue({
        data: [{
          id: 'puzzle-1',
          fen: '8/8/8/8/8/8/8/8 w - - 0 1',
          moves: ['e2e4', 'e7e5'],
          rating: 1400,
          themes: ['mateIn2'],
          game_url: 'https://lichess.org/example',
        }],
        error: null,
      }),
    } as Pick<PuzzleBatchClient, 'rpc'> as PuzzleBatchClient;

    const puzzles = await fetchPuzzleBatch({
      ...defaultPuzzleConfig,
      minRating: 1350,
      maxRating: 1500,
      selectedThemes: ['fork', 'mateIn2', 'fork'],
    }, ['puzzle-3', 'puzzle-1', 'puzzle-3'], 24, client);

    expect(client.rpc).toHaveBeenCalledWith('get_puzzle_batch', {
      min_rating: 1350,
      max_rating: 1500,
      selected_themes: ['fork', 'mateIn2'],
      exclude_ids: ['puzzle-1', 'puzzle-3'],
      batch_size: 24,
    });
    expect(puzzles).toEqual([{
      id: 'puzzle-1',
      fen: '8/8/8/8/8/8/8/8 w - - 0 1',
      moves: ['e2e4', 'e7e5'],
      rating: 1400,
      themes: ['mateIn2'],
      gameUrl: 'https://lichess.org/example',
    }]);
  });

  it('maps move drill rows from Supabase into runtime positions', async () => {
    const query = createPromiseQuery({
      data: [{
        id: 'moves-black-001',
        fen: '8/8/8/8/8/8/8/8 b - - 0 1',
        san: 'Qa5',
        from_square: 'a4',
        to_square: 'a5',
        turn_color: 'black',
      }],
      error: null,
    });
    const client = {
      from: vi.fn().mockReturnValue(query),
    } as Pick<MoveDrillClient, 'from'> as MoveDrillClient;

    const positions = await fetchMoveDrillPositions('black', client);

    expect(client.from).toHaveBeenCalledWith('drill_move_positions');
    expect(query.select).toHaveBeenCalledWith('id, fen, san, from_square, to_square, turn_color');
    expect(query.eq).toHaveBeenCalledWith('turn_color', 'black');
    expect(query.order).toHaveBeenCalledWith('id', {
      ascending: true,
    });
    expect(positions).toEqual([{
      id: 'moves-black-001',
      fen: '8/8/8/8/8/8/8/8 b - - 0 1',
      san: 'Qa5',
      fromSquare: 'a4',
      toSquare: 'a5',
      turnColor: 'black',
    }]);
  });
});
