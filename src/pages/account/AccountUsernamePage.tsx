import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useAccountProfile } from '@/hooks/useAccountProfile';
import { AccountLayout } from '@/components/AccountLayout';
import { hasSupabaseConfig, supabase } from '@/lib/supabase';
import { USERNAME_REGEX, normalizeEmail, normalizeUsername } from '@/lib/account';

const AccountUsername = () => {
  const { isLoading, profile } = useAccountProfile();
  const [usernameInput, setUsernameInput] = useState('');
  const [isSavingUsername, setIsSavingUsername] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    setUsernameInput(profile.username ?? '');
  }, [profile.username]);

  const handleUsernameSave = async () => {
    if (!profile.uid || !profile.email) return;

    if (!supabase) {
      toast({
        title: 'Name update unavailable',
        description: 'Database access is not configured right now.',
        variant: 'destructive',
      });
      return;
    }

    const normalizedUsername = normalizeUsername(usernameInput);
    if (!USERNAME_REGEX.test(normalizedUsername)) {
      toast({
        title: 'Invalid name',
        description: 'Use 3-20 characters: lowercase letters, numbers, or underscores.',
        variant: 'destructive',
      });
      return;
    }

    if (normalizedUsername === profile.username) {
      toast({
        title: 'No change',
        description: 'That is already your current name.',
      });
      return;
    }

    setIsSavingUsername(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .update({ username: normalizedUsername })
        .eq('id', profile.uid)
        .select('username')
        .maybeSingle();

      if (error) {
        throw error;
      }

      if (!data) {
        const { error: insertError } = await supabase.from('profiles').insert({
          id: profile.uid,
          email: normalizeEmail(profile.email),
          username: normalizedUsername,
        });

        if (insertError) {
          throw insertError;
        }
      }

      setUsernameInput(normalizedUsername);
      toast({
        title: 'Name updated',
        description: `Your name is now ${normalizedUsername}.`,
      });
    } catch (error) {
      console.error('Username update failed:', error);
      toast({
        title: 'Name update failed',
        description:
          error && typeof error === 'object' && 'code' in error && (error as { code?: unknown }).code === '23505'
            ? 'That name is already taken. Please choose another.'
            : 'Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSavingUsername(false);
    }
  };

  return (
    <AccountLayout>
      <div className="mx-auto max-w-4xl">
        <Card className="bg-surface-white">
          <CardHeader>
            <CardTitle className="text-primary">Change Name</CardTitle>
            <CardDescription className="text-foreground">Update the username used for your account.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {!hasSupabaseConfig && <div className="rounded-lg border border-border/50 bg-surface-strong p-4 text-foreground">Supabase is not configured.</div>}
            {hasSupabaseConfig && isLoading && <div className="rounded-lg border border-border/50 bg-surface-white p-4 text-foreground">Loading account details...</div>}
            {hasSupabaseConfig && !isLoading && profile.uid && (
              <div className="rounded-lg border border-border/50 bg-surface-white p-4 space-y-3">
                <div>
                  <p className="text-sm font-medium text-foreground">Current Name</p>
                  <p className="mt-1 text-xl font-semibold text-primary">{profile.username ?? 'Not set'}</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="account-username" className="text-foreground">New Name</Label>
                  <Input
                    id="account-username"
                    type="text"
                    value={usernameInput}
                    onChange={(event) => setUsernameInput(event.target.value)}
                    placeholder="new_username"
                    autoComplete="username"
                    className="text-foreground"
                  />
                </div>
                <div className="flex gap-3">
                  <Button type="button" onClick={() => void handleUsernameSave()} disabled={isSavingUsername} className="border-2 border-primary bg-primary text-primary-foreground hover:bg-primary/90">
                    {isSavingUsername ? 'Saving...' : 'Save Name'}
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

export default AccountUsername;
