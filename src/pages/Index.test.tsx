import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useDesktopGameLayout } from "@/hooks/useDesktopGameLayout";
import { useGameState } from "@/hooks/useGameState";
import Index from "./Index";

vi.mock("@/hooks/useGameState", () => ({
  useGameState: vi.fn(),
}));

vi.mock("@/hooks/useDesktopGameLayout", () => ({
  useDesktopGameLayout: vi.fn(),
}));

vi.mock("@/hooks/useDesktopFitLayout", () => ({
  useDesktopFitLayout: () => ({
    containerRef: { current: null },
    layout: {
      boardSize: 760,
      rightColumnWidth: 441,
      rightColumnHeight: 760,
      gap: 32,
      scale: 1,
    },
  }),
}));

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

vi.mock("@/components/AppSidebar", () => ({
  AppSidebar: () => <div data-testid="sidebar" />,
}));

vi.mock("@/components/SeoHead", () => ({
  default: () => null,
}));

vi.mock("@/components/BlindfoldBoard", () => ({
  BlindfoldBoard: () => <div data-testid="blindfold-board" />,
}));

vi.mock("@/components/LandingOperaReplay", () => ({
  LandingOperaReplay: () => <div data-testid="landing-opera-replay" />,
}));

vi.mock("@/components/GameConfigPanel", () => ({
  GameConfigPanel: () => <div data-testid="game-config-panel" />,
}));

vi.mock("@/components/MoveInput", () => ({
  MoveInput: () => <div data-testid="move-input" />,
}));

vi.mock("@/components/MoveList", () => ({
  MoveList: () => <div data-testid="move-list" />,
}));

vi.mock("@/components/StatusBar", () => ({
  StatusBar: () => <div data-testid="status-bar" />,
}));

vi.mock("@/components/ParticipantSummaryCard", () => ({
  ParticipantSummaryCard: () => <div data-testid="participant-summary" />,
}));

vi.mock("@/components/ui/button", () => ({
  Button: ({ children }: { children: ReactNode }) => <button type="button">{children}</button>,
}));

const useGameStateMock = vi.mocked(useGameState);
const useDesktopGameLayoutMock = vi.mocked(useDesktopGameLayout);

const createHookValue = (gameState = null) => ({
  gameState,
  startNewGame: vi.fn(),
  resetGame: vi.fn(),
  makeMove: vi.fn().mockReturnValue({ success: true }),
  makeMoveUci: vi.fn().mockReturnValue(true),
  shouldShowBoard: vi.fn().mockReturnValue(true),
  getGameStatus: vi.fn().mockReturnValue("White to move"),
  getCurrentState: vi.fn().mockReturnValue(gameState),
  getPgn: vi.fn().mockReturnValue(""),
});

const renderIndex = () => renderToStaticMarkup(
  <MemoryRouter>
    <Index />
  </MemoryRouter>,
);

beforeEach(() => {
  vi.clearAllMocks();
  useDesktopGameLayoutMock.mockReturnValue(false);
});

describe("Index", () => {
  it("renders the landing Opera replay instead of the static image when no game is active", () => {
    useGameStateMock.mockReturnValue(createHookValue());

    const markup = renderIndex();

    expect(markup).toContain('data-testid="landing-opera-replay"');
    expect(markup).not.toContain("Pawns playing chess");
  });

  it("renders the normal board for an active mobile game", () => {
    useGameStateMock.mockReturnValue(createHookValue({
      mode: "computer",
      fen: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
      moves: [],
      halfMoveCount: 0,
      revealEvery: 1,
      allowCheats: false,
      hideMoveHistory: false,
      isOver: false,
      result: null,
      isCheck: false,
      turnColor: "white",
      playerColor: "white",
      engineElo: 1200,
      playerMoveCount: 0,
    }));

    const markup = renderIndex();

    expect(markup).toContain('data-testid="blindfold-board"');
    expect(markup).not.toContain('data-testid="landing-opera-replay"');
  });

  it("renders the normal board for an active desktop game", () => {
    useDesktopGameLayoutMock.mockReturnValue(true);
    useGameStateMock.mockReturnValue(createHookValue({
      mode: "computer",
      fen: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
      moves: [],
      halfMoveCount: 0,
      revealEvery: 1,
      allowCheats: false,
      hideMoveHistory: false,
      isOver: false,
      result: null,
      isCheck: false,
      turnColor: "white",
      playerColor: "white",
      engineElo: 1200,
      playerMoveCount: 0,
    }));

    const markup = renderIndex();

    expect(markup).toContain('data-testid="blindfold-board"');
    expect(markup).not.toContain('data-testid="landing-opera-replay"');
  });
});
