import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const createJsonResponse = (payload: unknown, status = 200) =>
  new Response(JSON.stringify(payload), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

describe('otpApi', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubEnv('VITE_OTP_API_BASE_URL', 'https://otp.example.com');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it('parses auth readiness responses from /auth/status', async () => {
    const fetchMock = vi.fn().mockResolvedValue(createJsonResponse({
      ok: true,
      signupReady: true,
      resetReady: false,
      reasons: ['missing_mailer_config'],
    }));
    vi.stubGlobal('fetch', fetchMock);

    const { getAuthStatus } = await import('./otpApi');

    await expect(getAuthStatus()).resolves.toEqual({
      ok: true,
      signupReady: true,
      resetReady: false,
      reasons: ['missing_mailer_config'],
    });
    expect(fetchMock).toHaveBeenCalledWith('https://otp.example.com/auth/status', { method: 'GET' });
  });

  it('rejects invalid auth readiness payloads', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(createJsonResponse({
      ok: true,
      signupReady: 'yes',
      resetReady: true,
      reasons: [],
    })));

    const { getAuthStatus } = await import('./otpApi');

    await expect(getAuthStatus()).rejects.toMatchObject({ message: 'otp_response_invalid' });
  });

  it('maps readiness failures to stable availability codes', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(createJsonResponse({ ok: false, error: 'signup_unavailable' }, 503))
      .mockResolvedValueOnce(createJsonResponse({ ok: false, error: 'reset_unavailable' }, 503));
    vi.stubGlobal('fetch', fetchMock);

    const { sendOtpCode, sendPasswordResetOtp } = await import('./otpApi');

    await expect(sendOtpCode('player@example.com')).rejects.toMatchObject({ message: 'signup_unavailable' });
    await expect(sendPasswordResetOtp('player@example.com')).rejects.toMatchObject({ message: 'reset_unavailable' });
  });
});
