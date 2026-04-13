import { AppSidebar } from '@/components/AppSidebar';
import pawnsPlayingImage from '../../../Visual/BBpawnsplaying2.png';

const About = () => {
  return (
    <div className="bg-background min-h-screen md:flex">
      <AppSidebar />
      <div className="container mx-auto flex items-center px-4 py-10 md:flex-1">
        <div className="mx-auto w-full max-w-4xl p-2 text-center">
          <h1 className="text-4xl font-bold text-foreground md:text-5xl">Coming Soon!</h1>
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
