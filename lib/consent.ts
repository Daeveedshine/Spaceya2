import { doc, getDoc, setDoc, addDoc, collection } from 'firebase/firestore';
import { db, isConfigured } from '../firebaseConfig';
import { LEGAL } from './legalConfig';
import { User } from '../types';

export const COOKIE_KEY = 'spaceya_cookie_prefs';

export interface CookiePrefs {
  essential: true;
  preferences: boolean; // theme etc.
  analytics: boolean;
  decidedAt: string;
}

export const getCookiePrefs = (): CookiePrefs | null => {
  try {
    const raw = localStorage.getItem(COOKIE_KEY);
    return raw ? (JSON.parse(raw) as CookiePrefs) : null;
  } catch {
    return null;
  }
};

export const saveCookiePrefs = (p: { preferences: boolean; analytics: boolean }) => {
  const prefs: CookiePrefs = { essential: true, ...p, decidedAt: new Date().toISOString() };
  try { localStorage.setItem(COOKIE_KEY, JSON.stringify(prefs)); } catch {}
  window.dispatchEvent(new CustomEvent('cookie-prefs-changed', { detail: prefs }));
  return prefs;
};

/** True only if the user explicitly allowed optional analytics. Gate any analytics code on this. */
export const analyticsAllowed = () => getCookiePrefs()?.analytics === true;

export const openLegal = (doc: 'terms' | 'privacy' | 'cookies') => {
  window.dispatchEvent(new CustomEvent('open-legal', { detail: doc }));
};

/** Records the user's acceptance of the current Terms + Privacy Policy version. */
export const recordConsent = async (uid: string) => {
  if (!isConfigured) return;
  await setDoc(doc(db, 'consents', uid), {
    userId: uid,
    termsVersion: LEGAL.version,
    privacyVersion: LEGAL.version,
    acceptedAt: new Date().toISOString(),
    userAgent: (navigator.userAgent || '').slice(0, 300),
  });
};

/** Returns true if the user has accepted the current version. */
export const hasCurrentConsent = async (uid: string): Promise<boolean> => {
  if (!isConfigured) return true;
  try {
    const snap = await getDoc(doc(db, 'consents', uid));
    return snap.exists() && snap.data().termsVersion === LEGAL.version;
  } catch {
    return true; // don't lock users out on a transient read error
  }
};

export type DataRequestType = 'DELETE_ACCOUNT' | 'EXPORT_DATA' | 'CORRECTION';

export const submitDataRequest = async (user: User, type: DataRequestType, note = '') => {
  await addDoc(collection(db, 'dataRequests'), {
    userId: user.id,
    email: user.email,
    name: user.name,
    type,
    note: note.slice(0, 1000),
    status: 'OPEN',
    createdAt: new Date().toISOString(),
  });
};
