import type { ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useDesktopGameLayout } from '@/hooks/useDesktopGameLayout';
import { useOpeningTrainerState } from '@/hooks/useOpeningTrainerState';
import Openings from './Openings';

vi.mock('@/hooks/useOpeningTrainerState', () => ({
  useOpeningTrainerState: vi.fn(),
}));

vi.mock('@/hooks/useDesktopGameLayout', () => ({
  useDesktopGameLayout: vi.fn(),
}));

vi.mock('@/hooks/useDesktopFitLayout', () => ({
  useDesktopFitLayout: () => ({
    containerRef: { current: null },
    layout: {
      boardSize: 760,
      rightColumnWidth: 460,
      rightColumnHeight: 760,
      gap: 32,
      scale: 1,
    },
  }),
}));

vi.mock('@/components/AppSidebar', () => ({
  AppSidebar: () => <div data-testid="sidebar" />,
}));

vi.mock('@/components/SeoHead', () => ({
  default: () => null,
}));

vi.mock('@/components/BlindfoldBoard', () => ({
  BlindfoldBoard: () => <div data-testid="blindfold-board" />,
}));

vi.mock('@/components/OpeningsConfigPanel', () => ({
  OpeningsConfigPanel: () => <div data-testid="openings-config-panel" />,
}));

vi.mock('@/components/OpeningsActivePanel', () => ({
  OpeningsActivePanel: () => <div data-testid="openings-active-panel" />,
}));

vi.mock('@/components/OpeningsResultsPanel', () => ({
  OpeningsResultsPanel: () => <div data-testid="openings-results-panel" />,
}));

vi.mock('@/components/MoveInput', () => ({
  MoveInput: () => <div data-testid="move-input" />,
}));

vi.mock('@/components/MoveList', () => ({
  MoveList: () => <div data-testid="move-list" />,
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({ children }: { children: ReactNode }) => <button type="button">{children}</button>,
}));

const useOpeningTrainerStateMock = vi.mocked(useOpeningTrainerState);
const useDesktopGameLayoutMock = vi.mocked(useDesktopGameLayout);

const createHookValue = (phase: 'config' | 'session' | 'results') => ({
  phase,
  config: {
    selectedFamilyNames: [],
    selectedLineIds: [],
    playerColor: 'white' as const,
    depthPlayerMoves: 1,
    revealEvery: 3,
    allowCheats: true,
    hideMoveHistory: false,
  },
  lookup: {
    families: [],
    lines: [],
  },
  round: phase === 'config' ? null : {
    currentFen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
    playedUciMoves: [],
    playerMoveCount: 0,
    config: {
      revealEvery: 3,
      allowCheats: true,
    },
    activeRecordIds: [],
    movesSan: [],
    error: '',
    status: 'Ready',
    opening: null,
  },
  configStatus: {
    message: 'Ready',
    tone: 'default' as const,
    isStartDisabled: false,
  },
  continueEngineElo: 1500,
  continueRevealEvery: 3,
  updateConfig: vi.fn(),
  startRound: vi.fn(),
  restartRound: vi.fn(),
  returnToConfig: vi.fn(),
  submitSanMove: vi.fn(),
  submitUciMove: vi.fn(),
  setContinueEngineElo: vi.fn(),
  setContinueRevealEvery: vi.fn(),
  getContinueGameStartSeed: vi.fn().mockReturnValue(null),
});

const renderOpenings = () => renderToStaticMarkup(
  <MemoryRouter>
    <Openings />
  </MemoryRouter>,
);

beforeEach(() => {
  vi.clearAllMocks();
  useDesktopGameLayoutMock.mockReturnValue(false);
});

describe('Openings page', () => {
  it('renders the openings configuration panel', () => {
    useOpeningTrainerStateMock.mockReturnValue(createHookValue('config'));

    const markup = renderOpenings();

    expect(markup).toContain('data-testid="openings-config-panel"');
    expect(markup).toContain('data-testid="blindfold-board"');
  });

  it('renders the openings results panel when a round is complete', () => {
    useOpeningTrainerStateMock.mockReturnValue(createHookValue('results'));

    const markup = renderOpenings();

    expect(markup).toContain('data-testid="openings-results-panel"');
  });
});
