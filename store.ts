
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

// Save data to LocalStorage (Immediate) AND Firestore (Async)
export const saveStore = async (state: AppState) => {
  const oldState = getStore();
  
  import('./lib/sanitize').then(async ({ sanitizeObject }) => {
     // Apply dynamic sanitization globally!
     const sanitizedState = sanitizeObject(state);
     localStorage.setItem(STORAGE_KEY, JSON.stringify(sanitizedState));
     
     // 2. Remote Persistence (Firebase securely mapped to individual collections)
     if (isConfigured && db && auth.currentUser && !auth.currentUser.isAnonymous) {
       const syncCollection = async <T extends { id: string }>(collectionName: string, newItems: T[], oldItems: T[]) => {
         for (const item of newItems) {
           const oldItem = oldItems.find(i => i.id === item.id);
           if (!oldItem || JSON.stringify(item) !== JSON.stringify(oldItem)) {
             try {
               await setDoc(doc(db, collectionName, item.id), item, { merge: true });
             } catch (err: any) {
               handleFirestoreError(err, 'update' as any, `/${collectionName}/${item.id}`, auth.currentUser);
             }
           }
         }
       };

       // Sequentially background sync to the ABAC-secured cloud collections
       syncCollection('users', sanitizedState.users, oldState.users);
       syncCollection('properties', sanitizedState.properties, oldState.properties);
       syncCollection('applications', sanitizedState.applications, oldState.applications);
       syncCollection('agreements', sanitizedState.agreements, oldState.agreements);
       syncCollection('tickets', sanitizedState.tickets, oldState.tickets);
       syncCollection('notifications', sanitizedState.notifications, oldState.notifications);
       syncCollection('transactions', sanitizedState.transactions, oldState.transactions);
       syncCollection('wallets', sanitizedState.wallets || [], oldState.wallets || []);
       syncCollection('bank_accounts', sanitizedState.bank_accounts || [], oldState.bank_accounts || []);
       
       // Note: Some collections like formTemplates use agentId as docID
       if (!auth.currentUser.isAnonymous) {
         for (const template of sanitizedState.formTemplates) {
           const oldItem = oldState.formTemplates.find(i => i.agentId === template.agentId);
           if (!oldItem || JSON.stringify(template) !== JSON.stringify(oldItem)) {
             try {
               await setDoc(doc(db, 'formTemplates', template.agentId), template, { merge: true });
             } catch (err: any) {
               handleFirestoreError(err, 'update' as any, `/formTemplates/${template.agentId}`, auth.currentUser);
             }
           }
         }
       }
     }
  });
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
      let userRole = 'TENANT';
      try {
        const userDocPromise = getDoc(doc(db, 'users', user.uid));
        const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 5000));
        
        const userDoc: any = await Promise.race([userDocPromise, timeoutPromise]);
        userRole = userDoc.exists() ? userDoc.data()?.role : 'TENANT';
      } catch (err) {
        console.warn("User role fetch defaulted due to connection:", err);
        // Fallback: check local storage for the last known role of this user
        const local = getStore();
        if (local.currentUser?.id === user.uid) {
          userRole = local.currentUser.role;
        }
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
      // USERS: Admins/Agents can see all. Tenants can see only themselves.
      if (userRole === 'ADMIN' || userRole === 'AGENT') {
        unsubscribes.push(attachListener('users', 'users', collection(db, 'users')));
      } else {
        unsubscribes.push(attachListener('users', 'users', query(collection(db, 'users'), where('id', '==', user.uid))));
      }

      // PROPERTIES: Admins see all. Agents/Tenants see LISTED/VACANT OR their own.
      if (userRole === 'ADMIN') {
        unsubscribes.push(attachListener('properties', 'properties', collection(db, 'properties')));
      } else {
        unsubscribes.push(attachListener('properties', 'properties', query(
           collection(db, 'properties'), 
           or(
             where('status', 'in', ['LISTED', 'VACANT']), 
             where('agentId', '==', user.uid),
             where('tenantId', '==', user.uid)
           )
        )));
      }

      // APPLICATIONS: Admins see all. Agents/Tenants see applications where they are the agent or tenant.
      if (userRole === 'ADMIN') {
        unsubscribes.push(attachListener('applications', 'applications', collection(db, 'applications')));
      } else if (userRole === 'AGENT') {
        unsubscribes.push(attachListener('applications', 'applications', query(collection(db, 'applications'), where('agentId', '==', user.uid))));
      } else {
        unsubscribes.push(attachListener('applications', 'applications', query(collection(db, 'applications'), where('userId', '==', user.uid))));
      }

      // TICKETS & AGREEMENTS: Tenants see their own
      if (userRole === 'TENANT') {
         unsubscribes.push(attachListener('tickets', 'tickets', query(collection(db, 'tickets'), where('tenantId', '==', user.uid))));
         unsubscribes.push(attachListener('agreements', 'agreements', query(collection(db, 'agreements'), where('tenantId', '==', user.uid))));
      } else if (userRole === 'AGENT') {
          // Getting agent property IDs first
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          const pIds = userDoc.exists() ? userDoc.data()?.assignedPropertyIds || [] : [];
          
          // Agent sees tickets and agreements for their properties
          if (pIds.length > 0) {
            // Firestore 'in' query supports up to 10-30 items depending on version, 
            // but we'll stick to a reasonable chunk for this app.
            const chunks = [];
            for (let i = 0; i < pIds.length; i += 10) {
              chunks.push(pIds.slice(i, i + 10));
            }
            
            chunks.forEach(chunk => {
              unsubscribes.push(attachListener('tickets', 'tickets', query(collection(db, 'tickets'), where('propertyId', 'in', chunk))));
              unsubscribes.push(attachListener('agreements', 'agreements', query(collection(db, 'agreements'), where('propertyId', 'in', chunk))));
            });
          }
          
          // Also listen for properties where user is agent directly (for those not in assignedPropertyIds)
          unsubscribes.push(attachListener('properties', 'properties', query(collection(db, 'properties'), where('agentId', '==', user.uid))));
      } else if (userRole === 'ADMIN') {
          unsubscribes.push(attachListener('tickets', 'tickets', collection(db, 'tickets')));
          unsubscribes.push(attachListener('agreements', 'agreements', collection(db, 'agreements')));
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
