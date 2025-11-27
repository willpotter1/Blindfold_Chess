import { initializeApp, getApps, getApp } from "firebase/app";
import { getAnalytics, isSupported, type Analytics } from "firebase/analytics";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

// Initialize once, even if module is imported multiple times.
export const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

let analyticsInstance: Analytics | undefined;

export const initAnalytics = async () => {
  if (typeof window === "undefined") return undefined;
  if (analyticsInstance) return analyticsInstance;

  const supported = await isSupported();
  if (!supported) return undefined;

  analyticsInstance = getAnalytics(app);
  return analyticsInstance;
};
