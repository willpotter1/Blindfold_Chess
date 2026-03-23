const LOCAL_OTP_SERVER_PORT = '8787';
const normalizedOtpApiBaseUrl = import.meta.env.VITE_OTP_API_BASE_URL?.trim().replace(/\/+$/, '');

const isLocalOtpServerUrl = (value: string) => {
  try {
    const parsedUrl = new URL(value);
    return (
      parsedUrl.port === LOCAL_OTP_SERVER_PORT &&
      (parsedUrl.hostname === 'localhost' || parsedUrl.hostname === '127.0.0.1' || parsedUrl.hostname === '::1')
    );
  } catch {
    return false;
  }
};

const OTP_API_BASE_URL =
  import.meta.env.DEV && (!normalizedOtpApiBaseUrl || isLocalOtpServerUrl(normalizedOtpApiBaseUrl))
    ? ''
    : normalizedOtpApiBaseUrl;
const isDevProxyOtpRequest = import.meta.env.DEV && !OTP_API_BASE_URL;

const buildOtpApiUrl = (path: string) => {
  if (!OTP_API_BASE_URL && !import.meta.env.DEV) {
    throw new Error('otp_api_not_configured');
  }
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return OTP_API_BASE_URL ? `${OTP_API_BASE_URL}${normalizedPath}` : normalizedPath;
};

type OtpErrorPayload = {
  ok?: false;
  error?: string;
  detail?: string;
};

const getProxyFailureErrorCode = (response: Response, responseText: string) => {
  if (!isDevProxyOtpRequest || response.ok || response.status < 500) {
    return null;
  }

  const normalizedResponseText = responseText.toLowerCase();
  if (
    !responseText.trim() ||
    normalizedResponseText.includes('econnrefused') ||
    normalizedResponseText.includes('socket hang up') ||
    normalizedResponseText.includes('proxy error') ||
    normalizedResponseText.includes('failed to connect') ||
    normalizedResponseText.includes('localhost:8787')
  ) {
    return 'otp_server_unreachable';
  }

  return null;
};

const postJson = async <T>(path: string, payload: unknown): Promise<T> => {
  let response: Response;
  try {
    response = await fetch(buildOtpApiUrl(path), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  } catch (error) {
    if (error instanceof TypeError) {
      throw new Error('otp_server_unreachable');
    }
    throw error;
  }

  const responseText = await response.text();
  const proxyFailureErrorCode = getProxyFailureErrorCode(response, responseText);
  let body: (T & OtpErrorPayload) | null = null;

  if (responseText.trim()) {
    try {
      body = JSON.parse(responseText) as T & OtpErrorPayload;
    } catch {
      throw new Error(proxyFailureErrorCode || (response.ok ? 'otp_response_invalid' : 'otp_request_failed'));
    }
  }

  if (!response.ok || body?.ok === false) {
    throw new Error(proxyFailureErrorCode || body?.detail || body?.error || 'otp_request_failed');
  }
  if (!body) {
    throw new Error('otp_response_invalid');
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
