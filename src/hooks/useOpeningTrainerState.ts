import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  buildOpeningTrainerStartSeed,
  defaultOpeningTrainerConfig,
  getOpeningTrainerConfigStatus,
  startOpeningTrainerRound,
  submitOpeningTrainerSanMove,
  submitOpeningTrainerUciMove,
  type OpeningTrainerConfig,
  type OpeningTrainerRound,
} from '@/lib/openingTrainer';
import { getOpeningLookup, type OpeningLookup } from '@/lib/openings';

type OpeningTrainerPhase = 'config' | 'session' | 'results';

const DEFAULT_CONTINUE_ENGINE_ELO = 1500;

export const useOpeningTrainerState = () => {
  const [phase, setPhase] = useState<OpeningTrainerPhase>('config');
  const [config, setConfig] = useState<OpeningTrainerConfig>(defaultOpeningTrainerConfig);
  const [lookup, setLookup] = useState<OpeningLookup | null>(null);
  const [lookupError, setLookupError] = useState('');
  const [round, setRound] = useState<OpeningTrainerRound | null>(null);
  const [continueEngineElo, setContinueEngineElo] = useState(DEFAULT_CONTINUE_ENGINE_ELO);
  const [continueRevealEvery, setContinueRevealEvery] = useState(defaultOpeningTrainerConfig.revealEvery);

  useEffect(() => {
    let isMounted = true;

    void getOpeningLookup()
      .then((nextLookup) => {
        if (!isMounted) {
          return;
        }

        setLookup(nextLookup);
        setLookupError('');
      })
      .catch((error) => {
        if (!isMounted) {
          return;
        }

        setLookupError(error instanceof Error ? error.message : 'Failed to load openings.');
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const configStatus = useMemo(() => (
    lookupError
      ? {
          matchingLineCount: 0,
          matchingRecordCount: 0,
          isStartDisabled: true,
          message: lookupError,
          tone: 'error' as const,
        }
      : getOpeningTrainerConfigStatus(lookup, config)
  ), [config, lookup, lookupError]);

  const updateConfig = useCallback((nextConfig: OpeningTrainerConfig) => {
    setConfig(nextConfig);

    if (phase !== 'session') {
      setContinueRevealEvery(nextConfig.revealEvery);
    }
  }, [phase]);

  const startRound = useCallback(() => {
    if (!lookup || configStatus.isStartDisabled) {
      return;
    }

    const nextRound = startOpeningTrainerRound(lookup, config);
    setRound(nextRound);
    setPhase(nextRound.phase === 'completed' ? 'results' : 'session');
    setContinueRevealEvery(config.revealEvery);
  }, [config, configStatus.isStartDisabled, lookup]);

  const restartRound = useCallback(() => {
    startRound();
  }, [startRound]);

  const returnToConfig = useCallback(() => {
    setRound(null);
    setPhase('config');
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

  return {
    phase,
    config,
    lookup,
    lookupError,
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
