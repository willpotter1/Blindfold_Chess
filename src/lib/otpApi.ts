const normalizedOtpApiBaseUrl = import.meta.env.VITE_OTP_API_BASE_URL?.trim().replace(/\/+$/, '');
const OTP_API_BASE_URL = normalizedOtpApiBaseUrl || (import.meta.env.DEV ? 'http://localhost:8787' : '');

const buildOtpApiUrl = (path: string) => {
  if (!OTP_API_BASE_URL && !import.meta.env.DEV) {
    throw new Error('otp_api_not_configured');
  }
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${OTP_API_BASE_URL}${normalizedPath}`;
};

type OtpErrorPayload = {
  ok?: false;
  error?: string;
  detail?: string;
};

const postJson = async <T>(path: string, payload: unknown): Promise<T> => {
  const response = await fetch(buildOtpApiUrl(path), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  const body = (await response.json()) as T & OtpErrorPayload;
  if (!response.ok || body.ok === false) {
    throw new Error(body.detail || body.error || 'otp_request_failed');
  }

  return body;
};

export const sendOtpCode = async (email: string): Promise<void> => {
  await postJson('/auth/send-otp', { email });
};

export const signupWithOtp = async (email: string, password: string, username: string, otp: string): Promise<void> => {
  await postJson('/auth/signup', {
    email,
    password,
    username,
    otp,
  });
};

export const resolveIdentifierToEmail = async (identifier: string): Promise<string> => {
  const trimmedIdentifier = identifier.trim();
  if (trimmedIdentifier.includes('@')) {
    return trimmedIdentifier.toLowerCase();
  }

  const body = await postJson<{ ok: true; email: string }>('/auth/resolve-identifier', {
    identifier: trimmedIdentifier,
  });

  return body.email;
};

export const sendPasswordResetOtp = async (email: string): Promise<void> => {
  await postJson('/auth/send-reset-otp', { email });
};

export const resetPasswordWithOtp = async (email: string, otp: string, newPassword: string): Promise<void> => {
  await postJson('/auth/reset-password', {
    email,
    otp,
    newPassword,
  });
};
