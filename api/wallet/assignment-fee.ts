import { HttpError, requireUser, route } from '../_lib/http';
import { getDb } from '../_lib/firebase';
import { chargeAssignmentFee } from '../_lib/wallet';

export default route(async (req) => {
  const { uid } = await requireUser(req);
  const { tenantId, propertyId } = req.body || {};
  if (typeof tenantId !== 'string' || typeof propertyId !== 'string' || !tenantId || !propertyId) {
    throw new HttpError(400, 'tenantId and propertyId are required');
  }
  const caller = await getDb().collection('users').doc(uid).get();
  if (caller.data()?.role !== 'AGENT') throw new HttpError(403, 'Only agents can assign tenants');
  return chargeAssignmentFee(uid, tenantId, propertyId);
});
