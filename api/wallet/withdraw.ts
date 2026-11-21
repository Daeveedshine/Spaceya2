import { HttpError, requireUser, route } from '../_lib/http';
import { getDb } from '../_lib/firebase';
import { isValidAmount, requestWithdrawal } from '../_lib/wallet';

export default route(async (req) => {
  const { uid } = await requireUser(req);
  const amount = req.body?.amount;
  if (!isValidAmount(amount)) throw new HttpError(400, 'Invalid amount');
  const caller = await getDb().collection('users').doc(uid).get();
  if (!['AGENT', 'ADMIN'].includes(caller.data()?.role)) throw new HttpError(403, 'Not allowed');
  return requestWithdrawal(uid, amount);
});
