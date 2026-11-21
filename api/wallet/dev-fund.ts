import { HttpError, requireUser, route } from '../_lib/http.js';
import { creditDeposit, isValidAmount } from '../_lib/wallet.js';

/**
 * Local/testing top-up so you can try the app without Paystack.
 * Disabled unless ALLOW_SIMULATED_FUNDING=true AND NODE_ENV is not production.
 */
export default route(async (req) => {
  if (process.env.ALLOW_SIMULATED_FUNDING !== 'true' || process.env.NODE_ENV === 'production') {
    throw new HttpError(404, 'Not found');
  }
  const { uid } = await requireUser(req);
  const amount = req.body?.amount;
  if (!isValidAmount(amount, 1, 100_000)) throw new HttpError(400, 'Invalid amount');
  return creditDeposit(uid, amount, `DEV-${Date.now()}-${Math.floor(Math.random() * 1e6)}`, 'Simulated wallet funding (dev)');
});
