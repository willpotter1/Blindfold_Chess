import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useAuth } from '@/lib/authContext';
import { supabase } from '@/lib/supabase';
import { Puzzle, Target, BookOpen, LogIn, LogOut, UserPlus, User, Menu, X, Swords } from 'lucide-react';
import whitePawnLogo from '../../Visual/Whitepawn.png';

type AppSidebarProps = {
  onHomeClick?: () => void;
  desktopMode?: boolean;
};

const NAV_ITEMS = [
  { path: '/puzzles', label: 'Puzzles', icon: Puzzle },
  { path: '/drills', label: 'Drills', icon: Target },
  { path: '/openings', label: 'Openings', icon: BookOpen },
] as const;

export const AppSidebar = ({
  onHomeClick,
  desktopMode = true,
}: AppSidebarProps) => {
  const { isAuthenticated, isLoaded: isAuthLoaded } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const location = useLocation();
  const navigate = useNavigate();

  const handleSignOut = useCallback(async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
    navigate('/');
  }, [navigate]);

  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  const openMenu = useCallback(() => {
    setIsMobileMenuOpen(true);
    setIsAnimating(true);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => setIsAnimating(false));
    });
  }, []);

  const closeMenu = useCallback(() => {
    setIsAnimating(true);
    const timeout = setTimeout(() => {
      setIsMobileMenuOpen(false);
      setIsAnimating(false);
    }, 300);
    return () => clearTimeout(timeout);
  }, []);

  const toggleMenu = useCallback(() => {
    if (isMobileMenuOpen) {
      closeMenu();
    } else {
      openMenu();
    }
  }, [isMobileMenuOpen, closeMenu, openMenu]);

  const isMenuVisible = isMobileMenuOpen;
  const isMenuRevealed = isMobileMenuOpen && !isAnimating;

  const isActive = (path: string) => location.pathname === path || location.pathname.startsWith(path + '/');

  return (
    <>
      {/* ── Desktop: vertical sidebar ── */}
      <div
        className={cn(
          'mx-4 mt-4 hidden w-auto rounded-2xl border border-border/50 bg-card p-2.5 shadow-theme-soft',
          'md:sticky md:top-4 md:mb-4 md:mr-0 md:block md:h-[calc(100vh-2rem)] md:w-20 md:shrink-0 md:self-start',
        )}
      >
        <div className="flex h-full flex-col items-center">
          {/* Logo */}
          <Link to="/" onClick={onHomeClick} className="mb-5 mt-2">
            <img src={whitePawnLogo} alt="Blindchess logo" className="h-9 w-9 object-contain" />
          </Link>

          {/* Nav items */}
          <nav className="flex w-full flex-col items-center gap-1.5 px-0.5">
            {NAV_ITEMS.map(({ path, label, icon: Icon }) => (
              <Link
                key={path}
                to={path}
                className={cn(
                  'flex w-full flex-col items-center gap-1 rounded-xl py-2.5 transition-colors',
                  isActive(path)
                    ? 'bg-secondary text-foreground'
                    : 'text-muted-foreground hover:bg-secondary/60 hover:text-foreground',
                )}
                title={label}
              >
                <Icon size={20} strokeWidth={1.75} />
                <span className="text-[0.6rem] font-medium leading-none">{label}</span>
              </Link>
            ))}
          </nav>

          {/* Bottom: auth */}
          <div
            className="mt-auto flex w-full flex-col items-center gap-1.5 px-0.5 transition-opacity duration-300"
            style={{ opacity: isAuthLoaded ? 1 : 0 }}
          >
            {!isAuthLoaded ? null : isAuthenticated ? (
              <>
                <Link
                  to="/account"
                  className={cn(
                    'flex w-full flex-col items-center gap-1 rounded-xl py-2.5 transition-colors',
                    isActive('/account')
                      ? 'bg-secondary text-foreground'
                      : 'text-muted-foreground hover:bg-secondary/60 hover:text-foreground',
                  )}
                  title="Account"
                >
                  <User size={20} strokeWidth={1.75} />
                  <span className="text-[0.6rem] font-medium leading-none">Account</span>
                </Link>
                <button
                  type="button"
                  className="flex w-full flex-col items-center gap-1 rounded-xl py-2.5 text-muted-foreground transition-colors hover:bg-secondary/60 hover:text-foreground"
                  title="Sign Out"
                  onClick={() => void handleSignOut()}
                >
                  <LogOut size={20} strokeWidth={1.75} />
                  <span className="text-[0.6rem] font-medium leading-none">Sign Out</span>
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  className={cn(
                    'flex w-full flex-col items-center gap-1 rounded-xl py-2.5 transition-colors',
                    isActive('/login')
                      ? 'bg-secondary text-foreground'
                      : 'text-muted-foreground hover:bg-secondary/60 hover:text-foreground',
                  )}
                  title="Log In"
                >
                  <LogIn size={20} strokeWidth={1.75} />
                  <span className="text-[0.6rem] font-medium leading-none">Log In</span>
                </Link>
                <Link
                  to="/signup"
                  className={cn(
                    'flex w-full flex-col items-center gap-1 rounded-xl border py-2.5 transition-colors',
                    isActive('/signup')
                      ? 'border-foreground/25 bg-secondary text-foreground'
                      : 'border-border/50 text-muted-foreground hover:border-foreground/20 hover:text-foreground',
                  )}
                  title="Sign Up"
                >
                  <UserPlus size={20} strokeWidth={1.75} />
                  <span className="text-[0.6rem] font-medium leading-none">Sign Up</span>
                </Link>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── Mobile: top navbar ── */}
      <div className="sticky top-0 z-40 w-full border-b border-border/50 bg-background md:hidden">
        <div className="flex h-14 items-center px-4">
          {/* Left: hamburger + logo */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="flex h-9 w-9 items-center justify-center rounded-lg text-foreground hover:bg-secondary"
              onClick={toggleMenu}
              aria-label="Toggle menu"
            >
              {isMobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
            <Link to="/" onClick={onHomeClick} className="flex items-center">
              <img src={whitePawnLogo} alt="Blindchess logo" className="h-7 w-7 object-contain" />
            </Link>
          </div>

          {/* Right: auth buttons */}
          <div
            className="ml-auto flex items-center gap-1.5 transition-opacity duration-300"
            style={{ opacity: isAuthLoaded ? 1 : 0 }}
          >
            {!isAuthLoaded || isAuthenticated ? null : (
              <>
                <Button asChild type="button" size="sm" className="h-7 rounded-md bg-transparent px-2.5 text-[0.7rem] text-muted-foreground hover:bg-secondary hover:text-foreground">
                  <Link to="/login">Log In</Link>
                </Button>
                <Button asChild type="button" size="sm" className="h-7 rounded-md border border-foreground/20 bg-transparent px-2.5 text-[0.7rem] text-foreground hover:bg-secondary">
                  <Link to="/signup">Sign Up</Link>
                </Button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── Mobile: animated side panel + backdrop ── */}
      {isMenuVisible && (
        <div className="fixed inset-0 z-30 md:hidden">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-background/50 transition-all duration-300 ease-out"
            style={{
              opacity: isMenuRevealed ? 1 : 0,
              backdropFilter: isMenuRevealed ? 'blur(6px)' : 'blur(0px)',
              WebkitBackdropFilter: isMenuRevealed ? 'blur(6px)' : 'blur(0px)',
            }}
            onClick={closeMenu}
          />

          {/* Panel */}
          <div
            ref={panelRef}
            className="absolute left-0 top-14 flex flex-col border-r border-border/50 bg-card shadow-theme-strong transition-transform duration-300 ease-out"
            style={{
              width: '16.5rem',
              height: 'calc(100vh - 3.5rem)',
              transform: isMenuRevealed ? 'translateX(0)' : 'translateX(-100%)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Nav links */}
            <nav className="flex flex-col gap-0.5 p-3 pt-4">
              <p className="mb-2 px-3 text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground/60">
                Training
              </p>
              <Link
                to="/"
                className={cn(
                  'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
                  location.pathname === '/' || location.pathname.startsWith('/game')
                    ? 'bg-secondary text-foreground'
                    : 'text-muted-foreground hover:bg-secondary/60 hover:text-foreground',
                )}
                onClick={closeMenu}
              >
                <Swords size={16} strokeWidth={1.75} />
                Game
              </Link>
              {NAV_ITEMS.map(({ path, label, icon: Icon }) => (
                <Link
                  key={path}
                  to={path}
                  className={cn(
                    'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
                    isActive(path)
                      ? 'bg-secondary text-foreground'
                      : 'text-muted-foreground hover:bg-secondary/60 hover:text-foreground',
                  )}
                  onClick={closeMenu}
                >
                  <Icon size={16} strokeWidth={1.75} />
                  {label}
                </Link>
              ))}
            </nav>

            {/* Account section — only when signed in */}
            {isAuthLoaded && isAuthenticated && (
              <>
                <div className="mx-3 my-2 h-px bg-border/50" />
                <div className="flex flex-col gap-0.5 p-3">
                  <p className="mb-2 px-3 text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground/60">
                    Account
                  </p>
                  <Link
                    to="/account"
                    className={cn(
                      'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
                      isActive('/account')
                        ? 'bg-secondary text-foreground'
                        : 'text-muted-foreground hover:bg-secondary/60 hover:text-foreground',
                    )}
                    onClick={closeMenu}
                  >
                    <User size={16} strokeWidth={1.75} />
                    Account
                  </Link>
                  <button
                    type="button"
                    className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary/60 hover:text-foreground"
                    onClick={() => {
                      closeMenu();
                      void handleSignOut();
                    }}
                  >
                    <LogOut size={16} strokeWidth={1.75} />
                    Log Out
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
};
