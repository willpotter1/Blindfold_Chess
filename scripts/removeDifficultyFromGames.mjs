import fs from "node:fs";
import path from "node:path";
import { initializeApp } from "firebase/app";
import {
  collection,
  deleteField,
  documentId,
  getDocsFromServer,
  getFirestore,
  limit,
  orderBy,
  query,
  startAfter,
  writeBatch,
} from "firebase/firestore";

const REQUIRED_ENV_KEYS = [
  "VITE_FIREBASE_API_KEY",
  "VITE_FIREBASE_AUTH_DOMAIN",
  "VITE_FIREBASE_PROJECT_ID",
  "VITE_FIREBASE_APP_ID",
];

const PAGE_SIZE = 500;

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

const getFirebaseConfigFromEnv = () => {
  const missing = REQUIRED_ENV_KEYS.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    throw new Error(
      `Missing Firebase env vars: ${missing.join(", ")}. Set them in .env.local or your shell.`
    );
  }

  return {
    apiKey: process.env.VITE_FIREBASE_API_KEY,
    authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.VITE_FIREBASE_APP_ID,
    measurementId: process.env.VITE_FIREBASE_MEASUREMENT_ID,
  };
};

const hasOwn = (obj, prop) => Object.prototype.hasOwnProperty.call(obj, prop);

const run = async () => {
  const dryRun = process.argv.includes("--dry-run");
  loadLocalEnv();

  const firebaseConfig = getFirebaseConfigFromEnv();
  const app = initializeApp(firebaseConfig);
  const db = getFirestore(app);

  let lastDoc = null;
  let pages = 0;
  let scanned = 0;
  let matched = 0;
  let updated = 0;

  while (true) {
    const constraints = [orderBy(documentId()), limit(PAGE_SIZE)];
    if (lastDoc) {
      constraints.push(startAfter(lastDoc));
    }

    const snapshot = await getDocsFromServer(query(collection(db, "games"), ...constraints));
    if (snapshot.empty) break;

    pages += 1;
    scanned += snapshot.size;

    const batch = writeBatch(db);
    let updatesInBatch = 0;

    for (const docSnap of snapshot.docs) {
      const data = docSnap.data();
      const config = data?.config;

      if (config && typeof config === "object" && hasOwn(config, "difficulty")) {
        matched += 1;
        if (!dryRun) {
          batch.update(docSnap.ref, { "config.difficulty": deleteField() });
          updatesInBatch += 1;
        }
      }
    }

    if (!dryRun && updatesInBatch > 0) {
      await batch.commit();
      updated += updatesInBatch;
    }

    lastDoc = snapshot.docs[snapshot.docs.length - 1];
    console.log(
      `Page ${pages}: scanned ${snapshot.size}, matches ${matched}, updated ${updated}${dryRun ? " (dry-run)" : ""}`
    );
  }

  console.log(
    `Done. Total scanned: ${scanned}, matches: ${matched}, updated: ${dryRun ? 0 : updated}${dryRun ? " (dry-run)" : ""}`
  );
};

run().catch((error) => {
  console.error("Migration failed:", error);
  process.exitCode = 1;
});
