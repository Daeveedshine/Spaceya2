import crypto from 'crypto';
import { HttpError } from './http.js';

export interface PaystackVerifyData {
  status: string;
  reference: string;
  amount: number; // kobo
  currency: string;
  metadata?: { uid?: string } | null;
}

/** Asks Paystack (server-to-server, with the secret key) what really happened to a reference. */
export const verifyReference = async (reference: string): Promise<PaystackVerifyData> => {
  const secret = process.env.PAYSTACK_SECRET_KEY;
  if (!secret) throw new Error('PAYSTACK_SECRET_KEY is not set');
  const res = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, {
    headers: { Authorization: `Bearer ${secret}` },
  });
  if (res.status === 404) throw new HttpError(404, 'Payment not found');
  const body: any = await res.json().catch(() => null);
  if (!res.ok || !body?.status || !body.data) throw new HttpError(502, 'Could not verify payment');
  return body.data as PaystackVerifyData;
};

export const isValidSignature = (rawBody: Buffer, signature: string | undefined): boolean => {
  const secret = process.env.PAYSTACK_SECRET_KEY;
  if (!secret || !signature) return false;
  const expected = crypto.createHmac('sha512', secret).update(rawBody).digest('hex');
  const a = Buffer.from(expected);
  const b = Buffer.from(signature);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
};

/** Shared by the verify endpoint and the webhook: only a confirmed NGN payment for this uid counts. */
export const assertConfirmedPayment = (data: PaystackVerifyData, uid: string) => {
  if (data.status !== 'success') throw new HttpError(402, 'Payment not successful');
  if (data.currency !== 'NGN') throw new HttpError(400, 'Unsupported currency');
  if (data.metadata?.uid !== uid) throw new HttpError(403, 'Payment does not belong to this account');
  return data.amount / 100;
};
