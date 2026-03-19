import { FormEvent, useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { createUserWithEmailAndPassword, deleteUser, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  query,
  runTransaction,
  serverTimestamp,
  where,
} from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { getFirebaseAuth, getFirestoreDb, hasFirebaseConfig } from '@/lib/firebase';
import { resetPasswordWithOtp, sendOtpCode, sendPasswordResetOtp, verifyOtpCode } from '@/lib/otpApi';
import emptyBoardIcon from '../../Visual/emptyboard3.png';
import profileIcon from '../../Visual/Brownprofile.png';
import whitePawnLogo from '../../Visual/Whitepawn.png';

type AuthMode = 'login' | 'signup';

const USERNAME_REGEX = /^[a-z0-9_]{3,20}$/;
const sidebarLinkButtonClassName = 'md:w-full';
const sidebarIconButtonClassName = 'h-auto justify-start border-0 bg-transparent px-0 py-1 text-white shadow-none hover:bg-transparent md:w-full';
const sidebarIconSlotClassName = 'flex h-9 w-9 shrink-0 items-center justify-center';
const primaryActionButtonClassName = 'w-full border-2 border-[#8B4513] bg-[#8B4513] text-white hover:bg-[#8B4513]/90';
const textLinkClassName = 'bg-transparent p-0 text-sm font-medium text-[#8B4513] underline underline-offset-4';

const normalizeUsername = (value: string) => value.trim().toLowerCase();
const isOtpResetRequiredError = (message: string) =>
  message === 'otp_not_found' || message === 'otp_expired' || message === 'max_attempts_exceeded';
const isPermissionDeniedError = (error: unknown) => {
  if (error && typeof error === 'object' && 'code' in error) {
    const code = (error as { code?: unknown }).code;
    if (code === 'permission-denied' || code === 'firestore/permission-denied') {
      return true;
    }
  }
  return error instanceof Error && /insufficient permissions/i.test(error.message);
};

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

const getResetErrorDescription = (error: unknown) => {
  if (!(error instanceof Error)) {
    return 'Please try again.';
  }
  if (error.message === 'cooldown_active') {
    return 'A code was sent recently. Check your email or wait a minute before trying again.';
  }
  if (error.message === 'invalid_otp') {
    return 'That OTP is incorrect.';
  }
  if (error.message === 'otp_not_found') {
    return 'No active OTP was found. Request a new one.';
  }
  if (error.message === 'otp_expired') {
    return 'That OTP has expired. Request a new one.';
  }
  if (error.message === 'max_attempts_exceeded') {
    return 'Too many incorrect attempts. Request a new OTP.';
  }
  if (error.message === 'weak_password') {
    return 'Use a password with at least 6 characters.';
  }
  if (error.message === 'firebase_admin_not_configured') {
    return 'The reset server is missing Firebase admin credentials.';
  }
  if (error.message === 'otp_api_not_configured') {
    return 'The OTP API is not configured.';
  }
  return error.message;
};

const Login = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [authMode, setAuthMode] = useState<AuthMode>('login');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isForgotPasswordMode, setIsForgotPasswordMode] = useState(false);
  const [forgotIdentifier, setForgotIdentifier] = useState('');
  const [forgotResolvedEmail, setForgotResolvedEmail] = useState('');
  const [resetOtp, setResetOtp] = useState('');
  const [resetNewPassword, setResetNewPassword] = useState('');
  const [confirmResetNewPassword, setConfirmResetNewPassword] = useState('');
  const [isResetOtpSent, setIsResetOtpSent] = useState(false);
  const [isSendingResetOtp, setIsSendingResetOtp] = useState(false);
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [isSigningUp, setIsSigningUp] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    const requestedMode = searchParams.get('mode') === 'signup' ? 'signup' : 'login';
    setAuthMode(requestedMode);
  }, [searchParams]);

  const setRouteAuthMode = (mode: AuthMode) => {
    const nextParams = new URLSearchParams(searchParams);
    if (mode === 'signup') {
      nextParams.set('mode', 'signup');
    } else {
      nextParams.delete('mode');
    }
    setSearchParams(nextParams, { replace: true });
  };

  const switchAuthMode = (mode: AuthMode) => {
    setIsForgotPasswordMode(false);
    setRouteAuthMode(mode);
  };

  const resolveEmailFromIdentifier = async (rawIdentifier: string): Promise<string> => {
    const trimmedIdentifier = rawIdentifier.trim();
    if (trimmedIdentifier.includes('@')) {
      return trimmedIdentifier;
    }

    const db = getFirestoreDb();
    if (!db) {
      throw new Error('Database unavailable for username lookup.');
    }

    const normalizedUsername = trimmedIdentifier.toLowerCase();
    try {
      const usernameRef = doc(db, 'usernames', normalizedUsername);
      const usernameDoc = await getDoc(usernameRef);
      if (usernameDoc.exists()) {
        const usernameRecord = usernameDoc.data() as { email?: string };
        if (usernameRecord.email) {
          return usernameRecord.email;
        }
      }

      const usersRef = collection(db, 'users');
      const usernameQuery = query(usersRef, where('username', '==', normalizedUsername), limit(1));
      const snapshot = await getDocs(usernameQuery);

      if (snapshot.empty) {
        throw new Error('No account found for that username.');
      }

      const userRecord = snapshot.docs[0].data() as { email?: string };
      if (!userRecord.email) {
        throw new Error('Username is missing an email record.');
      }

      return userRecord.email;
    } catch (error) {
      if (isPermissionDeniedError(error)) {
        throw new Error('Username login is unavailable right now. Please log in with your email address.');
      }
      throw error;
    }
  };

  const resetForgotPasswordState = () => {
    setForgotIdentifier('');
    setForgotResolvedEmail('');
    setResetOtp('');
    setResetNewPassword('');
    setConfirmResetNewPassword('');
    setIsResetOtpSent(false);
  };

  const handleLogin = async (event: FormEvent<HTMLFormElement>) => {
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

    setIsLoggingIn(true);
    try {
      const emailAddress = await resolveEmailFromIdentifier(identifier);
      await signInWithEmailAndPassword(auth, emailAddress, password);

      toast({
        title: 'Signed in',
        description: 'Welcome back.',
      });
      navigate('/');
    } catch (error) {
      console.error('Login failed:', error);
      toast({
        title: 'Login failed',
        description: error instanceof Error ? error.message : 'Check your credentials and try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoggingIn(false);
    }
  };

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
      const credential = await createUserWithEmailAndPassword(auth, email, signupPassword);
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
      setIdentifier(email);
      setPassword('');
      setUsername('');
      setEmail('');
      setSignupPassword('');
      setOtp('');
      setOtpSent(false);
      switchAuthMode('login');
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

  const handleSendResetOtp = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!forgotIdentifier.trim()) {
      toast({
        title: 'Identifier required',
        description: 'Enter your email or username first.',
        variant: 'destructive',
      });
      return;
    }

    setIsSendingResetOtp(true);
    try {
      const resolvedEmail = await resolveEmailFromIdentifier(forgotIdentifier);
      await sendPasswordResetOtp(resolvedEmail);
      setForgotResolvedEmail(resolvedEmail);
      setIsResetOtpSent(true);
      toast({
        title: 'Reset OTP sent',
        description: 'Check the account email for the 6-digit reset code.',
      });
    } catch (error) {
      console.error('Send reset OTP failed:', error);
      toast({
        title: 'Could not send reset OTP',
        description: getResetErrorDescription(error),
        variant: 'destructive',
      });
    } finally {
      setIsSendingResetOtp(false);
    }
  };

  const handleResetPassword = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!forgotResolvedEmail) {
      toast({
        title: 'Reset OTP required',
        description: 'Request a reset OTP before setting a new password.',
        variant: 'destructive',
      });
      return;
    }

    if (!resetOtp.trim()) {
      toast({
        title: 'OTP required',
        description: 'Enter the reset OTP from your email.',
        variant: 'destructive',
      });
      return;
    }

    if (resetNewPassword.length < 6) {
      toast({
        title: 'Password too short',
        description: 'Use a password with at least 6 characters.',
        variant: 'destructive',
      });
      return;
    }

    if (resetNewPassword !== confirmResetNewPassword) {
      toast({
        title: 'Passwords do not match',
        description: 'Make sure the new password and confirmation match.',
        variant: 'destructive',
      });
      return;
    }

    setIsResettingPassword(true);
    try {
      await resetPasswordWithOtp(forgotResolvedEmail, resetOtp, resetNewPassword);
      toast({
        title: 'Password reset',
        description: 'Your password has been updated. You can log in now.',
      });
      resetForgotPasswordState();
      setIsForgotPasswordMode(false);
      switchAuthMode('login');
    } catch (error) {
      console.error('Password reset failed:', error);
      toast({
        title: 'Password reset failed',
        description: getResetErrorDescription(error),
        variant: 'destructive',
      });
    } finally {
      setIsResettingPassword(false);
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
            <Button asChild type="button" className={sidebarLinkButtonClassName}>
              <Link to="/about">Puzzles</Link>
            </Button>
            <Button asChild type="button" className={sidebarLinkButtonClassName}>
              <Link to="/about">Openings</Link>
            </Button>
            <Button asChild type="button" className={sidebarLinkButtonClassName}>
              <Link to="/about">About</Link>
            </Button>
          </div>
          <div className="flex gap-2 md:mt-auto md:flex-col">
            <Button asChild type="button" className={sidebarLinkButtonClassName}>
              <Link to="/login">Log In</Link>
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
          <CardHeader className="space-y-2 pb-6">
            <CardTitle>{isForgotPasswordMode ? 'Forgot Password' : authMode === 'signup' ? 'Sign Up' : 'Login'}</CardTitle>
            <CardDescription>
              {isForgotPasswordMode
                ? 'Enter your email or username to receive a reset OTP, then submit the OTP and your new password.'
                : authMode === 'signup'
                  ? 'Create your account with a unique username, password, and email OTP.'
                  : 'Sign in with your email or username and password.'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {isForgotPasswordMode ? (
              <form className="space-y-6" onSubmit={isResetOtpSent ? handleResetPassword : handleSendResetOtp}>
                <div className="space-y-2">
                  <Label htmlFor="forgot-identifier">Email or Username</Label>
                  <Input
                    id="forgot-identifier"
                    type="text"
                    placeholder="you@example.com or username"
                    autoComplete="username"
                    value={forgotIdentifier}
                    onChange={(event) => {
                      setForgotIdentifier(event.target.value);
                      if (isResetOtpSent) {
                        setForgotResolvedEmail('');
                        setResetOtp('');
                        setResetNewPassword('');
                        setConfirmResetNewPassword('');
                        setIsResetOtpSent(false);
                      }
                    }}
                    required
                  />
                </div>
                {isResetOtpSent && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="forgot-otp">Reset OTP</Label>
                      <Input
                        id="forgot-otp"
                        type="text"
                        inputMode="numeric"
                        placeholder="6-digit code"
                        value={resetOtp}
                        onChange={(event) => setResetOtp(event.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="forgot-new-password">New Password</Label>
                      <Input
                        id="forgot-new-password"
                        type="password"
                        autoComplete="new-password"
                        value={resetNewPassword}
                        onChange={(event) => setResetNewPassword(event.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="forgot-confirm-password">Confirm New Password</Label>
                      <Input
                        id="forgot-confirm-password"
                        type="password"
                        autoComplete="new-password"
                        value={confirmResetNewPassword}
                        onChange={(event) => setConfirmResetNewPassword(event.target.value)}
                        required
                      />
                    </div>
                  </>
                )}
                <div className="space-y-3 pt-1">
                  <Button
                    type="submit"
                    className={primaryActionButtonClassName}
                    disabled={isSendingResetOtp || isResettingPassword}
                  >
                    {isResetOtpSent
                      ? isResettingPassword
                        ? 'Resetting Password...'
                        : 'Reset Password'
                      : isSendingResetOtp
                        ? 'Sending OTP...'
                        : 'Send Reset OTP'}
                  </Button>
                  <div className="text-center">
                    <button
                      type="button"
                      className={textLinkClassName}
                      onClick={() => {
                        resetForgotPasswordState();
                        setIsForgotPasswordMode(false);
                        switchAuthMode('login');
                      }}
                    >
                      Back to login
                    </button>
                  </div>
                </div>
              </form>
            ) : authMode === 'signup' ? (
              <>
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
                      value={signupPassword}
                      onChange={(event) => setSignupPassword(event.target.value)}
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
                    <Button type="submit" className={primaryActionButtonClassName} disabled={isSigningUp}>
                      {isSigningUp ? 'Creating account...' : 'Verify OTP and Sign Up'}
                    </Button>
                  ) : (
                    <Button type="submit" className={primaryActionButtonClassName} disabled={isSendingOtp}>
                      {isSendingOtp ? 'Sending OTP...' : 'Create Account'}
                    </Button>
                  )}
                </form>
                <p className="text-center text-sm text-muted-foreground">
                  Already have an account?{' '}
                  <button type="button" className={textLinkClassName} onClick={() => switchAuthMode('login')}>
                    Log in
                  </button>
                </p>
              </>
            ) : (
              <>
                <form className="space-y-6" onSubmit={handleLogin}>
                  <div className="space-y-2">
                    <Label htmlFor="login-identifier">Email or Username</Label>
                    <Input
                      id="login-identifier"
                      type="text"
                      placeholder="you@example.com or username"
                      autoComplete="username"
                      value={identifier}
                      onChange={(event) => setIdentifier(event.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="login-password">Password</Label>
                    <Input
                      id="login-password"
                      type="password"
                      placeholder="Enter your password"
                      autoComplete="current-password"
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      required
                    />
                  </div>
                  <Button type="submit" className={primaryActionButtonClassName} disabled={isLoggingIn}>
                    {isLoggingIn ? 'Logging in...' : 'Login'}
                  </Button>
                </form>
                <div className="space-y-3 pt-1 text-center">
                  <button
                    type="button"
                    className={textLinkClassName}
                    onClick={() => {
                      resetForgotPasswordState();
                      setForgotIdentifier(identifier);
                      setIsForgotPasswordMode(true);
                      setRouteAuthMode('login');
                    }}
                  >
                    Forgot password?
                  </button>
                  <p className="text-sm text-muted-foreground">
                    Need an account?{' '}
                    <button type="button" className={textLinkClassName} onClick={() => switchAuthMode('signup')}>
                      Sign up
                    </button>
                  </p>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Login;
