import { Chess } from 'chess.js';
import { visionMovePositions } from '@/data/visionMovePositions';

export type VisionMode = 'coordinates' | 'moves';
export type BoardPerspective = 'white' | 'black';
export type TurnColor = 'white' | 'black';
export type MovesPieceDisplay = 'board' | 'panel';
export type RoundLengthSeconds = 30 | 60 | 120;

export type VisionCoordinatePrompt = {
  id: string;
  label: string;
  answerSquare: string;
  mode: 'coordinates';
};

export type VisionMovePosition = {
  id: string;
  fen: string;
  san: string;
  fromSquare: string;
  toSquare: string;
  turnColor: TurnColor;
};

export type VisionMovePrompt = VisionMovePosition & {
  label: string;
  mode: 'moves';
};

export type VisionPrompt = VisionCoordinatePrompt | VisionMovePrompt;

export type VisionRoundConfig = {
  mode: VisionMode;
  perspective: BoardPerspective;
  showCoordinates: boolean;
  roundLengthSeconds: RoundLengthSeconds;
  movesPieceDisplay: MovesPieceDisplay;
};

export type VisionRoundStats = {
  correctCount: number;
  wrongCount: number;
  totalAttempts: number;
};

export type BoardCoordinates = {
  row: number;
  col: number;
};

export type VisionPieceType = 'king' | 'queen' | 'rook' | 'bishop' | 'knight' | 'pawn';
export type VisionPieceSpriteKey =
  | 'wk'
  | 'wq'
  | 'wr'
  | 'wb'
  | 'wn'
  | 'wp'
  | 'bk'
  | 'bq'
  | 'br'
  | 'bb'
  | 'bn'
  | 'bp';

export type VisionBoardPiece = {
  square: string;
  color: TurnColor;
  type: VisionPieceType;
  spriteKey: VisionPieceSpriteKey;
  displayName: string;
};

export type VisionMoveClickResolution =
  | {
      kind: 'select-from';
      selectedFromSquare: string;
      shouldCountAttempt: false;
    }
  | {
      kind: 'resolved';
      result: 'correct' | 'wrong';
      feedbackSquare: string;
      shouldCountAttempt: true;
    };

export type VisionMoveValidationResult =
  | { isValid: true }
  | { isValid: false; reason: string };

const BOARD_SIZE = 8;
const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'] as const;
const SIMPLE_VISION_MOVE_SAN_PATTERN = /^(?:[KQRBN](?:x)?[a-h][1-8]|[a-h][1-8]|[a-h]x[a-h][1-8])$/;

const CHESS_PIECE_TO_VISION_PIECE: Record<string, VisionPieceType> = {
  k: 'king',
  q: 'queen',
  r: 'rook',
  b: 'bishop',
  n: 'knight',
  p: 'pawn',
};

const PIECE_DISPLAY_NAMES: Record<VisionPieceType, string> = {
  king: 'King',
  queen: 'Queen',
  rook: 'Rook',
  bishop: 'Bishop',
  knight: 'Knight',
  pawn: 'Pawn',
};

const PIECE_SORT_ORDER: Record<VisionPieceType, number> = {
  king: 0,
  queen: 1,
  rook: 2,
  bishop: 3,
  knight: 4,
  pawn: 5,
};

export const roundLengthOptions: readonly RoundLengthSeconds[] = [30, 60, 120] as const;

export const defaultVisionRoundConfig: VisionRoundConfig = {
  mode: 'coordinates',
  perspective: 'white',
  showCoordinates: true,
  roundLengthSeconds: 60,
  movesPieceDisplay: 'board',
};

export const emptyVisionRoundStats: VisionRoundStats = {
  correctCount: 0,
  wrongCount: 0,
  totalAttempts: 0,
};

const assertValidVisualIndex = (value: number, label: string) => {
  if (!Number.isInteger(value) || value < 0 || value >= BOARD_SIZE) {
    throw new Error(`Invalid visual ${label}: ${value}`);
  }
};

const assertValidSquare = (square: string) => {
  if (!/^[a-h][1-8]$/.test(square)) {
    throw new Error(`Invalid square: ${square}`);
  }
};

export const generateAllSquares = () => {
  const squares: string[] = [];

  for (let rank = 1; rank <= BOARD_SIZE; rank += 1) {
    for (const file of FILES) {
      squares.push(`${file}${rank}`);
    }
  }

  return squares;
};

export const visualPositionToSquare = (
  { row, col }: BoardCoordinates,
  perspective: BoardPerspective,
) => {
  assertValidVisualIndex(row, 'row');
  assertValidVisualIndex(col, 'column');

  const file = perspective === 'white' ? FILES[col] : FILES[BOARD_SIZE - 1 - col];
  const rank = perspective === 'white' ? BOARD_SIZE - row : row + 1;

  return `${file}${rank}`;
};

export const squareToVisualPosition = (
  square: string,
  perspective: BoardPerspective,
): BoardCoordinates => {
  assertValidSquare(square);

  const fileIndex = FILES.indexOf(square[0] as typeof FILES[number]);
  const rank = Number(square[1]);

  return perspective === 'white'
    ? { row: BOARD_SIZE - rank, col: fileIndex }
    : { row: rank - 1, col: BOARD_SIZE - 1 - fileIndex };
};

export const getFileLabelForColumn = (col: number, perspective: BoardPerspective) => {
  assertValidVisualIndex(col, 'column');
  return perspective === 'white' ? FILES[col] : FILES[BOARD_SIZE - 1 - col];
};

export const getRankLabelForRow = (row: number, perspective: BoardPerspective) => {
  assertValidVisualIndex(row, 'row');
  return String(perspective === 'white' ? BOARD_SIZE - row : row + 1);
};

export const getTurnColorFromFen = (fen: string): TurnColor => (
  fen.split(' ')[1] === 'b' ? 'black' : 'white'
);

const flipFenTurn = (fen: string) => {
  const parts = fen.split(' ');
  parts[1] = parts[1] === 'w' ? 'b' : 'w';
  return parts.join(' ');
};

export const isSimpleVisionMoveSan = (san: string) => SIMPLE_VISION_MOVE_SAN_PATTERN.test(san.trim());

export const getPiecePlacementsFromFen = (
  fen: string,
  leadingColor: TurnColor = 'white',
) => {
  const chess = new Chess(fen);
  const colorOrder = leadingColor === 'white'
    ? { white: 0, black: 1 }
    : { black: 0, white: 1 };

  const pieces: VisionBoardPiece[] = [];

  chess.board().forEach((row, rowIndex) => {
    row.forEach((piece, colIndex) => {
      if (!piece) {
        return;
      }

      const square = `${FILES[colIndex]}${BOARD_SIZE - rowIndex}`;
      const color = piece.color === 'w' ? 'white' : 'black';
      const type = CHESS_PIECE_TO_VISION_PIECE[piece.type];

      pieces.push({
        square,
        color,
        type,
        spriteKey: `${piece.color}${piece.type}` as VisionPieceSpriteKey,
        displayName: PIECE_DISPLAY_NAMES[type],
      });
    });
  });

  return pieces.sort((left, right) => {
    const colorDelta = colorOrder[left.color] - colorOrder[right.color];

    if (colorDelta !== 0) {
      return colorDelta;
    }

    const typeDelta = PIECE_SORT_ORDER[left.type] - PIECE_SORT_ORDER[right.type];

    if (typeDelta !== 0) {
      return typeDelta;
    }

    return left.square.localeCompare(right.square);
  });
};

export const validateVisionMovePosition = (
  position: VisionMovePosition,
): VisionMoveValidationResult => {
  let chess: Chess;

  try {
    chess = new Chess(position.fen);
  } catch (error) {
    return {
      isValid: false,
      reason: error instanceof Error ? error.message : 'Invalid FEN',
    };
  }

  if (getTurnColorFromFen(position.fen) !== position.turnColor) {
    return {
      isValid: false,
      reason: 'Turn color does not match the FEN side to move.',
    };
  }

  if (chess.inCheck() || chess.isCheckmate() || chess.isStalemate()) {
    return {
      isValid: false,
      reason: 'Side to move is already in check or the position is already finished.',
    };
  }

  if (new Chess(flipFenTurn(position.fen)).inCheck()) {
    return {
      isValid: false,
      reason: 'The non-moving king is under attack in the stored position.',
    };
  }

  if (!isSimpleVisionMoveSan(position.san)) {
    return {
      isValid: false,
      reason: 'SAN is outside the allowed simple move subset.',
    };
  }

  if (getPiecePlacementsFromFen(position.fen).length !== 6) {
    return {
      isValid: false,
      reason: 'Position does not contain exactly six pieces.',
    };
  }

  const matchingMove = chess.moves({ verbose: true }).find((move) => (
    move.from === position.fromSquare &&
    move.to === position.toSquare &&
    !move.promotion
  ));

  if (!matchingMove) {
    return {
      isValid: false,
      reason: 'Designated move is not legal from the stored FEN.',
    };
  }

  if (matchingMove.san !== position.san) {
    return {
      isValid: false,
      reason: `Stored SAN ${position.san} does not match legal SAN ${matchingMove.san}.`,
    };
  }

  return { isValid: true };
};

const createCoordinatePrompts = () =>
  generateAllSquares().map<VisionCoordinatePrompt>((square) => ({
    id: `coordinates:${square}`,
    label: square,
    answerSquare: square,
    mode: 'coordinates',
  }));

const createMovesPrompts = (turnColor: TurnColor) =>
  visionMovePositions
    .filter((position) => position.turnColor === turnColor)
    .map<VisionMovePrompt>((position) => ({
      ...position,
      label: position.san,
      mode: 'moves',
    }));

const getBasePrompts = (config: VisionRoundConfig) => (
  config.mode === 'coordinates'
    ? createCoordinatePrompts()
    : createMovesPrompts(config.perspective)
);

export const shufflePrompts = <T,>(prompts: readonly T[], random: () => number = Math.random) => {
  const shuffled = [...prompts];

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }

  return shuffled;
};

export const buildPromptDeck = (
  config: VisionRoundConfig,
  lastPromptId?: string | null,
  random: () => number = Math.random,
) => {
  const deck = shufflePrompts(getBasePrompts(config), random);

  if (lastPromptId && deck.length > 1 && deck[0].id === lastPromptId) {
    const nextUniqueIndex = deck.findIndex((prompt) => prompt.id !== lastPromptId);

    if (nextUniqueIndex > 0) {
      [deck[0], deck[nextUniqueIndex]] = [deck[nextUniqueIndex], deck[0]];
    }
  }

  return deck;
};

export const resolveMovesPromptClick = (
  prompt: VisionMovePrompt,
  selectedFromSquare: string | null,
  clickedSquare: string,
): VisionMoveClickResolution => {
  if (!selectedFromSquare) {
    return clickedSquare === prompt.fromSquare
      ? {
          kind: 'select-from',
          selectedFromSquare: clickedSquare,
          shouldCountAttempt: false,
        }
      : {
          kind: 'resolved',
          result: 'wrong',
          feedbackSquare: clickedSquare,
          shouldCountAttempt: true,
        };
  }

  return clickedSquare === prompt.toSquare
    ? {
        kind: 'resolved',
        result: 'correct',
        feedbackSquare: clickedSquare,
        shouldCountAttempt: true,
      }
    : {
        kind: 'resolved',
        result: 'wrong',
        feedbackSquare: clickedSquare,
        shouldCountAttempt: true,
      };
};

export const getVisionAccuracy = (stats: VisionRoundStats) => (
  stats.totalAttempts === 0 ? 0 : stats.correctCount / stats.totalAttempts
);

export const getVisionScore = (stats: VisionRoundStats) => stats.correctCount;
