import { useState } from 'react';
import { Link } from 'react-router-dom';
import { EmailAuthProvider, reauthenticateWithCredential, updateEmail } from 'firebase/auth';
import { doc, runTransaction, serverTimestamp } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useAccountProfile } from '@/hooks/useAccountProfile';
import { AccountLayout } from '@/components/AccountLayout';
import { getFirebaseAuth, getFirestoreDb, hasFirebaseConfig } from '@/lib/firebase';
import { isPermissionDeniedError } from '@/lib/account';

const AccountEmail = () => {
  const { isLoading, profile } = useAccountProfile();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [isChangingEmail, setIsChangingEmail] = useState(false);
  const { toast } = useToast();

  const handleEmailChange = async () => {
    const auth = getFirebaseAuth();
    const currentUser = auth?.currentUser;
    const db = getFirestoreDb();

    if (!auth || !currentUser || !currentUser.email || !profile.uid) {
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
      const credential = EmailAuthProvider.credential(currentUser.email, currentPassword);
      await reauthenticateWithCredential(currentUser, credential);
      await updateEmail(currentUser, newEmail.trim());

      if (db) {
        await runTransaction(db, async (transaction) => {
          const userProfileRef = doc(db, 'users', profile.uid!);
          transaction.set(
            userProfileRef,
            {
              uid: profile.uid,
              email: newEmail.trim(),
              username: profile.username,
              updatedAt: serverTimestamp(),
            },
            { merge: true },
          );

          if (profile.username) {
            transaction.set(
              doc(db, 'usernames', profile.username),
              {
                uid: profile.uid,
                username: profile.username,
                email: newEmail.trim(),
                updatedAt: serverTimestamp(),
              },
              { merge: true },
            );
          }
        });
      }

      setCurrentPassword('');
      setNewEmail('');
      toast({
        title: 'Email updated',
        description: `Your email is now ${newEmail.trim()}.`,
      });
    } catch (error) {
      console.error('Email update failed:', error);
      toast({
        title: 'Email update failed',
        description:
          isPermissionDeniedError(error)
            ? 'Firestore rules are blocking this update.'
            : error instanceof Error && /wrong-password|invalid-credential/i.test(error.message)
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
        <Card className="bg-white">
          <CardHeader>
            <CardTitle className="text-[#8B4513]">Change Email</CardTitle>
            <CardDescription className="text-black">Update the email address linked to your account.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {!hasFirebaseConfig && <div className="rounded-lg border-2 border-[#d9b99b] bg-[#d9b99b] p-4 text-black">Firebase is not configured.</div>}
            {hasFirebaseConfig && isLoading && <div className="rounded-lg border-2 border-[#d9b99b] bg-white p-4 text-black">Loading account details...</div>}
            {hasFirebaseConfig && !isLoading && profile.uid && (
              <div className="rounded-lg border-2 border-[#d9b99b] bg-white p-4 space-y-3">
                <div>
                  <p className="text-sm font-medium text-black">Current Email</p>
                  <p className="mt-1 text-lg font-semibold text-[#8B4513]">{profile.email ?? 'Unavailable'}</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="account-email-password" className="text-black">Current Password</Label>
                  <Input id="account-email-password" type="password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} autoComplete="current-password" className="text-black" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="account-email" className="text-black">New Email</Label>
                  <Input id="account-email" type="email" value={newEmail} onChange={(event) => setNewEmail(event.target.value)} autoComplete="email" className="text-black" />
                </div>
                <div className="flex gap-3">
                  <Button type="button" onClick={() => void handleEmailChange()} disabled={isChangingEmail} className="border-2 border-[#8B4513] bg-[#8B4513] text-white hover:bg-[#8B4513]/90">
                    {isChangingEmail ? 'Saving...' : 'Save Email'}
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

export default AccountEmail;
