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
}));

const renderSidebar = (desktopMode = true) => renderToStaticMarkup(<AppSidebar desktopMode={desktopMode} />);

describe('AppSidebar', () => {
  it('switches the desktop sidebar between stacked and bottom-bar classes at the 768px breakpoint', () => {
    const markup = renderSidebar();

    expect(markup).toContain('md:sticky md:top-4 md:mb-4 md:mr-0 md:h-[calc(100vh-2rem)] md:w-28 md:shrink-0 md:self-start');
    expect(markup).toContain('[@media(max-width:767px)]:fixed [@media(max-width:767px)]:inset-x-0 [@media(max-width:767px)]:bottom-0');
    expect(markup).toContain('flex gap-2 md:mt-6 md:flex-col [@media(max-width:767px)]:min-w-0 [@media(max-width:767px)]:flex-1 [@media(max-width:767px)]:grid [@media(max-width:767px)]:grid-cols-4');
  });

  it('renders a bottom bar directly when desktop mode is disabled', () => {
    const markup = renderSidebar(false);

    expect(markup).toContain('fixed inset-x-0 bottom-0 z-40 m-0 w-screen rounded-none');
    expect(markup).toContain('grid w-full grid-cols-[auto_minmax(0,1fr)] gap-3');
    expect(markup).toContain('min-w-0 flex-1 grid grid-cols-4 items-stretch justify-stretch gap-2');
  });
});
