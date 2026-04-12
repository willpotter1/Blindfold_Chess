import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useAccountProfile } from '@/hooks/useAccountProfile';
import { normalizeEmail } from '@/lib/account';
import { AccountLayout } from '@/components/AccountLayout';
import { hasSupabaseConfig, supabase } from '@/lib/supabase';

const AccountEmail = () => {
  const { isLoading, profile } = useAccountProfile();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [isChangingEmail, setIsChangingEmail] = useState(false);
  const { toast } = useToast();

  const handleEmailChange = async () => {
    const currentUser = supabase ? (await supabase.auth.getUser()).data.user : null;

    if (!supabase || !currentUser || !currentUser.email || !profile.uid) {
      toast({
        title: 'Email update unavailable',
        description: 'You need to be signed in with an email/password account.',
        variant: 'destructive',
      });
      return;
    }

    if (!newEmail.trim() || !currentPassword) {
      toast({
        title: 'Missing fields',
        description: 'Enter your current password and new email.',
        variant: 'destructive',
      });
      return;
    }

    setIsChangingEmail(true);
    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: currentUser.email,
        password: currentPassword,
      });
      if (signInError) {
        throw signInError;
      }

      const normalizedNewEmail = normalizeEmail(newEmail);

      const { error: updateError } = await supabase.auth.updateUser({ email: normalizedNewEmail });
      if (updateError) {
        throw updateError;
      }

      const { error: profileUpdateError } = await supabase
        .from('profiles')
        .update({ email: normalizedNewEmail })
        .eq('id', profile.uid);
      if (profileUpdateError) {
        throw profileUpdateError;
      }

      setCurrentPassword('');
      setNewEmail('');
      toast({
        title: 'Email updated',
        description: 'If email change confirmations are enabled, confirm the update from your inbox.',
      });
    } catch (error) {
      console.error('Email update failed:', error);
      toast({
        title: 'Email update failed',
        description:
          error instanceof Error && /invalid login credentials|invalid-credential/i.test(error.message)
            ? 'Your current password is incorrect.'
            : 'Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsChangingEmail(false);
    }
  };

  return (
    <AccountLayout>
      <div className="mx-auto max-w-4xl">
        <Card className="bg-surface-white">
          <CardHeader>
            <CardTitle className="text-primary">Change Email</CardTitle>
            <CardDescription className="text-foreground">Update the email address linked to your account.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {!hasSupabaseConfig && <div className="rounded-lg border-2 border-border bg-surface-strong p-4 text-foreground">Supabase is not configured.</div>}
            {hasSupabaseConfig && isLoading && <div className="rounded-lg border-2 border-border bg-surface-white p-4 text-foreground">Loading account details...</div>}
            {hasSupabaseConfig && !isLoading && profile.uid && (
              <div className="rounded-lg border-2 border-border bg-surface-white p-4 space-y-3">
                <div>
                  <p className="text-sm font-medium text-foreground">Current Email</p>
                  <p className="mt-1 text-lg font-semibold text-primary">{profile.email ?? 'Unavailable'}</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="account-email-password" className="text-foreground">Current Password</Label>
                  <Input id="account-email-password" type="password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} autoComplete="current-password" className="text-foreground" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="account-email" className="text-foreground">New Email</Label>
                  <Input id="account-email" type="email" value={newEmail} onChange={(event) => setNewEmail(event.target.value)} autoComplete="email" className="text-foreground" />
                </div>
                <div className="flex gap-3">
                  <Button type="button" onClick={() => void handleEmailChange()} disabled={isChangingEmail} className="border-2 border-primary bg-primary text-primary-foreground hover:bg-primary/90">
                    {isChangingEmail ? 'Saving...' : 'Save Email'}
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

export default AccountEmail;
