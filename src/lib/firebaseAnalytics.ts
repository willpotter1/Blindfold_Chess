import { getApp, getApps, initializeApp } from "firebase/app";
import { getAnalytics, isSupported, logEvent } from "firebase/analytics";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY?.trim(),
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN?.trim(),
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID?.trim(),
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET?.trim(),
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID?.trim(),
  appId: import.meta.env.VITE_FIREBASE_APP_ID?.trim(),
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID?.trim(),
};

export const hasFirebaseAnalyticsConfig = Object.values(firebaseConfig).every(
  (value) => typeof value === "string" && value.length > 0
);

let analyticsPromise: Promise<ReturnType<typeof getAnalytics> | null> | null = null;

const getAnalyticsClient = async () => {
  if (typeof window === "undefined" || !hasFirebaseAnalyticsConfig) {
    return null;
  }

  analyticsPromise ??= (async () => {
    if (!(await isSupported())) {
      return null;
    }

    const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
    return getAnalytics(app);
  })().catch((error) => {
    console.error("Failed to initialize Firebase Analytics:", error);
    analyticsPromise = null;
    return null;
  });

  return analyticsPromise;
};

export const trackPageView = async (pagePath: string, pageTitle: string) => {
  const analytics = await getAnalyticsClient();
  if (!analytics || typeof window === "undefined") {
    return;
  }

  logEvent(analytics, "page_view", {
    page_title: pageTitle,
    page_location: window.location.href,
    page_path: pagePath,
  });
};

export const trackAnalyticsEvent = async (
  eventName: string,
  params?: Record<string, string | number | boolean | undefined>
) => {
  const analytics = await getAnalyticsClient();
  if (!analytics) {
    return;
  }

  const cleanParams = params
    ? Object.fromEntries(Object.entries(params).filter(([, value]) => value !== undefined))
    : undefined;

  logEvent(analytics, eventName, cleanParams);
};
