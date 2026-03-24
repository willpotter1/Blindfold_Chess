import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AccountLayout } from '@/components/AccountLayout';
import { useToast } from '@/hooks/use-toast';
import { useAccountProfile } from '@/hooks/useAccountProfile';
import {
  exportPgnToChessCom,
  exportPgnToLichess,
  getGameModeLabel,
  getPgnResultLabel,
} from '@/lib/pgnExport';
import { hasSupabaseConfig, supabase } from '@/lib/supabase';

const PRIMARY_BUTTON_CLASSNAME = 'rounded-full bg-[#6d3c1c] px-5 text-white hover:bg-[#5e3318]';
const SECONDARY_BUTTON_CLASSNAME = 'border border-[#b99779]/60 bg-white/70 text-black hover:bg-white';

const formatAccuracyPercent = (accuracy: number) => {
  const percentage = accuracy * 100;
  return `${Number.isInteger(percentage) ? percentage.toFixed(0) : percentage.toFixed(1)}%`;
};

const metricTileClassName = 'rounded-[24px] border border-[#d9b99b] bg-[#fff8f1]/90 p-4';

const Account = () => {
  const { isLoading, profile } = useAccountProfile();
  const [toastState, navigate] = [useToast(), useNavigate()];
  const { toast } = toastState;

  const handleSignOut = async () => {
    if (!supabase) return;

    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        throw error;
      }

      toast({
        title: 'Signed out',
        description: 'You have been signed out.',
      });
      navigate('/');
    } catch (error) {
      console.error('Sign out failed:', error);
      toast({
        title: 'Sign out failed',
        description: 'Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handleExportToChessCom = async (pgn: string) => {
    await exportPgnToChessCom(pgn, toast);
  };

  const handleExportToLichess = async (pgn: string) => {
    await exportPgnToLichess(pgn, toast);
  };

  return (
    <AccountLayout>
      <div className="mx-auto max-w-6xl">
        <div className="space-y-8">
          <div className="bg-paper-grain overflow-hidden rounded-[32px] border border-white/60 px-6 py-8 sm:px-8 lg:px-10">
            <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-2xl">
                <p className="text-xs uppercase tracking-[0.34em] text-[#6d5848]">Account</p>
                <h1 className="mt-3 text-5xl font-semibold leading-[0.9] text-[#3d2413] sm:text-6xl">
                  Your training archive.
                </h1>
                <p className="mt-4 max-w-xl text-sm leading-7 text-[#5c4b3f] sm:text-base">
                  Keep your identity clean, review your recent sessions, and track how consistently you are converting calculation into results.
                </p>
              </div>

              {hasSupabaseConfig && !isLoading && profile.uid && (
                <Button
                  type="button"
                  onClick={() => void handleSignOut()}
                  className="h-12 rounded-full bg-[#6d3c1c] px-7 text-[#f8f2eb] hover:bg-[#5e3318] lg:shrink-0"
                >
                  Sign Out
                </Button>
              )}
            </div>
          </div>

          {!hasSupabaseConfig && (
            <div className="rounded-[28px] border border-[#b99779]/60 bg-[#ead7c2] p-5 text-black">
              Supabase is not configured. Account features are unavailable until the environment variables are set.
            </div>
          )}

          {hasSupabaseConfig && isLoading && (
            <div className="rounded-[28px] border border-[#b99779]/60 bg-white/80 p-5 text-black">
              Loading account details...
            </div>
          )}

          {hasSupabaseConfig && !isLoading && !profile.uid && (
            <div className="space-y-4">
              <div className="rounded-[28px] border border-[#b99779]/60 bg-white/80 p-5 text-black">
                You are not signed in.
              </div>
              <div className="flex flex-wrap gap-3">
                <Button asChild className="rounded-full border border-[#b99779]/60 bg-white/70 px-6 text-black hover:bg-white">
                  <Link to="/login">Log In</Link>
                </Button>
                <Button asChild className="rounded-full bg-[#6d3c1c] px-6 text-white hover:bg-[#5e3318]">
                  <Link to="/signup">Create Account</Link>
                </Button>
              </div>
            </div>
          )}

          {hasSupabaseConfig && !isLoading && profile.uid && (
            <div className="space-y-6">
              <div className="grid gap-4 lg:grid-cols-3">
                <div className="rounded-[28px] border border-[#b99779]/60 bg-white/70 p-5 backdrop-blur-sm">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between md:flex-col md:items-stretch lg:flex-row lg:items-start">
                    <div className="min-w-0">
                      <p className="text-xs uppercase tracking-[0.24em] text-black/55">Name</p>
                      <p className="mt-2 break-words text-2xl font-semibold text-[#8B4513]">
                        {profile.username ?? 'Not set'}
                      </p>
                    </div>
                    <Button asChild className={`${PRIMARY_BUTTON_CLASSNAME} sm:shrink-0`}>
                      <Link to="/account/username">Change</Link>
                    </Button>
                  </div>
                </div>

                <div className="rounded-[28px] border border-[#b99779]/60 bg-white/70 p-5 backdrop-blur-sm">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between md:flex-col md:items-stretch lg:flex-row lg:items-start">
                    <div className="min-w-0">
                      <p className="text-xs uppercase tracking-[0.24em] text-black/55">Email</p>
                      <p className="mt-2 break-words text-base font-semibold text-[#8B4513]">
                        {profile.email ?? 'Unavailable'}
                      </p>
                    </div>
                    <Button asChild className={`${PRIMARY_BUTTON_CLASSNAME} sm:shrink-0`}>
                      <Link to="/account/email">Change</Link>
                    </Button>
                  </div>
                </div>

                <div className="rounded-[28px] border border-[#b99779]/60 bg-white/70 p-5 backdrop-blur-sm">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between md:flex-col md:items-stretch lg:flex-row lg:items-start">
                    <div className="min-w-0">
                      <p className="text-xs uppercase tracking-[0.24em] text-black/55">Password</p>
                      <p className="mt-2 text-base font-semibold text-[#8B4513]">••••••••</p>
                    </div>
                    <Button asChild className={`${PRIMARY_BUTTON_CLASSNAME} sm:shrink-0`}>
                      <Link to="/account/password">Change</Link>
                    </Button>
                  </div>
                </div>
              </div>

              <div className="grid gap-6 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] xl:items-start">
                <div className="rounded-[32px] border border-[#b99779]/60 bg-white/72 p-5 backdrop-blur-sm sm:p-6">
                  <div className="space-y-5">
                    <div>
                      <p className="text-xs uppercase tracking-[0.28em] text-black/55">Analytics</p>
                      <p className="mt-2 text-sm text-black/70">Your saved game and training totals.</p>
                    </div>

                    <div className="border-t border-[#d9b99b] pt-5">
                      <p className="text-2xl font-semibold text-[#4c2c13]">Games completed</p>
                      <div className="mt-3 grid gap-3 sm:grid-cols-3">
                        <div className={metricTileClassName}>
                          <p className="text-xs uppercase tracking-wide text-black/70">Total</p>
                          <p className="mt-1 text-2xl font-semibold text-[#8B4513]">{profile.gamesCompleted}</p>
                        </div>
                        <div className={metricTileClassName}>
                          <p className="text-xs uppercase tracking-wide text-black/70">Vs computer</p>
                          <p className="mt-1 text-2xl font-semibold text-[#8B4513]">{profile.computerGamesCompleted}</p>
                        </div>
                        <div className={metricTileClassName}>
                          <p className="text-xs uppercase tracking-wide text-black/70">Pass n play</p>
                          <p className="mt-1 text-2xl font-semibold text-[#8B4513]">{profile.passNPlayGamesCompleted}</p>
                        </div>
                      </div>
                    </div>

                    <div className="border-t border-[#d9b99b] pt-5">
                      <p className="text-2xl font-semibold text-[#4c2c13]">Puzzle training</p>
                      <div className="mt-3 grid gap-3 sm:grid-cols-3">
                        <div className={metricTileClassName}>
                          <p className="text-xs uppercase tracking-wide text-black/70">Attempted</p>
                          <p className="mt-1 text-2xl font-semibold text-[#8B4513]">{profile.puzzleAttempts}</p>
                        </div>
                        <div className={metricTileClassName}>
                          <p className="text-xs uppercase tracking-wide text-black/70">Solved</p>
                          <p className="mt-1 text-2xl font-semibold text-[#8B4513]">{profile.puzzlesSolved}</p>
                        </div>
                        <div className={metricTileClassName}>
                          <p className="text-xs uppercase tracking-wide text-black/70">Failed</p>
                          <p className="mt-1 text-2xl font-semibold text-[#8B4513]">{profile.puzzlesFailed}</p>
                        </div>
                      </div>
                    </div>

                    <div className="border-t border-[#d9b99b] pt-5">
                      <p className="text-2xl font-semibold text-[#4c2c13]">Drill training</p>
                      <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                        <div className={metricTileClassName}>
                          <p className="text-xs uppercase tracking-wide text-black/70">Rounds</p>
                          <p className="mt-1 text-2xl font-semibold text-[#8B4513]">{profile.drillRoundsPlayed}</p>
                        </div>
                        <div className={metricTileClassName}>
                          <p className="text-xs uppercase tracking-wide text-black/70">Coordinate</p>
                          <p className="mt-1 text-2xl font-semibold text-[#8B4513]">{profile.coordinateDrillRoundsPlayed}</p>
                        </div>
                        <div className={metricTileClassName}>
                          <p className="text-xs uppercase tracking-wide text-black/70">Moves</p>
                          <p className="mt-1 text-2xl font-semibold text-[#8B4513]">{profile.moveDrillRoundsPlayed}</p>
                        </div>
                        <div className={metricTileClassName}>
                          <p className="text-xs uppercase tracking-wide text-black/70">Best score</p>
                          <p className="mt-1 text-2xl font-semibold text-[#8B4513]">{profile.bestDrillScore}</p>
                        </div>
                        <div className={metricTileClassName}>
                          <p className="text-xs uppercase tracking-wide text-black/70">Best accuracy</p>
                          <p className="mt-1 text-2xl font-semibold text-[#8B4513]">
                            {formatAccuracyPercent(profile.bestDrillAccuracy)}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="rounded-[32px] border border-[#b99779]/60 bg-white/72 p-5 backdrop-blur-sm sm:p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-xs uppercase tracking-[0.28em] text-black/55">Recent games</p>
                      <p className="mt-2 text-sm text-black/70">
                        Saved games with quick export to Chess.com or Lichess.
                      </p>
                    </div>
                    <p className="shrink-0 text-xs uppercase tracking-wide text-black/60">
                      {profile.recentGames.length} shown
                    </p>
                  </div>

                  <div className="mt-4">
                    {profile.recentGames.length === 0 ? (
                      <div className="rounded-[24px] border border-[#d9b99b] bg-[#fff8f1]/90 p-4 text-sm text-black/70">
                        No saved games yet. Finished games will appear here automatically.
                      </div>
                    ) : (
                      <ScrollArea className="h-[32rem] w-full pr-4">
                        <div className="space-y-3">
                          {profile.recentGames.map((game) => (
                            <div key={game.id} className="rounded-[24px] border border-[#d9b99b] bg-[#fff8f1]/90 p-4">
                              <div className="space-y-3">
                                <div className="min-w-0">
                                  <p className="text-base font-semibold text-[#8B4513]">
                                    {getGameModeLabel(game.mode)}
                                  </p>
                                  <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-black/70">
                                    <span>Result: {getPgnResultLabel(game.pgn)}</span>
                                    {game.engineElo !== null && <span>ELO: {game.engineElo}</span>}
                                  </div>
                                </div>

                                <div className="flex flex-col gap-2 sm:flex-row">
                                  <Button
                                    type="button"
                                    size="sm"
                                    onClick={() => void handleExportToChessCom(game.pgn)}
                                    className={`${SECONDARY_BUTTON_CLASSNAME} sm:flex-1`}
                                  >
                                    Export to Chess.com
                                  </Button>
                                  <Button
                                    type="button"
                                    size="sm"
                                    onClick={() => void handleExportToLichess(game.pgn)}
                                    className={`${SECONDARY_BUTTON_CLASSNAME} sm:flex-1`}
                                  >
                                    Export to Lichess
                                  </Button>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </AccountLayout>
  );
};

export default Account;
