import { FormEvent, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { collection, getDocs, limit, query, where } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { getFirebaseAuth, getFirestoreDb, hasFirebaseConfig } from '@/lib/firebase';

const Login = () => {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

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

  return (
    <div className="min-h-screen bg-white md:flex">
      <div className="w-full border-b bg-zinc-600 p-4 md:h-screen md:w-24 md:shrink-0 md:border-b-0 md:border-r">
        <div className="flex items-center justify-between md:h-full md:flex-col md:items-stretch md:justify-start">
          <Link to="/" className="md:self-center">
            <img
              src="/BBpawn.png"
              alt="BBpawn logo"
              className="h-14 w-14 object-contain md:h-20 md:w-20"
            />
          </Link>
          <div className="flex gap-2 md:mt-4 md:flex-col">
            <Button asChild type="button" className="md:w-full">
              <Link to="/account">Account</Link>
            </Button>
            <Button asChild type="button" className="md:w-full">
              <Link to="/games">Games</Link>
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
            <CardTitle>Login</CardTitle>
            <CardDescription>Sign in with your email or username and password.</CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={handleLogin}>
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
