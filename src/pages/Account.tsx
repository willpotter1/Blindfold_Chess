import { Link, useNavigate } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useAccountProfile } from '@/hooks/useAccountProfile';
import { AccountLayout } from '@/components/AccountLayout';
import { getFirebaseAuth, hasFirebaseConfig } from '@/lib/firebase';

const Account = () => {
  const { isLoading, profile } = useAccountProfile();
  const [toastState, navigate] = [useToast(), useNavigate()];
  const { toast } = toastState;

  const handleSignOut = async () => {
    const auth = getFirebaseAuth();
    if (!auth) return;

    try {
      await signOut(auth);
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
            {!hasFirebaseConfig && (
              <div className="rounded-lg border-2 border-[#d9b99b] bg-[#d9b99b] p-4 text-black">
                Firebase is not configured. Account features are unavailable until the environment variables are set.
              </div>
            )}

            {hasFirebaseConfig && isLoading && (
              <div className="rounded-lg border-2 border-[#d9b99b] bg-white p-4 text-black">
                Loading account details...
              </div>
            )}

            {hasFirebaseConfig && !isLoading && !profile.uid && (
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

            {hasFirebaseConfig && !isLoading && profile.uid && (
              <div className="grid gap-4">
                <div className="rounded-lg border-2 border-[#d9b99b] bg-white p-4">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-sm font-medium text-black">Name</p>
                      <p className="mt-1 text-xl font-semibold text-[#8B4513]">{profile.username ?? 'Not set'}</p>
                    </div>
                    <Button asChild className="border-2 border-[#8B4513] bg-[#8B4513] text-white hover:bg-[#8B4513]/90">
                      <Link to="/account/username">Change</Link>
                    </Button>
                  </div>
                </div>
                <div className="rounded-lg border-2 border-[#d9b99b] bg-white p-4">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-sm font-medium text-black">Email</p>
                      <p className="mt-1 text-lg font-semibold text-[#8B4513]">{profile.email ?? 'Unavailable'}</p>
                    </div>
                    <Button asChild className="border-2 border-[#8B4513] bg-[#8B4513] text-white hover:bg-[#8B4513]/90">
                      <Link to="/account/email">Change</Link>
                    </Button>
                  </div>
                </div>
                <div className="rounded-lg border-2 border-[#d9b99b] bg-white p-4">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-sm font-medium text-black">Password</p>
                      <p className="mt-1 text-lg font-semibold text-[#8B4513]">••••••••</p>
                    </div>
                    <Button asChild className="border-2 border-[#8B4513] bg-[#8B4513] text-white hover:bg-[#8B4513]/90">
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
            )}
          </CardContent>
        </Card>
      </div>
    </AccountLayout>
  );
};

export default Account;
