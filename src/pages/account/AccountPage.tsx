import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { LogOut, User, Mail, Lock, ExternalLink, ChevronRight, Trash2, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AccountLayout } from '@/components/AccountLayout';
import { AccountModal } from '@/components/AccountModal';
import { useToast } from '@/hooks/use-toast';
import { useAccountProfile } from '@/hooks/useAccountProfile';
import { USERNAME_REGEX, normalizeEmail, normalizeUsername } from '@/lib/account';
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

type ModalType = 'username' | 'email' | 'password' | 'delete' | null;

const Account = () => {
  const { isLoading, profile } = useAccountProfile();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [activeModal, setActiveModal] = useState<ModalType>(null);

  // Username state
  const [usernameInput, setUsernameInput] = useState('');
  const [isSavingUsername, setIsSavingUsername] = useState(false);

  // Email state
  const [emailPassword, setEmailPassword] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [isChangingEmail, setIsChangingEmail] = useState(false);

  // Password state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  useEffect(() => {
    if (activeModal === 'username') {
      setUsernameInput(profile.username ?? '');
    }
  }, [activeModal, profile.username]);

  const closeModal = () => {
    setActiveModal(null);
    setUsernameInput('');
    setEmailPassword('');
    setNewEmail('');
    setCurrentPassword('');
    setNewPassword('');
    setConfirmNewPassword('');
  };

  const handleSignOut = async () => {
    if (!supabase) return;
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      toast({ title: 'Signed out', description: 'You have been signed out.' });
      navigate('/');
    } catch {
      toast({ title: 'Sign out failed', description: 'Please try again.', variant: 'destructive' });
    }
  };

  const handleUsernameSave = async () => {
    if (!profile.uid || !supabase) return;

    const normalized = normalizeUsername(usernameInput);
    if (!USERNAME_REGEX.test(normalized)) {
      toast({ title: 'Invalid name', description: 'Use 3-20 characters: lowercase letters, numbers, or underscores.', variant: 'destructive' });
      return;
    }
    if (normalized === profile.username) {
      toast({ title: 'No change', description: 'That is already your current name.' });
      return;
    }

    setIsSavingUsername(true);
    try {
      const { error } = await supabase.from('profiles').update({ username: normalized }).eq('id', profile.uid);
      if (error) throw error;
      toast({ title: 'Name updated', description: `Your name is now ${normalized}.` });
      closeModal();
      window.location.reload();
    } catch (error) {
      const code = error && typeof error === 'object' && 'code' in error ? (error as { code?: string }).code : null;
      toast({ title: 'Name update failed', description: code === '23505' ? 'That name is already taken.' : 'Please try again.', variant: 'destructive' });
    } finally {
      setIsSavingUsername(false);
    }
  };

  const handleEmailChange = async () => {
    if (!supabase || !profile.uid) return;
    const currentUser = (await supabase.auth.getUser()).data.user;
    if (!currentUser?.email) return;

    if (!newEmail.trim() || !emailPassword) {
      toast({ title: 'Missing fields', description: 'Enter your current password and new email.', variant: 'destructive' });
      return;
    }

    setIsChangingEmail(true);
    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({ email: currentUser.email, password: emailPassword });
      if (signInError) throw signInError;

      const normalizedNewEmail = normalizeEmail(newEmail);
      const { error: updateError } = await supabase.auth.updateUser({ email: normalizedNewEmail });
      if (updateError) throw updateError;

      await supabase.from('profiles').update({ email: normalizedNewEmail }).eq('id', profile.uid);

      toast({ title: 'Email updated', description: 'Check your inbox if confirmation is required.' });
      closeModal();
      window.location.reload();
    } catch (error) {
      const msg = error instanceof Error ? error.message : '';
      toast({ title: 'Email update failed', description: /invalid login credentials/i.test(msg) ? 'Current password is incorrect.' : 'Please try again.', variant: 'destructive' });
    } finally {
      setIsChangingEmail(false);
    }
  };

  const handlePasswordChange = async () => {
    if (!supabase) return;
    const currentUser = (await supabase.auth.getUser()).data.user;
    if (!currentUser?.email) return;

    if (!currentPassword) {
      toast({ title: 'Current password required', variant: 'destructive' });
      return;
    }
    if (newPassword.length < 6) {
      toast({ title: 'Too short', description: 'Use at least 6 characters.', variant: 'destructive' });
      return;
    }
    if (newPassword !== confirmNewPassword) {
      toast({ title: 'Passwords do not match', variant: 'destructive' });
      return;
    }

    setIsChangingPassword(true);
    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({ email: currentUser.email, password: currentPassword });
      if (signInError) throw signInError;

      const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
      if (updateError) throw updateError;

      toast({ title: 'Password updated' });
      closeModal();
    } catch (error) {
      const msg = error instanceof Error ? error.message : '';
      toast({ title: 'Password update failed', description: /wrong-password|invalid-credential/i.test(msg) ? 'Current password is incorrect.' : 'Please try again.', variant: 'destructive' });
    } finally {
      setIsChangingPassword(false);
    }
  };

  const [deleteConfirmInput, setDeleteConfirmInput] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDeleteAccount = async () => {
    if (deleteConfirmInput !== 'delete my account' || !supabase || !profile.uid) return;

    setIsDeleting(true);
    try {
      // Delete profile (cascades to games, etc. via FK)
      const { error: profileError } = await supabase.from('profiles').delete().eq('id', profile.uid);
      if (profileError) throw profileError;

      await supabase.auth.signOut();
      toast({ title: 'Account deleted', description: 'Your account has been permanently removed.' });
      navigate('/');
    } catch (error) {
      console.error('Account deletion failed:', error);
      toast({ title: 'Deletion failed', description: 'Please try again or contact support.', variant: 'destructive' });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleExportToChessCom = async (pgn: string) => { await exportPgnToChessCom(pgn, toast); };
  const handleExportToLichess = async (pgn: string) => { await exportPgnToLichess(pgn, toast); };

  if (!hasSupabaseConfig) {
    return (
      <AccountLayout>
        <div className="mx-auto max-w-lg py-16 text-center">
          <p className="text-sm text-muted-foreground">Supabase is not configured.</p>
        </div>
      </AccountLayout>
    );
  }

  if (isLoading) {
    return (
      <AccountLayout>
        <div className="flex min-h-[50vh] items-center justify-center">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-muted-foreground/20 border-t-foreground" />
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
        <div className="space-y-1">
          <h1 className="text-lg font-semibold text-foreground">Account</h1>
          <p className="text-xs text-muted-foreground">Manage your profile and view stats</p>
        </div>

        {/* Profile settings */}
        <div className="rounded-xl border border-border/50 bg-card divide-y divide-border/30">
          <SettingsRow icon={User} label="Username" value={profile.username ?? 'Not set'} onClick={() => setActiveModal('username')} />
          <SettingsRow icon={Mail} label="Email" value={profile.email ?? 'Unavailable'} onClick={() => setActiveModal('email')} />
          <SettingsRow icon={Lock} label="Password" value="••••••••" onClick={() => setActiveModal('password')} />
        </div>

        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => void handleSignOut()}
            className="h-8 border border-border/50 bg-card text-[0.7rem] text-muted-foreground hover:bg-secondary hover:text-foreground"
          >
            <LogOut size={12} className="mr-1.5" />Sign Out
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => setActiveModal('delete')}
            className="h-8 border border-destructive/30 bg-card text-[0.7rem] text-destructive/70 hover:border-destructive/50 hover:bg-destructive/10 hover:text-destructive"
          >
            <Trash2 size={12} className="mr-1.5" />Delete Account
          </Button>
        </div>

        {/* Stats */}
        <div className="space-y-5 pt-2">
          <StatGroup label="Games">
            <Stat label="Total" value={profile.gamesCompleted} />
            <Stat label="Vs Computer" value={profile.computerGamesCompleted} />
            <Stat label="Pass N Play" value={profile.passNPlayGamesCompleted} />
          </StatGroup>

          <StatGroup label="Puzzles">
            <Stat label="Attempted" value={profile.puzzleAttempts} />
            <Stat label="Solved" value={profile.puzzlesSolved} />
            <Stat label="Failed" value={profile.puzzlesFailed} />
          </StatGroup>

          <StatGroup label="Drills">
            <Stat label="Rounds" value={profile.drillRoundsPlayed} />
            <Stat label="Best Score" value={profile.bestDrillScore} />
            <Stat label="Best Accuracy" value={formatAccuracyPercent(profile.bestDrillAccuracy)} />
          </StatGroup>
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
                        <Button type="button" size="sm" variant="ghost" className="h-7 px-2 text-[0.65rem] text-muted-foreground hover:bg-secondary hover:text-foreground" onClick={() => void handleExportToChessCom(game.pgn)}>
                          <ExternalLink size={11} className="mr-1" />Chess.com
                        </Button>
                        <Button type="button" size="sm" variant="ghost" className="h-7 px-2 text-[0.65rem] text-muted-foreground hover:bg-secondary hover:text-foreground" onClick={() => void handleExportToLichess(game.pgn)}>
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

      {/* ── Modals ── */}
      <AccountModal
        isOpen={activeModal === 'username'}
        onClose={closeModal}
        title="Change Username"
        description="Lowercase letters, numbers, and underscores. 3-20 characters."
      >
        <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); void handleUsernameSave(); }}>
          <div className="space-y-1.5">
            <Label htmlFor="modal-username" className="text-xs">Username</Label>
            <Input
              id="modal-username"
              type="text"
              value={usernameInput}
              onChange={(e) => setUsernameInput(e.target.value)}
              placeholder={profile.username ?? 'new_username'}
              autoComplete="username"
              autoFocus
            />
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              className="h-9 flex-1 border border-border/50 bg-card text-xs text-muted-foreground hover:bg-secondary hover:text-foreground"
              onClick={closeModal}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="h-9 flex-1 bg-primary text-xs text-primary-foreground hover:bg-primary/90"
              disabled={isSavingUsername}
            >
              {isSavingUsername ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </form>
      </AccountModal>

      <AccountModal
        isOpen={activeModal === 'email'}
        onClose={closeModal}
        title="Change Email"
        description="Verify your identity with your current password."
      >
        <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); void handleEmailChange(); }}>
          <div className="space-y-1.5">
            <Label htmlFor="modal-email-password" className="text-xs">Current password</Label>
            <Input
              id="modal-email-password"
              type="password"
              value={emailPassword}
              onChange={(e) => setEmailPassword(e.target.value)}
              autoComplete="current-password"
              autoFocus
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="modal-new-email" className="text-xs">New email</Label>
            <Input
              id="modal-new-email"
              type="email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
            />
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              className="h-9 flex-1 border border-border/50 bg-card text-xs text-muted-foreground hover:bg-secondary hover:text-foreground"
              onClick={closeModal}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="h-9 flex-1 bg-primary text-xs text-primary-foreground hover:bg-primary/90"
              disabled={isChangingEmail}
            >
              {isChangingEmail ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </form>
      </AccountModal>

      <AccountModal
        isOpen={activeModal === 'password'}
        onClose={closeModal}
        title="Change Password"
        description="Enter your current password, then choose a new one."
      >
        <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); void handlePasswordChange(); }}>
          <div className="space-y-1.5">
            <Label htmlFor="modal-current-pw" className="text-xs">Current password</Label>
            <Input
              id="modal-current-pw"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              autoComplete="current-password"
              autoFocus
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="modal-new-pw" className="text-xs">New password</Label>
            <Input
              id="modal-new-pw"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="At least 6 characters"
              autoComplete="new-password"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="modal-confirm-pw" className="text-xs">Confirm password</Label>
            <Input
              id="modal-confirm-pw"
              type="password"
              value={confirmNewPassword}
              onChange={(e) => setConfirmNewPassword(e.target.value)}
              autoComplete="new-password"
            />
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              className="h-9 flex-1 border border-border/50 bg-card text-xs text-muted-foreground hover:bg-secondary hover:text-foreground"
              onClick={closeModal}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="h-9 flex-1 bg-primary text-xs text-primary-foreground hover:bg-primary/90"
              disabled={isChangingPassword}
            >
              {isChangingPassword ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </form>
      </AccountModal>

      <AccountModal
        isOpen={activeModal === 'delete'}
        onClose={() => { closeModal(); setDeleteConfirmInput(''); }}
        title="Delete Account"
        description="This action is permanent and cannot be undone."
      >
        <div className="space-y-4">
          <div className="flex items-start gap-3 rounded-lg bg-destructive/10 p-3">
            <AlertTriangle size={16} className="mt-0.5 shrink-0 text-destructive" />
            <p className="text-xs leading-relaxed text-destructive">
              All your data will be permanently deleted, including games, puzzles, drills, and opening history. This cannot be recovered.
            </p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="modal-delete-confirm" className="text-xs">
              Type &ldquo;<span className="font-semibold text-foreground">delete my account</span>&rdquo; to confirm
            </Label>
            <Input
              id="modal-delete-confirm"
              type="text"
              value={deleteConfirmInput}
              onChange={(e) => setDeleteConfirmInput(e.target.value)}
              placeholder="delete my account"
              autoComplete="off"
              autoFocus
            />
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              className="h-9 flex-1 border border-border/50 bg-card text-xs text-muted-foreground hover:bg-secondary hover:text-foreground"
              onClick={() => { closeModal(); setDeleteConfirmInput(''); }}
            >
              Cancel
            </Button>
            <Button
              type="button"
              className="h-9 flex-1 bg-destructive text-xs text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteConfirmInput !== 'delete my account' || isDeleting}
              onClick={() => void handleDeleteAccount()}
            >
              {isDeleting ? 'Deleting...' : 'Delete Account'}
            </Button>
          </div>
        </div>
      </AccountModal>
    </AccountLayout>
  );
};

const SettingsRow = ({ icon: Icon, label, value, onClick }: { icon: React.ElementType; label: string; value: string; onClick: () => void }) => (
  <button
    type="button"
    className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-secondary/30"
    onClick={onClick}
  >
    <Icon size={15} className="shrink-0 text-muted-foreground" />
    <div className="min-w-0 flex-1">
      <p className="text-[0.65rem] text-muted-foreground">{label}</p>
      <p className="mt-0.5 truncate text-sm font-medium text-foreground">{value}</p>
    </div>
    <ChevronRight size={13} className="shrink-0 text-muted-foreground/40" />
  </button>
);

const StatGroup = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="rounded-xl border border-border/50 bg-card p-4">
    <p className="mb-3 text-[0.6rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground/60">{label}</p>
    <div className="grid grid-cols-3 gap-3">
      {children}
    </div>
  </div>
);

const Stat = ({ label, value }: { label: string; value: string | number }) => (
  <div>
    <p className="text-xl font-semibold text-foreground">{value}</p>
    <p className="mt-0.5 text-[0.6rem] text-muted-foreground">{label}</p>
  </div>
);

export default Account;
