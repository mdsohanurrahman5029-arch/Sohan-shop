# SOHAN SHOP — Firestore & Storage Security Specification (`security_spec.md`)

## 1. Data Invariants
1. **Default-Deny Catch-All**: No unlisted collection or subcollection is ever readable or writable.
2. **Single Permanent Admin Authorization Invariant (`isAdmin()`)**:
   - Strictly ONE Google account is authorized as permanent Admin: `mdsohanurrahman5029@gmail.com`.
   - `isAdmin()` requires `request.auth != null`, `request.auth.token.email_verified == true`, AND `request.auth.token.email == 'mdsohanurrahman5029@gmail.com'`.
   - No other Google account can ever become an admin, create `/admins/{uid}`, or access admin resources.
3. **Product & Stock Integrity Invariant (`/products/{productId}`)**:
   - Public customers can ONLY `get` or `list` products where `resource.data.active == true`.
   - Only the single permanent `isAdmin()` can `create`, `update`, or `delete` products, change prices, or modify `stockQuantity` / `stock`.
4. **Order & PII Isolation Invariant (`/orders/{orderId}`)**:
   - Public customers can `create` a new order ONLY if `paymentStatus == 'PAYMENT VERIFICATION PENDING'`, `orderStatus == 'PENDING PAYMENT VERIFICATION'`, `stockDeducted == false`, `deliveryCharge` is strictly `60` or `120`, and `createdAt == request.time`.
   - Public customers and non-admin Google accounts can NEVER `get`, `list`, `update`, or `delete` any order document.
   - Only the single permanent `isAdmin()` can read (`get`, `list`), `update`, or `delete` orders.
5. **Payment Record Invariant (`/payments/{paymentId}`)**:
   - Public customers can `create` a payment record ONLY with `status == 'PAYMENT VERIFICATION PENDING'` and `amount` strictly `60` or `120`.
   - Only the single permanent `isAdmin()` can read, update, or delete payment records.
6. **Admin Profile & Settings Invariant (`/admins/{adminUid}`)**:
   - Only the single permanent `isAdmin()` (`mdsohanurrahman5029@gmail.com`) can read, create, update, or delete its own admin document where `adminUid == request.auth.uid` and `incoming().email == 'mdsohanurrahman5029@gmail.com'`. No second admin account can ever be created.

## 2. The "Dirty Dozen" Payloads
1. **Shadow Field Injection on Product**: Admin or attacker sends `{ ...validProduct, isHacked: true }` -> Rejected by `hasOnly()`.
2. **Unauthorized Google User Product Modification**: Signed-in user `otheruser@gmail.com` (`email_verified: true`) attempts `update` on `/products/product-001` -> Rejected by `isAdmin()`.
3. **Customer Self-Marking Order as PAID**: Public user creates `/orders/SOHAN-1` with `paymentStatus: 'PAID'` -> Rejected by `incoming().paymentStatus == 'PAYMENT VERIFICATION PENDING'`.
4. **Customer Manipulating Delivery Charge**: Public user creates `/orders/SOHAN-1` with `deliveryCharge: 0` -> Rejected by `deliveryCharge in [60, 120]`.
5. **PII Order Scraping (`list` / `get`)**: Public user or signed-in `otheruser@gmail.com` attempts to `get` or `list` `/orders` -> Rejected by `allow get, list: if isAdmin()`.
6. **Spoofed Unverified Admin Email**: Attacker signs in with unverified email `mdsohanurrahman5029@gmail.com` (`email_verified: false`) -> Rejected by `request.auth.token.email_verified == true`.
7. **Creating a Second Admin Account**: Any user (even admin) attempts to create `/admins/{secondUid}` with `email: 'second@gmail.com'` -> Rejected by `incoming().email == 'mdsohanurrahman5029@gmail.com'` and `adminUid == request.auth.uid`.
8. **ID Poisoning Attack**: User attempts to create `/orders/{200_char_invalid_id}` -> Rejected by `isValidId()`.
9. **Denial-of-Wallet Oversized String**: User submits `fullAddress` with 50,000 characters -> Rejected by `.size() <= 1000`.
10. **Negative Stock Update**: Attacker attempts to set `stockQuantity: -5` -> Rejected by `stockQuantity >= 0` and `isAdmin()`.
11. **Timestamp Forgery**: User submits `createdAt` in the past or future instead of `request.time` -> Rejected by `incoming().createdAt == request.time`.
12. **Unbounded Array Injection**: User submits `images` array with 50 items -> Rejected by `images.size() <= 10`.
