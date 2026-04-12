import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import whitePawnLogo from '../../Visual/Whitepawn.png';

type AppSidebarProps = {
  onHomeClick?: () => void;
  desktopMode?: boolean;
  mobilePortraitBottomBar?: boolean;
};

const navButtonBaseClassName = 'border-transparent bg-transparent text-primary hover:bg-surface-white/85 hover:text-primary';

export const AppSidebar = ({
  onHomeClick,
  desktopMode = true,
  mobilePortraitBottomBar = true,
}: AppSidebarProps) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const buttonClassName = cn(
    navButtonBaseClassName,
    desktopMode
      ? 'md:w-full [@media(max-width:767px)]:w-full [@media(max-width:767px)]:min-w-0 [@media(max-width:767px)]:px-2 [@media(max-width:767px)]:text-[0.72rem]'
      : 'w-full min-w-0 px-2 text-[0.72rem]',
  );

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
        'mx-4 mt-4 w-auto rounded-[28px] bg-paper-grain-top p-4 shadow-theme-strong',
        desktopMode
          ? 'md:sticky md:top-4 md:mb-4 md:mr-0 md:h-[calc(100vh-2rem)] md:w-28 md:shrink-0 md:self-start [@media(max-width:767px)]:fixed [@media(max-width:767px)]:inset-x-0 [@media(max-width:767px)]:bottom-0 [@media(max-width:767px)]:z-40 [@media(max-width:767px)]:m-0 [@media(max-width:767px)]:w-screen [@media(max-width:767px)]:rounded-none [@media(max-width:767px)]:border-t-2 [@media(max-width:767px)]:border-border [@media(max-width:767px)]:bg-background [@media(max-width:767px)]:px-3 [@media(max-width:767px)]:pt-3 [@media(max-width:767px)]:pb-[calc(0.75rem+env(safe-area-inset-bottom))] [@media(max-width:767px)]:shadow-[0_-10px_28px_rgba(0,0,0,0.16)]'
          : mobilePortraitBottomBar && 'fixed inset-x-0 bottom-0 z-40 m-0 w-screen rounded-none border-t-2 border-border bg-background px-3 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] shadow-[0_-10px_28px_rgba(0,0,0,0.16)]',
      )}
    >
      <div
        className={cn(
          'flex items-center',
          desktopMode
            ? 'md:h-full md:flex-col md:items-stretch md:justify-start [@media(max-width:767px)]:grid [@media(max-width:767px)]:grid-cols-[auto_minmax(0,1fr)] [@media(max-width:767px)]:gap-3'
            : 'grid w-full grid-cols-[auto_minmax(0,1fr)] gap-3',
        )}
      >
        <Link
          to="/"
          onClick={onHomeClick}
          className={cn(
            desktopMode
              ? 'md:self-center [@media(max-width:767px)]:flex [@media(max-width:767px)]:min-h-0 [@media(max-width:767px)]:shrink-0 [@media(max-width:767px)]:items-center [@media(max-width:767px)]:self-center'
              : 'flex min-h-0 shrink-0 items-center self-center',
          )}
        >
          <img
            src={whitePawnLogo}
            alt="White pawn logo"
            className={cn(
              'object-contain',
              desktopMode ? 'md:h-20 md:w-20 [@media(max-width:767px)]:h-10 [@media(max-width:767px)]:w-10' : 'h-10 w-10',
            )}
          />
        </Link>

        <div
          className={cn(
            'flex gap-2',
            desktopMode
              ? 'md:mt-6 md:flex-col [@media(max-width:767px)]:min-w-0 [@media(max-width:767px)]:flex-1 [@media(max-width:767px)]:grid [@media(max-width:767px)]:grid-cols-4 [@media(max-width:767px)]:gap-2 [@media(max-width:767px)]:items-stretch [@media(max-width:767px)]:justify-stretch'
              : 'min-w-0 flex-1 grid grid-cols-4 items-stretch justify-stretch gap-2',
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

          {!desktopMode && (
            <Button asChild type="button" className={buttonClassName}>
              <Link to={isAuthenticated ? '/account' : '/login'}>{isAuthenticated ? 'Account' : 'Log In'}</Link>
            </Button>
          )}

          {desktopMode && (
            <Button asChild type="button" className={cn(buttonClassName, 'md:hidden')}>
              <Link to={isAuthenticated ? '/account' : '/login'}>{isAuthenticated ? 'Account' : 'Log In'}</Link>
            </Button>
          )}
        </div>

        {desktopMode && (
          <div className="hidden gap-2 md:mt-auto md:flex md:flex-col">
            <Button asChild type="button" className={buttonClassName}>
              <Link to={isAuthenticated ? '/account' : '/login'}>{isAuthenticated ? 'Account' : 'Log In'}</Link>
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};
