import { createHash, randomInt, timingSafeEqual } from "node:crypto";
import http from "node:http";
import { createClient } from "@supabase/supabase-js";
import { getOtpAuthReadiness, getOtpAvailabilityError } from "./otp-auth-readiness.mjs";

const PORT = Number(process.env.OTP_SERVER_PORT ?? 8787);
const ALLOWED_ORIGINS = String(
  process.env.OTP_ALLOWED_ORIGINS ?? process.env.OTP_ALLOWED_ORIGIN ?? "http://localhost:5173",
)
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);
const MAILERSEND_API_TOKEN = process.env.MAILERSEND_API_TOKEN ?? "";
const MAILERSEND_FROM_EMAIL = process.env.MAILERSEND_FROM_EMAIL ?? "";
const MAILERSEND_FROM_NAME = process.env.MAILERSEND_FROM_NAME ?? "Blindchess";
const OTP_CODE_TTL_SECONDS = Number(process.env.OTP_CODE_TTL_SECONDS ?? 600);
const OTP_SEND_COOLDOWN_SECONDS = Number(process.env.OTP_SEND_COOLDOWN_SECONDS ?? 60);
const OTP_MAX_VERIFY_ATTEMPTS = Number(process.env.OTP_MAX_VERIFY_ATTEMPTS ?? 5);
const OTP_HASH_SECRET = process.env.OTP_HASH_SECRET ?? "";
const SUPABASE_URL = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL ?? "";
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
const IS_PRODUCTION = process.env.NODE_ENV === "production";
const USERNAME_REGEX = /^[a-z0-9_]{3,20}$/;
const getAuthReadiness = () => getOtpAuthReadiness(process.env);

if (!MAILERSEND_API_TOKEN || !MAILERSEND_FROM_EMAIL) {
  console.warn("Missing MAILERSEND_API_TOKEN or MAILERSEND_FROM_EMAIL. OTP email endpoints will fail.");
}
if (!OTP_HASH_SECRET) {
  console.warn("Missing OTP_HASH_SECRET. Set a long random value before production.");
}
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.warn("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. Auth endpoints will fail.");
}

/** @type {Map<string, { codeHash: Buffer; expiresAt: number; attemptsLeft: number; lastSentAt: number }>} */
const otpStore = new Map();

const supabaseAdmin = SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY
  ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })
  : null;

const getSupabaseAdmin = () => {
  if (!supabaseAdmin) {
    throw new Error("supabase_admin_not_configured");
  }

  return supabaseAdmin;
};

const getOriginHeader = (originHeader) => {
  if (Array.isArray(originHeader)) {
    return originHeader[0];
  }

  return originHeader;
};

const isOriginAllowed = (requestOrigin) => Boolean(requestOrigin && ALLOWED_ORIGINS.includes(requestOrigin));

const json = (req, res, statusCode, payload) => {
  const body = JSON.stringify(payload);
  const requestOrigin = getOriginHeader(req.headers.origin);
  const headers = {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    Vary: "Origin",
  };

  if (isOriginAllowed(requestOrigin)) {
    headers["Access-Control-Allow-Origin"] = requestOrigin;
  }

  res.writeHead(statusCode, headers);
  res.end(body);
};

const parseJsonBody = async (req) =>
  new Promise((resolve, reject) => {
    let raw = "";
    req.on("data", (chunk) => {
      raw += chunk;
      if (raw.length > 1_000_000) {
        reject(new Error("Body too large"));
      }
    });
    req.on("end", () => {
      try {
        resolve(raw ? JSON.parse(raw) : {});
      } catch {
        reject(new Error("Invalid JSON"));
      }
    });
    req.on("error", reject);
  });

const normalizeEmail = (email) => String(email ?? "").trim().toLowerCase();
const normalizeUsername = (username) => String(username ?? "").trim().toLowerCase();
const otpCode = () => String(randomInt(0, 1_000_000)).padStart(6, "0");
const otpKey = (purpose, email) => `${purpose}:${normalizeEmail(email)}`;

const hashOtp = (email, code) =>
  createHash("sha256")
    .update(`${normalizeEmail(email)}:${code}:${OTP_HASH_SECRET}`)
    .digest();

const safeCompare = (a, b) => {
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
};

const toAppError = (error) => {
  if (error instanceof Error) {
    return error;
  }

  if (error && typeof error === "object" && typeof error.message === "string") {
    return new Error(error.message);
  }

  return new Error(typeof error === "string" ? error : "unknown_error");
};

const mapSupabaseError = (error) => {
  const appError = toAppError(error);
  const message = appError.message;
  const code = typeof error === "object" && error && "code" in error ? error.code : undefined;
  const details = typeof error === "object" && error && "details" in error ? String(error.details ?? "") : "";
  const hint = typeof error === "object" && error && "hint" in error ? String(error.hint ?? "") : "";
  const combined = `${message} ${details} ${hint}`;

  if (/already been registered|user already registered/i.test(combined)) {
    return new Error("email_already_exists");
  }

  if (code === "23505" && /username/i.test(combined)) {
    return new Error("username_taken");
  }

  if (code === "23505") {
    return new Error("duplicate_record");
  }

  return appError;
};

const listAllAuthUsers = async () => {
  const client = getSupabaseAdmin();
  const users = [];
  let page = 1;

  while (true) {
    const { data, error } = await client.auth.admin.listUsers({
      page,
      perPage: 1000,
    });

    if (error) {
      throw mapSupabaseError(error);
    }

    const pageUsers = data?.users ?? [];
    users.push(...pageUsers);

    if (pageUsers.length < 1000) {
      break;
    }

    page += 1;
  }

  return users;
};

const sendOtpEmail = async (email, code, options = {}) => {
  const subject = options.subject ?? "Your Blindchess verification code";
  const introText = options.introText ?? "Your one-time password is";
  const introHtml = options.introHtml ?? "Your one-time password is";

  const response = await fetch("https://api.mailersend.com/v1/email", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${MAILERSEND_API_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: { email: MAILERSEND_FROM_EMAIL, name: MAILERSEND_FROM_NAME },
      to: [{ email }],
      subject,
      text: `${introText} ${code}. It expires in ${Math.floor(OTP_CODE_TTL_SECONDS / 60)} minutes.`,
      html: `<p>${introHtml} <strong>${code}</strong>.</p><p>It expires in ${Math.floor(
        OTP_CODE_TTL_SECONDS / 60,
      )} minutes.</p>`,
    }),
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`MailerSend send failed (${response.status}): ${detail}`);
  }
};

const createOtpRecord = async (purpose, email, options = {}) => {
  const now = Date.now();
  const key = otpKey(purpose, email);
  const existing = otpStore.get(key);
  if (existing && now - existing.lastSentAt < OTP_SEND_COOLDOWN_SECONDS * 1000) {
    throw new Error("cooldown_active");
  }

  const code = otpCode();
  await sendOtpEmail(email, code, options);

  otpStore.set(key, {
    codeHash: hashOtp(email, code),
    expiresAt: now + OTP_CODE_TTL_SECONDS * 1000,
    attemptsLeft: OTP_MAX_VERIFY_ATTEMPTS,
    lastSentAt: now,
  });

  return { expiresInSeconds: OTP_CODE_TTL_SECONDS };
};

const verifyOtpRecord = (purpose, email, code) => {
  const key = otpKey(purpose, email);
  const record = otpStore.get(key);
  if (!record) {
    return { ok: false, statusCode: 400, error: "otp_not_found" };
  }

  if (record.expiresAt < Date.now()) {
    otpStore.delete(key);
    return { ok: false, statusCode: 400, error: "otp_expired" };
  }

  if (record.attemptsLeft <= 0) {
    otpStore.delete(key);
    return { ok: false, statusCode: 429, error: "max_attempts_exceeded" };
  }

  const valid = safeCompare(record.codeHash, hashOtp(email, code));
  if (!valid) {
    record.attemptsLeft -= 1;
    otpStore.set(key, record);
    return {
      ok: false,
      statusCode: 400,
      error: "invalid_otp",
      attemptsLeft: record.attemptsLeft,
    };
  }

  otpStore.delete(key);
  return { ok: true };
};

const lookupAuthUserByEmail = async (email) => {
  const users = await listAllAuthUsers();
  const normalizedEmail = normalizeEmail(email);
  return users.find((user) => normalizeEmail(user.email ?? "") === normalizedEmail) ?? null;
};

const lookupAuthEmailByUserId = async (userId) => {
  const users = await listAllAuthUsers();
  const matchingUser = users.find((user) => user.id === userId);
  return matchingUser?.email ?? null;
};

const lookupProfileByUsername = async (username) => {
  const client = getSupabaseAdmin();
  const { data, error } = await client
    .from("profiles")
    .select("id")
    .eq("username", normalizeUsername(username))
    .maybeSingle();

  if (error) {
    throw mapSupabaseError(error);
  }

  return data ?? null;
};

const createAuthUser = async (email, password) => {
  const client = getSupabaseAdmin();
  const { data, error } = await client.auth.admin.createUser({
    email: normalizeEmail(email),
    password,
    email_confirm: true,
  });

  if (error) {
    throw mapSupabaseError(error);
  }

  return data.user;
};

const deleteAuthUser = async (userId) => {
  const client = getSupabaseAdmin();
  const { error } = await client.auth.admin.deleteUser(userId);
  if (error) {
    throw mapSupabaseError(error);
  }
};

const insertProfile = async (userId, username, email) => {
  const client = getSupabaseAdmin();
  const { error } = await client.from("profiles").insert({
    id: userId,
    username: normalizeUsername(username),
    email: normalizeEmail(email),
  });

  if (error) {
    throw mapSupabaseError(error);
  }
};

const updateAuthPassword = async (userId, password) => {
  const client = getSupabaseAdmin();
  const { error } = await client.auth.admin.updateUserById(userId, { password });

  if (error) {
    throw mapSupabaseError(error);
  }
};

const handleSendOtp = async (req, res) => {
  const body = await parseJsonBody(req);
  const email = normalizeEmail(body.email);
  const readiness = getAuthReadiness();

  if (!email || !email.includes("@")) {
    return json(req, res, 400, { ok: false, error: "invalid_email" });
  }
  if (!readiness.signupReady) {
    return json(req, res, 503, { ok: false, error: getOtpAvailabilityError("signup") });
  }

  try {
    const result = await createOtpRecord("signup", email);
    return json(req, res, 200, { ok: true, ...result });
  } catch (error) {
    if (error instanceof Error && error.message === "cooldown_active") {
      return json(req, res, 429, { ok: false, error: "cooldown_active" });
    }
    throw error;
  }
};

const handleSignup = async (req, res) => {
  const body = await parseJsonBody(req);
  const email = normalizeEmail(body.email);
  const username = normalizeUsername(body.username);
  const otp = String(body.otp ?? "").trim();
  const password = String(body.password ?? "");
  const readiness = getAuthReadiness();

  if (!email || !email.includes("@")) {
    return json(req, res, 400, { ok: false, error: "invalid_email" });
  }
  if (!USERNAME_REGEX.test(username)) {
    return json(req, res, 400, { ok: false, error: "invalid_username" });
  }
  if (!otp || !password) {
    return json(req, res, 400, { ok: false, error: "missing_fields" });
  }
  if (password.length < 6) {
    return json(req, res, 400, { ok: false, error: "weak_password" });
  }
  if (!readiness.signupReady) {
    return json(req, res, 503, { ok: false, error: getOtpAvailabilityError("signup") });
  }

  const verification = verifyOtpRecord("signup", email, otp);
  if (!verification.ok) {
    return json(req, res, verification.statusCode, {
      ok: false,
      error: verification.error,
      ...(verification.attemptsLeft == null ? {} : { attemptsLeft: verification.attemptsLeft }),
    });
  }

  let createdUserId = null;

  try {
    const authUser = await createAuthUser(email, password);
    createdUserId = authUser?.id ?? null;
    if (!createdUserId) {
      throw new Error("signup_failed");
    }

    await insertProfile(createdUserId, username, email);
    return json(req, res, 200, { ok: true, userId: createdUserId });
  } catch (error) {
    if (createdUserId) {
      try {
        await deleteAuthUser(createdUserId);
      } catch (cleanupError) {
        console.error("Failed to clean up auth user after signup error:", cleanupError);
      }
    }

    const mappedError = mapSupabaseError(error);
    if (mappedError.message === "supabase_admin_not_configured") {
      return json(req, res, 503, { ok: false, error: getOtpAvailabilityError("signup") });
    }

    return json(req, res, 400, { ok: false, error: mappedError.message });
  }
};

const handleResolveIdentifier = async (req, res) => {
  const body = await parseJsonBody(req);
  const identifier = String(body.identifier ?? "").trim();
  if (!identifier) {
    return json(req, res, 400, { ok: false, error: "identifier_required" });
  }

  if (identifier.includes("@")) {
    return json(req, res, 200, { ok: true, email: normalizeEmail(identifier) });
  }

  const username = normalizeUsername(identifier);
  if (!USERNAME_REGEX.test(username)) {
    return json(req, res, 400, { ok: false, error: "invalid_username" });
  }

  const profile = await lookupProfileByUsername(username);
  if (!profile?.id) {
    return json(req, res, 404, { ok: false, error: "identifier_not_found" });
  }

  const email = await lookupAuthEmailByUserId(profile.id);
  if (!email) {
    return json(req, res, 404, { ok: false, error: "identifier_not_found" });
  }

  return json(req, res, 200, { ok: true, email });
};

const handleSendResetOtp = async (req, res) => {
  const body = await parseJsonBody(req);
  const email = normalizeEmail(body.email);
  const readiness = getAuthReadiness();

  if (!email || !email.includes("@")) {
    return json(req, res, 400, { ok: false, error: "invalid_email" });
  }
  if (!readiness.resetReady) {
    return json(req, res, 503, { ok: false, error: getOtpAvailabilityError("reset") });
  }

  try {
    const existingUser = await lookupAuthUserByEmail(email);
    if (!existingUser) {
      return json(req, res, 200, { ok: true, expiresInSeconds: OTP_CODE_TTL_SECONDS });
    }

    const result = await createOtpRecord("password_reset", email, {
      subject: "Your Blindchess password reset code",
      introText: "Use this password reset code:",
      introHtml: "Use this password reset code:",
    });
    return json(req, res, 200, { ok: true, ...result });
  } catch (error) {
    if (error instanceof Error && error.message === "cooldown_active") {
      return json(req, res, 429, { ok: false, error: "cooldown_active" });
    }
    if (error instanceof Error && error.message === "supabase_admin_not_configured") {
      return json(req, res, 503, { ok: false, error: getOtpAvailabilityError("reset") });
    }
    throw error;
  }
};

const handleResetPassword = async (req, res) => {
  const body = await parseJsonBody(req);
  const email = normalizeEmail(body.email);
  const code = String(body.otp ?? "").trim();
  const newPassword = String(body.newPassword ?? "");
  const readiness = getAuthReadiness();

  if (!email || !code || !newPassword) {
    return json(req, res, 400, { ok: false, error: "missing_fields" });
  }
  if (newPassword.length < 6) {
    return json(req, res, 400, { ok: false, error: "weak_password" });
  }
  if (!readiness.resetReady) {
    return json(req, res, 503, { ok: false, error: getOtpAvailabilityError("reset") });
  }

  const verification = verifyOtpRecord("password_reset", email, code);
  if (!verification.ok) {
    return json(req, res, verification.statusCode, {
      ok: false,
      error: verification.error,
      ...(verification.attemptsLeft == null ? {} : { attemptsLeft: verification.attemptsLeft }),
    });
  }

  try {
    const existingUser = await lookupAuthUserByEmail(email);
    if (!existingUser?.id) {
      return json(req, res, 400, { ok: false, error: "email_not_found" });
    }

    await updateAuthPassword(existingUser.id, newPassword);
    return json(req, res, 200, { ok: true });
  } catch (error) {
    const mappedError = mapSupabaseError(error);
    if (mappedError.message === "supabase_admin_not_configured") {
      return json(req, res, 503, { ok: false, error: getOtpAvailabilityError("reset") });
    }
    throw mappedError;
  }
};

setInterval(() => {
  const now = Date.now();
  for (const [key, record] of otpStore.entries()) {
    if (record.expiresAt < now) {
      otpStore.delete(key);
    }
  }
}, 60_000).unref();

const server = http.createServer(async (req, res) => {
  try {
    const requestOrigin = getOriginHeader(req.headers.origin);
    if (requestOrigin && !isOriginAllowed(requestOrigin)) {
      return json(req, res, 403, { ok: false, error: "origin_not_allowed" });
    }

    if (req.method === "OPTIONS") {
      return json(req, res, 204, {});
    }

    if (req.method === "POST" && req.url === "/auth/send-otp") {
      return await handleSendOtp(req, res);
    }

    if (req.method === "POST" && req.url === "/auth/signup") {
      return await handleSignup(req, res);
    }

    if (req.method === "POST" && req.url === "/auth/resolve-identifier") {
      return await handleResolveIdentifier(req, res);
    }

    if (req.method === "POST" && req.url === "/auth/send-reset-otp") {
      return await handleSendResetOtp(req, res);
    }

    if (req.method === "POST" && req.url === "/auth/reset-password") {
      return await handleResetPassword(req, res);
    }

    if (req.method === "GET" && req.url === "/healthz") {
      return json(req, res, 200, { ok: true });
    }

    if (req.method === "GET" && req.url === "/auth/status") {
      const { signupReady, resetReady, reasons } = getAuthReadiness();
      return json(req, res, 200, { ok: true, signupReady, resetReady, reasons });
    }

    return json(req, res, 404, { ok: false, error: "not_found" });
  } catch (error) {
    console.error("OTP server error:", error);
    return json(req, res, 500, {
      ok: false,
      error: "server_error",
      ...(IS_PRODUCTION ? {} : { detail: error instanceof Error ? error.message : String(error) }),
    });
  }
});

server.listen(PORT, () => {
  console.log(`OTP server listening on http://localhost:${PORT}`);
  console.log(`Allowed origins: ${ALLOWED_ORIGINS.join(", ") || "(none configured)"}`);
});
