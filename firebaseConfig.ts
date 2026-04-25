
/// <reference types="vite/client" />
import { initializeApp } from 'firebase/app';
import { initializeFirestore, doc, getDocFromServer } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { logger } from './lib/logger';

const envConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
  firestoreDatabaseId: import.meta.env.VITE_FIRESTORE_DATABASE_ID,
};

// We cannot rely on require in a Vite environment.
let activeConfig = envConfig;

// Attempt to load from window.FIREBASE_CONFIG if injected, else fall back to envConfig
if (typeof window !== 'undefined' && (window as any).FIREBASE_CONFIG) {
  activeConfig = (window as any).FIREBASE_CONFIG;
}

const requiredKeys = ['apiKey', 'authDomain', 'projectId', 'appId'] as const;
let configurationError = null;

for (const key of requiredKeys) {
  if (!activeConfig[key as keyof typeof activeConfig]) {
    configurationError = `Missing required Firebase configuration environment variable: ${key}`;
    break;
  }
}

let app;
let db: any = null;
let auth: any = null;
let isConfigured = false;

if (configurationError) {
  logger.warn(configurationError);
} else {
  try {
    app = initializeApp(activeConfig);
    // Using more compatible polling settings for restricted environments
    db = initializeFirestore(app, {
      forceLongPolling: true,
    }, activeConfig.firestoreDatabaseId);
    auth = getAuth(app);
    isConfigured = true;
  } catch (error: any) {
    configurationError = `Firebase initialization failed: ${error.message}`;
    logger.error(configurationError);
  }
}

export { db, auth, isConfigured, configurationError };

// Validate Connection to Firestore on boot with a more helpful message
async function verifyBackendConnection() {
  if (!isConfigured || !db) return;
  try {
    // Try to reach the backend, but don't fail the whole app if it's just slow
    const connectionRef = doc(db, 'test', 'connection');
    await getDocFromServer(connectionRef);
  } catch (error: any) {
    // Suppress connectivity errors as many environments are slow or start offline
    if (error?.message?.includes('offline') || error?.message?.includes('deadline-exceeded')) {
      logger.warn("Firestore is taking longer than expected to connect. The app will sync when online.");
    } else {
      logger.error("Firebase Backend Error:", error?.message);
    }
  }
}

// Run connection check in the background if configured
if (isConfigured) {
  verifyBackendConnection();
}
