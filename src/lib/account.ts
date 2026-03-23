export const USERNAME_REGEX = /^[a-z0-9_]{3,20}$/;

export const normalizeUsername = (value: string) => value.trim().toLowerCase();

export type AccountProfile = {
  username: string | null;
  email: string | null;
  uid: string | null;
  gamesCompleted: number;
  computerGamesCompleted: number;
  passNPlayGamesCompleted: number;
};
