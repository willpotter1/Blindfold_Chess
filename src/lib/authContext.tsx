import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { supabase } from '@/lib/supabase';

type AuthState = {
  isAuthenticated: boolean;
  isLoaded: boolean;
};

const AuthContext = createContext<AuthState>({ isAuthenticated: false, isLoaded: !supabase });

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoaded, setIsLoaded] = useState(!supabase);

  useEffect(() => {
    if (!supabase) {
      setIsAuthenticated(false);
      setIsLoaded(true);
      return;
    }

    void supabase.auth.getSession().then(({ data, error }) => {
      if (!error) {
        setIsAuthenticated(Boolean(data.session?.user));
      }
      setIsLoaded(true);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsAuthenticated(Boolean(session?.user));
      setIsLoaded(true);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return (
    <AuthContext.Provider value={{ isAuthenticated, isLoaded }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
