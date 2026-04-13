import { Link, useNavigate } from 'react-router-dom';
import { LogOut, User, Mail, Lock, ExternalLink, ChevronRight } from 'lucide-react';
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

const formatAccuracyPercent = (accuracy: number) => {
  const percentage = accuracy * 100;
  return `${Number.isInteger(percentage) ? percentage.toFixed(0) : percentage.toFixed(1)}%`;
};

const Account = () => {
  const { isLoading, profile } = useAccountProfile();
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    if (!supabase) return;

    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;

      toast({ title: 'Signed out', description: 'You have been signed out.' });
      navigate('/');
    } catch (error) {
      console.error('Sign out failed:', error);
      toast({ title: 'Sign out failed', description: 'Please try again.', variant: 'destructive' });
    }
  };

  const handleExportToChessCom = async (pgn: string) => {
    await exportPgnToChessCom(pgn, toast);
  };

  const handleExportToLichess = async (pgn: string) => {
    await exportPgnToLichess(pgn, toast);
  };

  if (!hasSupabaseConfig) {
    return (
      <AccountLayout>
        <div className="mx-auto max-w-lg py-16 text-center">
          <p className="text-sm text-muted-foreground">Supabase is not configured. Set VITE_SUPABASE_* env vars to enable account features.</p>
        </div>
      </AccountLayout>
    );
  }

  if (isLoading) {
    return (
      <AccountLayout>
        <div className="mx-auto max-w-lg py-16 text-center">
          <p className="text-sm text-muted-foreground">Loading account...</p>
        </div>
      </AccountLayout>
    );
  }

  if (!profile.uid) {
    return (
      <AccountLayout>
        <div className="mx-auto max-w-sm space-y-6 py-16">
          <div className="text-center">
            <h1 className="text-lg font-semibold text-foreground">Not signed in</h1>
            <p className="mt-1 text-sm text-muted-foreground">Sign in to view your account</p>
          </div>
          <div className="flex justify-center gap-3">
            <Button asChild variant="outline" className="h-9 border border-border/50 bg-card text-sm hover:bg-secondary">
              <Link to="/login">Log In</Link>
            </Button>
            <Button asChild className="h-9 bg-primary text-sm text-primary-foreground hover:bg-primary/90">
              <Link to="/signup">Sign Up</Link>
            </Button>
          </div>
        </div>
      </AccountLayout>
    );
  }

  return (
    <AccountLayout>
      <div className="mx-auto max-w-4xl space-y-6">
        {/* Profile settings */}
        <div className="space-y-1">
          <h1 className="text-lg font-semibold text-foreground">Account</h1>
          <p className="text-xs text-muted-foreground">Manage your profile and view stats</p>
        </div>

        <div className="space-y-2">
          <Link
            to="/account/username"
            className="flex items-center justify-between rounded-xl border border-border/50 bg-card px-4 py-3 transition-colors hover:bg-secondary/40"
          >
            <div className="flex items-center gap-3">
              <User size={16} className="text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Username</p>
                <p className="text-sm font-medium text-foreground">{profile.username ?? 'Not set'}</p>
              </div>
            </div>
            <ChevronRight size={14} className="text-muted-foreground" />
          </Link>

          <Link
            to="/account/email"
            className="flex items-center justify-between rounded-xl border border-border/50 bg-card px-4 py-3 transition-colors hover:bg-secondary/40"
          >
            <div className="flex items-center gap-3">
              <Mail size={16} className="text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Email</p>
                <p className="text-sm font-medium text-foreground">{profile.email ?? 'Unavailable'}</p>
              </div>
            </div>
            <ChevronRight size={14} className="text-muted-foreground" />
          </Link>

          <Link
            to="/account/password"
            className="flex items-center justify-between rounded-xl border border-border/50 bg-card px-4 py-3 transition-colors hover:bg-secondary/40"
          >
            <div className="flex items-center gap-3">
              <Lock size={16} className="text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Password</p>
                <p className="text-sm font-medium text-foreground">••••••••</p>
              </div>
            </div>
            <ChevronRight size={14} className="text-muted-foreground" />
          </Link>
        </div>

        <Button
          type="button"
          variant="outline"
          onClick={() => void handleSignOut()}
          className="h-9 border border-border/50 bg-card text-xs text-muted-foreground hover:bg-secondary hover:text-foreground"
        >
          <LogOut size={13} className="mr-1.5" />Sign Out
        </Button>

        {/* Stats */}
        <div className="space-y-4 pt-2">
          <p className="text-[0.6rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground/60">Stats</p>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
            <Stat label="Games" value={profile.gamesCompleted} />
            <Stat label="Vs Computer" value={profile.computerGamesCompleted} />
            <Stat label="Pass N Play" value={profile.passNPlayGamesCompleted} />
            <Stat label="Puzzles" value={profile.puzzleAttempts} />
            <Stat label="Solved" value={profile.puzzlesSolved} />
            <Stat label="Failed" value={profile.puzzlesFailed} />
            <Stat label="Drill Rounds" value={profile.drillRoundsPlayed} />
            <Stat label="Best Score" value={profile.bestDrillScore} />
            <Stat label="Best Accuracy" value={formatAccuracyPercent(profile.bestDrillAccuracy)} />
          </div>
        </div>

        {/* Recent games */}
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between">
            <p className="text-[0.6rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground/60">Recent Games</p>
            <p className="text-[0.6rem] text-muted-foreground/40">{profile.recentGames.length} shown</p>
          </div>

          {profile.recentGames.length === 0 ? (
            <div className="rounded-xl border border-border/50 bg-card px-4 py-6 text-center text-xs text-muted-foreground">
              No saved games yet
            </div>
          ) : (
            <ScrollArea className="h-[28rem] w-full">
              <div className="space-y-2 pr-3">
                {profile.recentGames.map((game) => (
                  <div key={game.id} className="rounded-xl border border-border/50 bg-card px-4 py-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-foreground">{getGameModeLabel(game.mode)}</p>
                        <div className="mt-0.5 flex flex-wrap gap-x-3 text-xs text-muted-foreground">
                          <span>{getPgnResultLabel(game.pgn)}</span>
                          {game.engineElo !== null && <span>ELO {game.engineElo}</span>}
                        </div>
                      </div>
                      <div className="flex gap-1.5">
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          className="h-7 px-2 text-[0.65rem] text-muted-foreground hover:bg-secondary hover:text-foreground"
                          onClick={() => void handleExportToChessCom(game.pgn)}
                        >
                          <ExternalLink size={11} className="mr-1" />Chess.com
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          className="h-7 px-2 text-[0.65rem] text-muted-foreground hover:bg-secondary hover:text-foreground"
                          onClick={() => void handleExportToLichess(game.pgn)}
                        >
                          <ExternalLink size={11} className="mr-1" />Lichess
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
    </AccountLayout>
  );
};

const Stat = ({ label, value }: { label: string; value: string | number }) => (
  <div className="rounded-xl border border-border/50 bg-card px-3 py-3">
    <p className="text-[0.6rem] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
      {label}
    </p>
    <p className="mt-1.5 text-xl font-semibold text-foreground">{value}</p>
  </div>
);

export default Account;
