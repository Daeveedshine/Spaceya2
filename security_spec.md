# Security Specification

## Data Invariants
1. **User Identity Invariant**: A user document's `id` must match the authenticated `request.auth.uid`.
2. **Role Immutability**: Users cannot change their own `role` once set during registration.
3. **Property Ownership**: Only the `agentId` (owner) of a property can modify its details.
4. **Application Integrity**: A tenant application must be linked to a valid tenant `userId` and a valid property.
5. **Wallet/Transaction Security**: Wallet balances can only be updated by specific operations with strict key validation.
6. **Maintenance Ticket Lifecycle**: Only tenants can create tickets for their properties; only agents can update their status.
7. **Temporal Integrity**: All timestamps (`createdAt`, `updatedAt`, `submissionDate`) must be validated against `request.time` where applicable.

## The "Dirty Dozen" Payloads
1. **Privilege Escalation**: Attempt to update `role` to 'ADMIN' in a user document.
2. **Identity Spoofing**: Attempt to create a user document with an `id` different from `request.auth.uid`.
3. **Shadow Field Injection**: Attempt to create a property with an extra `isVerified: true` field not in the schema.
4. **Orphaned Application**: Attempt to create an application for a property ID that does not exist.
5. **Unauthorized Status Skip**: Attempt to update an application status directly from `PENDING` to `APPROVED` as a tenant.
6. **Wallet Theft**: Attempt to subtract `walletBalance` from another user's account.
7. **Cross-Tenant Snoop**: Attempt to read another tenant's maintenance tickets.
8. **Malicious ID Injection**: Attempt to create a document with a 1MB junk string as the ID.
9. **Timestamp Manipulation**: Attempt to set a past `createdAt` date manually.
10. **Resource Exhaustion**: Attempt to upload a 1MB string into a `name` field.
11. **Agent Bypass**: Attempt to update a property's `status` as a tenant.
12. **System Field Corruption**: Attempt to modify `agentId` on an existing property.

## Test Runner (Logic)
The following operations must return `PERMISSION_DENIED`:
1. `db.collection('users').doc('attacker').update({ role: 'ADMIN' })`
2. `db.collection('properties').doc('p1').update({ agentId: 'attacker' })`
3. `db.collection('system').doc('connection_check').get()` (unless explicitly allowed)
