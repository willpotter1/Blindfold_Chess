import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import emptyBoardIcon from '../../Visual/emptyboard3.png';
import whitePawnLogo from '../../Visual/Whitepawn.png';

type AccountLayoutProps = {
  children: React.ReactNode;
};

const navButtonClassName = 'border-2 border-[#d9b99b] bg-white text-black hover:bg-white/90 md:w-full';
const gamesButtonClassName = 'h-auto border-0 bg-transparent px-0 py-1 text-white shadow-none hover:bg-transparent md:w-full';

export const AccountLayout = ({ children }: AccountLayoutProps) => {
  return (
    <div className="min-h-screen bg-white md:flex">
      <div className="mx-4 mt-4 w-auto rounded-2xl bg-[#d9b99b] p-4 md:mb-4 md:mr-0 md:h-[calc(100vh-2rem)] md:w-44 md:shrink-0">
        <div className="flex items-center justify-between md:h-full md:flex-col md:items-stretch md:justify-start">
          <Link to="/" className="md:self-center">
            <img
              src={whitePawnLogo}
              alt="White pawn logo"
              className="h-14 w-14 object-contain md:h-20 md:w-20"
            />
          </Link>
          <div className="flex gap-2 md:mt-4 md:flex-col">
            <Button asChild type="button" className={navButtonClassName}>
              <Link to="/account">Account</Link>
            </Button>
            <Button asChild type="button" className={gamesButtonClassName}>
              <Link to="/games" className="flex items-center justify-start gap-3">
                <img src={emptyBoardIcon} alt="" aria-hidden="true" className="h-9 w-9 object-contain" />
                <span className="text-lg font-bold">Games</span>
              </Link>
            </Button>
            <Button asChild type="button" className={navButtonClassName}>
              <Link to="/about">Puzzles</Link>
            </Button>
            <Button asChild type="button" className={navButtonClassName}>
              <Link to="/about">Openings</Link>
            </Button>
            <Button asChild type="button" className={navButtonClassName}>
              <Link to="/about">About</Link>
            </Button>
          </div>
          <div className="flex gap-2 md:mt-auto md:flex-col">
            <Button asChild type="button" className={navButtonClassName}>
              <Link to="/login">Log In</Link>
            </Button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-10 md:flex-1">{children}</div>
    </div>
  );
};
