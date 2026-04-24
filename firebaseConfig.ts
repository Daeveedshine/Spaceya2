
import { initializeApp } from 'firebase/app';
import { initializeFirestore, doc, getDocFromServer } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import firebaseConfig from './firebase-applet-config.json';

const app = initializeApp(firebaseConfig);

// Using more compatible polling settings for restricted environments
export const db = initializeFirestore(app, {
  experimentalAutoDetectLongPolling: true,
}, firebaseConfig.firestoreDatabaseId);

export const auth = getAuth(app);
export const isConfigured = true;

// Validate Connection to Firestore on boot with a more helpful message
async function verifyBackendConnection() {
  try {
    // Try to reach the backend, but don't fail the whole app if it's just slow
    const connectionRef = doc(db, 'test', 'connection');
    await getDocFromServer(connectionRef);
  } catch (error: any) {
    // Suppress connectivity errors as many environments are slow or start offline
    if (error?.message?.includes('offline') || error?.message?.includes('deadline-exceeded')) {
      console.warn("Firestore is taking longer than expected to connect. The app will sync when online.");
    } else {
      console.error("Firebase Backend Error:", error?.message);
    }
  }
}

// Run connection check in the background
verifyBackendConnection();
