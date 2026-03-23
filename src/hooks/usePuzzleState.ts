import { useQuery } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Chess } from 'chess.js';
import { normalizeSan } from '@/lib/chess/normalizeSan';
import {
  createPuzzleSessionQueue,
  mergePuzzleQueueBatch,
  resetSeenPuzzleIds,
  shouldResetSeenPuzzleIds,
  takeNextQueuedPuzzle,
  type PuzzleQueueState,
} from '@/lib/puzzleQueue';
import {
  defaultPuzzleConfig,
  preparePuzzle,
  type PuzzleConfig,
  type PuzzleRecord,
} from '@/lib/puzzles';
import { hasSupabaseConfig } from '@/lib/supabase';
import {
  PUZZLE_BATCH_SIZE,
  PUZZLE_QUEUE_REFILL_THRESHOLD,
  fetchPuzzleBatch,
  fetchPuzzleCount,
  normalizePuzzleConfigForQuery,
} from '@/lib/trainingContent';
import { savePuzzleAttempt, type PuzzleAttemptResult } from '@/lib/trainingResults';
import { incrementUsageMetric } from '@/lib/usageMetrics';

type SubmitMoveResult = {
  success: boolean;
  error?: string;
};

type PuzzlePhase = 'config' | 'session';
type HintStage = 0 | 1 | 2;
type PuzzleAttemptTracker = {
  startedAt: string;
  playerMoveCount: number;
  wrongMoveCount: number;
};

const EMPTY_PUZZLE_QUEUE_STATE: PuzzleQueueState = {
  queuedPuzzles: [],
  seenPuzzleIds: [],
};

const toUci = (from: string, to: string, promotion?: string) => `${from}${to}${promotion ?? ''}`;

const getStatusWithLastComputerMove = (lastComputerMoveSan: string, chess: Chess) => {
  if (chess.inCheck()) {
    return `Last computer move: ${lastComputerMoveSan}\n${chess.turn() === 'w' ? 'White' : 'Black'} is in check`;
  }

  return `Last computer move: ${lastComputerMoveSan}`;
};

const getValidPuzzleBatch = (puzzles: readonly PuzzleRecord[]) => {
  const seenPuzzleIds = new Set<string>();

  return puzzles.filter((puzzle) => {
    if (seenPuzzleIds.has(puzzle.id) || !preparePuzzle(puzzle)) {
      return false;
    }

    seenPuzzleIds.add(puzzle.id);
    return true;
  });
};

const useDebouncedValue = <T,>(value: T, delayMs: number) => {
  const [debouncedValue, setDebouncedValue] = useState(value);
  const [isPending, setIsPending] = useState(false);

  useEffect(() => {
    setIsPending(true);
    const timeoutId = window.setTimeout(() => {
      setDebouncedValue(value);
      setIsPending(false);
    }, delayMs);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [delayMs, value]);

  useEffect(() => {
    if (Object.is(debouncedValue, value)) {
      setIsPending(false);
    }
  }, [debouncedValue, value]);

  return { debouncedValue, isPending };
};

export const usePuzzleState = () => {
  const [phase, setPhase] = useState<PuzzlePhase>('config');
  const [config, setConfig] = useState<PuzzleConfig>(defaultPuzzleConfig);
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
  const currentPuzzleIdRef = useRef<string | null>(null);
  const currentPuzzleRef = useRef<PuzzleRecord | null>(null);
  const sessionConfigRef = useRef<PuzzleConfig | null>(null);
  const activeAttemptRef = useRef<PuzzleAttemptTracker | null>(null);
  const hasSavedAttemptRef = useRef(false);
  const hasActiveUsageMetricsSessionRef = useRef(false);
  const sessionQueueRef = useRef<PuzzleQueueState>(EMPTY_PUZZLE_QUEUE_STATE);
  const sessionMatchingCountRef = useRef(0);
  const sessionQueueGenerationRef = useRef(0);
  const refillingQueueGenerationRef = useRef<number | null>(null);

  const normalizedConfig = useMemo(() => normalizePuzzleConfigForQuery(config), [config]);
  const { debouncedValue: debouncedConfig, isPending: isConfigDebouncing } = useDebouncedValue(normalizedConfig, 250);
  const shouldQueryPuzzleCatalog = hasSupabaseConfig && debouncedConfig.selectedThemes.length > 0;
  const puzzleCountQuery = useQuery({
    queryKey: ['puzzle-count', debouncedConfig],
    queryFn: () => fetchPuzzleCount(debouncedConfig),
    enabled: shouldQueryPuzzleCatalog,
    staleTime: 30 * 1000,
  });
  const puzzlePreviewBatchQuery = useQuery({
    queryKey: ['puzzle-preview-batch', debouncedConfig],
    queryFn: () => fetchPuzzleBatch(debouncedConfig, [], PUZZLE_BATCH_SIZE),
    enabled: shouldQueryPuzzleCatalog,
    staleTime: 30 * 1000,
  });
  const matchingPuzzleCount = debouncedConfig.selectedThemes.length === 0 ? 0 : (puzzleCountQuery.data ?? 0);
  const previewBatch = useMemo(
    () => getValidPuzzleBatch(puzzlePreviewBatchQuery.data ?? []),
    [puzzlePreviewBatchQuery.data],
  );
  const isCatalogQueryLoading = shouldQueryPuzzleCatalog && (
    puzzleCountQuery.isPending ||
    puzzlePreviewBatchQuery.isPending ||
    (puzzleCountQuery.data === undefined && puzzleCountQuery.isFetching) ||
    (puzzlePreviewBatchQuery.data === undefined && puzzlePreviewBatchQuery.isFetching)
  );
  const isConfigLoading = hasSupabaseConfig ? (isConfigDebouncing || isCatalogQueryLoading) : false;
  const previewPuzzle = isConfigLoading ? null : (previewBatch[0] ?? null);

  let configError = '';
  if (!hasSupabaseConfig) {
    configError = 'Puzzle content requires Supabase configuration.';
  } else if (config.selectedThemes.length === 0) {
    configError = 'No puzzles match the current filters.';
  } else if (puzzleCountQuery.error || puzzlePreviewBatchQuery.error) {
    configError = 'Puzzles could not be loaded.';
  } else if (!isConfigLoading && matchingPuzzleCount === 0) {
    configError = 'No puzzles match the current filters.';
  } else if (!isConfigLoading && matchingPuzzleCount > 0 && previewBatch.length === 0) {
    configError = 'Matching puzzles could not be loaded due to puzzle data errors.';
  }

  const updateStateFromChess = useCallback((chess: Chess) => {
    setFen(chess.fen());
    setMoves(chess.history());
  }, []);

  const resetTrackedAttempt = useCallback(() => {
    activeAttemptRef.current = null;
    hasSavedAttemptRef.current = false;
  }, []);

  const startTrackedSession = useCallback(() => {
    hasActiveUsageMetricsSessionRef.current = true;
    void incrementUsageMetric('puzzles', 'standard', 'started');
  }, []);

  const finishTrackedSession = useCallback(() => {
    if (!hasActiveUsageMetricsSessionRef.current) {
      return;
    }

    hasActiveUsageMetricsSessionRef.current = false;
    void incrementUsageMetric('puzzles', 'standard', 'finished');
  }, []);

  const finalizeTrackedAttempt = useCallback((result: PuzzleAttemptResult) => {
    const attempt = activeAttemptRef.current;
    const puzzle = currentPuzzleRef.current;
    const currentSessionConfig = sessionConfigRef.current;

    if (attempt && puzzle && currentSessionConfig && !hasSavedAttemptRef.current) {
      hasSavedAttemptRef.current = true;

      void savePuzzleAttempt({
        puzzle,
        config: currentSessionConfig,
        result,
        startedAt: attempt.startedAt,
        playerMoveCount: attempt.playerMoveCount,
        wrongMoveCount: attempt.wrongMoveCount,
      });
    }

    finishTrackedSession();
  }, [finishTrackedSession]);

  const failMove = useCallback((
    message: string,
    statusMessage = 'Try again.',
    options?: { countWrongMove?: boolean },
  ): SubmitMoveResult => {
    if (options?.countWrongMove && activeAttemptRef.current) {
      activeAttemptRef.current.wrongMoveCount += 1;
    }

    setError(message);
    setStatus(statusMessage);
    return { success: false, error: message };
  }, []);

  const refillSessionQueue = useCallback(async () => {
    const currentSessionConfig = sessionConfigRef.current;
    const currentGeneration = sessionQueueGenerationRef.current;

    if (
      !currentSessionConfig ||
      !hasSupabaseConfig ||
      refillingQueueGenerationRef.current === currentGeneration
    ) {
      return;
    }

    refillingQueueGenerationRef.current = currentGeneration;

    try {
      const loadBatch = async (excludeIds: string[]) => (
        getValidPuzzleBatch(await fetchPuzzleBatch(currentSessionConfig, excludeIds, PUZZLE_BATCH_SIZE))
      );

      let nextBatch = await loadBatch(sessionQueueRef.current.seenPuzzleIds);
      if (sessionQueueGenerationRef.current !== currentGeneration) {
        return;
      }

      if (
        nextBatch.length === 0 &&
        shouldResetSeenPuzzleIds(sessionMatchingCountRef.current, sessionQueueRef.current.seenPuzzleIds)
      ) {
        sessionQueueRef.current = {
          ...sessionQueueRef.current,
          seenPuzzleIds: resetSeenPuzzleIds(currentPuzzleIdRef.current),
        };
        nextBatch = await loadBatch(sessionQueueRef.current.seenPuzzleIds);

        if (sessionQueueGenerationRef.current !== currentGeneration) {
          return;
        }
      }

      if (nextBatch.length === 0) {
        return;
      }

      sessionQueueRef.current = mergePuzzleQueueBatch(
        sessionQueueRef.current,
        nextBatch,
        currentPuzzleIdRef.current,
      );
    } catch (queueError) {
      console.error('Failed to refill puzzle queue:', queueError);
    } finally {
      if (refillingQueueGenerationRef.current === currentGeneration) {
        refillingQueueGenerationRef.current = null;
      }
    }
  }, []);

  const resetSessionState = useCallback((puzzle: PuzzleRecord, nextSessionConfig: PuzzleConfig) => {
    const preparedPuzzle = preparePuzzle(puzzle);
    if (!preparedPuzzle) {
      setCurrentPuzzle(null);
      setSessionConfig(null);
      currentPuzzleRef.current = null;
      sessionConfigRef.current = null;
      resetTrackedAttempt();
      hasActiveUsageMetricsSessionRef.current = false;
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
      currentPuzzleRef.current = null;
      sessionConfigRef.current = null;
      resetTrackedAttempt();
      hasActiveUsageMetricsSessionRef.current = false;
      setError('Puzzle data error');
      setStatus('Loading puzzle...');
      return false;
    }

    chessRef.current = chess;
    solutionIndexRef.current = preparedPuzzle.playerSolutionStartIndex;
    currentPuzzleIdRef.current = puzzle.id;
    currentPuzzleRef.current = puzzle;
    sessionConfigRef.current = nextSessionConfig;
    resetTrackedAttempt();

    setCurrentPuzzle(puzzle);
    setSessionConfig(nextSessionConfig);
    setPlayerMoveCount(0);
    setIsSolved(false);
    setHintStage(0);
    setError('');
    setStatus(getStatusWithLastComputerMove(preparedPuzzle.openingSan, chess));
    updateStateFromChess(chess);
    startTrackedSession();
    return true;
  }, [resetTrackedAttempt, startTrackedSession, updateStateFromChess]);

  const updateConfig = useCallback((nextConfig: PuzzleConfig) => {
    setConfig(nextConfig);
  }, []);

  const startSession = useCallback(() => {
    if (isConfigLoading || !previewPuzzle || previewBatch.length === 0 || Boolean(configError)) {
      return false;
    }

    sessionQueueGenerationRef.current += 1;
    refillingQueueGenerationRef.current = null;
    sessionQueueRef.current = createPuzzleSessionQueue(previewBatch, previewPuzzle.id);
    sessionMatchingCountRef.current = matchingPuzzleCount;

    const didReset = resetSessionState(previewPuzzle, config);
    if (!didReset) {
      setPhase('config');
      sessionQueueRef.current = EMPTY_PUZZLE_QUEUE_STATE;
      sessionMatchingCountRef.current = 0;
      return false;
    }

    setPhase('session');
    return true;
  }, [config, configError, isConfigLoading, matchingPuzzleCount, previewBatch, previewPuzzle, resetSessionState]);

  const exitToConfig = useCallback(() => {
    finalizeTrackedAttempt('failed');
    sessionQueueGenerationRef.current += 1;
    refillingQueueGenerationRef.current = null;
    sessionQueueRef.current = EMPTY_PUZZLE_QUEUE_STATE;
    sessionMatchingCountRef.current = 0;
    setPhase('config');
    setCurrentPuzzle(null);
    setSessionConfig(null);
    chessRef.current = null;
    currentPuzzleRef.current = null;
    sessionConfigRef.current = null;
    currentPuzzleIdRef.current = null;
    solutionIndexRef.current = 0;
    resetTrackedAttempt();
    hasActiveUsageMetricsSessionRef.current = false;
    setFen('');
    setMoves([]);
    setError('');
    setStatus('White to move');
    setIsSolved(false);
    setPlayerMoveCount(0);
    setHintStage(0);
  }, [finalizeTrackedAttempt, resetTrackedAttempt]);

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
      finalizeTrackedAttempt('solved');
      return true;
    }

    return false;
  }, [currentPuzzle, finalizeTrackedAttempt]);

  const commitCorrectMove = useCallback((uciMove: string): SubmitMoveResult => {
    const chess = chessRef.current;
    const puzzle = currentPuzzle;

    if (!chess || !puzzle) {
      return failMove('Puzzle not ready', 'Loading puzzle...');
    }

    const currentIndex = solutionIndexRef.current;
    const expectedMove = puzzle.moves[currentIndex];
    if (uciMove !== expectedMove) {
      return failMove('That move is legal, but it is not the puzzle solution.', 'Try again.', {
        countWrongMove: true,
      });
    }

    const playerMove = chess.move({
      from: uciMove.slice(0, 2),
      to: uciMove.slice(2, 4),
      promotion: uciMove.slice(4, 5) || undefined,
    });

    if (!playerMove) {
      return failMove('Invalid move', 'Try again.', { countWrongMove: true });
    }

    if (!activeAttemptRef.current) {
      activeAttemptRef.current = {
        startedAt: new Date().toISOString(),
        playerMoveCount: 0,
        wrongMoveCount: 0,
      };
    }

    activeAttemptRef.current.playerMoveCount += 1;
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
        return failMove('Illegal move', 'Try again.', { countWrongMove: true });
      }

      return commitCorrectMove(toUci(move.from, move.to, move.promotion));
    } catch {
      return failMove('Invalid move format', 'Try again.', { countWrongMove: true });
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
      return failMove('Invalid move', 'Try again.', { countWrongMove: true });
    }

    const selectedMove = matchingMoves.find((move) => move.promotion === 'q') ?? matchingMoves[0];
    return commitCorrectMove(toUci(selectedMove.from, selectedMove.to, selectedMove.promotion));
  }, [commitCorrectMove, currentPuzzle, failMove, isSolved]);

  const retryPuzzle = useCallback(() => {
    if (!currentPuzzle || !sessionConfig) {
      return;
    }

    finalizeTrackedAttempt('failed');
    resetSessionState(currentPuzzle, sessionConfig);
  }, [currentPuzzle, finalizeTrackedAttempt, resetSessionState, sessionConfig]);

  const getNextSessionPuzzle = useCallback(async () => {
    let queuedPuzzleResult = takeNextQueuedPuzzle(sessionQueueRef.current);

    if (!queuedPuzzleResult.nextPuzzle) {
      await refillSessionQueue();
      queuedPuzzleResult = takeNextQueuedPuzzle(sessionQueueRef.current);
    }

    if (!queuedPuzzleResult.nextPuzzle) {
      return null;
    }

    sessionQueueRef.current = queuedPuzzleResult.queueState;

    if (queuedPuzzleResult.queueState.queuedPuzzles.length < PUZZLE_QUEUE_REFILL_THRESHOLD) {
      void refillSessionQueue();
    }

    return queuedPuzzleResult.nextPuzzle;
  }, [refillSessionQueue]);

  const loadNextPuzzle = useCallback(() => {
    const advanceToNextPuzzle = async () => {
      if (!sessionConfig) {
        return;
      }

      const nextPuzzle = await getNextSessionPuzzle();
      if (!nextPuzzle) {
        setError('Could not load next puzzle.');
        setStatus('No more puzzles are currently available.');
        return;
      }

      finalizeTrackedAttempt('failed');
      resetSessionState(nextPuzzle, sessionConfig);
    };

    void advanceToNextPuzzle();
  }, [finalizeTrackedAttempt, getNextSessionPuzzle, resetSessionState, sessionConfig]);

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

  useEffect(() => {
    if (phase !== 'session') {
      return;
    }

    if (sessionQueueRef.current.queuedPuzzles.length < PUZZLE_QUEUE_REFILL_THRESHOLD) {
      void refillSessionQueue();
    }
  }, [currentPuzzle?.id, phase, refillSessionQueue]);

  useEffect(() => () => {
    finalizeTrackedAttempt('failed');
  }, [finalizeTrackedAttempt]);

  return {
    phase,
    config,
    previewPuzzle,
    previewPoolSize: isConfigLoading ? 0 : matchingPuzzleCount,
    isConfigLoading,
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
