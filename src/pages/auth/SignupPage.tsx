import { FormEvent, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { UserPlus } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AppSidebar } from '@/components/AppSidebar';
import { useToast } from '@/hooks/use-toast';
import { getAuthStatus, sendOtpCode, signupWithOtp } from '@/lib/otpApi';
import { hasSupabaseConfig } from '@/lib/supabase';

const USERNAME_REGEX = /^[a-z0-9_]{3,20}$/;
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
  return typeof error.message === 'string' ? error.message : 'An unexpected error occurred.';
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
    <div className="bg-background min-h-screen md:flex">
      <AppSidebar />

      <div className="flex flex-1 items-start justify-center px-4 py-10 md:items-center md:py-0">
        <div className="w-full max-w-sm">
          {!hasSupabaseConfig && (
            <div className="mb-6 rounded-xl border border-destructive/30 bg-card p-3 text-xs text-destructive">
              Supabase is not configured. Set VITE_SUPABASE_* env vars to enable auth.
            </div>
          )}

          <div className="space-y-6">
            {/* Header */}
            <div className="space-y-2">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-secondary">
                  <UserPlus size={18} className="text-foreground" />
                </div>
                <div>
                  <h1 className="text-lg font-semibold text-foreground">Create an account</h1>
                  <p className="text-xs text-muted-foreground">Sign up with email verification</p>
                </div>
              </div>
            </div>

            {isSignupAvailable === false && (
              <Alert variant="destructive">
                <AlertTitle>Unavailable</AlertTitle>
                <AlertDescription>{signupUnavailableDescription}</AlertDescription>
              </Alert>
            )}

            {/* Form */}
            <form className="space-y-4" onSubmit={otpSent ? handleSignup : handleSendOtp}>
              <div className="space-y-1.5">
                <Label htmlFor="signup-username" className="text-xs">Username</Label>
                <Input
                  id="signup-username"
                  type="text"
                  placeholder="lowercase, 3-20 chars"
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                  required
                  minLength={3}
                  maxLength={20}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="signup-email" className="text-xs">Email</Label>
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
              <div className="space-y-1.5">
                <Label htmlFor="signup-password" className="text-xs">Password</Label>
                <Input
                  id="signup-password"
                  type="password"
                  placeholder="At least 6 characters"
                  autoComplete="new-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                  minLength={6}
                />
              </div>
              {otpSent && (
                <div className="space-y-1.5">
                  <Label htmlFor="signup-otp" className="text-xs">Verification code</Label>
                  <Input
                    id="signup-otp"
                    type="text"
                    inputMode="numeric"
                    placeholder="000000"
                    value={otp}
                    onChange={(event) => setOtp(event.target.value)}
                    required
                    minLength={6}
                    maxLength={6}
                    className="font-mono tracking-widest"
                  />
                  <p className="text-[0.65rem] text-muted-foreground">Check your email for the 6-digit code</p>
                </div>
              )}
              {otpSent ? (
                <Button
                  type="submit"
                  className="h-10 w-full bg-primary text-sm text-primary-foreground hover:bg-primary/90"
                  disabled={isSigningUp}
                >
                  {isSigningUp ? 'Creating account...' : 'Verify & Sign Up'}
                </Button>
              ) : (
                <Button
                  type="submit"
                  className="h-10 w-full bg-primary text-sm text-primary-foreground hover:bg-primary/90"
                  disabled={isSendingOtp || isCheckingSignupStatus || isSignupAvailable === false}
                >
                  {isSendingOtp ? 'Sending code...' : 'Continue'}
                </Button>
              )}
            </form>

            {/* Footer */}
            <p className="text-center text-xs text-muted-foreground">
              Already have an account?{' '}
              <Link to="/login" className="font-medium text-foreground underline underline-offset-4 hover:text-foreground/80">
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Signup;
