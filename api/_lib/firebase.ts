import { App, cert, getApps, initializeApp } from 'firebase-admin/app';
import { Firestore, getFirestore } from 'firebase-admin/firestore';

/**
 * Server credentials. Set FIREBASE_SERVICE_ACCOUNT to the service-account JSON
 * (as a single-line string) in Vercel / your server env. Never prefix it with VITE_.
 */
export const getAdminApp = (): App => {
  const existing = getApps()[0];
  if (existing) return existing;
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!raw) throw new Error('FIREBASE_SERVICE_ACCOUNT is not set');
  return initializeApp({ credential: cert(JSON.parse(raw)) });
};

export const getDb = (): Firestore => {
  const databaseId = process.env.VITE_FIRESTORE_DATABASE_ID || process.env.FIRESTORE_DATABASE_ID;
  const app = getAdminApp();
  return databaseId && databaseId !== '(default)' ? getFirestore(app, databaseId) : getFirestore(app);
};
