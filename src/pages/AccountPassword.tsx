import { useState } from 'react';
import { Link } from 'react-router-dom';
import { EmailAuthProvider, reauthenticateWithCredential, updatePassword } from 'firebase/auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useAccountProfile } from '@/hooks/useAccountProfile';
import { AccountLayout } from '@/components/AccountLayout';
import { getFirebaseAuth, hasFirebaseConfig } from '@/lib/firebase';

const AccountPassword = () => {
  const { isLoading, profile } = useAccountProfile();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const { toast } = useToast();

  const handlePasswordChange = async () => {
    const auth = getFirebaseAuth();
    const currentUser = auth?.currentUser;

    if (!auth || !currentUser || !currentUser.email) {
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
      const credential = EmailAuthProvider.credential(currentUser.email, currentPassword);
      await reauthenticateWithCredential(currentUser, credential);
      await updatePassword(currentUser, newPassword);
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
        <Card className="bg-white">
          <CardHeader>
            <CardTitle className="text-[#8B4513]">Change Password</CardTitle>
            <CardDescription className="text-black">Enter your current password before setting a new one.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {!hasFirebaseConfig && <div className="rounded-lg border-2 border-[#d9b99b] bg-[#d9b99b] p-4 text-black">Firebase is not configured.</div>}
            {hasFirebaseConfig && isLoading && <div className="rounded-lg border-2 border-[#d9b99b] bg-white p-4 text-black">Loading account details...</div>}
            {hasFirebaseConfig && !isLoading && profile.uid && (
              <div className="rounded-lg border-2 border-[#d9b99b] bg-white p-4 space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="account-current-password" className="text-black">Current Password</Label>
                  <Input id="account-current-password" type="password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} autoComplete="current-password" className="text-black" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="account-new-password" className="text-black">New Password</Label>
                  <Input id="account-new-password" type="password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} autoComplete="new-password" className="text-black" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="account-confirm-password" className="text-black">Confirm New Password</Label>
                  <Input id="account-confirm-password" type="password" value={confirmNewPassword} onChange={(event) => setConfirmNewPassword(event.target.value)} autoComplete="new-password" className="text-black" />
                </div>
                <div className="flex gap-3">
                  <Button type="button" onClick={() => void handlePasswordChange()} disabled={isChangingPassword} className="border-2 border-[#8B4513] bg-[#8B4513] text-white hover:bg-[#8B4513]/90">
                    {isChangingPassword ? 'Saving...' : 'Save Password'}
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

export default AccountPassword;
