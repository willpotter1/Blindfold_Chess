import { useQuery } from '@tanstack/react-query';
import { useCallback, useEffect, useRef, useState } from 'react';
import { hasSupabaseConfig } from '@/lib/supabase';
import { fetchMoveDrillPositions } from '@/lib/trainingContent';
import { saveDrillRound } from '@/lib/trainingResults';
import { incrementUsageMetric } from '@/lib/usageMetrics';
import {
  buildPromptDeck,
  defaultVisionRoundConfig,
  emptyVisionRoundStats,
  resolveMovesPromptClick,
  type VisionPrompt,
  type VisionMovePosition,
  type VisionRoundConfig,
  type VisionRoundStats,
} from '@/lib/visionTrainer';
import { getMoveDrillConfigStatus, shouldPrefetchMoveDrillPositions } from '@/lib/visionTrainerContent';

type VisionRoundPhase = 'config' | 'playing' | 'results';
type AttemptResult = 'correct' | 'wrong';

export type VisionBoardFeedback = {
  square: string;
  result: AttemptResult;
} | null;

const TIMER_INTERVAL_MS = 100;
const FEEDBACK_DURATION_MS = 180;

export const useVisionTrainerState = () => {
  const [phase, setPhase] = useState<VisionRoundPhase>('config');
  const [config, setConfig] = useState<VisionRoundConfig>(defaultVisionRoundConfig);
  const [stats, setStats] = useState<VisionRoundStats>(emptyVisionRoundStats);
  const [timeRemainingMs, setTimeRemainingMs] = useState(defaultVisionRoundConfig.roundLengthSeconds * 1000);
  const [currentPrompt, setCurrentPrompt] = useState<VisionPrompt | null>(null);
  const [feedback, setFeedback] = useState<VisionBoardFeedback>(null);
  const [selectedMoveSourceSquare, setSelectedMoveSourceSquare] = useState<string | null>(null);

  const deckRef = useRef<VisionPrompt[]>([]);
  const deckIndexRef = useRef(0);
  const deadlineRef = useRef<number | null>(null);
  const lastPromptIdRef = useRef<string | null>(null);
  const timerIntervalRef = useRef<number | null>(null);
  const feedbackTimeoutRef = useRef<number | null>(null);
  const statsRef = useRef<VisionRoundStats>(emptyVisionRoundStats);
  const activeRoundConfigRef = useRef<VisionRoundConfig | null>(null);
  const activeMovePositionsRef = useRef<VisionMovePosition[]>([]);
  const roundActiveRef = useRef(false);
  const hasSavedRoundRef = useRef(false);
  const usageMetricsRoundRef = useRef<{
    mode: VisionRoundConfig['mode'];
    hasTrackedFinished: boolean;
  } | null>(null);
  const shouldFetchMovePositions = shouldPrefetchMoveDrillPositions(config.mode);
  const movePositionsQuery = useQuery({
    queryKey: ['drill-move-positions', config.perspective],
    queryFn: () => fetchMoveDrillPositions(config.perspective),
    enabled: shouldFetchMovePositions && hasSupabaseConfig,
    staleTime: 5 * 60 * 1000,
  });
  const isMovePositionsLoading =
    shouldFetchMovePositions &&
    (movePositionsQuery.isPending || (!movePositionsQuery.data && movePositionsQuery.isFetching));
  const moveDrillConfigStatus = getMoveDrillConfigStatus({
    mode: config.mode,
    hasSupabaseConfig,
    isLoading: isMovePositionsLoading,
    hasError: Boolean(movePositionsQuery.error),
    movePositionsCount: movePositionsQuery.data?.length ?? 0,
  });

  const clearTimerInterval = useCallback(() => {
    if (timerIntervalRef.current !== null) {
      window.clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
  }, []);

  const clearFeedbackTimeout = useCallback(() => {
    if (feedbackTimeoutRef.current !== null) {
      window.clearTimeout(feedbackTimeoutRef.current);
      feedbackTimeoutRef.current = null;
    }
  }, []);

  const takeNextPrompt = useCallback((roundConfig: VisionRoundConfig) => {
    if (deckIndexRef.current >= deckRef.current.length) {
      deckRef.current = buildPromptDeck(roundConfig, activeMovePositionsRef.current, lastPromptIdRef.current);
      deckIndexRef.current = 0;
    }

    const nextPrompt = deckRef.current[deckIndexRef.current] ?? null;

    if (nextPrompt) {
      deckIndexRef.current += 1;
      lastPromptIdRef.current = nextPrompt.id;
    }

    return nextPrompt;
  }, []);

  const finishRound = useCallback(() => {
    if (!roundActiveRef.current) {
      return;
    }

    roundActiveRef.current = false;
    clearTimerInterval();
    clearFeedbackTimeout();
    deadlineRef.current = null;
    const completedRoundConfig = activeRoundConfigRef.current;
    const completedRoundStats = statsRef.current;

    if (completedRoundConfig && !hasSavedRoundRef.current) {
      hasSavedRoundRef.current = true;
      void saveDrillRound({
        config: completedRoundConfig,
        stats: completedRoundStats,
      });
    }

    if (usageMetricsRoundRef.current && !usageMetricsRoundRef.current.hasTrackedFinished) {
      usageMetricsRoundRef.current.hasTrackedFinished = true;
      void incrementUsageMetric('drills', usageMetricsRoundRef.current.mode, 'finished');
    }

    setFeedback(null);
    setSelectedMoveSourceSquare(null);
    setPhase('results');
    setCurrentPrompt(null);
    setTimeRemainingMs(0);
  }, [clearFeedbackTimeout, clearTimerInterval]);

  const updateConfig = useCallback((nextConfig: VisionRoundConfig) => {
    setConfig(nextConfig);

    if (phase !== 'playing') {
      setTimeRemainingMs(nextConfig.roundLengthSeconds * 1000);
    }
  }, [phase]);

  const startRound = useCallback(() => {
    if (moveDrillConfigStatus.isStartDisabled) {
      return;
    }

    clearTimerInterval();
    clearFeedbackTimeout();

    activeMovePositionsRef.current = config.mode === 'moves' ? (movePositionsQuery.data ?? []) : [];
    deckRef.current = buildPromptDeck(config, activeMovePositionsRef.current);
    deckIndexRef.current = 0;
    lastPromptIdRef.current = null;

    const firstPrompt = takeNextPrompt(config);

    activeRoundConfigRef.current = config;
    statsRef.current = emptyVisionRoundStats;
    roundActiveRef.current = true;
    hasSavedRoundRef.current = false;
    usageMetricsRoundRef.current = {
      mode: config.mode,
      hasTrackedFinished: false,
    };
    deadlineRef.current = Date.now() + config.roundLengthSeconds * 1000;
    setPhase('playing');
    setStats(emptyVisionRoundStats);
    setCurrentPrompt(firstPrompt);
    setFeedback(null);
    setSelectedMoveSourceSquare(null);
    setTimeRemainingMs(config.roundLengthSeconds * 1000);
    void incrementUsageMetric('drills', config.mode, 'started');
  }, [clearFeedbackTimeout, clearTimerInterval, config, moveDrillConfigStatus.isStartDisabled, movePositionsQuery.data, takeNextPrompt]);

  const restartRound = useCallback(() => {
    startRound();
  }, [startRound]);

  const returnToConfig = useCallback(() => {
    clearTimerInterval();
    clearFeedbackTimeout();
    deadlineRef.current = null;
    activeRoundConfigRef.current = null;
    activeMovePositionsRef.current = [];
    statsRef.current = emptyVisionRoundStats;
    roundActiveRef.current = false;
    hasSavedRoundRef.current = false;
    usageMetricsRoundRef.current = null;
    setPhase('config');
    setCurrentPrompt(null);
    setFeedback(null);
    setSelectedMoveSourceSquare(null);
    setStats(emptyVisionRoundStats);
    setTimeRemainingMs(config.roundLengthSeconds * 1000);
  }, [clearFeedbackTimeout, clearTimerInterval, config.roundLengthSeconds]);

  const handleResolvedAttempt = useCallback((
    result: AttemptResult,
    feedbackSquare: string,
  ) => {
    clearFeedbackTimeout();
    setFeedback({ square: feedbackSquare, result });
    feedbackTimeoutRef.current = window.setTimeout(() => {
      setFeedback(null);
      feedbackTimeoutRef.current = null;
    }, FEEDBACK_DURATION_MS);

    const nextStats = {
      correctCount: statsRef.current.correctCount + (result === 'correct' ? 1 : 0),
      wrongCount: statsRef.current.wrongCount + (result === 'wrong' ? 1 : 0),
      totalAttempts: statsRef.current.totalAttempts + 1,
    };
    statsRef.current = nextStats;
    setStats(nextStats);
  }, [clearFeedbackTimeout]);

  const handleSquareClick = useCallback((square: string) => {
    if (phase !== 'playing' || !currentPrompt) {
      return;
    }

    const deadline = deadlineRef.current;

    if (!deadline || Date.now() >= deadline) {
      finishRound();
      return;
    }

    if (currentPrompt.mode === 'moves') {
      const resolution = resolveMovesPromptClick(
        currentPrompt,
        selectedMoveSourceSquare,
        square,
      );

      if (resolution.kind === 'select-from') {
        clearFeedbackTimeout();
        setFeedback(null);
        setSelectedMoveSourceSquare(resolution.selectedFromSquare);
        return;
      }

      setSelectedMoveSourceSquare(null);
      handleResolvedAttempt(resolution.result, resolution.feedbackSquare);

      const nextPrompt = takeNextPrompt(config);

      if (!nextPrompt) {
        finishRound();
        return;
      }

      setCurrentPrompt(nextPrompt);
      return;
    }

    const wasCorrect = square === currentPrompt.answerSquare;
    const result: AttemptResult = wasCorrect ? 'correct' : 'wrong';

    setSelectedMoveSourceSquare(null);
    handleResolvedAttempt(result, square);

    const nextPrompt = takeNextPrompt(config);

    if (!nextPrompt) {
      finishRound();
      return;
    }

    setCurrentPrompt(nextPrompt);
  }, [
    clearFeedbackTimeout,
    config,
    currentPrompt,
    finishRound,
    handleResolvedAttempt,
    phase,
    selectedMoveSourceSquare,
    takeNextPrompt,
  ]);

  useEffect(() => {
    if (phase !== 'playing') {
      return undefined;
    }

    const tick = () => {
      const deadline = deadlineRef.current;

      if (!deadline) {
        finishRound();
        return;
      }

      const remainingMs = Math.max(0, deadline - Date.now());
      setTimeRemainingMs(remainingMs);

      if (remainingMs === 0) {
        finishRound();
      }
    };

    tick();
    timerIntervalRef.current = window.setInterval(tick, TIMER_INTERVAL_MS);

    return () => {
      clearTimerInterval();
    };
  }, [clearTimerInterval, finishRound, phase]);

  useEffect(() => () => {
    clearTimerInterval();
    clearFeedbackTimeout();
    usageMetricsRoundRef.current = null;
  }, [clearFeedbackTimeout, clearTimerInterval]);

  return {
    phase,
    config,
    currentPrompt,
    feedback,
    selectedMoveSourceSquare,
    stats,
    timeRemainingMs,
    updateConfig,
    startRound,
    restartRound,
    returnToConfig,
    handleSquareClick,
    configStatusMessage: moveDrillConfigStatus.message,
    configStatusTone: moveDrillConfigStatus.tone,
    isStartDisabled: moveDrillConfigStatus.isStartDisabled,
  };
};
