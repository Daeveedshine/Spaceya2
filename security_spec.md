# Spaceya application security Spec

## 1. Data Invariants
1. **Users**: User document IDs must strictly match `request.auth.uid`. Role assignment (`ADMIN`, `AGENT`, `TENANT`) must only be allowed during initial creation, or explicitly by an ADMIN later. Agents cannot elevate themselves to ADMIN.
2. **Properties**: Only AGENT and ADMIN roles can create listed properties. A property's `agentId` must match the currently authenticated agent's UID. Tenants cannot create properties.
3. **Applications (Dossiers)**: A Tenant can create an application targeting an Agent or Property. The `userId` must match the request's uid.
4. **Agreements**: Only AGENTS can create agreements for properties they own.
5. **Transactions**: Only backend services or verified webhooks (simulated here) should theoretically write status. For prototype: `userId` must match, and balance updates (transactions) must be securely logged.
6. **FormTemplates**: An agent can only update their own form template (`agentId` == `request.auth.uid`).

## 2. The "Dirty Dozen" Payloads
1.  **Identity Spoofing**: User creates profile with someone else's UID in `id`.
2.  **Role Escalation**: Regular user signs up and passes `role: "ADMIN"` in the payload.
3.  **Cross-Tenant Application Tampering**: Tenant A tries to update Tenant B's application status to APPROVED.
4.  **Property Hijacking**: Agent tries to update a property where `agentId` is someone else.
5.  **Phantom Application**: Tenant submits an application for an invalid/non-existent `propertyId`.
6.  **Admin Impersonation Update**: A user attempts to update their role to `"ADMIN"` after creation.
7.  **Wallet Balance Manipulation**: User tries to update their own `walletBalance` arbitrarily through a client request.
8.  **Orphaned Form Template**: FormTemplate created with `agentId` not matching the `request.auth.uid`.
9.  **Financial Spoofing (Payments)**: Tenant writes a payment record marking their status as "paid" without backend validation.
10. **Malicious ID Injection**: Creating a property with a 5000 character string as the ID to cause resource exhaustion.
11. **Type Poisoning**: Updating the `rent` field of a property to a string.
12. **Missing Author Fields**: Creating an application but omitting the `userId` field to avoid traceability.

## 3. Test Runner
Will be provided in `firestore.rules.test.ts`.
