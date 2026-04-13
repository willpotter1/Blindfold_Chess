import { useEffect, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import {
  createEmptyAccountProfile,
  type AccountProfile,
  type AccountRecentGame,
  normalizeEmail,
} from '@/lib/account';
import { supabase } from '@/lib/supabase';

const RECENT_GAMES_LIMIT = 20;

export const useAccountProfile = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [profile, setProfile] = useState<AccountProfile>(createEmptyAccountProfile);

  useEffect(() => {
    if (!supabase) {
      setIsLoading(false);
      return;
    }

    let isActive = true;

    const syncProfile = async (user: User | null) => {
      if (!isActive) return;

      if (!user) {
        setProfile(createEmptyAccountProfile());
        setIsLoading(false);
        return;
      }

      let username: string | null = null;
      let gamesCompleted = 0;
      let computerGamesCompleted = 0;
      let passNPlayGamesCompleted = 0;
      let puzzleAttempts = 0;
      let puzzlesSolved = 0;
      let puzzlesFailed = 0;
      let drillRoundsPlayed = 0;
      let coordinateDrillRoundsPlayed = 0;
      let moveDrillRoundsPlayed = 0;
      let bestDrillScore = 0;
      let bestDrillAccuracy = 0;
      let recentGames: AccountRecentGame[] = [];
      try {
        const [
          profileResult,
          totalGamesResult,
          computerGamesResult,
          passNPlayGamesResult,
          puzzleAttemptsResult,
          puzzlesSolvedResult,
          puzzlesFailedResult,
          drillRoundsPlayedResult,
          coordinateDrillRoundsPlayedResult,
          moveDrillRoundsPlayedResult,
          bestDrillScoreResult,
          bestDrillAccuracyResult,
          recentGamesResult,
        ] = await Promise.all([
          supabase
            .from('profiles')
            .select('username, email')
            .eq('id', user.id)
            .maybeSingle(),
          supabase
            .from('games')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', user.id),
          supabase
            .from('games')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', user.id)
            .eq('mode', 'computer'),
          supabase
            .from('games')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', user.id)
            .eq('mode', 'pass-n-play'),
          supabase
            .from('puzzle_attempts')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', user.id),
          supabase
            .from('puzzle_attempts')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', user.id)
            .eq('result', 'solved'),
          supabase
            .from('puzzle_attempts')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', user.id)
            .eq('result', 'failed'),
          supabase
            .from('drill_rounds')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', user.id),
          supabase
            .from('drill_rounds')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', user.id)
            .eq('mode', 'coordinates'),
          supabase
            .from('drill_rounds')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', user.id)
            .eq('mode', 'moves'),
          supabase
            .from('drill_rounds')
            .select('score')
            .eq('user_id', user.id)
            .order('score', { ascending: false })
            .limit(1)
            .maybeSingle(),
          supabase
            .from('drill_rounds')
            .select('accuracy')
            .eq('user_id', user.id)
            .order('accuracy', { ascending: false })
            .limit(1)
            .maybeSingle(),
          supabase
            .from('games')
            .select('id, pgn, mode, engine_elo, created_at')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(RECENT_GAMES_LIMIT),
        ]);

        if (profileResult.error) {
          throw profileResult.error;
        }

        if (totalGamesResult.error) {
          throw totalGamesResult.error;
        }

        if (computerGamesResult.error) {
          throw computerGamesResult.error;
        }

        if (passNPlayGamesResult.error) {
          throw passNPlayGamesResult.error;
        }

        if (puzzleAttemptsResult.error) {
          throw puzzleAttemptsResult.error;
        }

        if (puzzlesSolvedResult.error) {
          throw puzzlesSolvedResult.error;
        }

        if (puzzlesFailedResult.error) {
          throw puzzlesFailedResult.error;
        }

        if (drillRoundsPlayedResult.error) {
          throw drillRoundsPlayedResult.error;
        }

        if (coordinateDrillRoundsPlayedResult.error) {
          throw coordinateDrillRoundsPlayedResult.error;
        }

        if (moveDrillRoundsPlayedResult.error) {
          throw moveDrillRoundsPlayedResult.error;
        }

        if (bestDrillScoreResult.error) {
          throw bestDrillScoreResult.error;
        }

        if (bestDrillAccuracyResult.error) {
          throw bestDrillAccuracyResult.error;
        }

        if (recentGamesResult.error) {
          throw recentGamesResult.error;
        }

        username = profileResult.data?.username ?? null;
        gamesCompleted = totalGamesResult.count ?? 0;
        computerGamesCompleted = computerGamesResult.count ?? 0;
        passNPlayGamesCompleted = passNPlayGamesResult.count ?? 0;
        puzzleAttempts = puzzleAttemptsResult.count ?? 0;
        puzzlesSolved = puzzlesSolvedResult.count ?? 0;
        puzzlesFailed = puzzlesFailedResult.count ?? 0;
        drillRoundsPlayed = drillRoundsPlayedResult.count ?? 0;
        coordinateDrillRoundsPlayed = coordinateDrillRoundsPlayedResult.count ?? 0;
        moveDrillRoundsPlayed = moveDrillRoundsPlayedResult.count ?? 0;
        bestDrillScore = bestDrillScoreResult.data?.score ?? 0;
        bestDrillAccuracy = bestDrillAccuracyResult.data?.accuracy ?? 0;
        recentGames = (recentGamesResult.data ?? []).map((game) => ({
          id: game.id,
          pgn: game.pgn,
          mode: game.mode,
          engineElo: game.engine_elo,
          createdAt: game.created_at,
        }));
      } catch (error) {
        console.error('Failed to load account profile:', error);
      }

      if (!isActive) return;
      setProfile({
        username,
        email: user.email ? normalizeEmail(user.email) : null,
        uid: user.id,
        gamesCompleted,
        computerGamesCompleted,
        passNPlayGamesCompleted,
        puzzleAttempts,
        puzzlesSolved,
        puzzlesFailed,
        drillRoundsPlayed,
        coordinateDrillRoundsPlayed,
        moveDrillRoundsPlayed,
        bestDrillScore,
        bestDrillAccuracy,
        recentGames,
      });
      setIsLoading(false);
    };

    void supabase.auth.getUser().then(({ data, error }) => {
      if (error) {
        console.error('Failed to load current session user:', error);
        if (!isActive) return;
        setIsLoading(false);
        return;
      }

      void syncProfile(data.user);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      void syncProfile(session?.user ?? null);
    });

    return () => {
      isActive = false;
      subscription.unsubscribe();
    };
  }, []);

  return { isLoading, profile };
};
