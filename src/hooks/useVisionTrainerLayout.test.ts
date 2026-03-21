import { describe, expect, it } from 'vitest';
import {
  buildVisionTrainerDesktopLayout,
  buildVisionTrainerMobileActiveLayout,
} from './useVisionTrainerLayout';

describe('useVisionTrainerLayout sizing helpers', () => {
  it('returns a desktop layout without a forced panel height contract', () => {
    const layout = buildVisionTrainerDesktopLayout({
      availableWidth: 1220,
      availableHeight: 760,
      baseBoardSize: 760,
      basePanelWidth: 360,
      baseGap: 32,
      rightWidthDamping: 0.3,
    });

    expect(layout.boardSize).toBeGreaterThan(0);
    expect(layout.panelWidth).toBeGreaterThan(0);
  });

  it('scales board, panel, and gap down together as space tightens', () => {
    const spaciousLayout = buildVisionTrainerDesktopLayout({
      availableWidth: 1500,
      availableHeight: 820,
      baseBoardSize: 760,
      basePanelWidth: 360,
      baseGap: 32,
      rightWidthDamping: 0.3,
    });
    const compactLayout = buildVisionTrainerDesktopLayout({
      availableWidth: 1080,
      availableHeight: 660,
      baseBoardSize: 760,
      basePanelWidth: 360,
      baseGap: 32,
      rightWidthDamping: 0.3,
    });

    expect(compactLayout.boardSize).toBeLessThan(spaciousLayout.boardSize);
    expect(compactLayout.panelWidth).toBeLessThan(spaciousLayout.panelWidth);
    expect(compactLayout.gap).toBeLessThanOrEqual(spaciousLayout.gap);
  });

  it('sizes the mobile active board to fit above the prompt panel', () => {
    const panelHeight = 156;
    const layout = buildVisionTrainerMobileActiveLayout({
      availableWidth: 390,
      availableHeight: 700,
      panelHeight,
    });

    expect(layout.boardSize + layout.gap + panelHeight).toBeLessThanOrEqual(700);
  });
});
