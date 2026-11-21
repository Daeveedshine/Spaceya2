import { HttpError, requireUser, route } from '../_lib/http';
import { assertConfirmedPayment, verifyReference } from '../_lib/paystack';
import { creditDeposit } from '../_lib/wallet';

export default route(async (req) => {
  const { uid } = await requireUser(req);
  const reference = req.body?.reference;
  if (typeof reference !== 'string' || !/^[A-Za-z0-9_\-]{6,100}$/.test(reference)) {
    throw new HttpError(400, 'Invalid reference');
  }
  const data = await verifyReference(reference);
  const amount = assertConfirmedPayment(data, uid);
  return creditDeposit(uid, amount, reference, 'Wallet funding via Paystack');
});
