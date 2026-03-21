import { useCallback, useEffect, useState } from 'react';

type VisionTrainerLayoutOptions = {
  desktopEnabled: boolean;
  mobileActiveEnabled: boolean;
  baseBoardSize: number;
  basePanelWidth: number;
  baseGap: number;
  rightWidthDamping?: number;
  mobilePanelHeightEstimate?: number;
};

export type VisionTrainerLayoutModel = {
  boardSize: number;
  panelWidth: number;
  gap: number;
  panelPadding: number;
  sectionGap: number;
  mobileActiveBoardSize: number;
  mobileActiveGap: number;
  mobileActivePanelPadding: number;
  mobileActiveSectionGap: number;
};

type DesktopLayoutArgs = {
  availableWidth: number;
  availableHeight: number;
  baseBoardSize: number;
  basePanelWidth: number;
  baseGap: number;
  rightWidthDamping: number;
};

type MobileActiveLayoutArgs = {
  availableWidth: number;
  availableHeight: number;
  panelHeight: number;
};

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));
const roundPx = (value: number) => Math.round(value);

export const buildVisionTrainerDesktopLayout = ({
  availableWidth,
  availableHeight,
  baseBoardSize,
  basePanelWidth,
  baseGap,
  rightWidthDamping,
}: DesktopLayoutArgs) => {
  const safeWidth = Math.max(0, availableWidth);
  const safeHeight = Math.max(0, availableHeight);
  const heightScale = safeHeight / baseBoardSize;
  const widthScale =
    (safeWidth - baseGap - basePanelWidth * (1 - rightWidthDamping)) /
    (baseBoardSize + basePanelWidth * rightWidthDamping);
  const scale = clamp(Math.min(1, heightScale, widthScale), 0.52, 1);
  const boardSize = roundPx(baseBoardSize * scale);
  const panelWidth = roundPx(
    basePanelWidth * (1 - rightWidthDamping * (1 - scale)),
  );
  const gap = roundPx(clamp(baseGap * (0.78 + scale * 0.22), 18, baseGap));

  return {
    boardSize,
    panelWidth,
    gap,
    panelPadding: roundPx(clamp(panelWidth * 0.07, 18, 28)),
    sectionGap: roundPx(clamp(boardSize * 0.028, 14, 24)),
  };
};

export const buildVisionTrainerMobileActiveLayout = ({
  availableWidth,
  availableHeight,
  panelHeight,
}: MobileActiveLayoutArgs) => {
  const safeWidth = Math.max(0, availableWidth);
  const safeHeight = Math.max(0, availableHeight);
  const safePanelHeight = Math.max(0, panelHeight);
  const gap = roundPx(clamp(safeWidth * 0.035, 12, 18));
  const boardSize = roundPx(Math.max(0, Math.min(safeWidth, safeHeight - safePanelHeight - gap)));

  return {
    boardSize,
    gap,
    panelPadding: roundPx(clamp(Math.max(boardSize, 240) * 0.048, 14, 20)),
    sectionGap: roundPx(clamp(Math.max(boardSize, 240) * 0.03, 10, 16)),
  };
};

const buildDefaultLayout = (
  baseBoardSize: number,
  basePanelWidth: number,
  baseGap: number,
  mobilePanelHeightEstimate: number,
  rightWidthDamping: number,
): VisionTrainerLayoutModel => {
  const desktopLayout = buildVisionTrainerDesktopLayout({
    availableWidth: baseBoardSize + basePanelWidth + baseGap,
    availableHeight: baseBoardSize,
    baseBoardSize,
    basePanelWidth,
    baseGap,
    rightWidthDamping,
  });
  const mobileActiveLayout = buildVisionTrainerMobileActiveLayout({
    availableWidth: 390,
    availableHeight: 720,
    panelHeight: mobilePanelHeightEstimate,
  });

  return {
    ...desktopLayout,
    mobileActiveBoardSize: mobileActiveLayout.boardSize,
    mobileActiveGap: mobileActiveLayout.gap,
    mobileActivePanelPadding: mobileActiveLayout.panelPadding,
    mobileActiveSectionGap: mobileActiveLayout.sectionGap,
  };
};

export const useVisionTrainerLayout = ({
  desktopEnabled,
  mobileActiveEnabled,
  baseBoardSize,
  basePanelWidth,
  baseGap,
  rightWidthDamping = 0.3,
  mobilePanelHeightEstimate = 168,
}: VisionTrainerLayoutOptions) => {
  const [desktopContainerNode, setDesktopContainerNode] = useState<HTMLDivElement | null>(null);
  const [mobileShellNode, setMobileShellNode] = useState<HTMLDivElement | null>(null);
  const [mobilePanelNode, setMobilePanelNode] = useState<HTMLDivElement | null>(null);
  const [layout, setLayout] = useState<VisionTrainerLayoutModel>(() =>
    buildDefaultLayout(
      baseBoardSize,
      basePanelWidth,
      baseGap,
      mobilePanelHeightEstimate,
      rightWidthDamping,
    ),
  );

  const desktopContainerRef = useCallback((node: HTMLDivElement | null) => {
    setDesktopContainerNode(node);
  }, []);

  const mobileActiveShellRef = useCallback((node: HTMLDivElement | null) => {
    setMobileShellNode(node);
  }, []);

  const mobileActivePanelRef = useCallback((node: HTMLDivElement | null) => {
    setMobilePanelNode(node);
  }, []);

  useEffect(() => {
    if (!desktopEnabled || !desktopContainerNode) {
      return undefined;
    }

    const updateLayout = () => {
      const desktopLayout = buildVisionTrainerDesktopLayout({
        availableWidth: desktopContainerNode.clientWidth,
        availableHeight: desktopContainerNode.clientHeight,
        baseBoardSize,
        basePanelWidth,
        baseGap,
        rightWidthDamping,
      });

      setLayout((previousLayout) => ({
        ...previousLayout,
        ...desktopLayout,
      }));
    };

    updateLayout();

    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', updateLayout);
      return () => {
        window.removeEventListener('resize', updateLayout);
      };
    }

    const resizeObserver = new ResizeObserver(() => {
      updateLayout();
    });

    resizeObserver.observe(desktopContainerNode);
    window.addEventListener('resize', updateLayout);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', updateLayout);
    };
  }, [
    baseBoardSize,
    baseGap,
    basePanelWidth,
    desktopContainerNode,
    desktopEnabled,
    rightWidthDamping,
  ]);

  useEffect(() => {
    if (!mobileActiveEnabled || !mobileShellNode) {
      return undefined;
    }

    const updateLayout = () => {
      const mobileActiveLayout = buildVisionTrainerMobileActiveLayout({
        availableWidth: mobileShellNode.clientWidth,
        availableHeight: mobileShellNode.clientHeight,
        panelHeight: mobilePanelNode?.offsetHeight ?? mobilePanelHeightEstimate,
      });

      setLayout((previousLayout) => ({
        ...previousLayout,
        mobileActiveBoardSize: mobileActiveLayout.boardSize,
        mobileActiveGap: mobileActiveLayout.gap,
        mobileActivePanelPadding: mobileActiveLayout.panelPadding,
        mobileActiveSectionGap: mobileActiveLayout.sectionGap,
      }));
    };

    updateLayout();

    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', updateLayout);
      return () => {
        window.removeEventListener('resize', updateLayout);
      };
    }

    const resizeObserver = new ResizeObserver(() => {
      updateLayout();
    });

    resizeObserver.observe(mobileShellNode);

    if (mobilePanelNode) {
      resizeObserver.observe(mobilePanelNode);
    }

    window.addEventListener('resize', updateLayout);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', updateLayout);
    };
  }, [
    mobileActiveEnabled,
    mobilePanelHeightEstimate,
    mobilePanelNode,
    mobileShellNode,
  ]);

  return {
    desktopContainerRef,
    mobileActiveShellRef,
    mobileActivePanelRef,
    layout,
  };
};
