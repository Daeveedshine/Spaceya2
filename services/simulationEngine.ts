import { db } from '../firebaseConfig';
import { doc, getDoc, setDoc, runTransaction, collection, query, where, getDocs, Timestamp } from 'firebase/firestore';

const COMPANY_WALLET_ID = 'COMPANY_WALLET_0';

export interface SimulationResult {
  status: 'success' | 'failed';
  message: string;
  balance?: number;
  reference?: string;
}

// Ensure company wallet exists
export const initializeCompanyWallet = async () => {
  const walletRef = doc(db, 'wallets', COMPANY_WALLET_ID);
  const snap = await getDoc(walletRef);
  if (!snap.exists()) {
    await setDoc(walletRef, {
      user_id: 0,
      balance: 0,
      status: 'active',
      created_at: Timestamp.now()
    });
  }
};

const generateReference = (prefix: string) => {
  return `${prefix}-${Math.floor(Math.random() * 900000) + 100000}`;
};

export const simulateFundWallet = async (userId: string, amount: number): Promise<SimulationResult> => {
  try {
    const walletRef = doc(db, 'wallets', userId);
    
    const result = await runTransaction(db, async (transaction) => {
      const walletDoc = await transaction.get(walletRef);
      if (!walletDoc.exists()) {
        // Create wallet if it doesn't exist
        transaction.set(walletRef, {
          user_id: userId,
          balance: amount,
          status: 'active',
          created_at: Timestamp.now()
        });
      } else {
        const currentBalance = walletDoc.data().balance || 0;
        transaction.update(walletRef, {
          balance: currentBalance + amount
        });
      }

      const ref = generateReference('REF-TEST');
      const transactionRef = doc(collection(db, 'transactions'));
      transaction.set(transactionRef, {
        user_id: userId,
        type: 'deposit',
        amount: amount,
        status: 'success',
        reference: ref,
        description: 'Simulated wallet funding',
        created_at: Timestamp.now()
      });

      return { balance: walletDoc.exists() ? walletDoc.data().balance + amount : amount, reference: ref };
    });

    return {
      status: 'success',
      message: 'Wallet funded successfully',
      balance: result.balance,
      reference: result.reference
    };
  } catch (error: any) {
    return {
      status: 'failed',
      message: error.message || 'Error funding wallet'
    };
  }
};

export const simulateTenantAssignment = async (agentId: string, tenantId: string, propertyId: string): Promise<SimulationResult> => {
  try {
    const FEE = 1000;
    const agentWalletRef = doc(db, 'wallets', agentId);
    const companyWalletRef = doc(db, 'wallets', COMPANY_WALLET_ID);

    const result = await runTransaction(db, async (transaction) => {
      const agentWalletDoc = await transaction.get(agentWalletRef);
      if (!agentWalletDoc.exists()) {
        throw new Error('Insufficient wallet balance');
      }

      const currentBalance = agentWalletDoc.data().balance || 0;
      if (currentBalance < FEE) {
        throw new Error('Insufficient wallet balance');
      }

      // Ensure company wallet is initialized
      const companyWalletDoc = await transaction.get(companyWalletRef);
      const companyBalance = companyWalletDoc.exists() ? companyWalletDoc.data().balance || 0 : 0;

      if (!companyWalletDoc.exists()) {
         transaction.set(companyWalletRef, {
            user_id: 0,
            balance: FEE,
            status: 'active',
            created_at: Timestamp.now()
         });
      } else {
         transaction.update(companyWalletRef, {
            balance: companyBalance + FEE
         });
      }

      transaction.update(agentWalletRef, {
        balance: currentBalance - FEE
      });

      const ref = generateReference('ASSIGN');
      
      const agentTxRef = doc(collection(db, 'transactions'));
      transaction.set(agentTxRef, {
        user_id: agentId,
        type: 'deduction',
        amount: FEE,
        status: 'success',
        reference: ref + '-A',
        description: `Simulated tenant assignment fee: Property ${propertyId}`,
        created_at: Timestamp.now()
      });

      const companyTxRef = doc(collection(db, 'transactions'));
      transaction.set(companyTxRef, {
        user_id: 0,
        type: 'credit',
        amount: FEE,
        status: 'success',
        reference: ref + '-C',
        description: `Earnings from tenant assignment: Property ${propertyId}`,
        created_at: Timestamp.now()
      });

      return { balance: currentBalance - FEE, reference: ref + '-A' };
    });

    return {
      status: 'success',
      message: 'Tenant assigned successfully',
      balance: result.balance,
      reference: result.reference
    };
  } catch (error: any) {
    return {
      status: 'failed',
      message: error.message || 'Error processing assignment'
    };
  }
};

export const simulateWithdrawal = async (agentId: string, amount: number): Promise<SimulationResult> => {
  try {
    const walletRef = doc(db, 'wallets', agentId);

    const result = await runTransaction(db, async (transaction) => {
      const walletDoc = await transaction.get(walletRef);
      if (!walletDoc.exists()) {
        throw new Error('Wallet not found');
      }

      const currentBalance = walletDoc.data().balance || 0;
      if (currentBalance < amount) {
        throw new Error('Insufficient balance');
      }

      transaction.update(walletRef, {
        balance: currentBalance - amount
      });

      const ref = generateReference('TRF-TEST');
      const transactionRef = doc(collection(db, 'transactions'));
      transaction.set(transactionRef, {
        user_id: agentId,
        type: 'withdrawal',
        amount: amount,
        status: 'success',
        reference: ref,
        description: 'Simulated bank transfer',
        created_at: Timestamp.now()
      });

      return { balance: currentBalance - amount, reference: ref };
    });

    return {
      status: 'success',
      message: 'Withdrawal successful',
      balance: result.balance,
      reference: result.reference
    };
  } catch (error: any) {
    return {
      status: 'failed',
      message: error.message || 'Error withdrawing funds'
    };
  }
};

export const registerBankAccount = async (userId: string, bankName: string, accountNumber: string) => {
  const accountRef = doc(collection(db, 'bank_accounts'));
  const fakeAccountNames = ['John Doe', 'Alice Smith', 'Bob Johnson', 'Mary Jane', 'Oluwaseun Adeyemi'];
  
  await setDoc(accountRef, {
    user_id: userId,
    bank_name: bankName,
    account_number: accountNumber,
    account_name: fakeAccountNames[Math.floor(Math.random() * fakeAccountNames.length)],
    recipient_code: generateReference('RCP-TEST'),
    created_at: Timestamp.now()
  });
};

export const fetchWalletBalance = async (userId: string): Promise<number> => {
  const walletRef = doc(db, 'wallets', userId);
  const snap = await getDoc(walletRef);
  return snap.exists() ? snap.data().balance : 0;
};

export const getCompanyWalletBalance = async (): Promise<number> => {
  const walletRef = doc(db, 'wallets', COMPANY_WALLET_ID);
  const snap = await getDoc(walletRef);
  return snap.exists() ? snap.data().balance : 0;
};
