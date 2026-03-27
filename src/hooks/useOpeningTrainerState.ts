import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { getOpeningExplorerData } from '@/lib/openingExplorerCore.js';
import {
  buildOpeningTrainerStartSeed,
  defaultOpeningTrainerConfig,
  getOpeningTrainerConfigStatus,
  resolveOpeningTrainerRecordSelection,
  startOpeningTrainerRound,
  submitOpeningTrainerSanMove,
  submitOpeningTrainerUciMove,
  type OpeningTrainerConfig,
  type OpeningTrainerRound,
} from '@/lib/openingTrainer';
import {
  createOpeningLookup,
  type OpeningLookup,
} from '@/lib/openings';
import { saveOpeningRound } from '@/lib/trainingResults';
import { incrementUsageMetric } from '@/lib/usageMetrics';

type OpeningTrainerPhase = 'config' | 'session' | 'results';

const DEFAULT_CONTINUE_ENGINE_ELO = 1500;

export const useOpeningTrainerState = () => {
  const [phase, setPhase] = useState<OpeningTrainerPhase>('config');
  const [config, setConfig] = useState<OpeningTrainerConfig>(defaultOpeningTrainerConfig);
  const [explorer, setExplorer] = useState<Awaited<ReturnType<typeof getOpeningExplorerData>> | null>(null);
  const [lookup, setLookup] = useState<OpeningLookup | null>(null);
  const [catalogError, setCatalogError] = useState('');
  const [startError, setStartError] = useState('');
  const [isStartingRound, setIsStartingRound] = useState(false);
  const [round, setRound] = useState<OpeningTrainerRound | null>(null);
  const [continueEngineElo, setContinueEngineElo] = useState(DEFAULT_CONTINUE_ENGINE_ELO);
  const [continueRevealEvery, setContinueRevealEvery] = useState(defaultOpeningTrainerConfig.revealEvery);
  const activeRoundStartedAtRef = useRef<string | null>(null);
  const hasSavedRoundRef = useRef(false);
  const hasActiveUsageMetricsSessionRef = useRef(false);

  useEffect(() => {
    let isMounted = true;

    void getOpeningExplorerData()
      .then((nextExplorer) => {
        if (!isMounted) {
          return;
        }

        setExplorer(nextExplorer);
        setCatalogError('');
      })
      .catch((error) => {
        if (!isMounted) {
          return;
        }

        setCatalogError(error instanceof Error ? error.message : 'Failed to load openings.');
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const configStatus = useMemo(() => (
    catalogError
      ? {
          matchingLineCount: 0,
          matchingRecordCount: 0,
          isStartDisabled: true,
          message: catalogError,
          tone: 'error' as const,
        }
      : isStartingRound
        ? {
            matchingLineCount: 0,
            matchingRecordCount: 0,
            isStartDisabled: true,
            message: 'Loading selected openings...',
            tone: 'default' as const,
          }
        : startError
          ? {
              matchingLineCount: 0,
              matchingRecordCount: 0,
              isStartDisabled: false,
              message: startError,
              tone: 'error' as const,
            }
          : getOpeningTrainerConfigStatus(explorer, config)
  ), [catalogError, config, explorer, isStartingRound, startError]);

  const updateConfig = useCallback((nextConfig: OpeningTrainerConfig) => {
    setConfig(nextConfig);
    setStartError('');

    if (phase !== 'session') {
      setContinueRevealEvery(nextConfig.revealEvery);
    }
  }, [phase]);

  const startRound = useCallback(async () => {
    if (!explorer || configStatus.isStartDisabled || isStartingRound) {
      return;
    }

    setIsStartingRound(true);
    setStartError('');

    try {
      const resolvedSelection = resolveOpeningTrainerRecordSelection(explorer, config);

      if (resolvedSelection.records.length === 0) {
        throw new Error('No openings match the current opening trainer configuration.');
      }

      const effectiveConfig: OpeningTrainerConfig = {
        ...config,
        selectedFamilyNames: resolvedSelection.selectedFamilyNames,
        selectedLineIds: resolvedSelection.selectedLineIds,
      };
      const nextLookup = createOpeningLookup({
        catalog: explorer.catalog,
        records: resolvedSelection.records,
      });
      const nextRound = startOpeningTrainerRound(nextLookup, effectiveConfig);

      activeRoundStartedAtRef.current = new Date().toISOString();
      hasSavedRoundRef.current = false;
      hasActiveUsageMetricsSessionRef.current = true;
      void incrementUsageMetric('openings', 'trainer', 'started');
      setLookup(nextLookup);
      setRound(nextRound);
      setPhase(nextRound.phase === 'completed' ? 'results' : 'session');
      setContinueRevealEvery(effectiveConfig.revealEvery);
    } catch (error) {
      setStartError(error instanceof Error ? error.message : 'Failed to load the selected openings.');
    } finally {
      setIsStartingRound(false);
    }
  }, [config, configStatus.isStartDisabled, explorer, isStartingRound]);

  const restartRound = useCallback(() => {
    void startRound();
  }, [startRound]);

  const returnToConfig = useCallback(() => {
    setRound(null);
    setLookup(null);
    setPhase('config');
    setStartError('');
    activeRoundStartedAtRef.current = null;
    hasSavedRoundRef.current = false;
    hasActiveUsageMetricsSessionRef.current = false;
    setContinueRevealEvery(config.revealEvery);
  }, [config.revealEvery]);

  const commitRound = useCallback((nextRound: OpeningTrainerRound) => {
    setRound(nextRound);
    setPhase(nextRound.phase === 'completed' ? 'results' : 'session');
  }, []);

  const submitSanMove = useCallback((san: string) => {
    if (!lookup || !round) {
      return;
    }

    commitRound(submitOpeningTrainerSanMove(lookup, round, san));
  }, [commitRound, lookup, round]);

  const submitUciMove = useCallback((uci: string) => {
    if (!lookup || !round) {
      return false;
    }

    const nextRound = submitOpeningTrainerUciMove(lookup, round, uci);
    const wasSuccessfulAdvance = nextRound.playedUciMoves.length > round.playedUciMoves.length;
    commitRound(nextRound);
    return wasSuccessfulAdvance;
  }, [commitRound, lookup, round]);

  const currentRound = round;

  useEffect(() => {
    if (!lookup || !round || round.phase !== 'completed' || hasSavedRoundRef.current) {
      return;
    }

    if (!round.opening || !round.openingLineId || !activeRoundStartedAtRef.current) {
      return;
    }

    hasSavedRoundRef.current = true;

    void saveOpeningRound({
      opening: round.opening,
      openingLineId: round.openingLineId,
      config: round.config,
      selectedFamilyNames: round.config.selectedFamilyNames,
      selectedLineIds: round.config.selectedLineIds,
      playedUciMoves: round.playedUciMoves,
      startedAt: activeRoundStartedAtRef.current,
    });

    if (hasActiveUsageMetricsSessionRef.current) {
      hasActiveUsageMetricsSessionRef.current = false;
      void incrementUsageMetric('openings', 'trainer', 'finished');
    }
  }, [lookup, round]);

  return {
    phase,
    config,
    explorer,
    lookup,
    lookupError: catalogError || startError,
    round: currentRound,
    configStatus,
    continueEngineElo,
    continueRevealEvery,
    updateConfig,
    startRound,
    restartRound,
    returnToConfig,
    submitSanMove,
    submitUciMove,
    setContinueEngineElo,
    setContinueRevealEvery,
    getContinueGameStartSeed: () => (currentRound ? buildOpeningTrainerStartSeed(currentRound) : null),
  };
};
