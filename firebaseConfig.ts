
/// <reference types="vite/client" />
import { initializeApp } from 'firebase/app';
import { initializeFirestore, doc, getDocFromServer } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { logger } from './lib/logger';
import firebaseAppletConfig from './firebase-applet-config.json';

const activeConfig: any = {
  ...firebaseAppletConfig
};

let configurationError = null;
const requiredKeys = ['apiKey', 'authDomain', 'projectId'] as const;

for (const key of requiredKeys) {
  if (!activeConfig[key]) {
     configurationError = `Missing required environment variable: ${key}`;
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
    // Using force long polling for restricted environments
    db = initializeFirestore(app, {
      experimentalForceLongPolling: true,
      useFetchStreams: false,
    } as any, activeConfig.firestoreDatabaseId);
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
