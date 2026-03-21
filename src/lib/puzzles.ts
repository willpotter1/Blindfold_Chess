import { Chess } from 'chess.js';
import puzzleDataJson from '@/data/lichess_mate_1200_1800_dev.json?raw';

export type PuzzleRecord = {
  id: string;
  fen: string;
  moves: string[];
  rating: number;
  themes: string[];
  gameUrl?: string;
};

export type PuzzleConfig = {
  minRating: number;
  maxRating: number;
  revealEvery: number;
  allowCheats: boolean;
  hideMoveHistory: boolean;
  selectedThemes: string[];
};

export type PuzzleThemeOption = {
  value: string;
  label: string;
};

export type PreparedPuzzleRecord = {
  id: string;
  playableFen: string;
  playerColor: 'white' | 'black';
  computerColor: 'white' | 'black';
  openingSan: string;
  playerSolutionStartIndex: number;
};

const parsedPuzzleData = JSON.parse(puzzleDataJson) as PuzzleRecord[];

export const builtInPuzzles: PuzzleRecord[] = parsedPuzzleData;

const preparedPuzzleCache = new Map<string, PreparedPuzzleRecord | null>();

const getColorFromFen = (fen: string): 'white' | 'black' => (
  fen.split(' ')[1] === 'b' ? 'black' : 'white'
);

const getOpposingColor = (color: 'white' | 'black'): 'white' | 'black' => (
  color === 'white' ? 'black' : 'white'
);

const applyUciMove = (chess: Chess, uciMove: string) => (
  chess.move({
    from: uciMove.slice(0, 2),
    to: uciMove.slice(2, 4),
    promotion: uciMove.slice(4, 5) || undefined,
  })
);

export const preparePuzzle = (puzzle: PuzzleRecord): PreparedPuzzleRecord | null => {
  if (preparedPuzzleCache.has(puzzle.id)) {
    return preparedPuzzleCache.get(puzzle.id) ?? null;
  }

  let preparedPuzzle: PreparedPuzzleRecord | null = null;

  try {
    // Lichess puzzle records include the opponent's setup move before the player's winning line.
    if (puzzle.moves.length < 2 || puzzle.moves.length % 2 !== 0) {
      preparedPuzzleCache.set(puzzle.id, null);
      return null;
    }

    const chess = new Chess(puzzle.fen);
    const openingMove = applyUciMove(chess, puzzle.moves[0]);
    if (!openingMove) {
      preparedPuzzleCache.set(puzzle.id, null);
      return null;
    }

    const solutionPlayback = new Chess(chess.fen());
    for (let moveIndex = 1; moveIndex < puzzle.moves.length; moveIndex += 1) {
      const appliedMove = applyUciMove(solutionPlayback, puzzle.moves[moveIndex]);
      if (!appliedMove) {
        preparedPuzzleCache.set(puzzle.id, null);
        return null;
      }
    }

    const computerColor = getColorFromFen(puzzle.fen);
    const playerColor = getOpposingColor(computerColor);
    const losingColor = solutionPlayback.turn() === 'b' ? 'black' : 'white';
    if (!solutionPlayback.isCheckmate() || losingColor !== computerColor) {
      preparedPuzzleCache.set(puzzle.id, null);
      return null;
    }

    preparedPuzzle = {
      id: puzzle.id,
      playableFen: chess.fen(),
      playerColor,
      computerColor,
      openingSan: openingMove.san,
      playerSolutionStartIndex: 1,
    };
  } catch {
    preparedPuzzle = null;
  }

  preparedPuzzleCache.set(puzzle.id, preparedPuzzle);
  return preparedPuzzle;
};

const CURATED_THEME_LABELS: Record<string, string> = {
  mateIn1: 'Mate in 1',
  mateIn2: 'Mate in 2',
  mateIn3: 'Mate in 3',
  opening: 'Opening',
  middlegame: 'Middlegame',
  endgame: 'Endgame',
  sacrifice: 'Sacrifice',
  pin: 'Pin',
  backRankMate: 'Back Rank Mate',
  kingsideAttack: 'Kingside Attack',
  fork: 'Fork',
  deflection: 'Deflection',
  attraction: 'Attraction',
  operaMate: 'Opera Mate',
};

export const curatedPuzzleThemeOptions: PuzzleThemeOption[] = Object.entries(CURATED_THEME_LABELS).map(
  ([value, label]) => ({
    value,
    label,
  }),
);

const puzzleRatings = parsedPuzzleData.map((puzzle) => puzzle.rating);

export const puzzleRatingBounds = {
  min: Math.min(...puzzleRatings),
  max: Math.max(...puzzleRatings),
};

export const defaultPuzzleConfig: PuzzleConfig = {
  minRating: puzzleRatingBounds.min,
  maxRating: puzzleRatingBounds.max,
  revealEvery: 3,
  allowCheats: true,
  hideMoveHistory: false,
  selectedThemes: curatedPuzzleThemeOptions.map((option) => option.value),
};

export const getPuzzleMateLabel = (themes: string[]): string | null => {
  return themes.find((theme) => /^mateIn\d+$/i.test(theme)) ?? null;
};

export const filterPuzzles = (puzzles: PuzzleRecord[], config: PuzzleConfig): PuzzleRecord[] => {
  if (config.selectedThemes.length === 0) {
    return [];
  }

  return puzzles.filter((puzzle) => {
    if (puzzle.rating < config.minRating || puzzle.rating > config.maxRating) {
      return false;
    }

    return config.selectedThemes.some((theme) => puzzle.themes.includes(theme));
  });
};
