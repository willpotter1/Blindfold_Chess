import { useEffect, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import type { AccountProfile } from '@/lib/account';
import { supabase } from '@/lib/supabase';

export const useAccountProfile = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [profile, setProfile] = useState<AccountProfile>({
    username: null,
    email: null,
    uid: null,
    gamesCompleted: 0,
    computerGamesCompleted: 0,
    passNPlayGamesCompleted: 0,
  });

  useEffect(() => {
    if (!supabase) {
      setIsLoading(false);
      return;
    }

    let isActive = true;

    const syncProfile = async (user: User | null) => {
      if (!isActive) return;

      if (!user) {
        setProfile({
          username: null,
          email: null,
          uid: null,
          gamesCompleted: 0,
          computerGamesCompleted: 0,
          passNPlayGamesCompleted: 0,
        });
        setIsLoading(false);
        return;
      }

      let username: string | null = null;
      let gamesCompleted = 0;
      let computerGamesCompleted = 0;
      let passNPlayGamesCompleted = 0;
      try {
        const [
          profileResult,
          totalGamesResult,
          computerGamesResult,
          passNPlayGamesResult,
        ] = await Promise.all([
          supabase
            .from('profiles')
            .select('username')
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

        username = profileResult.data?.username ?? null;
        gamesCompleted = totalGamesResult.count ?? 0;
        computerGamesCompleted = computerGamesResult.count ?? 0;
        passNPlayGamesCompleted = passNPlayGamesResult.count ?? 0;
      } catch (error) {
        console.error('Failed to load account profile:', error);
      }

      if (!isActive) return;
      setProfile({
        username,
        email: user.email,
        uid: user.id,
        gamesCompleted,
        computerGamesCompleted,
        passNPlayGamesCompleted,
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
