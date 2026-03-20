import { Chess, type PieceSymbol } from 'chess.js';

type ParticipantColor = 'white' | 'black';
type NonKingPieceSymbol = Exclude<PieceSymbol, 'k'>;

export interface CapturedPieceDescriptor {
  type: NonKingPieceSymbol;
  color: ParticipantColor;
}

export type CapturedPiecesByColor = {
  white: CapturedPieceDescriptor[];
  black: CapturedPieceDescriptor[];
};

type PieceInventory = Record<NonKingPieceSymbol, number>;
type PieceInventoryByColor = Record<ParticipantColor, PieceInventory>;

const INITIAL_PIECE_COUNTS: PieceInventory = {
  q: 1,
  r: 2,
  b: 2,
  n: 2,
  p: 8,
};

const PIECE_DISPLAY_ORDER: NonKingPieceSymbol[] = ['q', 'r', 'b', 'n', 'p'];

const createEmptyPieceInventory = (): PieceInventory => ({
  q: 0,
  r: 0,
  b: 0,
  n: 0,
  p: 0,
});

const getRemainingPieceCountsFromFen = (fen: string): PieceInventoryByColor => {
  const chess = new Chess(fen);
  const remainingPieces: PieceInventoryByColor = {
    white: createEmptyPieceInventory(),
    black: createEmptyPieceInventory(),
  };

  for (const row of chess.board()) {
    for (const piece of row) {
      if (!piece || piece.type === 'k') continue;

      const colorKey = piece.color === 'w' ? 'white' : 'black';
      remainingPieces[colorKey][piece.type] += 1;
    }
  }

  return remainingPieces;
};

const buildCapturedPiecesForParticipant = (
  participantColor: ParticipantColor,
  opponentRemainingPieces: PieceInventory,
): CapturedPieceDescriptor[] => {
  const capturedPieceColor = participantColor === 'white' ? 'black' : 'white';
  const capturedPieces: CapturedPieceDescriptor[] = [];

  for (const pieceType of PIECE_DISPLAY_ORDER) {
    const capturedCount = Math.max(INITIAL_PIECE_COUNTS[pieceType] - opponentRemainingPieces[pieceType], 0);

    for (let index = 0; index < capturedCount; index += 1) {
      capturedPieces.push({
        type: pieceType,
        color: capturedPieceColor,
      });
    }
  }

  return capturedPieces;
};

export const getCapturedPiecesByColorFromFen = (fen: string): CapturedPiecesByColor => {
  const remainingPieces = getRemainingPieceCountsFromFen(fen);

  return {
    white: buildCapturedPiecesForParticipant('white', remainingPieces.black),
    black: buildCapturedPiecesForParticipant('black', remainingPieces.white),
  };
};
