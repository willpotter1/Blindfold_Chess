import { useCallback, useEffect, useState } from 'react';

type DesktopFitLayoutOptions = {
  enabled: boolean;
  baseBoardSize: number;
  baseRightColumnWidth: number;
  baseGap: number;
  rightWidthDamping?: number;
};

export type DesktopFitLayoutModel = {
  boardSize: number;
  rightColumnWidth: number;
  rightColumnHeight: number;
  gap: number;
  scale: number;
};

const roundPx = (value: number) => Math.round(value);

const buildLayout = ({
  availableWidth,
  availableHeight,
  baseBoardSize,
  baseRightColumnWidth,
  baseGap,
  rightWidthDamping,
}: {
  availableWidth: number;
  availableHeight: number;
  baseBoardSize: number;
  baseRightColumnWidth: number;
  baseGap: number;
  rightWidthDamping: number;
}): DesktopFitLayoutModel => {
  const heightScale = availableHeight / baseBoardSize;
  const widthScale =
    (availableWidth - baseGap - baseRightColumnWidth * (1 - rightWidthDamping)) /
    (baseBoardSize + baseRightColumnWidth * rightWidthDamping);

  const scale = Math.max(0.58, Math.min(1, heightScale, widthScale));
  const boardSize = roundPx(baseBoardSize * scale);
  const rightColumnWidth = roundPx(
    baseRightColumnWidth * (1 - rightWidthDamping * (1 - scale)),
  );

  return {
    boardSize,
    rightColumnWidth,
    rightColumnHeight: boardSize,
    gap: baseGap,
    scale,
  };
};

export const useDesktopFitLayout = ({
  enabled,
  baseBoardSize,
  baseRightColumnWidth,
  baseGap,
  rightWidthDamping = 0.25,
}: DesktopFitLayoutOptions) => {
  const [containerNode, setContainerNode] = useState<HTMLDivElement | null>(null);
  const [layout, setLayout] = useState<DesktopFitLayoutModel>({
    boardSize: baseBoardSize,
    rightColumnWidth: baseRightColumnWidth,
    rightColumnHeight: baseBoardSize,
    gap: baseGap,
    scale: 1,
  });

  const containerRef = useCallback((node: HTMLDivElement | null) => {
    setContainerNode(node);
  }, []);

  useEffect(() => {
    if (!enabled || !containerNode) {
      setLayout({
        boardSize: baseBoardSize,
        rightColumnWidth: baseRightColumnWidth,
        rightColumnHeight: baseBoardSize,
        gap: baseGap,
        scale: 1,
      });
      return;
    }

    const updateLayout = () => {
      const nextLayout = buildLayout({
        availableWidth: containerNode.clientWidth,
        availableHeight: containerNode.clientHeight,
        baseBoardSize,
        baseRightColumnWidth,
        baseGap,
        rightWidthDamping,
      });

      setLayout(nextLayout);
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

    resizeObserver.observe(containerNode);
    window.addEventListener('resize', updateLayout);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', updateLayout);
    };
  }, [
    baseBoardSize,
    baseGap,
    baseRightColumnWidth,
    containerNode,
    enabled,
    rightWidthDamping,
  ]);

  return { containerRef, layout };
};
