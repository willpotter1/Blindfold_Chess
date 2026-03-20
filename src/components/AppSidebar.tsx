import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import whitePawnLogo from '../../Visual/Whitepawn.png';

type AppSidebarProps = {
  onHomeClick?: () => void;
  desktopMode?: boolean;
};

const navButtonBaseClassName = 'border-2 border-[#d9b99b] bg-white text-black hover:bg-white/90';

export const AppSidebar = ({ onHomeClick, desktopMode = true }: AppSidebarProps) => {
  const buttonClassName = cn(navButtonBaseClassName, desktopMode ? 'md:w-full' : 'min-w-[96px] px-4 flex-1');

  return (
    <div
      className={cn(
        'mx-4 mt-4 w-auto rounded-2xl bg-[#d9b99b] p-4',
        desktopMode && 'md:mb-4 md:mr-0 md:h-[calc(100vh-2rem)] md:w-24 md:shrink-0',
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
            desktopMode ? 'md:mt-4 md:flex-col' : 'min-w-0 flex-1 flex-wrap items-center content-center justify-center',
          )}
        >
          <Button asChild type="button" className={buttonClassName}>
            <Link to="/puzzles">Puzzles</Link>
          </Button>
          <Button asChild type="button" className={buttonClassName}>
            <Link to="/account">Account</Link>
          </Button>
          <Button asChild type="button" className={buttonClassName}>
            <Link to="/games">Games</Link>
          </Button>
          <Button asChild type="button" className={buttonClassName}>
            <Link to="/about">About</Link>
          </Button>

          {!desktopMode && (
            <>
              <Button asChild type="button" className={buttonClassName}>
                <Link to="/login">Log In</Link>
              </Button>
              <Button asChild type="button" className={buttonClassName}>
                <Link to="/signup">Sign Up</Link>
              </Button>
            </>
          )}
        </div>

        {desktopMode && (
          <div className="flex gap-2 md:mt-auto md:flex-col">
            <Button asChild type="button" className={buttonClassName}>
              <Link to="/login">Log In</Link>
            </Button>
            <Button asChild type="button" className={buttonClassName}>
              <Link to="/signup">Sign Up</Link>
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};
