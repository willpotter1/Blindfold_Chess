import { FormEvent, useState } from 'react';
import { Link } from 'react-router-dom';
import { createUserWithEmailAndPassword, deleteUser, signOut } from 'firebase/auth';
import { doc, runTransaction, serverTimestamp } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { getFirebaseAuth, getFirestoreDb, hasFirebaseConfig } from '@/lib/firebase';
import { sendOtpCode, verifyOtpCode } from '@/lib/otpApi';
import emptyBoardIcon from '../../Visual/emptyboard3.png';
import profileIcon from '../../Visual/Brownprofile.png';
import whitePawnLogo from '../../Visual/Whitepawn.png';

const USERNAME_REGEX = /^[a-z0-9_]{3,20}$/;
const sidebarIconButtonClassName = 'h-auto justify-start border-0 bg-transparent px-0 py-1 text-white shadow-none hover:bg-transparent md:w-full';
const sidebarIconSlotClassName = 'flex h-9 w-9 shrink-0 items-center justify-center';
const primaryActionButtonClassName = 'w-full border-2 border-[#8B4513] bg-[#8B4513] text-white hover:bg-[#8B4513]/90';
const normalizeUsername = (value: string) => value.trim().toLowerCase();
const isOtpResetRequiredError = (message: string) =>
  message === 'otp_not_found' || message === 'otp_expired' || message === 'max_attempts_exceeded';
const getSignupErrorDescription = (error: unknown) => {
  if (!(error instanceof Error)) {
    return 'Please confirm your details and try again.';
  }
  if (error.message === 'invalid_otp') {
    return 'That code is incorrect. Please check your email and try again.';
  }
  if (error.message === 'otp_not_found') {
    return 'This code is no longer valid. Click Send OTP to get a new code.';
  }
  if (error.message === 'otp_expired') {
    return 'This code has expired. Click Send OTP to request a fresh code.';
  }
  if (error.message === 'max_attempts_exceeded') {
    return 'Too many failed attempts. Click Send OTP to request a new code.';
  }
  return error.message;
};
const isPermissionDeniedError = (error: unknown) => {
  if (error && typeof error === 'object' && 'code' in error) {
    const code = (error as { code?: unknown }).code;
    if (code === 'permission-denied' || code === 'firestore/permission-denied') {
      return true;
    }
  }
  return error instanceof Error && /insufficient permissions/i.test(error.message);
};

const Signup = () => {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [isSigningUp, setIsSigningUp] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const { toast } = useToast();

  const handleSendOtp = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const normalizedUsername = normalizeUsername(username);
    if (!USERNAME_REGEX.test(normalizedUsername)) {
      toast({
        title: 'Invalid username',
        description: 'Use 3-20 characters: lowercase letters, numbers, or underscores.',
        variant: 'destructive',
      });
      return;
    }

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
      if (error instanceof Error && error.message === 'cooldown_active') {
        setOtpSent(true);
      }
      toast({
        title: 'Could not send OTP',
        description:
          error instanceof Error && error.message === 'cooldown_active'
            ? 'A code was sent recently. Check your email or wait a minute before resending.'
            : error instanceof Error
              ? error.message
              : 'Please try again.',
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
    const db = getFirestoreDb();

    const normalizedUsername = normalizeUsername(username);
    if (!USERNAME_REGEX.test(normalizedUsername)) {
      toast({
        title: 'Invalid username',
        description: 'Use 3-20 characters: lowercase letters, numbers, or underscores.',
        variant: 'destructive',
      });
      return;
    }

    setIsSigningUp(true);
    let createdUserUid: string | null = null;
    let didClaimUsername = false;
    let didSkipUsernameClaim = false;
    try {
      await verifyOtpCode(email, otp);
      const credential = await createUserWithEmailAndPassword(auth, email, password);
      createdUserUid = credential.user.uid;

      if (!db) {
        didSkipUsernameClaim = true;
      } else {
        try {
          await runTransaction(db, async (transaction) => {
            const usernameRef = doc(db, 'usernames', normalizedUsername);
            const usernameDoc = await transaction.get(usernameRef);

            if (usernameDoc.exists()) {
              throw new Error('USERNAME_TAKEN');
            }

            transaction.set(usernameRef, {
              uid: credential.user.uid,
              username: normalizedUsername,
              email,
              createdAt: serverTimestamp(),
            });

            const userProfileRef = doc(db, 'users', credential.user.uid);
            transaction.set(userProfileRef, {
              uid: credential.user.uid,
              email,
              username: normalizedUsername,
              createdAt: serverTimestamp(),
            });
          });
          didClaimUsername = true;
        } catch (error) {
          if (error instanceof Error && error.message === 'USERNAME_TAKEN') {
            throw error;
          }
          if (isPermissionDeniedError(error)) {
            didSkipUsernameClaim = true;
          } else {
            throw error;
          }
        }
      }

      await signOut(auth);
      toast({
        title: 'Account created',
        description: didSkipUsernameClaim
          ? 'Email verified. Log in with your email address.'
          : 'Email verified and username reserved. You can log in now.',
      });
      setUsername('');
      setEmail('');
      setPassword('');
      setOtp('');
      setOtpSent(false);
    } catch (error) {
      if (createdUserUid && !didClaimUsername && auth.currentUser && auth.currentUser.uid === createdUserUid) {
        try {
          await deleteUser(auth.currentUser);
        } catch (cleanupError) {
          console.error('Failed to clean up auth user after signup error:', cleanupError);
        }
      }

      console.error('Signup failed:', error);
      const isUsernameTaken = error instanceof Error && error.message === 'USERNAME_TAKEN';
      if (error instanceof Error && isOtpResetRequiredError(error.message)) {
        setOtp('');
        setOtpSent(false);
      }
      toast({
        title: 'Sign up failed',
        description: isUsernameTaken
          ? 'That username is already taken. Please choose another.'
          : getSignupErrorDescription(error),
        variant: 'destructive',
      });
    } finally {
      setIsSigningUp(false);
    }
  };

  return (
    <div className="min-h-screen bg-white md:flex">
      <div className="mx-4 mt-4 w-auto rounded-2xl bg-[#d9b99b] p-4 md:mb-4 md:mr-0 md:h-[calc(100vh-2rem)] md:w-44 md:shrink-0">
        <div className="flex items-center justify-between md:h-full md:flex-col md:items-stretch md:justify-start">
          <Link to="/" className="md:self-center">
            <img
              src={whitePawnLogo}
              alt="White pawn logo"
              className="h-14 w-14 object-contain md:h-20 md:w-20"
            />
          </Link>
          <div className="flex gap-2 md:mt-4 md:flex-col">
            <Button asChild type="button" className={sidebarIconButtonClassName}>
              <Link to="/account" className="flex items-center justify-start gap-3">
                <span className={sidebarIconSlotClassName}>
                  <img src={profileIcon} alt="" aria-hidden="true" className="h-9 w-9 object-contain" />
                </span>
                <span className="text-lg font-bold">Account</span>
              </Link>
            </Button>
            <Button asChild type="button" className={sidebarIconButtonClassName}>
              <Link to="/games" className="flex items-center justify-start gap-3">
                <span className={sidebarIconSlotClassName}>
                  <img src={emptyBoardIcon} alt="" aria-hidden="true" className="h-9 w-9 object-contain" />
                </span>
                <span className="text-lg font-bold">Games</span>
              </Link>
            </Button>
            <Button asChild type="button" className="md:w-full">
              <Link to="/about">About</Link>
            </Button>
          </div>
          <div className="flex gap-2 md:mt-auto md:flex-col">
            <Button asChild type="button" className="md:w-full">
              <Link to="/login">Log In</Link>
            </Button>
            <Button asChild type="button" className="md:w-full">
              <Link to="/signup">Sign Up</Link>
            </Button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-10 md:flex-1">
        {!hasFirebaseConfig && (
          <div className="mx-auto mb-6 max-w-xl rounded-md border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
            Firebase is not configured. Set your `VITE_FIREBASE_*` env vars to enable authentication.
          </div>
        )}
        <Card className="mx-auto max-w-xl">
          <CardHeader>
            <CardTitle>Sign Up</CardTitle>
            <CardDescription>Create your account with a unique username, password, and email OTP.</CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={otpSent ? handleSignup : handleSendOtp}>
              <div className="space-y-2">
                <Label htmlFor="signup-username">Username</Label>
                <Input
                  id="signup-username"
                  type="text"
                  placeholder="e.g., blindchess_player"
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                  required
                  minLength={3}
                  maxLength={20}
                />
              </div>
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
                <Button type="submit" className={primaryActionButtonClassName} disabled={isSendingOtp}>
                  {isSendingOtp ? 'Creating account...' : 'Create Account'}
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
