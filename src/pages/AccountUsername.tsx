import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { doc, runTransaction, serverTimestamp } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useAccountProfile } from '@/hooks/useAccountProfile';
import { AccountLayout } from '@/components/AccountLayout';
import { getFirestoreDb, hasFirebaseConfig } from '@/lib/firebase';
import { USERNAME_REGEX, isPermissionDeniedError, normalizeUsername } from '@/lib/account';

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

    const db = getFirestoreDb();
    if (!db) {
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
      await runTransaction(db, async (transaction) => {
        const userProfileRef = doc(db, 'users', profile.uid!);
        const newUsernameRef = doc(db, 'usernames', normalizedUsername);
        const userProfileDoc = await transaction.get(userProfileRef);
        const newUsernameDoc = await transaction.get(newUsernameRef);

        if (newUsernameDoc.exists()) {
          throw new Error('USERNAME_TAKEN');
        }

        if (userProfileDoc.exists()) {
          transaction.set(userProfileRef, { username: normalizedUsername, updatedAt: serverTimestamp() }, { merge: true });
        } else {
          transaction.set(userProfileRef, {
            uid: profile.uid,
            email: profile.email,
            username: normalizedUsername,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
        }

        transaction.set(newUsernameRef, {
          uid: profile.uid,
          username: normalizedUsername,
          email: profile.email,
          createdAt: serverTimestamp(),
        });

        if (profile.username) {
          transaction.delete(doc(db, 'usernames', profile.username));
        }
      });

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
          error instanceof Error && error.message === 'USERNAME_TAKEN'
            ? 'That name is already taken. Please choose another.'
            : isPermissionDeniedError(error)
              ? 'Firestore rules are blocking this update.'
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
        <Card className="bg-white">
          <CardHeader>
            <CardTitle className="text-[#8B4513]">Change Name</CardTitle>
            <CardDescription className="text-black">Update the username used for your account.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {!hasFirebaseConfig && <div className="rounded-lg border-2 border-[#d9b99b] bg-[#d9b99b] p-4 text-black">Firebase is not configured.</div>}
            {hasFirebaseConfig && isLoading && <div className="rounded-lg border-2 border-[#d9b99b] bg-white p-4 text-black">Loading account details...</div>}
            {hasFirebaseConfig && !isLoading && profile.uid && (
              <div className="rounded-lg border-2 border-[#d9b99b] bg-white p-4 space-y-3">
                <div>
                  <p className="text-sm font-medium text-black">Current Name</p>
                  <p className="mt-1 text-xl font-semibold text-[#8B4513]">{profile.username ?? 'Not set'}</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="account-username" className="text-black">New Name</Label>
                  <Input
                    id="account-username"
                    type="text"
                    value={usernameInput}
                    onChange={(event) => setUsernameInput(event.target.value)}
                    placeholder="new_username"
                    autoComplete="username"
                    className="text-black"
                  />
                </div>
                <div className="flex gap-3">
                  <Button type="button" onClick={() => void handleUsernameSave()} disabled={isSavingUsername} className="border-2 border-[#8B4513] bg-[#8B4513] text-white hover:bg-[#8B4513]/90">
                    {isSavingUsername ? 'Saving...' : 'Save Name'}
                  </Button>
                  <Button asChild type="button" className="border-2 border-[#8B4513] bg-[#8B4513] text-white hover:bg-[#8B4513]/90">
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
