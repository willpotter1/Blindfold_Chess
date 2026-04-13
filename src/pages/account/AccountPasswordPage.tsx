import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useAccountProfile } from '@/hooks/useAccountProfile';
import { AccountLayout } from '@/components/AccountLayout';
import { hasSupabaseConfig, supabase } from '@/lib/supabase';

const AccountPassword = () => {
  const { isLoading, profile } = useAccountProfile();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const { toast } = useToast();

  const handlePasswordChange = async () => {
    const currentUser = supabase ? (await supabase.auth.getUser()).data.user : null;

    if (!supabase || !currentUser || !currentUser.email) {
      toast({
        title: 'Password update unavailable',
        description: 'You need to be signed in with an email/password account.',
        variant: 'destructive',
      });
      return;
    }

    if (!currentPassword) {
      toast({
        title: 'Current password required',
        description: 'Enter your current password to continue.',
        variant: 'destructive',
      });
      return;
    }

    if (newPassword.length < 6) {
      toast({
        title: 'New password too short',
        description: 'Use at least 6 characters.',
        variant: 'destructive',
      });
      return;
    }

    if (newPassword !== confirmNewPassword) {
      toast({
        title: 'Passwords do not match',
        description: 'Make sure the new password and confirmation match.',
        variant: 'destructive',
      });
      return;
    }

    setIsChangingPassword(true);
    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: currentUser.email,
        password: currentPassword,
      });
      if (signInError) {
        throw signInError;
      }

      const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
      if (updateError) {
        throw updateError;
      }

      setCurrentPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
      toast({
        title: 'Password updated',
        description: 'Your password has been changed.',
      });
    } catch (error) {
      console.error('Password update failed:', error);
      toast({
        title: 'Password update failed',
        description:
          error instanceof Error && /wrong-password|invalid-credential/i.test(error.message)
            ? 'Your current password is incorrect.'
            : 'Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsChangingPassword(false);
    }
  };

  return (
    <AccountLayout>
      <div className="mx-auto max-w-4xl">
        <Card className="bg-surface-white">
          <CardHeader>
            <CardTitle className="text-primary">Change Password</CardTitle>
            <CardDescription className="text-foreground">Enter your current password before setting a new one.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {!hasSupabaseConfig && <div className="rounded-lg border border-border/50 bg-surface-strong p-4 text-foreground">Supabase is not configured.</div>}
            {hasSupabaseConfig && isLoading && <div className="rounded-lg border border-border/50 bg-surface-white p-4 text-foreground">Loading account details...</div>}
            {hasSupabaseConfig && !isLoading && profile.uid && (
              <div className="rounded-lg border border-border/50 bg-surface-white p-4 space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="account-current-password" className="text-foreground">Current Password</Label>
                  <Input id="account-current-password" type="password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} autoComplete="current-password" className="text-foreground" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="account-new-password" className="text-foreground">New Password</Label>
                  <Input id="account-new-password" type="password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} autoComplete="new-password" className="text-foreground" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="account-confirm-password" className="text-foreground">Confirm New Password</Label>
                  <Input id="account-confirm-password" type="password" value={confirmNewPassword} onChange={(event) => setConfirmNewPassword(event.target.value)} autoComplete="new-password" className="text-foreground" />
                </div>
                <div className="flex gap-3">
                  <Button type="button" onClick={() => void handlePasswordChange()} disabled={isChangingPassword} className="border-2 border-primary bg-primary text-primary-foreground hover:bg-primary/90">
                    {isChangingPassword ? 'Saving...' : 'Save Password'}
                  </Button>
                  <Button asChild type="button" className="border-2 border-primary bg-primary text-primary-foreground hover:bg-primary/90">
                    <Link to="/account">Back</Link>
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AccountLayout>
  );
};

export default AccountPassword;
