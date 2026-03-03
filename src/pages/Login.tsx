import { FormEvent, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { getFirebaseAuth, hasFirebaseConfig } from '@/lib/firebase';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

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
        description: 'Check your email and password and try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoggingIn(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#303030] md:flex">
      <div className="w-full border-b bg-[#000000] p-4 md:h-screen md:w-24 md:shrink-0 md:border-b-0 md:border-r">
        <div className="flex items-center justify-between md:h-full md:flex-col md:items-stretch">
          <Link to="/" className="md:self-center">
            <img
              src="/Blindchess_logo.png"
              alt="Blindchess logo"
              className="h-14 w-14 object-contain md:h-20 md:w-20"
            />
          </Link>
          <div className="flex gap-2 md:flex-col">
            <Button asChild type="button" variant="default" className="md:w-full">
              <Link to="/login">Log In</Link>
            </Button>
            <Button asChild type="button" variant="outline" className="md:w-full">
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
            <CardTitle>Login</CardTitle>
            <CardDescription>Sign in with your email and password.</CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={handleLogin}>
              <div className="space-y-2">
                <Label htmlFor="login-email">Email</Label>
                <Input
                  id="login-email"
                  type="email"
                  placeholder="you@example.com"
                  autoComplete="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
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
              <Button type="submit" className="w-full" disabled={isLoggingIn}>
                {isLoggingIn ? 'Logging in...' : 'Login'}
              </Button>
            </form>
            <p className="mt-4 text-center text-sm text-muted-foreground">
              Need an account?{' '}
              <Link to="/signup" className="underline underline-offset-4">
                Sign up
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Login;
