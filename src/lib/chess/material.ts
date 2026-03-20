import { Chess } from 'chess.js';

const PIECE_VALUES = {
  p: 1,
  n: 3,
  b: 3,
  r: 5,
  q: 9,
  k: 0,
} as const;

export type MaterialCountByColor = {
  white: number;
  black: number;
};

export const getMaterialCountsFromFen = (fen: string): MaterialCountByColor => {
  const chess = new Chess(fen);
  const materialCounts: MaterialCountByColor = {
    white: 0,
    black: 0,
  };

  for (const row of chess.board()) {
    for (const piece of row) {
      if (!piece) continue;

      const colorKey = piece.color === 'w' ? 'white' : 'black';
      materialCounts[colorKey] += PIECE_VALUES[piece.type];
    }
  }

  return materialCounts;
};
