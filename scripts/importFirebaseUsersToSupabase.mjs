import fs from "node:fs";
import path from "node:path";
import { randomBytes } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

const DEFAULT_INPUT_DIR = path.join(process.cwd(), "data", "firebase-export");
const SUPABASE_PAGE_SIZE = 1000;
const USERNAME_REGEX = /^[a-z0-9_]{3,20}$/;

const loadEnvFile = (filePath) => {
  if (!fs.existsSync(filePath)) return;

  const raw = fs.readFileSync(filePath, "utf8");
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const equalsIndex = trimmed.indexOf("=");
    if (equalsIndex === -1) continue;

    const key = trimmed.slice(0, equalsIndex).trim();
    let value = trimmed.slice(equalsIndex + 1).trim();
    if (!key) continue;

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    if (process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
};

const loadLocalEnv = () => {
  const cwd = process.cwd();
  loadEnvFile(path.join(cwd, ".env"));
  loadEnvFile(path.join(cwd, ".env.local"));
};

const getSupabaseAdminClient = () => {
  const supabaseUrl = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in the environment.");
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
};

const parseArgs = () => {
  const args = process.argv.slice(2);
  let inputDir = DEFAULT_INPUT_DIR;
  let dryRun = false;

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === "--in" || arg === "--input") {
      inputDir = path.resolve(args[index + 1] ?? "");
      index += 1;
      continue;
    }

    if (arg === "--dry-run") {
      dryRun = true;
      continue;
    }

    throw new Error(`Unknown argument: ${arg}`);
  }

  return { inputDir, dryRun };
};

const normalizeExportEntry = (entry, label) => {
  if (!entry || typeof entry !== "object") {
    throw new Error(`Invalid export entry at ${label}`);
  }

  if ("id" in entry && "data" in entry) {
    return {
      id: String(entry.id),
      data: entry.data ?? {},
    };
  }

  if ("id" in entry) {
    const { id, ...data } = entry;
    return {
      id: String(id),
      data,
    };
  }

  throw new Error(`Export entry at ${label} must include an id field`);
};

const readCollectionDocuments = (inputDir, collectionName) => {
  const filePath = path.join(inputDir, `${collectionName}.json`);
  if (!fs.existsSync(filePath)) {
    if (collectionName === "usernames") {
      return [];
    }
    throw new Error(`Missing export file: ${filePath}`);
  }

  const parsed = JSON.parse(fs.readFileSync(filePath, "utf8"));

  if (Array.isArray(parsed)) {
    return parsed.map((entry, index) => normalizeExportEntry(entry, `${collectionName}[${index}]`));
  }

  if (parsed && typeof parsed === "object" && Array.isArray(parsed.documents)) {
    return parsed.documents.map((entry, index) => normalizeExportEntry(entry, `${collectionName}[${index}]`));
  }

  if (parsed && typeof parsed === "object") {
    return Object.entries(parsed).map(([id, entry]) =>
      normalizeExportEntry(
        entry && typeof entry === "object" && "data" in entry
          ? { id, data: entry.data }
          : { id, data: entry },
        `${collectionName}:${id}`,
      )
    );
  }

  throw new Error(`Unsupported export file shape for ${filePath}`);
};

const normalizeEmail = (value) => {
  const email = String(value ?? "").trim().toLowerCase();
  return email || null;
};

const normalizeUsername = (value) => {
  const username = String(value ?? "").trim().toLowerCase();
  return username || null;
};

const buildUsernameFallbackByUid = (usernameDocs) => {
  const byUid = new Map();

  for (const { id, data } of usernameDocs) {
    const uid = String(data?.uid ?? "").trim();
    if (!uid) continue;

    byUid.set(uid, {
      username: normalizeUsername(data?.username ?? id),
      email: normalizeEmail(data?.email),
    });
  }

  return byUid;
};

const randomTemporaryPassword = () => randomBytes(24).toString("base64url");

const listAllAuthUsers = async (supabase) => {
  const users = [];
  let page = 1;

  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({
      page,
      perPage: SUPABASE_PAGE_SIZE,
    });

    if (error) {
      throw error;
    }

    const pageUsers = data?.users ?? [];
    users.push(...pageUsers);

    if (pageUsers.length < SUPABASE_PAGE_SIZE) {
      break;
    }

    page += 1;
  }

  return users;
};

const loadExistingProfiles = async (supabase) => {
  const profiles = [];
  let from = 0;

  while (true) {
    const to = from + SUPABASE_PAGE_SIZE - 1;
    const { data, error } = await supabase
      .from("profiles")
      .select("id, username")
      .order("id", { ascending: true })
      .range(from, to);

    if (error) {
      throw error;
    }

    profiles.push(...(data ?? []));

    if (!data || data.length < SUPABASE_PAGE_SIZE) {
      break;
    }

    from += SUPABASE_PAGE_SIZE;
  }

  return profiles;
};

const run = async () => {
  loadLocalEnv();
  const { inputDir, dryRun } = parseArgs();
  const supabase = getSupabaseAdminClient();

  const userDocs = readCollectionDocuments(inputDir, "users");
  const usernameDocs = readCollectionDocuments(inputDir, "usernames");
  const usernameFallbackByUid = buildUsernameFallbackByUid(usernameDocs);

  const [authUsers, existingProfiles] = await Promise.all([
    listAllAuthUsers(supabase),
    loadExistingProfiles(supabase),
  ]);

  const authUsersByEmail = new Map(
    authUsers
      .filter((user) => user.email)
      .map((user) => [normalizeEmail(user.email), user]),
  );
  const profilesById = new Map(existingProfiles.map((profile) => [profile.id, profile]));
  const profilesByUsername = new Map(existingProfiles.map((profile) => [profile.username, profile]));

  let importedUsers = 0;
  let existingUsers = 0;
  let skippedUsers = 0;

  for (const { id, data } of userDocs) {
    const firebaseUid = String(data?.uid ?? id).trim();
    const fallback = usernameFallbackByUid.get(firebaseUid);
    const email = normalizeEmail(data?.email ?? fallback?.email);
    const username = normalizeUsername(data?.username ?? fallback?.username);

    if (!email || !username || !USERNAME_REGEX.test(username)) {
      skippedUsers += 1;
      console.warn(`Skipping Firebase user ${firebaseUid}: missing or invalid email/username`);
      continue;
    }

    const existingAuthUser = authUsersByEmail.get(email);
    const existingProfileForUsername = profilesByUsername.get(username);

    if (existingProfileForUsername && existingAuthUser && existingProfileForUsername.id !== existingAuthUser.id) {
      skippedUsers += 1;
      console.warn(`Skipping ${email}: username ${username} is already attached to another Supabase user`);
      continue;
    }

    if (existingAuthUser && profilesById.get(existingAuthUser.id)) {
      existingUsers += 1;
      console.log(`Already imported: ${email}`);
      continue;
    }

    const temporaryPassword = randomTemporaryPassword();

    if (dryRun) {
      importedUsers += 1;
      console.log(`[dry-run] Would import ${email} with username ${username}`);
      continue;
    }

    let authUser = existingAuthUser ?? null;
    if (!authUser) {
      const { data: createdAuthData, error: createAuthError } = await supabase.auth.admin.createUser({
        email,
        password: temporaryPassword,
        email_confirm: true,
        user_metadata: {
          migrated_from_firebase: true,
        },
      });

      if (createAuthError) {
        throw createAuthError;
      }

      authUser = createdAuthData.user;
      authUsersByEmail.set(email, authUser);
    }

    if (!authUser?.id) {
      throw new Error(`Failed to create or find Supabase auth user for ${email}`);
    }

    const { error: insertProfileError } = await supabase.from("profiles").insert({
      id: authUser.id,
      username,
    });

    if (insertProfileError) {
      throw insertProfileError;
    }

    profilesById.set(authUser.id, { id: authUser.id, username });
    profilesByUsername.set(username, { id: authUser.id, username });
    importedUsers += 1;
    console.log(`Imported ${email} with username ${username}`);
  }

  console.log(
    `${dryRun ? "[dry-run] " : ""}User import complete. Imported: ${importedUsers}, already present: ${existingUsers}, skipped: ${skippedUsers}.`,
  );
  console.log("Firebase passwords are not migrated. Imported users must use the forgot-password OTP flow to set a new Supabase password.");
};

run().catch((error) => {
  console.error("Firebase user import failed:", error);
  process.exitCode = 1;
});
