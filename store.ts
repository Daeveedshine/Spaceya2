
import { User, Property, Agreement, Payment, MaintenanceTicket, Notification, UserRole, PropertyStatus, TicketStatus, TicketPriority, NotificationType, TenantApplication, ApplicationStatus, PropertyCategory, FormTemplate, Transaction } from './types';
import { auth, db, isConfigured } from './firebaseConfig';
import { doc, setDoc, onSnapshot, collection, query, where, or, getDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { handleFirestoreError } from './lib/firebaseErrors';
import { useState, useEffect } from 'react';
import { sendSystemNotification } from './lib/notifications';

const STORAGE_KEY = 'prop_lifecycle_data';

// --- PUB/SUB FOR REACT COMPONENTS ---
let storeListeners: (() => void)[] = [];
export const subscribeToStore = (listener: () => void) => {
  storeListeners.push(listener);
  return () => { storeListeners = storeListeners.filter(l => l !== listener); };
};
export const triggerStoreUpdate = () => {
  storeListeners.forEach(l => l());
};

export const useAppStore = () => {
  const [store, setStore] = useState(getStore());
  useEffect(() => {
    return subscribeToStore(() => setStore(getStore()));
  }, []);
  
  const setStoreWithSave = (newState: AppState) => {
    saveStore(newState);
    setStore(newState);
    triggerStoreUpdate();
  };
  
  return [store, setStoreWithSave] as const;
};

// Keep all the interfaces and mock data exactly as they are until here...

export interface UserSettings {
  notifications: {
    email: boolean;
    push: boolean;
    maintenance: boolean;
    payments: boolean;
  };
  appearance: {
    density: 'comfortable' | 'compact';
    animations: boolean;
    glassEffect: boolean;
  };
  localization: {
    currency: 'NGN' | 'USD' | 'EUR';
    dateFormat: 'DD/MM/YYYY' | 'MM/DD/YYYY';
  };
}

interface AppState {
  users: User[];
  properties: Property[];
  agreements: Agreement[];
  payments: Payment[];
  tickets: MaintenanceTicket[];
  notifications: Notification[];
  applications: TenantApplication[];
  formTemplates: FormTemplate[];
  transactions: Transaction[];
  wallets?: any[];
  bank_accounts?: any[];
  currentUser: User | null;
  theme: 'light' | 'dark';
  settings: UserSettings;
}

const initialSettings: UserSettings = {
  notifications: {
    email: true,
    push: true,
    maintenance: true,
    payments: true
  },
  appearance: {
    density: 'comfortable',
    animations: true,
    glassEffect: true
  },
  localization: {
    currency: 'NGN',
    dateFormat: 'DD/MM/YYYY'
  }
};

const initialData: AppState = {
  users: [],
  properties: [],
  agreements: [],
  payments: [],
  tickets: [],
  notifications: [],
  wallets: [],
  bank_accounts: [],
  applications: [
    {
      id: 'mock_app_1',
      userId: 'tenant_1',
      propertyId: 'p1',
      agentId: 'agent_1',
      status: ApplicationStatus.PENDING,
      submissionDate: new Date().toISOString(),
      firstName: 'John',
      surname: 'Doe',
      middleName: 'Michael',
      dob: '1990-01-01',
      maritalStatus: 'Single',
      gender: 'Male',
      currentHomeAddress: '123 Fake Street, Lagos',
      occupation: 'Software Engineer',
      familySize: 1,
      phoneNumber: '08012345678',
      reasonForRelocating: 'Work',
      currentLandlordName: 'Mr. Smith',
      currentLandlordPhone: '08098765432',
      verificationType: 'National ID',
      verificationIdNumber: '123456789',
      agentIdCode: 'A101',
      signature: 'JD',
      applicationDate: new Date().toISOString(),
      riskScore: 85,
      aiRecommendation: 'Highly recommended due to stable income.'
    }
  ],
  formTemplates: [],
  transactions: [],
  currentUser: null,
  theme: 'dark',
  settings: initialSettings,
};

// Retrieve data synchronously from LocalStorage for instant UI render
export const getStore = (): AppState => {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (!saved) return initialData;
  const parsed = JSON.parse(saved);
  
  // Migration: Convert legacy assignedPropertyId to assignedPropertyIds array
  if (parsed.users) {
    parsed.users = parsed.users.map((u: any) => {
      if (u.assignedPropertyId && !u.assignedPropertyIds) {
        u.assignedPropertyIds = [u.assignedPropertyId];
      }
      if (u.role === UserRole.AGENT && u.walletBalance === undefined) {
        u.walletBalance = 5000; // Give every agent ₦5000 starter balance for this prototype
      }
      return u;
    });
  }
  if (parsed.currentUser) {
    if (parsed.currentUser.assignedPropertyId && !parsed.currentUser.assignedPropertyIds) {
      parsed.currentUser.assignedPropertyIds = [parsed.currentUser.assignedPropertyId];
    }
    if (parsed.currentUser.role === UserRole.AGENT && parsed.currentUser.walletBalance === undefined) {
      parsed.currentUser.walletBalance = 5000;
    }
  }

  if (!parsed.transactions) parsed.transactions = [];

  if (!parsed.settings) parsed.settings = initialSettings;
  if (!parsed.formTemplates) parsed.formTemplates = initialData.formTemplates;
  return parsed;
};

import { sanitizeObject } from './lib/sanitize';

// Save data to LocalStorage (Immediate) AND Firestore (Async)
export const saveStore = async (state: AppState) => {
  // 1. Local Persistence (Immediate)
  const sanitizedState = sanitizeObject(state);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(sanitizedState));
  
  // 2. Remote Persistence (Firebase securely mapped to individual collections)
  if (isConfigured && db && auth.currentUser && !auth.currentUser.isAnonymous) {
    const user = auth.currentUser;
    
    const syncCollection = async <T extends { id: string }>(collectionName: string, items: T[]) => {
      if (!items || items.length === 0) return;
      
      for (const item of items) {
        try {
          // Safety: Ensure valid agentId is present for shared collections
          if (collectionName === 'tickets' && (!item['agentId'] || item['agentId'] === 'u1')) {
             // Try to recover agentId from property if possible
             const propertyId = item['propertyId'];
             if (propertyId) {
               const prop = sanitizedState.properties.find(p => p.id === propertyId);
               if (prop && prop.agentId && prop.agentId !== 'u1') {
                 (item as any).agentId = prop.agentId;
               }
             }
          }

          // Safety: Ensure critical fields exist for certain collections
          if (collectionName === 'notifications' && !item['userId']) continue;
          if (collectionName === 'tickets' && (!item['agentId'] || !item['tenantId'] || item['agentId'] === 'u1')) continue;
          if (collectionName === 'agreements' && (!item['agentId'] || !item['tenantId'])) continue;

          await setDoc(doc(db, collectionName, item.id), item, { merge: true });
        } catch (err: any) {
          try { handleFirestoreError(err, 'write', `/${collectionName}/${item.id}`, user); } catch(e) {}
        }
      }
    };

    // Filter items to only sync those that this user has permission to write (ownership based)
    // We sync everything locally, but only push what we own to Firestore to avoid permission errors
    const userRole = sanitizedState.users.find(u => u.id === user.uid)?.role || 'TENANT';
    
    await Promise.all([
      syncCollection('users', sanitizedState.users.filter(u => u.id === user.uid)),
      syncCollection('properties', sanitizedState.properties.filter(p => p.agentId === user.uid)),
      syncCollection('applications', sanitizedState.applications.filter(a => a.userId === user.uid || a.agentId === user.uid)),
      syncCollection('agreements', sanitizedState.agreements.filter(a => a.agentId === user.uid)),
      syncCollection('tickets', sanitizedState.tickets.filter(t => t.tenantId === user.uid || t.agentId === user.uid)),
      syncCollection('notifications', sanitizedState.notifications.filter(n => n.userId === user.uid || n.linkTo === 'maintenance' || n.title.includes('Legal Notice') || userRole === 'AGENT' || userRole === 'ADMIN')),
      syncCollection('transactions', sanitizedState.transactions.filter(t => t.userId === user.uid || (t as any).user_id === user.uid)),
      syncCollection('formTemplates', sanitizedState.formTemplates.filter(f => f.agentId === user.uid))
    ]);
  }
};

// Subscribe to Firestore updates (Real-time Sync)
export const initFirebaseSync = (onUpdate: (newState: AppState) => void) => {
  if (!isConfigured || !db || !auth) return () => {};

  let unsubscribes: (() => void)[] = [];
  
  const cleanup = () => {
    unsubscribes.forEach(unsub => unsub());
    unsubscribes = [];
  };

  const authUnsub = onAuthStateChanged(auth, async (user) => {
    cleanup();
    
    if (user) {
      // 1. Fetch User Role cleanly – using a race to prevent hanging on poor connections
      let userRole: string | null = null;
      try {
        const userDocPromise = getDoc(doc(db, 'users', user.uid));
        const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 3000));
        
        const userDoc: any = await Promise.race([userDocPromise, timeoutPromise]);
        if (userDoc.exists()) {
          userRole = userDoc.data()?.role;
        }
      } catch (err) {
        console.warn("User role fetch defaulted due to connection:", err);
      }

      // Fallback 1: check local storage for the last known role of this user
      if (!userRole) {
        const local = getStore();
        if (local.currentUser?.id === user.uid) {
          userRole = local.currentUser.role;
        }
      }

      // Fallback 2: Default to TENANT but log it
      if (!userRole) {
        userRole = 'TENANT';
      }

      // 2. State Merger for collections
      const stateMergers: Record<string, any[]> = {
        users: [], properties: [], applications: [], agreements: [], tickets: [], formTemplates: [], transactions: [], bank_accounts: [], wallets: []
      };

      const attachListener = (collectionName: string, localKey: keyof AppState, q: any) => {
        return onSnapshot(q, (snap: any) => {
            const data = snap.docs.map((d: any) => {
              const item = { ...d.data(), id: d.id };
              // Convert any Firestore Timestamps to ISO strings for serializability
              Object.keys(item).forEach(key => {
                if (item[key] && typeof item[key].toDate === 'function') {
                  item[key] = item[key].toDate().toISOString();
                }
              });
              return item;
            });
            stateMergers[localKey] = data; // replace specific tracker list
            
            const currentLocal = getStore();
            const mergedState = { ...currentLocal, [localKey]: stateMergers[localKey] };
            mergedState.currentUser = mergedState.users.find(u => u.id === user.uid) || currentLocal.currentUser;
            
            localStorage.setItem(STORAGE_KEY, JSON.stringify(mergedState));
            onUpdate(mergedState);
            triggerStoreUpdate();
        }, (error: any) => {
            try { handleFirestoreError(error, 'list', `/${collectionName}`, user); } catch(ignored){}
        });
      };

      // 3. Dynamic Queries mapped perfectly to Firestore Rule conditions
      if (userRole === 'ADMIN') {
        unsubscribes.push(attachListener('users', 'users', collection(db, 'users')));
        unsubscribes.push(attachListener('properties', 'properties', collection(db, 'properties')));
        unsubscribes.push(attachListener('applications', 'applications', collection(db, 'applications')));
        unsubscribes.push(attachListener('tickets', 'tickets', collection(db, 'tickets')));
        unsubscribes.push(attachListener('agreements', 'agreements', collection(db, 'agreements')));
      } else if (userRole === 'AGENT') {
        unsubscribes.push(attachListener('users', 'users', collection(db, 'users')));
        unsubscribes.push(attachListener('properties', 'properties', query(collection(db, 'properties'), where('agentId', '==', user.uid))));
        unsubscribes.push(attachListener('applications', 'applications', query(collection(db, 'applications'), where('agentId', '==', user.uid))));
        unsubscribes.push(attachListener('tickets', 'tickets', query(collection(db, 'tickets'), where('agentId', '==', user.uid))));
        unsubscribes.push(attachListener('agreements', 'agreements', query(collection(db, 'agreements'), where('agentId', '==', user.uid))));
      } else {
        unsubscribes.push(attachListener('users', 'users', query(collection(db, 'users'), where('id', '==', user.uid))));
        unsubscribes.push(attachListener('properties', 'properties', query(
           collection(db, 'properties'), 
           or(
             where('status', 'in', ['LISTED', 'VACANT']), 
             where('tenantId', '==', user.uid)
           )
        )));
        unsubscribes.push(attachListener('applications', 'applications', query(collection(db, 'applications'), where('userId', '==', user.uid))));
        unsubscribes.push(attachListener('tickets', 'tickets', query(collection(db, 'tickets'), where('tenantId', '==', user.uid))));
        unsubscribes.push(attachListener('agreements', 'agreements', query(collection(db, 'agreements'), where('tenantId', '==', user.uid))));
      }

      // FORM TEMPLATES: Admins see all.
      if (userRole === 'ADMIN') {
        unsubscribes.push(attachListener('formTemplates', 'formTemplates', collection(db, 'formTemplates')));
      } else {
        unsubscribes.push(attachListener('formTemplates', 'formTemplates', query(collection(db, 'formTemplates'), where('agentId', '==', user.uid))));
      }

      // NOTIFICATIONS
      unsubscribes.push(attachListener('notifications', 'notifications', query(collection(db, 'notifications'), where('userId', '==', user.uid))));
      
      // Monitor notifications for new arrivals to trigger system notifications
      let lastNotificationCount = getStore().notifications.filter(n => n.userId === user.uid).length;
      const notificationsRef = query(collection(db, 'notifications'), where('userId', '==', user.uid));
      onSnapshot(notificationsRef, (snap) => {
          const currentNotifications = snap.docs.map(d => ({ ...d.data(), id: d.id } as Notification));
          const unreadNew = currentNotifications.filter(n => !n.isRead);
          
          if (currentNotifications.length > lastNotificationCount) {
             // Find the newest one
             const newest = unreadNew.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0];
             if (newest) {
                sendSystemNotification("SPACEYA: " + newest.title, {
                  body: newest.message,
                });
             }
          }
          lastNotificationCount = currentNotifications.length;
      });

      // TRANSACTIONS & WALLETS
      if (userRole === 'ADMIN') {
        unsubscribes.push(attachListener('transactions', 'transactions', collection(db, 'transactions')));
        unsubscribes.push(attachListener('wallets', 'wallets' as any, collection(db, 'wallets')));
      } else {
        unsubscribes.push(attachListener('transactions', 'transactions', query(collection(db, 'transactions'), where('user_id', 'in', [user.uid, 0]))));
        unsubscribes.push(attachListener('wallets', 'wallets' as any, query(collection(db, 'wallets'), where('user_id', 'in', [user.uid, 0]))));
      }

    } else {
      onUpdate(getStore());
    }
  });

  return () => {
    authUnsub();
    cleanup();
  };
};

/**
 * UTILITY: Format currency based on user settings
 */
export const formatCurrency = (amount: number, settings: UserSettings): string => {
  const rates = { NGN: 1, USD: 0.00065, EUR: 0.0006 };
  const converted = amount * rates[settings.localization.currency];
  
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: settings.localization.currency,
    minimumFractionDigits: settings.localization.currency === 'NGN' ? 0 : 2
  }).format(converted);
};

/**
 * UTILITY: Format date based on user settings
 */
export const formatDate = (dateString: string, settings: UserSettings): string => {
  if (!dateString || dateString === '---') return '---';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return dateString;

  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();

  return settings.localization.dateFormat === 'DD/MM/YYYY' 
    ? `${day}/${month}/${year}` 
    : `${month}/${day}/${year}`;
};
