import { createHash, randomBytes, randomInt, timingSafeEqual } from "node:crypto";
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
const IS_PRODUCTION = process.env.NODE_ENV === "production";

if (!MAILERSEND_API_TOKEN || !MAILERSEND_FROM_EMAIL) {
  console.warn("Missing MAILERSEND_API_TOKEN or MAILERSEND_FROM_EMAIL. /auth/send-otp will fail.");
}
if (!OTP_HASH_SECRET) {
  console.warn("Missing OTP_HASH_SECRET. Set a long random value before production.");
}

/** @type {Map<string, { codeHash: Buffer; expiresAt: number; attemptsLeft: number; lastSentAt: number }>} */
const otpStore = new Map();
/** @type {Map<string, { verifiedAt: number; expiresAt: number }>} */
const verificationStore = new Map();

const ALL_ORIGINS_ALLOWED = ALLOWED_ORIGINS.includes("*");
const isOriginAllowed = (requestOrigin) =>
  !requestOrigin || ALL_ORIGINS_ALLOWED || ALLOWED_ORIGINS.includes(requestOrigin);

const json = (req, res, statusCode, payload) => {
  const body = JSON.stringify(payload);
  const headers = {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Methods": "POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    Vary: "Origin",
  };
  if (ALL_ORIGINS_ALLOWED) {
    headers["Access-Control-Allow-Origin"] = "*";
  } else if (req.headers.origin && isOriginAllowed(req.headers.origin)) {
    headers["Access-Control-Allow-Origin"] = req.headers.origin;
  } else if (!req.headers.origin && ALLOWED_ORIGINS[0]) {
    headers["Access-Control-Allow-Origin"] = ALLOWED_ORIGINS[0];
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

const hashOtp = (email, code) =>
  createHash("sha256")
    .update(`${normalizeEmail(email)}:${code}:${OTP_HASH_SECRET}`)
    .digest();

const safeCompare = (a, b) => {
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
};

const sendOtpEmail = async (email, code) => {
  const response = await fetch("https://api.mailersend.com/v1/email", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${MAILERSEND_API_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: { email: MAILERSEND_FROM_EMAIL, name: MAILERSEND_FROM_NAME },
      to: [{ email }],
      subject: "Your Blindchess verification code",
      text: `Your one-time password is ${code}. It expires in ${Math.floor(
        OTP_CODE_TTL_SECONDS / 60,
      )} minutes.`,
      html: `<p>Your one-time password is <strong>${code}</strong>.</p><p>It expires in ${Math.floor(
        OTP_CODE_TTL_SECONDS / 60,
      )} minutes.</p>`,
    }),
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`MailerSend send failed (${response.status}): ${detail}`);
  }
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

  const now = Date.now();
  const existing = otpStore.get(email);
  if (existing && now - existing.lastSentAt < OTP_SEND_COOLDOWN_SECONDS * 1000) {
    return json(req, res, 429, { ok: false, error: "cooldown_active" });
  }

  const code = otpCode();
  await sendOtpEmail(email, code);

  otpStore.set(email, {
    codeHash: hashOtp(email, code),
    expiresAt: now + OTP_CODE_TTL_SECONDS * 1000,
    attemptsLeft: OTP_MAX_VERIFY_ATTEMPTS,
    lastSentAt: now,
  });

  return json(req, res, 200, { ok: true, expiresInSeconds: OTP_CODE_TTL_SECONDS });
};

const handleVerifyOtp = async (req, res) => {
  const body = await parseJsonBody(req);
  const email = normalizeEmail(body.email);
  const code = String(body.otp ?? "").trim();

  if (!email || !code) {
    return json(req, res, 400, { ok: false, error: "missing_fields" });
  }

  const record = otpStore.get(email);
  if (!record) {
    return json(req, res, 400, { ok: false, error: "otp_not_found" });
  }

  if (record.expiresAt < Date.now()) {
    otpStore.delete(email);
    return json(req, res, 400, { ok: false, error: "otp_expired" });
  }

  if (record.attemptsLeft <= 0) {
    otpStore.delete(email);
    return json(req, res, 429, { ok: false, error: "max_attempts_exceeded" });
  }

  const valid = safeCompare(record.codeHash, hashOtp(email, code));
  if (!valid) {
    record.attemptsLeft -= 1;
    otpStore.set(email, record);
    return json(req, res, 400, { ok: false, error: "invalid_otp", attemptsLeft: record.attemptsLeft });
  }

  otpStore.delete(email);
  const verificationToken = randomBytes(24).toString("base64url");
  verificationStore.set(verificationToken, {
    verifiedAt: Date.now(),
    expiresAt: Date.now() + 15 * 60 * 1000,
  });

  return json(req, res, 200, { ok: true, verificationToken });
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
    if (!isOriginAllowed(req.headers.origin)) {
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
  console.log(
    `Allowed origins: ${ALL_ORIGINS_ALLOWED ? "*" : ALLOWED_ORIGINS.join(", ") || "(none configured)"}`,
  );
});
