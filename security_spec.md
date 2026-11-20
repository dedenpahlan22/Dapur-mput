# MputPos Security Specification

## 1. Data Invariants
1. **User Isolation & PII Protection**: `/users/{userId}` stores `ownerEmail` (PII). Only `request.auth.uid == userId` with `email_verified == true` may read or write this document.
2. **Master Gate Parent Existence**: Subcollections (`/sheets`, `/areas`, `/menuItems`, `/orders`, `/expenses`) require the parent `/users/{userId}` document to exist on single-document operations (`get`, `create`, `update`, `delete`).
3. **Referential Integrity on Create**: Creating an `Order` or `Expense` requires the referenced `sheetId` document in `/users/{userId}/sheets/{sheetId}` to exist, and `Order` requires `areaId` in `/users/{userId}/areas/{areaId}` to exist.
4. **Immutable Ownership & Timestamps**: `ownerId` and `createdAt` cannot be modified after creation. `createdAt == request.time` on create; `updatedAt == request.time` on create and update.
5. **Bounded Payloads**: All strings and arrays enforce strict size bounds matching `firebase-blueprint.json` (`logoUrl` & `imageUrl` <= 220000 chars, `items` <= 50, `variants` <= 20, `addons` <= 20).
6. **Zero Query Delegation**: All `allow list` rules explicitly enforce `isOwner(userId) && resource.data.ownerId == request.auth.uid` without `get()`/`exists()` lookups.

## 2. Dirty Dozen Attack Payloads (Must Return PERMISSION_DENIED)
1. Unauthenticated read/write to `/users/uid1`.
2. Authenticated User B reading `/users/uid1` (PII leak).
3. Unverified email (`email_verified: false`) writing to `/users/uid1/orders/ord1`.
4. Shadow field injection (`isAdmin: true`) on `UserStore` create.
5. Identity spoofing (`ownerId: "other-uid"`) when creating a `Sheet`.
6. Modifying `ownerId` or `createdAt` during an `Order` update.
7. Client-forged timestamp (`createdAt` != `request.time`) on `MenuItem` create.
8. Oversized ID path poisoning (`sheetId` > 128 chars or containing invalid characters `/$`).
9. Oversized `customerName` (> 100 chars) or `notes` (> 500 chars) on `Order`.
10. Unbounded array injection (`items` > 50 or `items` empty `[]`) on `Order`.
11. Negative pricing (`basePrice: -5000` or `totalAmount: -1` or `amount: -100`) on `MenuItem`/`Order`/`Expense`.
12. Orphaned `Order` referencing non-existent `sheetId` or `areaId`.
