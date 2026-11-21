import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { getDb } from './firebase.js';
import { HttpError } from './http.js';

export const COMPANY_WALLET_ID = 'COMPANY_WALLET_0';
export const ASSIGNMENT_FEE = 1000; // NGN, same value the client used to hardcode
export const MIN_DEPOSIT = 100; // NGN
export const MAX_DEPOSIT = 5_000_000; // NGN

const ref = (prefix: string) => `${prefix}-${Date.now()}-${Math.floor(Math.random() * 900000) + 100000}`;

/**
 * Credits a wallet for a confirmed Paystack payment.
 * Idempotent: the transaction document id is derived from the Paystack reference,
 * so a replayed verify call or a webhook retry cannot credit twice.
 */
export const creditDeposit = async (uid: string, amountNaira: number, reference: string, description: string) => {
  const db = getDb();
  const txRef = db.collection('transactions').doc(`deposit_${reference}`);
  const walletRef = db.collection('wallets').doc(uid);
  const userRef = db.collection('users').doc(uid);

  return db.runTransaction(async (t) => {
    const [txSnap, walletSnap, userSnap] = await Promise.all([t.get(txRef), t.get(walletRef), t.get(userRef)]);
    if (!userSnap.exists) throw new HttpError(404, 'User not found');
    if (txSnap.exists) {
      return { credited: false, balance: walletSnap.exists ? (walletSnap.data()!.balance as number) : 0, reference };
    }
    const balance = (walletSnap.exists ? (walletSnap.data()!.balance as number) || 0 : 0) + amountNaira;
    if (walletSnap.exists) t.update(walletRef, { balance });
    else t.set(walletRef, { user_id: uid, balance, status: 'active', created_at: Timestamp.now() });
    t.update(userRef, { walletBalance: balance });
    t.set(txRef, {
      user_id: uid,
      type: 'deposit',
      amount: amountNaira,
      status: 'success',
      reference,
      description,
      created_at: Timestamp.now(),
    });
    return { credited: true, balance, reference };
  });
};

/** Charges the agent the tenant-assignment fee and credits the company wallet. */
export const chargeAssignmentFee = async (agentId: string, tenantId: string, propertyId: string) => {
  const db = getDb();
  const propRef = db.collection('properties').doc(propertyId);
  const tenantRef = db.collection('users').doc(tenantId);
  const agentWalletRef = db.collection('wallets').doc(agentId);
  const agentUserRef = db.collection('users').doc(agentId);
  const companyRef = db.collection('wallets').doc(COMPANY_WALLET_ID);

  return db.runTransaction(async (t) => {
    const [prop, tenant, wallet, company] = await Promise.all([
      t.get(propRef), t.get(tenantRef), t.get(agentWalletRef), t.get(companyRef),
    ]);
    if (!prop.exists || prop.data()!.agentId !== agentId) throw new HttpError(403, 'Property not found');
    if (prop.data()!.tenantId) throw new HttpError(409, 'Property already has a tenant');
    if (!tenant.exists || tenant.data()!.role !== 'TENANT') throw new HttpError(404, 'Tenant not found');

    const balance = wallet.exists ? (wallet.data()!.balance as number) || 0 : 0;
    if (balance < ASSIGNMENT_FEE) throw new HttpError(402, 'Insufficient wallet balance');

    const newBalance = balance - ASSIGNMENT_FEE;
    t.update(agentWalletRef, { balance: newBalance });
    t.update(agentUserRef, { walletBalance: newBalance });
    if (company.exists) t.update(companyRef, { balance: FieldValue.increment(ASSIGNMENT_FEE) });
    else t.set(companyRef, { user_id: 0, balance: ASSIGNMENT_FEE, status: 'active', created_at: Timestamp.now() });

    const reference = ref('ASSIGN');
    t.set(db.collection('transactions').doc(), {
      user_id: agentId, type: 'deduction', amount: ASSIGNMENT_FEE, status: 'success',
      reference: `${reference}-A`, description: `Tenant assignment fee: Property ${propertyId}`, created_at: Timestamp.now(),
    });
    t.set(db.collection('transactions').doc(), {
      user_id: 0, type: 'credit', amount: ASSIGNMENT_FEE, status: 'success',
      reference: `${reference}-C`, description: `Earnings from tenant assignment: Property ${propertyId}`, created_at: Timestamp.now(),
    });
    return { balance: newBalance, reference: `${reference}-A` };
  });
};

/**
 * Records a withdrawal request and holds the funds. This does NOT move money:
 * payouts are 'pending' until someone pays them out (or Paystack Transfers is wired in).
 */
export const requestWithdrawal = async (uid: string, amountNaira: number) => {
  const db = getDb();
  const walletRef = db.collection('wallets').doc(uid);
  const userRef = db.collection('users').doc(uid);
  return db.runTransaction(async (t) => {
    const wallet = await t.get(walletRef);
    const balance = wallet.exists ? (wallet.data()!.balance as number) || 0 : 0;
    if (balance < amountNaira) throw new HttpError(402, 'Insufficient balance');
    const newBalance = balance - amountNaira;
    const reference = ref('WDR');
    t.update(walletRef, { balance: newBalance });
    t.update(userRef, { walletBalance: newBalance });
    t.set(db.collection('transactions').doc(), {
      user_id: uid, type: 'withdrawal', amount: amountNaira, status: 'pending',
      reference, description: 'Withdrawal request (pending manual payout)', created_at: Timestamp.now(),
    });
    return { balance: newBalance, reference };
  });
};

export const isValidAmount = (n: unknown, min = 1, max = MAX_DEPOSIT): n is number =>
  typeof n === 'number' && Number.isFinite(n) && Number.isInteger(n) && n >= min && n <= max;
