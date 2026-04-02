export const AUTH_STATUS_REASONS = {
  missingMailerConfig: "missing_mailer_config",
  missingSupabaseAdmin: "missing_supabase_admin",
  missingOtpHashSecret: "missing_otp_hash_secret",
};

export const getOtpAuthReadiness = (env = process.env) => {
  const mailerReady = Boolean(env.MAILERSEND_API_TOKEN && env.MAILERSEND_FROM_EMAIL);
  const supabaseAdminReady = Boolean((env.SUPABASE_URL ?? env.VITE_SUPABASE_URL) && env.SUPABASE_SERVICE_ROLE_KEY);
  const otpHashReady = Boolean(env.OTP_HASH_SECRET);
  const reasons = [];

  if (!mailerReady) {
    reasons.push(AUTH_STATUS_REASONS.missingMailerConfig);
  }
  if (!supabaseAdminReady) {
    reasons.push(AUTH_STATUS_REASONS.missingSupabaseAdmin);
  }
  if (!otpHashReady) {
    reasons.push(AUTH_STATUS_REASONS.missingOtpHashSecret);
  }

  return {
    mailerReady,
    supabaseAdminReady,
    otpHashReady,
    signupReady: mailerReady && supabaseAdminReady && otpHashReady,
    resetReady: mailerReady && supabaseAdminReady && otpHashReady,
    reasons,
  };
};

export const getOtpAvailabilityError = (flow) => (flow === "reset" ? "reset_unavailable" : "signup_unavailable");
