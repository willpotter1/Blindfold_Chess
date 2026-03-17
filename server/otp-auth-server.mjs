import { createHash, createSign, randomBytes, randomInt, timingSafeEqual } from "node:crypto";
import http from "node:http";

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
const FIREBASE_ADMIN_CLIENT_EMAIL = process.env.FIREBASE_ADMIN_CLIENT_EMAIL ?? "";
const FIREBASE_ADMIN_PROJECT_ID = process.env.FIREBASE_ADMIN_PROJECT_ID ?? process.env.VITE_FIREBASE_PROJECT_ID ?? "";
const IS_PRODUCTION = process.env.NODE_ENV === "production";

const normalizeFirebasePrivateKey = (value) => {
  const trimmed = String(value ?? "").trim();
  if (!trimmed) {
    return "";
  }

  const unquoted =
    (trimmed.startsWith('"') && trimmed.endsWith('"')) || (trimmed.startsWith("'") && trimmed.endsWith("'"))
      ? trimmed.slice(1, -1)
      : trimmed;
  const normalized = unquoted.replace(/\\n/g, "\n").trim();

  if (/-----BEGIN [A-Z ]+PRIVATE KEY-----/.test(normalized)) {
    return normalized.endsWith("\n") ? normalized : `${normalized}\n`;
  }

  const keyBody = normalized.replace(/\s+/g, "");
  if (!/^[A-Za-z0-9+/=]+$/.test(keyBody)) {
    return normalized.endsWith("\n") ? normalized : `${normalized}\n`;
  }

  const wrappedBody = keyBody.match(/.{1,64}/g)?.join("\n") ?? keyBody;
  return `-----BEGIN PRIVATE KEY-----\n${wrappedBody}\n-----END PRIVATE KEY-----\n`;
};

const FIREBASE_ADMIN_PRIVATE_KEY = normalizeFirebasePrivateKey(process.env.FIREBASE_ADMIN_PRIVATE_KEY);

if (!MAILERSEND_API_TOKEN || !MAILERSEND_FROM_EMAIL) {
  console.warn("Missing MAILERSEND_API_TOKEN or MAILERSEND_FROM_EMAIL. /auth/send-otp will fail.");
}
if (!OTP_HASH_SECRET) {
  console.warn("Missing OTP_HASH_SECRET. Set a long random value before production.");
}
if (!FIREBASE_ADMIN_CLIENT_EMAIL || !FIREBASE_ADMIN_PRIVATE_KEY || !FIREBASE_ADMIN_PROJECT_ID) {
  console.warn(
    "Missing FIREBASE_ADMIN_CLIENT_EMAIL, FIREBASE_ADMIN_PRIVATE_KEY, or FIREBASE_ADMIN_PROJECT_ID. Password reset endpoints will fail.",
  );
}

/** @type {Map<string, { codeHash: Buffer; expiresAt: number; attemptsLeft: number; lastSentAt: number }>} */
const otpStore = new Map();
/** @type {Map<string, { verifiedAt: number; expiresAt: number }>} */
const verificationStore = new Map();
let adminAccessTokenCache;

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

const base64UrlEncode = (value) =>
  Buffer.from(typeof value === "string" ? value : JSON.stringify(value))
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");

const getAdminAccessToken = async () => {
  if (!FIREBASE_ADMIN_CLIENT_EMAIL || !FIREBASE_ADMIN_PRIVATE_KEY || !FIREBASE_ADMIN_PROJECT_ID) {
    throw new Error("firebase_admin_not_configured");
  }

  const now = Math.floor(Date.now() / 1000);
  if (adminAccessTokenCache && adminAccessTokenCache.expiresAt > now + 60) {
    return adminAccessTokenCache.token;
  }

  const header = { alg: "RS256", typ: "JWT" };
  const claimSet = {
    iss: FIREBASE_ADMIN_CLIENT_EMAIL,
    sub: FIREBASE_ADMIN_CLIENT_EMAIL,
    scope: "https://www.googleapis.com/auth/cloud-platform",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  };

  const unsignedJwt = `${base64UrlEncode(header)}.${base64UrlEncode(claimSet)}`;
  const signature = createSign("RSA-SHA256");
  signature.update(unsignedJwt);
  signature.end();
  const signedJwt = `${unsignedJwt}.${signature.sign(FIREBASE_ADMIN_PRIVATE_KEY, "base64url")}`;

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: signedJwt,
    }),
  });

  if (!response.ok) {
    throw new Error(`google_oauth_token_failed:${response.status}`);
  }

  const body = await response.json();
  adminAccessTokenCache = {
    token: body.access_token,
    expiresAt: now + Number(body.expires_in ?? 3600),
  };
  return body.access_token;
};

const identityToolkitAdminRequest = async (path, payload) => {
  const accessToken = await getAdminAccessToken();
  const response = await fetch(`https://identitytoolkit.googleapis.com/v1/projects/${FIREBASE_ADMIN_PROJECT_ID}${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const body = await response.json();
  if (!response.ok) {
    const message = body?.error?.message || body?.error || `identitytoolkit_request_failed:${response.status}`;
    throw new Error(message);
  }

  return body;
};

const lookupUserByEmail = async (email) => {
  const body = await identityToolkitAdminRequest("/accounts:lookup", {
    email: [normalizeEmail(email)],
  });

  return body.users?.[0] ?? null;
};

const adminResetPassword = async (localId, password) => {
  await identityToolkitAdminRequest("/accounts:update", {
    localId,
    password,
    validSince: String(Math.floor(Date.now() / 1000)),
  });
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
      text: `${introText} ${code}. It expires in ${Math.floor(
        OTP_CODE_TTL_SECONDS / 60,
      )} minutes.`,
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

const handleSendOtp = async (req, res) => {
  const body = await parseJsonBody(req);
  const email = normalizeEmail(body.email);

  if (!email || !email.includes("@")) {
    return json(req, res, 400, { ok: false, error: "invalid_email" });
  }
  if (!MAILERSEND_API_TOKEN || !MAILERSEND_FROM_EMAIL) {
    return json(req, res, 500, { ok: false, error: "mailer_not_configured" });
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

const handleVerifyOtp = async (req, res) => {
  const body = await parseJsonBody(req);
  const email = normalizeEmail(body.email);
  const code = String(body.otp ?? "").trim();

  if (!email || !code) {
    return json(req, res, 400, { ok: false, error: "missing_fields" });
  }

  const verification = verifyOtpRecord("signup", email, code);
  if (!verification.ok) {
    return json(req, res, verification.statusCode, {
      ok: false,
      error: verification.error,
      ...(verification.attemptsLeft == null ? {} : { attemptsLeft: verification.attemptsLeft }),
    });
  }

  const verificationToken = randomBytes(24).toString("base64url");
  verificationStore.set(verificationToken, {
    verifiedAt: Date.now(),
    expiresAt: Date.now() + 15 * 60 * 1000,
  });

  return json(req, res, 200, { ok: true, verificationToken });
};

const handleSendResetOtp = async (req, res) => {
  const body = await parseJsonBody(req);
  const email = normalizeEmail(body.email);

  if (!email || !email.includes("@")) {
    return json(req, res, 400, { ok: false, error: "invalid_email" });
  }
  if (!MAILERSEND_API_TOKEN || !MAILERSEND_FROM_EMAIL) {
    return json(req, res, 500, { ok: false, error: "mailer_not_configured" });
  }
  if (!FIREBASE_ADMIN_CLIENT_EMAIL || !FIREBASE_ADMIN_PRIVATE_KEY || !FIREBASE_ADMIN_PROJECT_ID) {
    return json(req, res, 500, { ok: false, error: "firebase_admin_not_configured" });
  }

  const existingUser = await lookupUserByEmail(email);
  if (!existingUser) {
    return json(req, res, 200, { ok: true, expiresInSeconds: OTP_CODE_TTL_SECONDS });
  }

  try {
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
    throw error;
  }
};

const handleResetPassword = async (req, res) => {
  const body = await parseJsonBody(req);
  const email = normalizeEmail(body.email);
  const code = String(body.otp ?? "").trim();
  const newPassword = String(body.newPassword ?? "");

  if (!email || !code || !newPassword) {
    return json(req, res, 400, { ok: false, error: "missing_fields" });
  }
  if (newPassword.length < 6) {
    return json(req, res, 400, { ok: false, error: "weak_password" });
  }
  if (!FIREBASE_ADMIN_CLIENT_EMAIL || !FIREBASE_ADMIN_PRIVATE_KEY || !FIREBASE_ADMIN_PROJECT_ID) {
    return json(req, res, 500, { ok: false, error: "firebase_admin_not_configured" });
  }

  const verification = verifyOtpRecord("password_reset", email, code);
  if (!verification.ok) {
    return json(req, res, verification.statusCode, {
      ok: false,
      error: verification.error,
      ...(verification.attemptsLeft == null ? {} : { attemptsLeft: verification.attemptsLeft }),
    });
  }

  const existingUser = await lookupUserByEmail(email);
  if (!existingUser?.localId) {
    return json(req, res, 400, { ok: false, error: "email_not_found" });
  }

  await adminResetPassword(existingUser.localId, newPassword);
  return json(req, res, 200, { ok: true });
};

setInterval(() => {
  const now = Date.now();
  for (const [email, record] of otpStore.entries()) {
    if (record.expiresAt < now) otpStore.delete(email);
  }
  for (const [token, record] of verificationStore.entries()) {
    if (record.expiresAt < now) verificationStore.delete(token);
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

    if (req.method === "POST" && req.url === "/auth/verify-otp") {
      return await handleVerifyOtp(req, res);
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

    return json(req, res, 404, { ok: false, error: "not_found" });
  } catch (error) {
    console.error("OTP server error:", error);
    return json(req, res, 500, {
      ok: false,
      error: "server_error",
      ...(IS_PRODUCTION
        ? {}
        : { detail: error instanceof Error ? error.message : String(error) }),
    });
  }
});

server.listen(PORT, () => {
  console.log(`OTP server listening on http://localhost:${PORT}`);
  console.log(`Allowed origins: ${ALLOWED_ORIGINS.join(", ") || "(none configured)"}`);
});
