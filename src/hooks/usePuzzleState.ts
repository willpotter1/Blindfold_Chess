import { useCallback, useEffect, useRef, useState } from 'react';
import { Chess } from 'chess.js';
import { normalizeSan } from '@/lib/chess/normalizeSan';
import {
  defaultPuzzleConfig,
  filterPuzzles,
  preparePuzzle,
  type PuzzleConfig,
  type PuzzleRecord,
} from '@/lib/puzzles';

type SubmitMoveResult = {
  success: boolean;
  error?: string;
};

type PuzzlePhase = 'config' | 'session';
type HintStage = 0 | 1 | 2;

const toUci = (from: string, to: string, promotion?: string) => `${from}${to}${promotion ?? ''}`;

const pickRandomPuzzle = (puzzles: PuzzleRecord[], excludedPuzzleId?: string | null): PuzzleRecord | null => {
  if (!puzzles.length) {
    return null;
  }

  if (puzzles.length === 1) {
    return puzzles[0];
  }

  let nextPuzzle = puzzles[Math.floor(Math.random() * puzzles.length)];
  while (nextPuzzle.id === excludedPuzzleId) {
    nextPuzzle = puzzles[Math.floor(Math.random() * puzzles.length)];
  }

  return nextPuzzle;
};

const getStatusWithLastComputerMove = (lastComputerMoveSan: string, chess: Chess) => {
  if (chess.inCheck()) {
    return `Last computer move: ${lastComputerMoveSan}\n${chess.turn() === 'w' ? 'White' : 'Black'} is in check`;
  }

  return `Last computer move: ${lastComputerMoveSan}`;
};

export const usePuzzleState = (puzzles: PuzzleRecord[]) => {
  const [phase, setPhase] = useState<PuzzlePhase>('config');
  const [config, setConfig] = useState<PuzzleConfig>(defaultPuzzleConfig);
  const [previewPool, setPreviewPool] = useState<PuzzleRecord[]>([]);
  const [previewPuzzle, setPreviewPuzzle] = useState<PuzzleRecord | null>(null);
  const [configError, setConfigError] = useState('');
  const [currentPuzzle, setCurrentPuzzle] = useState<PuzzleRecord | null>(null);
  const [sessionConfig, setSessionConfig] = useState<PuzzleConfig | null>(null);
  const [fen, setFen] = useState('');
  const [moves, setMoves] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('White to move');
  const [isSolved, setIsSolved] = useState(false);
  const [playerMoveCount, setPlayerMoveCount] = useState(0);
  const [hintStage, setHintStage] = useState<HintStage>(0);
  const chessRef = useRef<Chess | null>(null);
  const solutionIndexRef = useRef(0);
  const previewPuzzleIdRef = useRef<string | null>(null);
  const currentPuzzleIdRef = useRef<string | null>(null);
  const sessionPoolRef = useRef<PuzzleRecord[]>([]);

  const updateStateFromChess = useCallback((chess: Chess) => {
    setFen(chess.fen());
    setMoves(chess.history());
  }, []);

  const failMove = useCallback((message: string, statusMessage = 'Try again.'): SubmitMoveResult => {
    setError(message);
    setStatus(statusMessage);
    return { success: false, error: message };
  }, []);

  const resetSessionState = useCallback((puzzle: PuzzleRecord, nextSessionConfig: PuzzleConfig, nextSessionPool: PuzzleRecord[]) => {
    const preparedPuzzle = preparePuzzle(puzzle);
    if (!preparedPuzzle) {
      setCurrentPuzzle(null);
      setSessionConfig(null);
      setError('Puzzle data error');
      setStatus('Loading puzzle...');
      return false;
    }

    const chess = new Chess(puzzle.fen);
    const openingMove = chess.move({
      from: puzzle.moves[0].slice(0, 2),
      to: puzzle.moves[0].slice(2, 4),
      promotion: puzzle.moves[0].slice(4, 5) || undefined,
    });
    if (!openingMove) {
      setCurrentPuzzle(null);
      setSessionConfig(null);
      setError('Puzzle data error');
      setStatus('Loading puzzle...');
      return false;
    }

    chessRef.current = chess;
    solutionIndexRef.current = preparedPuzzle.playerSolutionStartIndex;
    currentPuzzleIdRef.current = puzzle.id;
    sessionPoolRef.current = nextSessionPool;

    setCurrentPuzzle(puzzle);
    setSessionConfig(nextSessionConfig);
    setPlayerMoveCount(0);
    setIsSolved(false);
    setHintStage(0);
    setError('');
    setStatus(getStatusWithLastComputerMove(preparedPuzzle.openingSan, chess));
    updateStateFromChess(chess);
    return true;
  }, [updateStateFromChess]);

  useEffect(() => {
    if (!puzzles.length) {
      setPreviewPool([]);
      setPreviewPuzzle(null);
      setConfigError('No puzzles are available.');
      previewPuzzleIdRef.current = null;
      return;
    }

    const matchingPuzzles = filterPuzzles(puzzles, config);
    const nextPreviewPool = matchingPuzzles.filter((puzzle) => preparePuzzle(puzzle));
    setPreviewPool(nextPreviewPool);

    if (!matchingPuzzles.length) {
      setPreviewPuzzle(null);
      setConfigError('No puzzles match the current filters.');
      previewPuzzleIdRef.current = null;
      return;
    }

    if (!nextPreviewPool.length) {
      setPreviewPuzzle(null);
      setConfigError('Matching puzzles could not be loaded due to puzzle data errors.');
      previewPuzzleIdRef.current = null;
      return;
    }

    setConfigError('');
    const persistedPreview =
      previewPuzzleIdRef.current
        ? nextPreviewPool.find((puzzle) => puzzle.id === previewPuzzleIdRef.current) ?? null
        : null;
    const nextPreviewPuzzle = persistedPreview ?? pickRandomPuzzle(nextPreviewPool, previewPuzzleIdRef.current);
    previewPuzzleIdRef.current = nextPreviewPuzzle?.id ?? null;
    setPreviewPuzzle(nextPreviewPuzzle);
  }, [config, puzzles]);

  const updateConfig = useCallback((nextConfig: PuzzleConfig) => {
    setConfig(nextConfig);
  }, []);

  const startSession = useCallback(() => {
    if (!previewPuzzle || !previewPool.length) {
      return false;
    }

    const didReset = resetSessionState(previewPuzzle, config, previewPool);
    if (!didReset) {
      setConfigError('Selected puzzle could not be loaded due to puzzle data errors.');
      setPhase('config');
      return false;
    }

    setPhase('session');
    return true;
  }, [config, previewPool, previewPuzzle, resetSessionState]);

  const exitToConfig = useCallback(() => {
    if (currentPuzzle) {
      previewPuzzleIdRef.current = currentPuzzle.id;
      setPreviewPuzzle(currentPuzzle);
    }

    setPhase('config');
    setCurrentPuzzle(null);
    setSessionConfig(null);
    sessionPoolRef.current = [];
    chessRef.current = null;
    currentPuzzleIdRef.current = null;
    solutionIndexRef.current = 0;
    setFen('');
    setMoves([]);
    setError('');
    setStatus('White to move');
    setIsSolved(false);
    setPlayerMoveCount(0);
    setHintStage(0);
  }, [currentPuzzle]);

  const finishIfSolved = useCallback((nextSolutionIndex: number) => {
    const chess = chessRef.current;
    if (!currentPuzzle || !chess) {
      return false;
    }

    if (nextSolutionIndex >= currentPuzzle.moves.length) {
      setIsSolved(true);
      setStatus('Solved');
      setError('');
      solutionIndexRef.current = nextSolutionIndex;
      return true;
    }

    return false;
  }, [currentPuzzle]);

  const commitCorrectMove = useCallback((uciMove: string): SubmitMoveResult => {
    const chess = chessRef.current;
    const puzzle = currentPuzzle;

    if (!chess || !puzzle) {
      return failMove('Puzzle not ready', 'Loading puzzle...');
    }

    const currentIndex = solutionIndexRef.current;
    const expectedMove = puzzle.moves[currentIndex];
    if (uciMove !== expectedMove) {
      return failMove('That move is legal, but it is not the puzzle solution.');
    }

    const playerMove = chess.move({
      from: uciMove.slice(0, 2),
      to: uciMove.slice(2, 4),
      promotion: uciMove.slice(4, 5) || undefined,
    });

    if (!playerMove) {
      return failMove('Invalid move');
    }

    let nextSolutionIndex = currentIndex + 1;
    solutionIndexRef.current = nextSolutionIndex;
    setPlayerMoveCount((count) => count + 1);
    setHintStage(0);
    setError('');
    updateStateFromChess(chess);

    if (finishIfSolved(nextSolutionIndex)) {
      return { success: true };
    }

    const replyMove = puzzle.moves[nextSolutionIndex];
    const replyApplied = chess.move({
      from: replyMove.slice(0, 2),
      to: replyMove.slice(2, 4),
      promotion: replyMove.slice(4, 5) || undefined,
    });

    if (!replyApplied) {
      return failMove('Puzzle reply could not be applied.', 'Puzzle data error.');
    }

    nextSolutionIndex += 1;
    solutionIndexRef.current = nextSolutionIndex;
    updateStateFromChess(chess);

    if (finishIfSolved(nextSolutionIndex)) {
      return { success: true };
    }

    setStatus(getStatusWithLastComputerMove(replyApplied.san, chess));
    return { success: true };
  }, [currentPuzzle, failMove, finishIfSolved, updateStateFromChess]);

  const submitSanMove = useCallback((san: string): SubmitMoveResult => {
    const chess = chessRef.current;
    if (!chess || !currentPuzzle) {
      return failMove('Puzzle not ready', 'Loading puzzle...');
    }

    if (isSolved) {
      return failMove('Puzzle already solved', 'Puzzle complete.');
    }

    try {
      const attempt = new Chess(chess.fen());
      const move = attempt.move(normalizeSan(san));
      if (!move) {
        return failMove('Illegal move');
      }

      return commitCorrectMove(toUci(move.from, move.to, move.promotion));
    } catch {
      return failMove('Invalid move format');
    }
  }, [commitCorrectMove, currentPuzzle, failMove, isSolved]);

  const submitBoardMove = useCallback((from: string, to: string): SubmitMoveResult => {
    const chess = chessRef.current;
    if (!chess || !currentPuzzle) {
      return failMove('Puzzle not ready', 'Loading puzzle...');
    }

    if (isSolved) {
      return failMove('Puzzle already solved', 'Puzzle complete.');
    }

    const legalFromMoves = chess.moves({ square: from, verbose: true });
    const matchingMoves = legalFromMoves.filter((move) => move.to === to);
    if (!matchingMoves.length) {
      return failMove('Invalid move');
    }

    const selectedMove = matchingMoves.find((move) => move.promotion === 'q') ?? matchingMoves[0];
    return commitCorrectMove(toUci(selectedMove.from, selectedMove.to, selectedMove.promotion));
  }, [commitCorrectMove, currentPuzzle, failMove, isSolved]);

  const retryPuzzle = useCallback(() => {
    if (!currentPuzzle || !sessionConfig || !sessionPoolRef.current.length) {
      return;
    }

    resetSessionState(currentPuzzle, sessionConfig, sessionPoolRef.current);
  }, [currentPuzzle, resetSessionState, sessionConfig]);

  const loadNextPuzzle = useCallback(() => {
    if (!sessionConfig || !sessionPoolRef.current.length) {
      return;
    }

    const nextPuzzle = pickRandomPuzzle(sessionPoolRef.current, currentPuzzleIdRef.current);
    if (!nextPuzzle) {
      return;
    }

    resetSessionState(nextPuzzle, sessionConfig, sessionPoolRef.current);
  }, [resetSessionState, sessionConfig]);

  const shouldShowBoard = useCallback(() => {
    if (phase !== 'session' || !sessionConfig) {
      return true;
    }

    if (sessionConfig.revealEvery <= 0) {
      return isSolved;
    }

    return playerMoveCount % sessionConfig.revealEvery === 0 || isSolved;
  }, [isSolved, phase, playerMoveCount, sessionConfig]);

  const advanceHint = useCallback(() => {
    if (phase !== 'session' || isSolved || !currentPuzzle?.moves[solutionIndexRef.current]) {
      return;
    }

    setHintStage((currentStage) => (currentStage < 2 ? ((currentStage + 1) as HintStage) : currentStage));
  }, [currentPuzzle, isSolved, phase]);

  const resetHint = useCallback(() => {
    setHintStage(0);
  }, []);

  const expectedPlayerMove =
    phase === 'session' && currentPuzzle && !isSolved
      ? currentPuzzle.moves[solutionIndexRef.current] ?? null
      : null;
  const hintSourceSquare = hintStage >= 1 && expectedPlayerMove ? expectedPlayerMove.slice(0, 2) : null;
  const hintTargetSquare = hintStage >= 2 && expectedPlayerMove ? expectedPlayerMove.slice(2, 4) : null;

  return {
    phase,
    config,
    previewPuzzle,
    previewPoolSize: previewPool.length,
    configError,
    currentPuzzle,
    sessionConfig,
    fen,
    moves,
    error,
    status,
    isSolved,
    hintStage,
    hintSourceSquare,
    hintTargetSquare,
    updateConfig,
    startSession,
    exitToConfig,
    submitSanMove,
    submitBoardMove,
    retryPuzzle,
    loadNextPuzzle,
    shouldShowBoard,
    advanceHint,
    resetHint,
  };
};
