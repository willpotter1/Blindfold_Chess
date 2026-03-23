import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useAccountProfile } from '@/hooks/useAccountProfile';
import { AccountLayout } from '@/components/AccountLayout';
import { hasSupabaseConfig, supabase } from '@/lib/supabase';

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

  return (
    <AccountLayout>
      <div className="mx-auto max-w-4xl">
        <Card className="bg-white">
          <CardHeader>
            <CardTitle className="text-[#8B4513]">Account</CardTitle>
            <CardDescription className="text-black">
              Manage your name, email, and password from dedicated settings pages.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
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
                  <Button asChild className="border-2 border-[#8B4513] bg-[#8B4513] text-white hover:bg-[#8B4513]/90">
                    <Link to="/signup">Create Account</Link>
                  </Button>
                </div>
              </div>
            )}

            {hasSupabaseConfig && !isLoading && profile.uid && (
              <div className="grid gap-6 lg:grid-cols-2 lg:items-start">
                <div className="grid gap-4">
                  <div className="rounded-lg border-2 border-[#d9b99b] bg-white p-4">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-black">Name</p>
                        <p className="mt-1 break-words text-xl font-semibold text-[#8B4513]">{profile.username ?? 'Not set'}</p>
                      </div>
                      <Button asChild className="border-2 border-[#8B4513] bg-[#8B4513] text-white hover:bg-[#8B4513]/90 sm:shrink-0">
                        <Link to="/account/username">Change</Link>
                      </Button>
                    </div>
                  </div>

                  <div className="rounded-lg border-2 border-[#d9b99b] bg-white p-4">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-black">Email</p>
                        <p className="mt-1 break-words text-lg font-semibold text-[#8B4513]">{profile.email ?? 'Unavailable'}</p>
                      </div>
                      <Button asChild className="border-2 border-[#8B4513] bg-[#8B4513] text-white hover:bg-[#8B4513]/90 sm:shrink-0">
                        <Link to="/account/email">Change</Link>
                      </Button>
                    </div>
                  </div>

                  <div className="rounded-lg border-2 border-[#d9b99b] bg-white p-4">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-black">Password</p>
                        <p className="mt-1 text-lg font-semibold text-[#8B4513]">••••••••</p>
                      </div>
                      <Button asChild className="border-2 border-[#8B4513] bg-[#8B4513] text-white hover:bg-[#8B4513]/90 sm:shrink-0">
                        <Link to="/account/password">Change</Link>
                      </Button>
                    </div>
                  </div>

                  <Button
                    type="button"
                    onClick={() => void handleSignOut()}
                    className="border-2 border-[#8B4513] bg-[#8B4513] text-white hover:bg-[#8B4513]/90"
                  >
                    Sign Out
                  </Button>
                </div>
                <div className="grid gap-4">
                  <div className="rounded-lg border-2 border-[#d9b99b] bg-white p-4">
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
                  <div className="rounded-lg border-2 border-[#d9b99b] bg-white p-4">
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
                  <div className="rounded-lg border-2 border-[#d9b99b] bg-white p-4">
                    <p className="text-sm font-medium text-black">Drill training</p>
                    <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
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
            )}
          </CardContent>
        </Card>
      </div>
    </AccountLayout>
  );
};

export default Account;
