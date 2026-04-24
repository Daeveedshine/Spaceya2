
import { User, Property, Agreement, Payment, MaintenanceTicket, Notification, UserRole, PropertyStatus, TicketStatus, TicketPriority, NotificationType, TenantApplication, ApplicationStatus, PropertyCategory, FormTemplate, Transaction } from './types';
import { auth, db, isConfigured } from './firebaseConfig';
import { doc, setDoc, onSnapshot, collection, query, where, or, getDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { handleFirestoreError } from './lib/firebaseErrors';
import { useState, useEffect } from 'react';

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
  
  // 1. Local Persistence (Fast)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));

  // 2. Remote Persistence (Firebase securely mapped to individual collections)
  if (isConfigured && db && auth.currentUser) {
    const syncCollection = async <T extends { id: string }>(collectionName: string, newItems: T[], oldItems: T[]) => {
      for (const item of newItems) {
        const oldItem = oldItems.find(i => i.id === item.id);
        if (!oldItem || JSON.stringify(item) !== JSON.stringify(oldItem)) {
          try {
            await setDoc(doc(db, collectionName, item.id), item, { merge: true });
          } catch (err: any) {
             handleFirestoreError(err, 'update', `/${collectionName}/${item.id}`, auth.currentUser);
          }
        }
      }
    };

    // Sequentially background sync to the ABAC-secured cloud collections
    syncCollection('users', state.users, oldState.users);
    syncCollection('properties', state.properties, oldState.properties);
    syncCollection('applications', state.applications, oldState.applications);
    syncCollection('agreements', state.agreements, oldState.agreements);
    syncCollection('tickets', state.tickets, oldState.tickets);
    
    // Note: Some collections like formTemplates use agentId as docID
    for (const template of state.formTemplates) {
      const oldItem = oldState.formTemplates.find(i => i.agentId === template.agentId);
      if (!oldItem || JSON.stringify(template) !== JSON.stringify(oldItem)) {
        try {
          await setDoc(doc(db, 'formTemplates', template.agentId), template, { merge: true });
        } catch (err: any) {
           handleFirestoreError(err, 'update', `/formTemplates/${template.agentId}`, auth.currentUser);
        }
      }
    }
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
      // 1. Fetch User Role cleanly instead of relying on local unsynced states
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      const userRole = userDoc.exists() ? userDoc.data()?.role : 'TENANT';

      // 2. State Merger for collections
      const stateMergers: Record<string, any[]> = {
        users: [], properties: [], applications: [], agreements: [], tickets: [], formTemplates: []
      };

      const attachListener = (collectionName: string, localKey: keyof AppState, q: any) => {
        return onSnapshot(q, (snap: any) => {
            const data = snap.docs.map((d: any) => d.data());
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
           or(where('status', 'in', ['LISTED', 'VACANT']), where('agentId', '==', user.uid))
        )));
      }

      // APPLICATIONS: Admins see all. Agents/Tenants see applications where they are the agent or tenant.
      if (userRole === 'ADMIN') {
        unsubscribes.push(attachListener('applications', 'applications', collection(db, 'applications')));
      } else {
        unsubscribes.push(attachListener('applications', 'applications', query(
           collection(db, 'applications'),
           or(where('userId', '==', user.uid), where('agentId', '==', user.uid))
        )));
      }

      // TICKETS & AGREEMENTS: Tenants see their own
      if (userRole === 'TENANT') {
         unsubscribes.push(attachListener('tickets', 'tickets', query(collection(db, 'tickets'), where('tenantId', '==', user.uid))));
         unsubscribes.push(attachListener('agreements', 'agreements', query(collection(db, 'agreements'), where('tenantId', '==', user.uid))));
      } else if (userRole === 'AGENT') {
          // Getting agent property IDs first
          const agentProps = await getDoc(doc(db, 'users', user.uid));
          const pIds = agentProps.exists() ? agentProps.data()?.assignedPropertyIds || [] : [];
          if (pIds.length > 0) {
            unsubscribes.push(attachListener('tickets', 'tickets', query(collection(db, 'tickets'), where('propertyId', 'in', pIds.slice(0, 10)))));
            unsubscribes.push(attachListener('agreements', 'agreements', query(collection(db, 'agreements'), where('propertyId', 'in', pIds.slice(0, 10)))));
          }
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
