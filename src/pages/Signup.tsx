import { FormEvent, useState } from 'react';
import { Link } from 'react-router-dom';
import { createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { getFirebaseAuth, hasFirebaseConfig } from '@/lib/firebase';
import { sendOtpCode, verifyOtpCode } from '@/lib/otpApi';

const Signup = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [isSigningUp, setIsSigningUp] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const { toast } = useToast();

  const handleSendOtp = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSendingOtp(true);
    try {
      await sendOtpCode(email);
      setOtpSent(true);
      toast({
        title: 'OTP sent',
        description: 'Check your email for the 6-digit code.',
      });
    } catch (error) {
      console.error('Send OTP failed:', error);
      toast({
        title: 'Could not send OTP',
        description: error instanceof Error ? error.message : 'Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSendingOtp(false);
    }
  };

  const handleSignup = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const auth = getFirebaseAuth();
    if (!auth) {
      toast({
        title: 'Firebase not configured',
        description: 'Add Firebase env values before using authentication.',
        variant: 'destructive',
      });
      return;
    }

    setIsSigningUp(true);
    try {
      await verifyOtpCode(email, otp);
      const credential = await createUserWithEmailAndPassword(auth, email, password);
      await signOut(auth);
      toast({
        title: 'Account created',
        description: 'Email verified via OTP. You can log in now.',
      });
      setOtp('');
      setOtpSent(false);
    } catch (error) {
      console.error('Signup failed:', error);
      toast({
        title: 'Sign up failed',
        description: error instanceof Error ? error.message : 'Please confirm your details and try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSigningUp(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="w-full border-b bg-card">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between gap-4">
            <Button asChild type="button" variant="outline" size="sm">
              <Link to="/">Back</Link>
            </Button>
            <h1 className="text-2xl font-bold text-foreground md:text-3xl">Blindchess</h1>
            <div className="w-[68px]" aria-hidden />
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-10">
        {!hasFirebaseConfig && (
          <div className="mx-auto mb-6 max-w-xl rounded-md border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
            Firebase is not configured. Set your `VITE_FIREBASE_*` env vars to enable authentication.
          </div>
        )}
        <Card className="mx-auto max-w-xl">
          <CardHeader>
            <CardTitle>Sign Up</CardTitle>
            <CardDescription>Create your account with password and verify email using OTP.</CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={otpSent ? handleSignup : handleSendOtp}>
              <div className="space-y-2">
                <Label htmlFor="signup-email">Email</Label>
                <Input
                  id="signup-email"
                  type="email"
                  placeholder="you@example.com"
                  autoComplete="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="signup-password">Password</Label>
                <Input
                  id="signup-password"
                  type="password"
                  placeholder="Create a password"
                  autoComplete="new-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                  minLength={6}
                />
              </div>
              {otpSent && (
                <div className="space-y-2">
                  <Label htmlFor="signup-otp">Email OTP</Label>
                  <Input
                    id="signup-otp"
                    type="text"
                    inputMode="numeric"
                    placeholder="6-digit code"
                    value={otp}
                    onChange={(event) => setOtp(event.target.value)}
                    required
                    minLength={6}
                    maxLength={6}
                  />
                </div>
              )}
              {otpSent ? (
                <Button type="submit" className="w-full" disabled={isSigningUp}>
                  {isSigningUp ? 'Creating account...' : 'Verify OTP and Sign Up'}
                </Button>
              ) : (
                <Button type="submit" className="w-full" disabled={isSendingOtp}>
                  {isSendingOtp ? 'Sending OTP...' : 'Send OTP'}
                </Button>
              )}
            </form>
            <p className="mt-4 text-center text-sm text-muted-foreground">
              Already have an account?{' '}
              <Link to="/login" className="underline underline-offset-4">
                Log in
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Signup;
