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

export const verifyOtpCode = async (email: string, otp: string): Promise<string> => {
  const body = await postJson<{ ok: true; verificationToken: string }>('/auth/verify-otp', {
    email,
    otp,
  });
  return body.verificationToken;
};
