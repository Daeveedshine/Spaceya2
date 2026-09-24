/// <reference types="vite/client" />
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDocFromServer } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { logger } from './lib/logger';

// Standard Firebase config mapping for Vite/AI Studio/Vercel
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

// Use glob to safely check for the applet config file without failing the build if missing
const appletConfigs = import.meta.glob('./firebase-applet-config.json', { eager: true });
const configKey = Object.keys(appletConfigs)[0];
const firebaseAppletConfig: any = configKey ? (appletConfigs[configKey] as any).default : {};

const activeConfig: any = {
  ...envConfig,
  ...firebaseAppletConfig
};

let configurationError = null;
const requiredKeys = ['apiKey', 'authDomain', 'projectId'] as const;

for (const key of requiredKeys) {
  if (!activeConfig[key]) {
     configurationError = `Missing required environment variable: VITE_FIREBASE_${key.toUpperCase()}`;
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
    db = activeConfig.firestoreDatabaseId 
      ? getFirestore(app, activeConfig.firestoreDatabaseId)
      : getFirestore(app);
    auth = getAuth(app);
    isConfigured = true;
  } catch (error: any) {
    configurationError = `Firebase initialization failed: ${error.message}`;
    logger.error(configurationError);
  }
}

export { db, auth, isConfigured, configurationError };

// Validate Connection to Firestore on boot
async function verifyBackendConnection() {
  if (!isConfigured || !db) return;
  try {
    const connectionRef = doc(db, 'test', 'connection');
    await getDocFromServer(connectionRef);
  } catch (error: any) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      logger.warn("Please check your Firebase configuration or network connection.");
    }
  }
}

if (isConfigured) {
  verifyBackendConnection();
}
