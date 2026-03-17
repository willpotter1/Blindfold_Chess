import { FormEvent, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { collection, doc, getDoc, getDocs, limit, query, where } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { getFirebaseAuth, getFirestoreDb, hasFirebaseConfig } from '@/lib/firebase';
import { resetPasswordWithOtp, sendPasswordResetOtp } from '@/lib/otpApi';
import whitePawnLogo from '../../Visual/Whitepawn.png';

const sidebarLinkButtonClassName = 'md:w-full';
const primaryActionButtonClassName = 'w-full border-2 border-[#8B4513] bg-[#8B4513] text-white hover:bg-[#8B4513]/90';
const textLinkClassName = 'text-sm font-medium text-[#8B4513] underline underline-offset-4';

const Login = () => {
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
  const { toast } = useToast();
  const navigate = useNavigate();
  const isPermissionDeniedError = (error: unknown) => {
    if (error && typeof error === 'object' && 'code' in error) {
      const code = (error as { code?: unknown }).code;
      if (code === 'permission-denied' || code === 'firestore/permission-denied') {
        return true;
      }
    }
    return error instanceof Error && /insufficient permissions/i.test(error.message);
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
      const email = await resolveEmailFromIdentifier(identifier);
      await signInWithEmailAndPassword(auth, email, password);

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

  const resetForgotPasswordState = () => {
    setForgotIdentifier('');
    setForgotResolvedEmail('');
    setResetOtp('');
    setResetNewPassword('');
    setConfirmResetNewPassword('');
    setIsResetOtpSent(false);
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
      <div className="mx-4 mt-4 w-auto rounded-2xl bg-[#d9b99b] p-4 md:mb-4 md:mr-0 md:h-[calc(100vh-2rem)] md:w-24 md:shrink-0">
        <div className="flex items-center justify-between md:h-full md:flex-col md:items-stretch md:justify-start">
          <Link to="/" className="md:self-center">
            <img
              src={whitePawnLogo}
              alt="White pawn logo"
              className="h-14 w-14 object-contain md:h-20 md:w-20"
            />
          </Link>
          <div className="flex gap-2 md:mt-4 md:flex-col">
            <Button asChild type="button" className={sidebarLinkButtonClassName}>
              <Link to="/account">Account</Link>
            </Button>
            <Button asChild type="button" className={sidebarLinkButtonClassName}>
              <Link to="/games">Games</Link>
            </Button>
            <Button asChild type="button" className={sidebarLinkButtonClassName}>
              <Link to="/about">About</Link>
            </Button>
          </div>
          <div className="flex gap-2 md:mt-auto md:flex-col">
            <Button asChild type="button" className={sidebarLinkButtonClassName}>
              <Link to="/login">Log In</Link>
            </Button>
            <Button asChild type="button" className={sidebarLinkButtonClassName}>
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
          <CardHeader className="space-y-2 pb-6">
            <CardTitle>{isForgotPasswordMode ? 'Forgot Password' : 'Login'}</CardTitle>
            <CardDescription>
              {isForgotPasswordMode
                ? 'Enter your email or username to receive a reset OTP, then submit the OTP and your new password.'
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
                <div className="pt-1">
                  <Button type="submit" className={primaryActionButtonClassName} disabled={isSendingResetOtp || isResettingPassword}>
                    {isResetOtpSent
                      ? isResettingPassword
                        ? 'Resetting Password...'
                        : 'Reset Password'
                      : isSendingResetOtp
                        ? 'Sending OTP...'
                        : 'Send Reset OTP'}
                  </Button>
                </div>
              </form>
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
                    }}
                  >
                    Forgot password?
                  </button>
                  <p className="text-sm text-muted-foreground">
                    Need an account?{' '}
                    <Link to="/signup" className={textLinkClassName}>
                      Sign up
                    </Link>
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
