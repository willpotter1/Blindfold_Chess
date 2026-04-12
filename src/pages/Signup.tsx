import { FormEvent, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AppSidebar } from '@/components/AppSidebar';
import { useToast } from '@/hooks/use-toast';
import { getAuthStatus, sendOtpCode, signupWithOtp } from '@/lib/otpApi';
import { hasSupabaseConfig } from '@/lib/supabase';

const USERNAME_REGEX = /^[a-z0-9_]{3,20}$/;
const primaryActionButtonClassName = 'w-full border-2 border-primary bg-primary text-primary-foreground hover:bg-primary/90';
const authCardClassName = 'mx-auto max-w-xl rounded-[32px] border-2 border-border bg-surface-white shadow-theme-soft backdrop-blur-sm';
const authPanelClassName = 'space-y-4 rounded-[24px] border-2 border-border bg-surface-white/80 p-5 sm:p-6';
const authFieldClassName = 'space-y-2 rounded-2xl border-2 border-border bg-surface-white/75 p-4';
const authInputClassName = 'border-border bg-surface-strong/55 text-foreground placeholder:text-foreground/65';
const otpServerUnavailableDescription = 'The OTP server is not running. Start it with npm run auth:dev.';
const signupUnavailableDescription = 'Account creation is temporarily unavailable. Please try again later.';
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
  if (error.message === 'cooldown_active') {
    return 'A code was sent recently. Check your email or wait a minute before resending.';
  }
  if (error.message === 'username_taken') {
    return 'That username is already taken. Please choose another.';
  }
  if (error.message === 'email_already_exists' || error.message === 'user_already_exists') {
    return 'An account already exists for that email address.';
  }
  if (error.message === 'invalid_email') {
    return 'Enter a valid email address.';
  }
  if (error.message === 'otp_server_unreachable') {
    return otpServerUnavailableDescription;
  }
  if (error.message === 'otp_response_invalid') {
    return 'The OTP server returned an invalid response. Check npm run auth:dev and try again.';
  }
  if (error.message === 'otp_api_not_configured') {
    return 'The OTP API is not configured.';
  }
  if (
    error.message === 'mailer_not_configured' ||
    error.message === 'supabase_admin_not_configured' ||
    error.message === 'signup_unavailable'
  ) {
    return signupUnavailableDescription;
  }
  if (error.message === 'otp_request_failed') {
    return 'The OTP request failed. Check the local auth server and try again.';
  }
  return error.message;
};

const Signup = () => {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [isSigningUp, setIsSigningUp] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [isCheckingSignupStatus, setIsCheckingSignupStatus] = useState(true);
  const [isSignupAvailable, setIsSignupAvailable] = useState<boolean | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    let cancelled = false;

    const loadSignupStatus = async () => {
      setIsCheckingSignupStatus(true);
      try {
        const status = await getAuthStatus();
        if (!cancelled) {
          setIsSignupAvailable(status.signupReady);
        }
      } catch (error) {
        if (!cancelled) {
          console.error('Signup status check failed:', error);
          setIsSignupAvailable(null);
        }
      } finally {
        if (!cancelled) {
          setIsCheckingSignupStatus(false);
        }
      }
    };

    void loadSignupStatus();

    return () => {
      cancelled = true;
    };
  }, []);

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
      const status = await getAuthStatus();
      setIsSignupAvailable(status.signupReady);
      if (!status.signupReady) {
        toast({
          title: 'Account creation unavailable',
          description: signupUnavailableDescription,
          variant: 'destructive',
        });
        return;
      }

      await sendOtpCode(email);
      setOtpSent(true);
      toast({
        title: 'OTP sent',
        description: 'Check your email for the 6-digit code.',
      });
    } catch (error) {
      console.error('Send OTP failed:', error);
      if (error instanceof Error && error.message === 'signup_unavailable') {
        setIsSignupAvailable(false);
      }
      if (error instanceof Error && error.message === 'cooldown_active') {
        setOtpSent(true);
      }
      toast({
        title: 'Could not send OTP',
        description: getSignupErrorDescription(error),
        variant: 'destructive',
      });
    } finally {
      setIsSendingOtp(false);
    }
  };

  const handleSignup = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!hasSupabaseConfig) {
      toast({
        title: 'Supabase not configured',
        description: 'Add Supabase env values before using authentication.',
        variant: 'destructive',
      });
      return;
    }

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
    try {
      await signupWithOtp(email, password, normalizedUsername, otp);
      toast({
        title: 'Account created',
        description: 'Email verified and username reserved. You can log in now.',
      });
      setUsername('');
      setEmail('');
      setPassword('');
      setOtp('');
      setOtpSent(false);
    } catch (error) {
      console.error('Signup failed:', error);
      if (error instanceof Error && error.message === 'signup_unavailable') {
        setIsSignupAvailable(false);
      }
      if (error instanceof Error && isOtpResetRequiredError(error.message)) {
        setOtp('');
        setOtpSent(false);
      }
      toast({
        title: 'Sign up failed',
        description: getSignupErrorDescription(error),
        variant: 'destructive',
      });
    } finally {
      setIsSigningUp(false);
    }
  };

  return (
    <div className="bg-stage-glow min-h-screen md:flex">
      <AppSidebar />

      <div className="container mx-auto px-4 py-10 pb-[calc(6.5rem+env(safe-area-inset-bottom))] md:flex-1 md:pb-10">
        {!hasSupabaseConfig && (
          <div className="mx-auto mb-6 max-w-xl rounded-[24px] border-2 border-destructive/40 bg-surface-white p-4 text-sm text-destructive shadow-theme-soft">
            Supabase is not configured. Set your `VITE_SUPABASE_*` env vars to enable authentication.
          </div>
        )}
        <Card className={authCardClassName}>
          <CardHeader className="space-y-2 pb-4 sm:pb-5">
            <CardTitle>Sign Up</CardTitle>
            <CardDescription>Create your account with a unique username, password, and email OTP.</CardDescription>
          </CardHeader>
          <CardContent className="pb-6">
            <div className={authPanelClassName}>
            {isSignupAvailable === false && (
              <Alert variant="destructive">
                <AlertTitle>Account creation unavailable</AlertTitle>
                <AlertDescription>{signupUnavailableDescription}</AlertDescription>
              </Alert>
            )}
            <form className="space-y-4" onSubmit={otpSent ? handleSignup : handleSendOtp}>
              <div className={authFieldClassName}>
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
                  className={authInputClassName}
                />
              </div>
              <div className={authFieldClassName}>
                <Label htmlFor="signup-email">Email</Label>
                <Input
                  id="signup-email"
                  type="email"
                  placeholder="you@example.com"
                  autoComplete="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                  className={authInputClassName}
                />
              </div>
              <div className={authFieldClassName}>
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
                  className={authInputClassName}
                />
              </div>
              {otpSent && (
                <div className={authFieldClassName}>
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
                    className={authInputClassName}
                  />
                </div>
              )}
              {otpSent ? (
                <Button type="submit" className="w-full" disabled={isSigningUp}>
                  {isSigningUp ? 'Creating account...' : 'Verify OTP and Sign Up'}
                </Button>
              ) : (
                <Button
                  type="submit"
                  className={primaryActionButtonClassName}
                  disabled={isSendingOtp || isCheckingSignupStatus || isSignupAvailable === false}
                >
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
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Signup;
