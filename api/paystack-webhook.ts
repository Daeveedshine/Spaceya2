import { readRawBody, Req, Res } from './_lib/http';
import { isValidSignature, verifyReference } from './_lib/paystack';
import { creditDeposit } from './_lib/wallet';

// Vercel: we need the raw bytes to check Paystack's HMAC signature.
export const config = { api: { bodyParser: false } };

/** Paystack calls this when a charge succeeds, even if the user closed the tab before the client could verify. */
export default async function handler(req: Req, res: Res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const raw = await readRawBody(req);
    if (!isValidSignature(raw, req.headers['x-paystack-signature'] as string | undefined)) {
      return res.status(401).json({ error: 'Bad signature' });
    }
    const event = JSON.parse(raw.toString('utf8'));
    if (event?.event !== 'charge.success') return res.status(200).json({ ok: true });

    // Don't trust the event payload for money: re-ask Paystack.
    const data = await verifyReference(String(event.data?.reference || ''));
    const uid = data.metadata?.uid;
    if (data.status === 'success' && data.currency === 'NGN' && typeof uid === 'string') {
      await creditDeposit(uid, data.amount / 100, data.reference, 'Wallet funding via Paystack');
    }
    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('Paystack webhook failed:', err);
    return res.status(500).json({ error: 'Webhook error' }); // non-2xx makes Paystack retry
  }
}
