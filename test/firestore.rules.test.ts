/**
 * Run with the Firestore emulator:
 *   npm i -D @firebase/rules-unit-testing vitest
 *   npx firebase emulators:exec --only firestore "npx vitest run test/firestore.rules.test.ts"
 */
import { assertFails, assertSucceeds, initializeTestEnvironment, RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { readFileSync } from 'fs';
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest';

let env: RulesTestEnvironment;
const user = (id: string, role: string, extra = {}) => ({ id, name: id, email: `${id}@x.com`, role, ...extra });

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-spaceya',
    firestore: { rules: readFileSync('firestore.rules', 'utf8') },
  });
});
afterAll(() => env.cleanup());
beforeEach(async () => {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await db.doc('users/agent1').set(user('agent1', 'AGENT'));
    await db.doc('users/agent2').set(user('agent2', 'AGENT'));
    await db.doc('users/tenant1').set(user('tenant1', 'TENANT'));
    await db.doc('users/tenant2').set(user('tenant2', 'TENANT'));
    await db.doc('users/admin1').set(user('admin1', 'ADMIN'));
    await db.doc('wallets/agent1').set({ user_id: 'agent1', balance: 5000, status: 'active' });
    await db.doc('wallets/agent2').set({ user_id: 'agent2', balance: 5000, status: 'active' });
    await db.doc('transactions/t1').set({ user_id: 'agent1', amount: 1, type: 'deposit', status: 'success', reference: 'r', description: 'd', created_at: 'x' });
    await db.doc('applications/app1').set({ id: 'app1', userId: 'tenant1', propertyId: 'p1', agentId: 'agent1', status: 'PENDING', submissionDate: 'x' });
  });
});

const as = (uid: string) => env.authenticatedContext(uid).firestore();

describe('money is server-only', () => {
  it('blocks client wallet writes', async () => {
    await assertFails(as('agent1').doc('wallets/agent1').update({ balance: 999999 }));
    await assertFails(as('agent1').doc('wallets/agent2').update({ balance: 0 }));
    await assertFails(as('agent1').doc('wallets/new').set({ user_id: 'agent1', balance: 1 }));
  });
  it('blocks client transaction writes', async () => {
    await assertFails(as('agent1').doc('transactions/x').set({ user_id: 'agent1', amount: 1 }));
    await assertFails(as('agent1').doc('transactions/t1').update({ status: 'failed' }));
  });
  it('lets users read only their own wallet/transactions', async () => {
    await assertSucceeds(as('agent1').doc('wallets/agent1').get());
    await assertFails(as('agent1').doc('wallets/agent2').get());
    await assertSucceeds(as('agent1').doc('transactions/t1').get());
    await assertFails(as('agent2').doc('transactions/t1').get());
    await assertSucceeds(as('admin1').doc('wallets/agent2').get());
  });
});

describe('users', () => {
  it('cannot self-register as ADMIN or with a balance', async () => {
    await assertFails(as('new1').doc('users/new1').set(user('new1', 'ADMIN')));
    await assertFails(as('new1').doc('users/new1').set(user('new1', 'AGENT', { walletBalance: 5000 })));
    await assertSucceeds(as('new1').doc('users/new1').set(user('new1', 'AGENT', { walletBalance: 0 })));
  });
  it('cannot change own role or walletBalance', async () => {
    await assertFails(as('tenant1').doc('users/tenant1').update({ role: 'ADMIN' }));
    await assertFails(as('tenant1').doc('users/tenant1').update({ walletBalance: 1e9 }));
    await assertSucceeds(as('tenant1').doc('users/tenant1').update({ name: 'New Name' }));
  });
  it('agent cannot top up a tenant balance', async () => {
    await assertFails(as('agent1').doc('users/tenant1').update({ walletBalance: 100 }));
  });
});

describe('reads are scoped', () => {
  it('applications visible only to applicant, agent, admin', async () => {
    await assertSucceeds(as('tenant1').doc('applications/app1').get());
    await assertSucceeds(as('agent1').doc('applications/app1').get());
    await assertSucceeds(as('admin1').doc('applications/app1').get());
    await assertFails(as('tenant2').doc('applications/app1').get());
    await assertFails(as('agent2').doc('applications/app1').get());
  });
});
