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

const parsedPuzzleData = JSON.parse(puzzleDataJson) as PuzzleRecord[];

export const builtInPuzzles: PuzzleRecord[] = parsedPuzzleData;

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
