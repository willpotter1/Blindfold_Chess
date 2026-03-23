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

const PRIMARY_BUTTON_CLASSNAME = 'border-2 border-[#8B4513] bg-[#8B4513] text-white hover:bg-[#8B4513]/90';
const SECONDARY_BUTTON_CLASSNAME = 'border border-[#d9b99b] bg-white text-black hover:bg-[#fff8f1]';

const formatAccuracyPercent = (accuracy: number) => {
  const percentage = accuracy * 100;
  return `${Number.isInteger(percentage) ? percentage.toFixed(0) : percentage.toFixed(1)}%`;
};

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
      <div className="mx-auto max-w-5xl">
        <div className="space-y-4">
          <div>
            <h1 className="text-3xl font-semibold text-[#8B4513]">Account</h1>
          </div>
          {!hasSupabaseConfig && (
            <div className="rounded-lg border-2 border-[#d9b99b] bg-[#d9b99b] p-4 text-black">
              Supabase is not configured. Account features are unavailable until the environment variables are set.
            </div>
          )}

          {hasSupabaseConfig && isLoading && (
            <div className="rounded-lg border-2 border-[#d9b99b] bg-white p-4 text-black">
              Loading account details...
            </div>
          )}

          {hasSupabaseConfig && !isLoading && !profile.uid && (
            <div className="space-y-4">
              <div className="rounded-lg border-2 border-[#d9b99b] bg-white p-4 text-black">
                You are not signed in.
              </div>
              <div className="flex flex-wrap gap-3">
                <Button asChild className="border-2 border-[#d9b99b] bg-[#d9b99b] text-black hover:bg-[#d9b99b]/90">
                  <Link to="/login">Log In</Link>
                </Button>
                <Button asChild className={PRIMARY_BUTTON_CLASSNAME}>
                  <Link to="/signup">Create Account</Link>
                </Button>
              </div>
            </div>
          )}

          {hasSupabaseConfig && !isLoading && profile.uid && (
            <div className="space-y-6">
              <div className="rounded-lg border-2 border-[#d9b99b] bg-white p-4 sm:p-5">
                <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                  <div className="grid flex-1 gap-3 md:grid-cols-3">
                    <div className="rounded-lg border border-[#d9b99b] bg-[#fff8f1] p-4">
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between md:flex-col md:items-stretch lg:flex-row lg:items-start">
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-black">Name</p>
                          <p className="mt-1 break-words text-lg font-semibold text-[#8B4513]">
                            {profile.username ?? 'Not set'}
                          </p>
                        </div>
                        <Button asChild className={`${PRIMARY_BUTTON_CLASSNAME} sm:shrink-0`}>
                          <Link to="/account/username">Change</Link>
                        </Button>
                      </div>
                    </div>

                    <div className="rounded-lg border border-[#d9b99b] bg-[#fff8f1] p-4">
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between md:flex-col md:items-stretch lg:flex-row lg:items-start">
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-black">Email</p>
                          <p className="mt-1 break-words text-base font-semibold text-[#8B4513]">
                            {profile.email ?? 'Unavailable'}
                          </p>
                        </div>
                        <Button asChild className={`${PRIMARY_BUTTON_CLASSNAME} sm:shrink-0`}>
                          <Link to="/account/email">Change</Link>
                        </Button>
                      </div>
                    </div>

                    <div className="rounded-lg border border-[#d9b99b] bg-[#fff8f1] p-4">
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between md:flex-col md:items-stretch lg:flex-row lg:items-start">
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-black">Password</p>
                          <p className="mt-1 text-base font-semibold text-[#8B4513]">••••••••</p>
                        </div>
                        <Button asChild className={`${PRIMARY_BUTTON_CLASSNAME} sm:shrink-0`}>
                          <Link to="/account/password">Change</Link>
                        </Button>
                      </div>
                    </div>
                  </div>

                  <Button
                    type="button"
                    onClick={() => void handleSignOut()}
                    className={`${PRIMARY_BUTTON_CLASSNAME} xl:shrink-0`}
                  >
                    Sign Out
                  </Button>
                </div>
              </div>

              <div className="grid gap-6 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] xl:items-start">
                <div className="rounded-lg border-2 border-[#d9b99b] bg-white p-4 sm:p-5">
                  <div className="space-y-5">
                    <div>
                      <p className="text-sm font-medium text-black">Analytics</p>
                      <p className="mt-1 text-sm text-black/70">Your saved game and training totals.</p>
                    </div>

                    <div className="border-t border-[#d9b99b] pt-5">
                      <p className="text-sm font-medium text-black">Games completed</p>
                      <div className="mt-3 grid gap-3 sm:grid-cols-3">
                          <div className="rounded-lg border border-[#d9b99b] bg-[#fff8f1] p-3">
                            <p className="text-xs uppercase tracking-wide text-black/70">Total</p>
                            <p className="mt-1 text-2xl font-semibold text-[#8B4513]">{profile.gamesCompleted}</p>
                          </div>
                          <div className="rounded-lg border border-[#d9b99b] bg-[#fff8f1] p-3">
                            <p className="text-xs uppercase tracking-wide text-black/70">Vs computer</p>
                            <p className="mt-1 text-2xl font-semibold text-[#8B4513]">{profile.computerGamesCompleted}</p>
                          </div>
                          <div className="rounded-lg border border-[#d9b99b] bg-[#fff8f1] p-3">
                            <p className="text-xs uppercase tracking-wide text-black/70">Pass n play</p>
                            <p className="mt-1 text-2xl font-semibold text-[#8B4513]">{profile.passNPlayGamesCompleted}</p>
                          </div>
                    </div>
                  </div>

                    <div className="border-t border-[#d9b99b] pt-5">
                      <p className="text-sm font-medium text-black">Puzzle training</p>
                      <div className="mt-3 grid gap-3 sm:grid-cols-3">
                          <div className="rounded-lg border border-[#d9b99b] bg-[#fff8f1] p-3">
                            <p className="text-xs uppercase tracking-wide text-black/70">Attempted</p>
                            <p className="mt-1 text-2xl font-semibold text-[#8B4513]">{profile.puzzleAttempts}</p>
                          </div>
                          <div className="rounded-lg border border-[#d9b99b] bg-[#fff8f1] p-3">
                            <p className="text-xs uppercase tracking-wide text-black/70">Solved</p>
                            <p className="mt-1 text-2xl font-semibold text-[#8B4513]">{profile.puzzlesSolved}</p>
                          </div>
                          <div className="rounded-lg border border-[#d9b99b] bg-[#fff8f1] p-3">
                            <p className="text-xs uppercase tracking-wide text-black/70">Failed</p>
                            <p className="mt-1 text-2xl font-semibold text-[#8B4513]">{profile.puzzlesFailed}</p>
                          </div>
                    </div>
                  </div>

                    <div className="border-t border-[#d9b99b] pt-5">
                      <p className="text-sm font-medium text-black">Drill training</p>
                      <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                          <div className="rounded-lg border border-[#d9b99b] bg-[#fff8f1] p-3">
                            <p className="text-xs uppercase tracking-wide text-black/70">Rounds</p>
                            <p className="mt-1 text-2xl font-semibold text-[#8B4513]">{profile.drillRoundsPlayed}</p>
                          </div>
                          <div className="rounded-lg border border-[#d9b99b] bg-[#fff8f1] p-3">
                            <p className="text-xs uppercase tracking-wide text-black/70">Coordinate</p>
                            <p className="mt-1 text-2xl font-semibold text-[#8B4513]">{profile.coordinateDrillRoundsPlayed}</p>
                          </div>
                          <div className="rounded-lg border border-[#d9b99b] bg-[#fff8f1] p-3">
                            <p className="text-xs uppercase tracking-wide text-black/70">Moves</p>
                            <p className="mt-1 text-2xl font-semibold text-[#8B4513]">{profile.moveDrillRoundsPlayed}</p>
                          </div>
                          <div className="rounded-lg border border-[#d9b99b] bg-[#fff8f1] p-3">
                            <p className="text-xs uppercase tracking-wide text-black/70">Best score</p>
                            <p className="mt-1 text-2xl font-semibold text-[#8B4513]">{profile.bestDrillScore}</p>
                          </div>
                          <div className="rounded-lg border border-[#d9b99b] bg-[#fff8f1] p-3">
                            <p className="text-xs uppercase tracking-wide text-black/70">Best accuracy</p>
                            <p className="mt-1 text-2xl font-semibold text-[#8B4513]">
                              {formatAccuracyPercent(profile.bestDrillAccuracy)}
                            </p>
                          </div>
                        </div>
                    </div>
                  </div>
                </div>

                <div className="rounded-lg border-2 border-[#d9b99b] bg-white p-4 sm:p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm font-medium text-black">Recent games</p>
                      <p className="mt-1 text-sm text-black/70">
                        Saved games with quick export to Chess.com or Lichess.
                      </p>
                    </div>
                    <p className="shrink-0 text-xs uppercase tracking-wide text-black/60">
                      {profile.recentGames.length} shown
                    </p>
                  </div>

                  <div className="mt-4">
                    {profile.recentGames.length === 0 ? (
                      <div className="rounded-lg border border-[#d9b99b] bg-[#fff8f1] p-4 text-sm text-black/70">
                        No saved games yet. Finished games will appear here automatically.
                      </div>
                    ) : (
                      <ScrollArea className="h-[32rem] w-full pr-4">
                        <div className="space-y-3">
                          {profile.recentGames.map((game) => (
                            <div key={game.id} className="rounded-lg border border-[#d9b99b] bg-[#fff8f1] p-4">
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
