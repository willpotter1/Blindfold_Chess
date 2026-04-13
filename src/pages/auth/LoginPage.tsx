import { FormEvent, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { LogIn, KeyRound, ArrowLeft } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AppSidebar } from '@/components/AppSidebar';
import { useToast } from '@/hooks/use-toast';
import { getAuthStatus, resetPasswordWithOtp, resolveIdentifierToEmail, sendPasswordResetOtp } from '@/lib/otpApi';
import { hasSupabaseConfig, supabase } from '@/lib/supabase';

const otpServerUnavailableDescription = 'The OTP server is not running. Start it with npm run auth:dev.';
const otpServerInvalidResponseDescription = 'The OTP server returned an invalid response. Check npm run auth:dev and try again.';
const resetUnavailableDescription = 'Password reset is temporarily unavailable. Please try again later.';

const getOtpRequestErrorDescription = (error: unknown) => {
  if (!(error instanceof Error)) {
    return null;
  }
  if (error.message === 'otp_server_unreachable') {
    return otpServerUnavailableDescription;
  }
  if (error.message === 'otp_response_invalid') {
    return otpServerInvalidResponseDescription;
  }
  if (error.message === 'otp_api_not_configured') {
    return 'The OTP API is not configured.';
  }
  if (error.message === 'mailer_not_configured' || error.message === 'reset_unavailable') {
    return resetUnavailableDescription;
  }
  if (error.message === 'otp_request_failed') {
    return 'The OTP request failed. Check the local auth server and try again.';
  }
  return null;
};

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
  const [isCheckingResetStatus, setIsCheckingResetStatus] = useState(true);
  const [isResetAvailable, setIsResetAvailable] = useState<boolean | null>(null);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;

    const loadResetStatus = async () => {
      setIsCheckingResetStatus(true);
      try {
        const status = await getAuthStatus();
        if (!cancelled) {
          setIsResetAvailable(status.resetReady);
        }
      } catch (error) {
        if (!cancelled) {
          console.error('Reset status check failed:', error);
          setIsResetAvailable(null);
        }
      } finally {
        if (!cancelled) {
          setIsCheckingResetStatus(false);
        }
      }
    };

    void loadResetStatus();

    return () => {
      cancelled = true;
    };
  }, []);

  const getResetErrorDescription = (error: unknown) => {
    const otpRequestErrorDescription = getOtpRequestErrorDescription(error);
    if (otpRequestErrorDescription) {
      return otpRequestErrorDescription;
    }
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
    if (error.message === 'supabase_admin_not_configured') {
      return resetUnavailableDescription;
    }
    if (error.message === 'identifier_not_found' || error.message === 'email_not_found') {
      return 'No account found for that email or username.';
    }
    return error.message;
  };

  const handleLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!supabase) {
      toast({
        title: 'Supabase not configured',
        description: 'Add Supabase env values before using authentication.',
        variant: 'destructive',
      });
      return;
    }

    setIsLoggingIn(true);
    try {
      const email = await resolveIdentifierToEmail(identifier);
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        throw error;
      }

      toast({
        title: 'Signed in',
        description: 'Welcome back.',
      });
      navigate('/');
    } catch (error) {
      console.error('Login failed:', error);
      const otpRequestErrorDescription = getOtpRequestErrorDescription(error);
      toast({
        title: 'Login failed',
        description:
          error instanceof Error && /invalid login credentials/i.test(error.message)
            ? 'Check your credentials and try again.'
            : otpRequestErrorDescription
              ? otpRequestErrorDescription
              : error instanceof Error && error.message === 'identifier_not_found'
                ? 'No account found for that email or username.'
                : error instanceof Error
                  ? error.message
                  : 'Check your credentials and try again.',
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
      const status = await getAuthStatus();
      setIsResetAvailable(status.resetReady);
      if (!status.resetReady) {
        toast({
          title: 'Password reset unavailable',
          description: resetUnavailableDescription,
          variant: 'destructive',
        });
        return;
      }

      const resolvedEmail = await resolveIdentifierToEmail(forgotIdentifier);
      await sendPasswordResetOtp(resolvedEmail);
      setForgotResolvedEmail(resolvedEmail);
      setIsResetOtpSent(true);
      toast({
        title: 'Reset OTP sent',
        description: 'Check the account email for the 6-digit reset code.',
      });
    } catch (error) {
      console.error('Send reset OTP failed:', error);
      if (error instanceof Error && error.message === 'reset_unavailable') {
        setIsResetAvailable(false);
      }
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
      if (error instanceof Error && error.message === 'reset_unavailable') {
        setIsResetAvailable(false);
      }
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
    <div className="bg-background min-h-screen md:flex">
      <AppSidebar />

      <div className="flex flex-1 items-start justify-center px-4 py-10 md:items-center md:py-0">
        <div className="w-full max-w-sm">
          {!hasSupabaseConfig && (
            <div className="mb-6 rounded-xl border border-destructive/30 bg-card p-3 text-xs text-destructive">
              Supabase is not configured. Set VITE_SUPABASE_* env vars to enable auth.
            </div>
          )}

          {isForgotPasswordMode ? (
            <div className="space-y-6">
              {/* Header */}
              <div className="space-y-2">
                <button
                  type="button"
                  className="mb-2 flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                  onClick={() => {
                    resetForgotPasswordState();
                    setIsForgotPasswordMode(false);
                  }}
                >
                  <ArrowLeft size={12} />Back to login
                </button>
                <div className="flex items-center gap-2.5">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-secondary">
                    <KeyRound size={18} className="text-foreground" />
                  </div>
                  <div>
                    <h1 className="text-lg font-semibold text-foreground">Reset password</h1>
                    <p className="text-xs text-muted-foreground">We'll send a code to your email</p>
                  </div>
                </div>
              </div>

              {isResetAvailable === false && (
                <Alert variant="destructive">
                  <AlertTitle>Unavailable</AlertTitle>
                  <AlertDescription>{resetUnavailableDescription}</AlertDescription>
                </Alert>
              )}

              {/* Form */}
              <form className="space-y-4" onSubmit={isResetOtpSent ? handleResetPassword : handleSendResetOtp}>
                <div className="space-y-1.5">
                  <Label htmlFor="forgot-identifier" className="text-xs">Email or username</Label>
                  <Input
                    id="forgot-identifier"
                    type="text"
                    placeholder="you@example.com"
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
                    <div className="space-y-1.5">
                      <Label htmlFor="forgot-otp" className="text-xs">6-digit code</Label>
                      <Input
                        id="forgot-otp"
                        type="text"
                        inputMode="numeric"
                        placeholder="000000"
                        value={resetOtp}
                        onChange={(event) => setResetOtp(event.target.value)}
                        required
                        className="font-mono tracking-widest"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="forgot-new-password" className="text-xs">New password</Label>
                      <Input
                        id="forgot-new-password"
                        type="password"
                        autoComplete="new-password"
                        placeholder="At least 6 characters"
                        value={resetNewPassword}
                        onChange={(event) => setResetNewPassword(event.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="forgot-confirm-password" className="text-xs">Confirm password</Label>
                      <Input
                        id="forgot-confirm-password"
                        type="password"
                        autoComplete="new-password"
                        placeholder="Re-enter new password"
                        value={confirmResetNewPassword}
                        onChange={(event) => setConfirmResetNewPassword(event.target.value)}
                        required
                      />
                    </div>
                  </>
                )}

                <Button
                  type="submit"
                  className="h-10 w-full bg-primary text-sm text-primary-foreground hover:bg-primary/90"
                  disabled={
                    isSendingResetOtp ||
                    isResettingPassword ||
                    (!isResetOtpSent && (isCheckingResetStatus || isResetAvailable === false))
                  }
                >
                  {isResetOtpSent
                    ? isResettingPassword
                      ? 'Resetting...'
                      : 'Reset Password'
                    : isSendingResetOtp
                      ? 'Sending...'
                      : 'Send Code'}
                </Button>
              </form>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Header */}
              <div className="space-y-2">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-secondary">
                    <LogIn size={18} className="text-foreground" />
                  </div>
                  <div>
                    <h1 className="text-lg font-semibold text-foreground">Welcome back</h1>
                    <p className="text-xs text-muted-foreground">Sign in to your account</p>
                  </div>
                </div>
              </div>

              {/* Form */}
              <form className="space-y-4" onSubmit={handleLogin}>
                <div className="space-y-1.5">
                  <Label htmlFor="login-identifier" className="text-xs">Email or username</Label>
                  <Input
                    id="login-identifier"
                    type="text"
                    placeholder="you@example.com"
                    autoComplete="username"
                    value={identifier}
                    onChange={(event) => setIdentifier(event.target.value)}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="login-password" className="text-xs">Password</Label>
                    <button
                      type="button"
                      className="text-[0.65rem] text-muted-foreground hover:text-foreground"
                      onClick={() => {
                        resetForgotPasswordState();
                        setForgotIdentifier(identifier);
                        setIsForgotPasswordMode(true);
                      }}
                    >
                      Forgot password?
                    </button>
                  </div>
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
                <Button
                  type="submit"
                  className="h-10 w-full bg-primary text-sm text-primary-foreground hover:bg-primary/90"
                  disabled={isLoggingIn}
                >
                  {isLoggingIn ? 'Signing in...' : 'Sign In'}
                </Button>
              </form>

              {/* Footer */}
              <p className="text-center text-xs text-muted-foreground">
                Don't have an account?{' '}
                <Link to="/signup" className="font-medium text-foreground underline underline-offset-4 hover:text-foreground/80">
                  Sign up
                </Link>
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Login;
