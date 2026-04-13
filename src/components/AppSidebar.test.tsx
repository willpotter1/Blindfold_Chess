import type { AnchorHTMLAttributes, ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { AppSidebar } from './AppSidebar';

vi.mock('react-router-dom', () => ({
  Link: ({ children, to, ...props }: { children: ReactNode; to: string } & AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a href={to} {...props}>
      {children}
    </a>
  ),
  useLocation: () => ({ pathname: '/', search: '', hash: '', state: null, key: 'default' }),
}));

const renderSidebar = (desktopMode = true) => renderToStaticMarkup(<AppSidebar desktopMode={desktopMode} />);

describe('AppSidebar', () => {
  it('renders a desktop sidebar hidden on mobile and a mobile top navbar hidden on desktop', () => {
    const markup = renderSidebar();

    // Desktop sidebar is present with sticky positioning
    expect(markup).toContain('md:sticky md:top-4 md:mb-4 md:mr-0');
    expect(markup).toContain('md:block');
    expect(markup).toContain('hidden');

    // Mobile top navbar is present
    expect(markup).toContain('sticky top-0 z-40');
    expect(markup).toContain('md:hidden');

    // Nav links exist
    expect(markup).toContain('Puzzles');
    expect(markup).toContain('Drills');
    expect(markup).toContain('Openings');

    // Auth buttons exist
    expect(markup).toContain('Log In');
    expect(markup).toContain('Sign Up');
  });

  it('renders both desktop and mobile nav when desktop mode is disabled', () => {
    const markup = renderSidebar(false);

    // Mobile top navbar is still present
    expect(markup).toContain('sticky top-0 z-40');
    expect(markup).toContain('md:hidden');

    // Nav links still render
    expect(markup).toContain('Puzzles');
    expect(markup).toContain('Drills');
    expect(markup).toContain('Openings');
  });
});
