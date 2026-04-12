import { FormEvent, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AppSidebar } from '@/components/AppSidebar';
import { useToast } from '@/hooks/use-toast';
import { getAuthStatus, resetPasswordWithOtp, resolveIdentifierToEmail, sendPasswordResetOtp } from '@/lib/otpApi';
import { hasSupabaseConfig, supabase } from '@/lib/supabase';

const primaryActionButtonClassName = 'w-full border-2 border-primary bg-primary text-primary-foreground hover:bg-primary/90';
const textLinkClassName = 'text-sm font-medium text-primary underline underline-offset-4';
const authCardClassName = 'mx-auto max-w-xl rounded-[32px] border-2 border-border bg-surface-white shadow-theme-soft backdrop-blur-sm';
const authPanelClassName = 'space-y-6 rounded-[24px] border-2 border-border bg-surface-white/80 p-5 sm:p-6';
const authFieldClassName = 'space-y-2 rounded-2xl border-2 border-border bg-surface-white/75 p-4';
const authInputClassName = 'border-border bg-surface-strong/55 text-foreground placeholder:text-foreground/65';
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
    <div className="bg-stage-glow min-h-screen md:flex">
      <AppSidebar />

      <div className="container mx-auto px-4 py-10 pb-[calc(6.5rem+env(safe-area-inset-bottom))] md:flex-1 md:pb-10">
        {!hasSupabaseConfig && (
          <div className="mx-auto mb-6 max-w-xl rounded-[24px] border-2 border-destructive/40 bg-surface-white p-4 text-sm text-destructive shadow-theme-soft">
            Supabase is not configured. Set your `VITE_SUPABASE_*` env vars to enable authentication.
          </div>
        )}
        <Card className={authCardClassName}>
          <CardHeader className="space-y-2 pb-6">
            <CardTitle>{isForgotPasswordMode ? 'Forgot Password' : 'Login'}</CardTitle>
            <CardDescription>
              {isForgotPasswordMode
                ? 'Enter your email or username to receive a reset OTP, then submit the OTP and your new password.'
                : 'Sign in with your email or username and password.'}
            </CardDescription>
          </CardHeader>
          <CardContent className="pb-6">
            <div className={authPanelClassName}>
            {isForgotPasswordMode ? (
              <form className="space-y-6" onSubmit={isResetOtpSent ? handleResetPassword : handleSendResetOtp}>
                {isResetAvailable === false && (
                  <Alert variant="destructive">
                    <AlertTitle>Password reset unavailable</AlertTitle>
                    <AlertDescription>{resetUnavailableDescription}</AlertDescription>
                  </Alert>
                )}
                <div className={authFieldClassName}>
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
                    className={authInputClassName}
                  />
                </div>
                {isResetOtpSent && (
                  <>
                    <div className={authFieldClassName}>
                      <Label htmlFor="forgot-otp">Reset OTP</Label>
                      <Input
                        id="forgot-otp"
                        type="text"
                        inputMode="numeric"
                        placeholder="6-digit code"
                        value={resetOtp}
                        onChange={(event) => setResetOtp(event.target.value)}
                        required
                        className={authInputClassName}
                      />
                    </div>
                    <div className={authFieldClassName}>
                      <Label htmlFor="forgot-new-password">New Password</Label>
                      <Input
                        id="forgot-new-password"
                        type="password"
                        autoComplete="new-password"
                        value={resetNewPassword}
                        onChange={(event) => setResetNewPassword(event.target.value)}
                        required
                        className={authInputClassName}
                      />
                    </div>
                    <div className={authFieldClassName}>
                      <Label htmlFor="forgot-confirm-password">Confirm New Password</Label>
                      <Input
                        id="forgot-confirm-password"
                        type="password"
                        autoComplete="new-password"
                        value={confirmResetNewPassword}
                        onChange={(event) => setConfirmResetNewPassword(event.target.value)}
                        required
                        className={authInputClassName}
                      />
                    </div>
                  </>
                )}
                <div className="pt-1">
                  <Button
                    type="submit"
                    className={primaryActionButtonClassName}
                    disabled={
                      isSendingResetOtp ||
                      isResettingPassword ||
                      (!isResetOtpSent && (isCheckingResetStatus || isResetAvailable === false))
                    }
                  >
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
                  <div className={authFieldClassName}>
                    <Label htmlFor="login-identifier">Email or Username</Label>
                    <Input
                      id="login-identifier"
                      type="text"
                      placeholder="you@example.com or username"
                      autoComplete="username"
                      value={identifier}
                      onChange={(event) => setIdentifier(event.target.value)}
                      required
                      className={authInputClassName}
                    />
                  </div>
                  <div className={authFieldClassName}>
                    <Label htmlFor="login-password">Password</Label>
                    <Input
                      id="login-password"
                      type="password"
                      placeholder="Enter your password"
                      autoComplete="current-password"
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      required
                      className={authInputClassName}
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
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Login;
