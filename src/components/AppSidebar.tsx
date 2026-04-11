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
    'min-w-[96px] px-4 flex-1',
    desktopMode && 'md:w-full md:min-w-0',
    mobilePortraitBottomBar && '[@media(max-width:639px)_and_(orientation:portrait)]:min-w-0 [@media(max-width:639px)_and_(orientation:portrait)]:px-2 [@media(max-width:639px)_and_(orientation:portrait)]:text-[0.72rem]',
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
        'mx-4 mt-4 w-auto rounded-[28px] bg-background p-4 shadow-theme-strong',
        desktopMode && 'md:sticky md:top-4 md:mb-4 md:mr-0 md:h-[calc(100vh-2rem)] md:w-28 md:shrink-0 md:self-start',
        mobilePortraitBottomBar && '[@media(max-width:639px)_and_(orientation:portrait)]:fixed [@media(max-width:639px)_and_(orientation:portrait)]:inset-x-0 [@media(max-width:639px)_and_(orientation:portrait)]:bottom-0 [@media(max-width:639px)_and_(orientation:portrait)]:z-40 [@media(max-width:639px)_and_(orientation:portrait)]:m-0 [@media(max-width:639px)_and_(orientation:portrait)]:w-screen [@media(max-width:639px)_and_(orientation:portrait)]:rounded-none [@media(max-width:639px)_and_(orientation:portrait)]:border-t-2 [@media(max-width:639px)_and_(orientation:portrait)]:border-border [@media(max-width:639px)_and_(orientation:portrait)]:px-3 [@media(max-width:639px)_and_(orientation:portrait)]:pt-3 [@media(max-width:639px)_and_(orientation:portrait)]:pb-[calc(0.75rem+env(safe-area-inset-bottom))] [@media(max-width:639px)_and_(orientation:portrait)]:shadow-[0_-10px_28px_rgba(0,0,0,0.16)]',
      )}
    >
      <div
        className={cn(
          'flex items-center gap-4',
          desktopMode && 'md:h-full md:flex-col md:items-stretch md:justify-start',
          mobilePortraitBottomBar && '[@media(max-width:639px)_and_(orientation:portrait)]:grid [@media(max-width:639px)_and_(orientation:portrait)]:grid-cols-[auto_minmax(0,1fr)] [@media(max-width:639px)_and_(orientation:portrait)]:gap-3',
        )}
      >
        <Link
          to="/"
          onClick={onHomeClick}
          className={cn(
            'flex h-full min-h-[72px] shrink-0 items-center self-stretch',
            desktopMode && 'md:self-center',
            mobilePortraitBottomBar && '[@media(max-width:639px)_and_(orientation:portrait)]:min-h-0 [@media(max-width:639px)_and_(orientation:portrait)]:self-center',
          )}
        >
          <img
            src={whitePawnLogo}
            alt="White pawn logo"
            className={cn(
              'h-14 w-14 object-contain',
              desktopMode ? 'md:h-20 md:w-20' : 'h-12 w-12',
              mobilePortraitBottomBar && '[@media(max-width:639px)_and_(orientation:portrait)]:h-10 [@media(max-width:639px)_and_(orientation:portrait)]:w-10',
            )}
          />
        </Link>

        <div
          className={cn(
            'min-w-0 flex-1 flex-wrap items-center content-center justify-center gap-2',
            desktopMode && 'md:mt-6 md:flex-col',
            mobilePortraitBottomBar && '[@media(max-width:639px)_and_(orientation:portrait)]:grid [@media(max-width:639px)_and_(orientation:portrait)]:grid-cols-4 [@media(max-width:639px)_and_(orientation:portrait)]:gap-2 [@media(max-width:639px)_and_(orientation:portrait)]:items-stretch [@media(max-width:639px)_and_(orientation:portrait)]:justify-stretch',
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

          <Button asChild type="button" className={cn(buttonClassName, desktopMode && 'md:hidden')}>
            <Link to={isAuthenticated ? '/account' : '/login'}>{isAuthenticated ? 'Account' : 'Log In'}</Link>
          </Button>
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
