import { describe, expect, it } from 'vitest';
import { AUTH_STATUS_REASONS, getOtpAuthReadiness, getOtpAvailabilityError } from './otp-auth-readiness.mjs';

describe('getOtpAuthReadiness', () => {
  it('reports missing mailer, Supabase admin, and OTP hash requirements', () => {
    expect(getOtpAuthReadiness({})).toEqual({
      mailerReady: false,
      supabaseAdminReady: false,
      otpHashReady: false,
      signupReady: false,
      resetReady: false,
      reasons: [
        AUTH_STATUS_REASONS.missingMailerConfig,
        AUTH_STATUS_REASONS.missingSupabaseAdmin,
        AUTH_STATUS_REASONS.missingOtpHashSecret,
      ],
    });
  });

  it('reports signup and reset readiness when all required env vars are present', () => {
    expect(getOtpAuthReadiness({
      MAILERSEND_API_TOKEN: 'token',
      MAILERSEND_FROM_EMAIL: 'auth@example.com',
      OTP_HASH_SECRET: 'secret',
      SUPABASE_URL: 'https://example.supabase.co',
      SUPABASE_SERVICE_ROLE_KEY: 'service-role',
    })).toEqual({
      mailerReady: true,
      supabaseAdminReady: true,
      otpHashReady: true,
      signupReady: true,
      resetReady: true,
      reasons: [],
    });
  });
});

describe('getOtpAvailabilityError', () => {
  it('maps signup and reset flows to stable availability codes', () => {
    expect(getOtpAvailabilityError('signup')).toBe('signup_unavailable');
    expect(getOtpAvailabilityError('reset')).toBe('reset_unavailable');
  });
});
