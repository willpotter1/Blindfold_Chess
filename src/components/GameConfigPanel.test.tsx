import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { GameConfigPanel } from './GameConfigPanel';

describe('GameConfigPanel', () => {
  it('shows computer-only fields in computer mode', () => {
    const markup = renderToStaticMarkup(
      <GameConfigPanel
        mode="computer"
        onStartGame={() => undefined}
        isGameActive={false}
      />
    );

    expect(markup).toContain('Play As');
    expect(markup).toContain('Engine Elo');
    expect(markup).toContain('Board Reveal Frequency');
  });

  it('hides computer-only fields in pass-and-play mode', () => {
    const markup = renderToStaticMarkup(
      <GameConfigPanel
        mode="pass-n-play"
        onStartGame={() => undefined}
        isGameActive={false}
      />
    );

    expect(markup).not.toContain('Play As');
    expect(markup).not.toContain('Engine Elo');
    expect(markup).toContain('Board Reveal Frequency');
  });
});
