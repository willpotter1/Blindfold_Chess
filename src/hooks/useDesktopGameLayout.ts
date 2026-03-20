import { useEffect, useState } from 'react';

const MIN_DESKTOP_VIEWPORT_WIDTH = 1200;

export const useDesktopGameLayout = () => {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const updateMatches = () => {
      setMatches(window.innerWidth >= MIN_DESKTOP_VIEWPORT_WIDTH);
    };

    updateMatches();
    window.addEventListener('resize', updateMatches);

    return () => {
      window.removeEventListener('resize', updateMatches);
    };
  }, []);

  return matches;
};
