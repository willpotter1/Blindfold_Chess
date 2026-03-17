import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import pawnsPlayingImage from '../../Visual/BBpawnsplaying2.png';
import emptyBoardIcon from '../../Visual/emptyboard3.png';
import whitePawnLogo from '../../Visual/Whitepawn.png';

const gamesButtonClassName = 'h-auto border-0 bg-transparent px-0 py-1 text-white shadow-none hover:bg-transparent md:w-full';

const About = () => {
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
            <Button asChild type="button" className="md:w-full">
              <Link to="/account">Account</Link>
            </Button>
            <Button asChild type="button" className={gamesButtonClassName}>
              <Link to="/games" className="flex items-center justify-start gap-3">
                <img src={emptyBoardIcon} alt="" aria-hidden="true" className="h-9 w-9 object-contain" />
                <span className="text-lg font-bold">Games</span>
              </Link>
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

      <div className="container mx-auto flex items-center px-4 py-10 md:flex-1">
        <div className="mx-auto w-full max-w-4xl p-2 text-center">
          <h1 className="text-4xl font-bold text-black md:text-5xl">Coming Soon!</h1>
          <img
            src={pawnsPlayingImage}
            alt="Pawns playing chess"
            className="mx-auto mt-6 w-full max-w-3xl rounded-lg object-contain"
          />
        </div>
      </div>
    </div>
  );
};

export default About;
