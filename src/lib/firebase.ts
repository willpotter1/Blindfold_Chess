import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { getAnalytics, isSupported, type Analytics } from "firebase/analytics";
import { getFirestore, type Firestore } from "firebase/firestore";
import { getAuth, type Auth } from "firebase/auth";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

export const hasFirebaseConfig = Boolean(
  firebaseConfig.apiKey &&
    firebaseConfig.authDomain &&
    firebaseConfig.projectId &&
    firebaseConfig.appId
);

const getOrInitApp = (): FirebaseApp | undefined => {
  if (!hasFirebaseConfig) {
    console.info("Firebase config missing; analytics disabled.");
    return undefined;
  }

  return getApps().length ? getApp() : initializeApp(firebaseConfig);
};

let analyticsInstance: Analytics | undefined;
let firestoreInstance: Firestore | undefined;
let authInstance: Auth | undefined;

export const initAnalytics = async () => {
  if (typeof window === "undefined") return undefined;
  if (!hasFirebaseConfig) return undefined;
  if (analyticsInstance) return analyticsInstance;

  const supported = await isSupported();
  if (!supported) {
    console.info("Firebase Analytics not supported in this environment");
    return undefined;
  }

  const app = getOrInitApp();
  if (!app) return undefined;

  analyticsInstance = getAnalytics(app);
  console.info("Firebase Analytics initialized");
  return analyticsInstance;
};

export const getFirestoreDb = (): Firestore | undefined => {
  if (!hasFirebaseConfig) return undefined;
  if (firestoreInstance) return firestoreInstance;

  const app = getOrInitApp();
  if (!app) return undefined;

  firestoreInstance = getFirestore(app);
  console.info("Firestore initialized");
  return firestoreInstance;
};

export const getFirebaseAuth = (): Auth | undefined => {
  if (!hasFirebaseConfig) return undefined;
  if (authInstance) return authInstance;

  const app = getOrInitApp();
  if (!app) return undefined;

  authInstance = getAuth(app);
  return authInstance;
};
