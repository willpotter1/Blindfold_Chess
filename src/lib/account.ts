export const USERNAME_REGEX = /^[a-z0-9_]{3,20}$/;

export const normalizeUsername = (value: string) => value.trim().toLowerCase();

export type AccountRecentGame = {
  id: string;
  pgn: string;
  mode: 'computer' | 'pass-n-play';
  engineElo: number | null;
  createdAt: string;
};

export type AccountProfile = {
  username: string | null;
  email: string | null;
  uid: string | null;
  gamesCompleted: number;
  computerGamesCompleted: number;
  passNPlayGamesCompleted: number;
  puzzleAttempts: number;
  puzzlesSolved: number;
  puzzlesFailed: number;
  drillRoundsPlayed: number;
  coordinateDrillRoundsPlayed: number;
  moveDrillRoundsPlayed: number;
  bestDrillScore: number;
  bestDrillAccuracy: number;
  recentGames: AccountRecentGame[];
};

export const createEmptyAccountProfile = (): AccountProfile => ({
  username: null,
  email: null,
  uid: null,
  gamesCompleted: 0,
  computerGamesCompleted: 0,
  passNPlayGamesCompleted: 0,
  puzzleAttempts: 0,
  puzzlesSolved: 0,
  puzzlesFailed: 0,
  drillRoundsPlayed: 0,
  coordinateDrillRoundsPlayed: 0,
  moveDrillRoundsPlayed: 0,
  bestDrillScore: 0,
  bestDrillAccuracy: 0,
  recentGames: [],
});
