import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import whitePawnLogo from '../../Visual/Whitepawn.png';

type AppSidebarProps = {
  onHomeClick?: () => void;
  desktopMode?: boolean;
};

const navButtonBaseClassName = 'border-transparent bg-transparent text-primary hover:bg-surface-white/85 hover:text-primary';

export const AppSidebar = ({ onHomeClick, desktopMode = true }: AppSidebarProps) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const buttonClassName = cn(navButtonBaseClassName, desktopMode ? 'md:w-full' : 'min-w-[96px] px-4 flex-1');

  useEffect(() => {
    if (!supabase) {
      setIsAuthenticated(false);
      return;
    }

    void supabase.auth.getSession().then(({ data, error }) => {
      if (error) {
        console.error('Failed to load current session:', error);
        return;
      }

      setIsAuthenticated(Boolean(data.session?.user));
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsAuthenticated(Boolean(session?.user));
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return (
    <div
      className={cn(
        'mx-4 mt-4 w-auto rounded-[28px] bg-paper-grain p-4 shadow-theme-strong',
        desktopMode && 'md:sticky md:top-4 md:mb-4 md:mr-0 md:h-[calc(100vh-2rem)] md:w-28 md:shrink-0 md:self-start',
      )}
    >
      <div
        className={cn(
          'flex items-center',
          desktopMode ? 'md:h-full md:flex-col md:items-stretch md:justify-start' : 'gap-4',
        )}
      >
        <Link
          to="/"
          onClick={onHomeClick}
          className={cn(desktopMode ? 'md:self-center' : 'flex h-full min-h-[72px] shrink-0 items-center self-stretch')}
        >
          <img
            src={whitePawnLogo}
            alt="White pawn logo"
            className={cn('h-14 w-14 object-contain', desktopMode ? 'md:h-20 md:w-20' : 'h-12 w-12')}
          />
        </Link>

        <div
          className={cn(
            'flex gap-2',
            desktopMode ? 'md:mt-6 md:flex-col' : 'min-w-0 flex-1 flex-wrap items-center content-center justify-center',
          )}
        >
          <Button asChild type="button" className={buttonClassName}>
            <Link to="/puzzles">Puzzles</Link>
          </Button>
          <Button asChild type="button" className={buttonClassName}>
            <Link to="/drills">Drills</Link>
          </Button>
          <Button asChild type="button" className={buttonClassName}>
            <Link to="/openings">Openings</Link>
          </Button>
          <Button asChild type="button" className={buttonClassName}>
            <Link to="/about">About</Link>
          </Button>

          {!desktopMode && (
            <>
              <Button asChild type="button" className={buttonClassName}>
                <Link to={isAuthenticated ? '/account' : '/login'}>{isAuthenticated ? 'Account' : 'Log In'}</Link>
              </Button>
            </>
          )}
        </div>

        {desktopMode && (
          <div className="flex gap-2 md:mt-auto md:flex-col">
            <Button asChild type="button" className={buttonClassName}>
              <Link to={isAuthenticated ? '/account' : '/login'}>{isAuthenticated ? 'Account' : 'Log In'}</Link>
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};
