import { useEffect, useRef, useState } from 'react';

const QUOTES = [
  { text: 'Calculation is visualization.', author: 'Garry Kasparov' },
  { text: 'Chess is the gymnasium of the mind.', author: 'Blaise Pascal' },
  { text: 'The ability to play chess is the sign of a gentleman.', author: 'Life Magazine, 1972' },
  { text: 'In chess, as in life, forethought wins.', author: 'Charles Buxton' },
  { text: 'Every chess master was once a beginner.', author: 'Irving Chernev' },
  { text: 'You must take your opponent into a deep dark forest where 2+2=5.', author: 'Mikhail Tal' },
  { text: 'Chess is imagination.', author: 'David Bronstein' },
  { text: 'When you see a good move, look for a better one.', author: 'Emanuel Lasker' },
  { text: 'The pawns are the soul of chess.', author: 'Francois-Andre Philidor' },
  { text: 'Chess is everything: art, science, and sport.', author: 'Anatoly Karpov' },
  { text: 'Chess demands total concentration.', author: 'Bobby Fischer' },
  { text: 'I see only one move ahead, but it is always the correct one.', author: 'Jose Raul Capablanca' },
] as const;

const INTERVAL_MS = 8000;
const EXIT_MS = 300;
const ENTER_MS = 450;

export const RotatingQuote = () => {
  const [index, setIndex] = useState(() => Math.floor(Math.random() * QUOTES.length));
  const [phase, setPhase] = useState<'visible' | 'exiting' | 'entering'>('visible');
  const prefersReducedMotion = useRef(false);

  useEffect(() => {
    prefersReducedMotion.current = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      if (prefersReducedMotion.current) {
        setIndex((prev) => (prev + 1) % QUOTES.length);
        return;
      }

      setPhase('exiting');

      setTimeout(() => {
        setIndex((prev) => (prev + 1) % QUOTES.length);
        setPhase('entering');

        setTimeout(() => {
          setPhase('visible');
        }, ENTER_MS);
      }, EXIT_MS);
    }, INTERVAL_MS);

    return () => clearInterval(interval);
  }, []);

  const quote = QUOTES[index];

  const contentStyle: React.CSSProperties = phase === 'exiting'
    ? {
        opacity: 0,
        transform: 'translateY(-6px)',
        transition: `opacity ${EXIT_MS}ms cubic-bezier(0.25, 1, 0.5, 1), transform ${EXIT_MS}ms cubic-bezier(0.25, 1, 0.5, 1)`,
      }
    : phase === 'entering'
      ? {
          opacity: 1,
          transform: 'translateY(0)',
          transition: `opacity ${ENTER_MS}ms cubic-bezier(0.16, 1, 0.3, 1), transform ${ENTER_MS}ms cubic-bezier(0.16, 1, 0.3, 1)`,
        }
      : {
          opacity: 1,
          transform: 'translateY(0)',
        };

  const initialStyle: React.CSSProperties = phase === 'entering'
    ? { opacity: 0, transform: 'translateY(6px)' }
    : {};

  // On entering, we need to start from the offset position then animate to final
  // We use a ref trick: set initial state, then requestAnimationFrame to target state
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (phase !== 'entering' || !contentRef.current) return;

    const el = contentRef.current;
    // Force the starting position
    el.style.opacity = '0';
    el.style.transform = 'translateY(6px)';
    el.style.transition = 'none';

    // Next frame: apply the target with transition
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        el.style.opacity = '1';
        el.style.transform = 'translateY(0)';
        el.style.transition = `opacity ${ENTER_MS}ms cubic-bezier(0.16, 1, 0.3, 1), transform ${ENTER_MS}ms cubic-bezier(0.16, 1, 0.3, 1)`;
      });
    });
  }, [phase]);

  return (
    <blockquote className="border-l-2 border-muted-foreground/20 pl-4">
      <div
        ref={contentRef}
        style={phase === 'exiting' ? contentStyle : phase === 'visible' ? contentStyle : initialStyle}
      >
        <p className="text-sm italic leading-relaxed text-muted-foreground">
          &ldquo;{quote.text}&rdquo;
        </p>
        <footer className="mt-1.5 text-xs font-medium text-muted-foreground/50">
          {quote.author}
        </footer>
      </div>
    </blockquote>
  );
};
