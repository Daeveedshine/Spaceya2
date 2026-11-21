import { auth } from '../firebaseConfig';
import { extractErrorMessage } from '../lib/firebaseErrors';

export interface WalletResult {
  status: 'success' | 'failed';
  message: string;
  balance?: number;
  reference?: string;
}

/**
 * All wallet changes happen on the server (see /api/wallet/*). The browser can only
 * ask; the server checks the Firebase ID token, verifies Paystack payments, and writes.
 */
const call = async (path: string, body: Record<string, unknown>): Promise<WalletResult> => {
  try {
    const token = await auth?.currentUser?.getIdToken();
    if (!token) return { status: 'failed', message: 'Please sign in again.' };
    const res = await fetch(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { status: 'failed', message: data.error || 'Request failed' };
    return { status: 'success', message: 'OK', balance: data.balance, reference: data.reference };
  } catch (err) {
    return { status: 'failed', message: extractErrorMessage(err) || 'Network error' };
  }
};

/** Call after Paystack reports success. The server re-checks the payment with Paystack before crediting. */
export const verifyDeposit = (reference: string) => call('/api/wallet/verify', { reference });

/** Dev-only top-up; the server rejects it unless ALLOW_SIMULATED_FUNDING=true and not production. */
export const devFundWallet = (amount: number) => call('/api/wallet/dev-fund', { amount });

export const chargeAssignmentFee = (tenantId: string, propertyId: string) =>
  call('/api/wallet/assignment-fee', { tenantId, propertyId });

export const requestWithdrawal = (amount: number) => call('/api/wallet/withdraw', { amount });
