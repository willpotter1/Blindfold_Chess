export const USERNAME_REGEX = /^[a-z0-9_]{3,20}$/;

export const normalizeUsername = (value: string) => value.trim().toLowerCase();

export const isPermissionDeniedError = (error: unknown) => {
  if (error && typeof error === 'object' && 'code' in error) {
    const code = (error as { code?: unknown }).code;
    if (code === 'permission-denied' || code === 'firestore/permission-denied') {
      return true;
    }
  }
  return error instanceof Error && /insufficient permissions/i.test(error.message);
};

export type AccountProfile = {
  username: string | null;
  email: string | null;
  uid: string | null;
};
