# Technical Report: E-Commerce Modular Monolith

## 1. Introduction

Online stores often fail when handling simultaneous requests. Two shoppers might buy the last available item at the same time, network timeouts might cause duplicate orders, and floating-point arithmetic can introduce financial discrepancies. This project solves those problems by implementing an e-commerce platform using the MERN stack (MongoDB, Express, React, and Node.js). The application manages the entire order lifecycle, from user authentication and catalog browsing to atomic checkout and administrative auditing. It strictly limits monetary calculations to whole paise and ensures that all state transitions and inventory updates are consistent.

## 2. Requirements Summary

| Requirement | Implementation Location |
| --- | --- |
| Layered Server Architecture | `server/src/routes`, `server/src/controllers`, `server/src/services`, `server/src/models` |
| Centralized Error Handling | `server/src/errors/AppError.js`, `server/src/middleware/errorHandler.js` |
| Request Input Validation | `server/src/validators/authValidators.js`, `server/src/validators/commonValidators.js` |
| Authentication & Role Checks | `server/src/services/authService.js`, `server/src/middleware/auth.js` |
| Integer Paise Pricing Math | `server/src/services/pricingService.js` |
| Product & Variant Catalog | `server/src/models/Product.js`, `server/src/models/Variant.js`, `server/src/services/catalogueService.js` |
| Cart & Coupon Management | `server/src/models/Cart.js`, `server/src/models/Coupon.js`, `server/src/services/cartService.js` |
| Idempotent Checkout & Stock Locking | `server/src/services/orderService.js`, `server/src/utils/idempotency.js` |
| Order State Machine & Stock Restores | `server/src/services/orderStateMachine.js`, `server/src/services/orderService.js` |
| Admin Inventory & Status Updates | `server/src/services/inventoryService.js`, `server/src/controllers/adminController.js` |
| Append-Only Audit Logging | `server/src/models/AuditLog.js`, `server/src/services/auditService.js` |
| Dynamic Aggregation & Invariants | `server/src/services/reportService.js` |
| Responsive Frontend Client | `client/src/App.jsx`, `client/src/pages/*`, `client/src/index.css` |

## 3. Architecture

The system uses a modular-monolith pattern instead of microservices. Microservices introduce distributed transactions, network latency between services, and complex deployment requirements. A modular monolith provides the benefits of clean domain boundaries while allowing everything to run within a single Node.js process and execute atomic multi-document transactions in one MongoDB database.

```
[ Client Request ]
       |
       v
[ Express Routes ]  --> Validates body, query, and params with Zod schemas
       |
       v
[ Controllers ]     --> Handles HTTP status codes and extracts request data
       |
       v
[ Services ]        --> Executes business rules, transactions, and state checks
       |
       v
[ Mongoose Models ] --> Interacts with database collections and enforces schema constraints
```

Every request flows strictly in this direction. Controllers never call Mongoose models directly, and routes contain no business logic.

## 4. Data Model

The database contains eight primary collections: `users`, `categories`, `products`, `variants`, `carts`, `coupons`, `orders`, and `auditlogs`. A complete schema diagram and index summary are documented in [docs/database.md](file:///d:/algion/docs/database.md).

- **Embedded Address Subdocuments:** User addresses are stored as an array of embedded subdocuments inside the `User` document. Because users only manage a small number of personal delivery addresses (capped at 10), embedding avoids unnecessary database joins and allows address updates in a single read-modify-write operation.
- **Order Snapshots:** When an order is placed, full copies of the item names, SKUs, unit prices, attributes, and delivery address are frozen directly inside the `Order` document. If an admin later edits a product's title or changes a price, historical orders remain accurate and tamper-free.

## 5. Key Design Decisions

### 5.1 Stock Protection with Conditional Updates Inside Transactions
- **Decision:** Use conditional updates (`{ _id, isActive: true, stock: { $gte: qty } }` with `$inc: { stock: -qty }`) inside a MongoDB replica set transaction (`server/src/services/orderService.js`).
- **Alternatives Considered:** Checking the stock with `findOne`, validating the number in Node.js, and saving with `variant.save()`.
- **Reason:** Checking stock in application memory creates a race condition window where two concurrent requests read sufficient stock before either saves, causing overselling.
- **Trade-off:** MongoDB multi-document transactions require a replica set (`--replSet`), which adds minor setup overhead in local development.

### 5.2 Idempotency Keys for Checkout
- **Decision:** Require an `Idempotency-Key` header on checkout and store a SHA-256 hash of the request body with a unique compound index on `(userId, idempotencyKey)` (`server/src/services/orderService.js`, `server/src/utils/idempotency.js`).
- **Alternatives Considered:** Relying on client-side button disabling or tracking session IDs without request hashing.
- **Reason:** Button disabling does not stop network retries or programmatic duplicate requests. The SHA-256 request hash detects if a client attempts to reuse a key with a different address or payload.
- **Trade-off:** The client must generate and maintain an idempotency key in session storage across retries.

### 5.3 Order State Machine as a Single Module
- **Decision:** Define all valid state transitions in a centralized module (`server/src/services/orderStateMachine.js`) and enforce them with conditional updates on the current status.
- **Alternatives Considered:** Updating order status strings directly in controllers or admin endpoints.
- **Reason:** Centralizing rules ensures that transitions like `PLACED -> CANCELLED` and `SHIPPED -> DELIVERED` are defined in one place. A conditional update on `expectedStatus` returns `409 CONFLICT` if two admins try to change an order at the same time.
- **Trade-off:** Any new status transition must be explicitly coded into the state machine before endpoints can use it.

### 5.4 Money Stored as Integers in Paise
- **Decision:** Store and calculate all prices, subtotals, taxes, and shipping fees as integer minor units (paise) (`server/src/services/pricingService.js`).
- **Alternatives Considered:** Using JavaScript floating-point numbers (`Number`) with decimals.
- **Reason:** Floating-point arithmetic introduces rounding inaccuracies (e.g., `0.1 + 0.2 = 0.30000000000000004`), which lead to unbalanced ledgers.
- **Trade-off:** Currency formatting must be applied in the user interface using `Intl.NumberFormat`.

### 5.5 Authentication with JWT in httpOnly Cookies
- **Decision:** Sign a JWT containing the user ID and role, and transmit it in an `httpOnly`, `sameSite: 'lax'` cookie (`server/src/controllers/authController.js`, `server/src/middleware/auth.js`).
- **Alternatives Considered:** Storing the JWT in `localStorage` and passing it via the `Authorization: Bearer` header.
- **Reason:** Tokens stored in `localStorage` are vulnerable to extraction through Cross-Site Scripting (XSS). An `httpOnly` cookie cannot be read by client-side JavaScript.
- **Trade-off:** The API requires CORS credential configuration (`credentials: 'include'`).

### 5.6 Returning 404 Instead of 403 for Other Customers' Orders
- **Decision:** Return `404 NOT_FOUND` when a customer requests an order ID belonging to someone else (`server/src/services/orderService.js`).
- **Alternatives Considered:** Returning `403 FORBIDDEN`.
- **Reason:** Returning 403 confirms to an attacker that the order exists, allowing them to enumerate valid order IDs. Returning 404 reveals no information.
- **Trade-off:** Debugging client errors requires checking server logs, since the response does not explicitly mention permissions.

### 5.7 Append-Only Audit Log
- **Decision:** Store domain events in an `AuditLog` collection that has no update or delete endpoints (`server/src/models/AuditLog.js`, `server/src/services/auditService.js`).
- **Alternatives Considered:** Writing operational logs to text files on disk.
- **Reason:** Database-backed audit logs can be queried directly by admins through the dashboard and joined with user and entity IDs.
- **Trade-off:** The collection grows continuously and will eventually require archival policies in high-traffic deployments.

### 5.8 Reports Computed by Aggregation and Reconciliation Checks
- **Decision:** Compute total revenue and order counts dynamically using MongoDB aggregation pipelines, and verify database invariants using a reconciliation service (`server/src/services/reportService.js`).
- **Alternatives Considered:** Storing running totals on user or store documents.
- **Reason:** Running totals easily get out of sync during concurrent updates or failed transactions. Aggregating the underlying documents guarantees mathematical consistency.
- **Trade-off:** Aggregating large collections consumes more database CPU than reading a pre-computed counter.

## 6. Testing Strategy

The testing suite contains unit and integration tests:
- **Unit Tests (Jest):** Target isolated pure functions, including pricing calculations, tax rounding, free shipping thresholds, Zod schemas, request hashes, and state machine transitions.
- **Integration Tests (Jest + Supertest):** Run against the Express app and a real MongoDB replica set using `mongodb-memory-server` with the WiredTiger engine.
- **Frontend Component Tests (Vitest + Testing Library):** Verify loading, error, empty, and populated states for cart and checkout components.

### Acceptance Test Mapping
- **A1 (Full purchase flow):** Automated in `tests/integration/acceptance.test.js` under `A1`.
- **A2 (Concurrency and race condition on single-stock item):** Automated in `acceptance.test.js` under `A2` using `Promise.all`.
- **A3 (Parallel idempotency with identical and divergent payloads):** Automated in `acceptance.test.js` under `A3`.
- **A4 (Payment decline, stock restoration, and terminal state enforcement):** Automated in `acceptance.test.js` under `A4`.
- **A5 (Role protection, 404 order isolation, and reconciliation integrity):** Automated in `acceptance.test.js` under `A5`.

### Latest Test Results
```
Server (Jest)
PASS tests/integration/acceptance.test.js
PASS tests/unit/openapi.test.js
PASS tests/unit/validation.test.js
PASS tests/unit/pricing.test.js
PASS tests/unit/orderStateMachine.test.js
PASS tests/unit/idempotency.test.js

Test Suites: 6 passed, 6 total
Tests:       25 passed, 25 total

Client (Vitest)
PASS src/test/cartAndCheckout.test.jsx

Test Files:  1 passed, 1 total
Tests:       5 passed, 5 total
```
All 27 automated tests pass with 0 failures.

## 7. Security Notes

- **Password Hashing:** Passwords are hashed with `bcrypt` using 10 salt rounds before storage. Plaintext passwords are never saved or returned in JSON responses.
- **Cookie Security:** Auth cookies are set with `httpOnly: true`, `sameSite: 'lax'`, and enabled `secure` flags in production environments.
- **Input Validation:** Every endpoint validates request parameters, query strings, and request bodies using Zod schemas. Malformed inputs are rejected before reaching controllers.
- **What Is Not Covered:** Rate limiting and DDoS protection (e.g., Redis-based token buckets) are not implemented, and CORS is restricted to a single configured client origin.

## 8. Known Limitations and Future Work

### Real Limitations from the Code
1. **Simulated Payments:** Payments are simulated with a success or decline button. There is no real bank or payment gateway webhook handler.
2. **No Real Email Dispatch:** Orders and state changes are written to the database and audit logs, but no email notifications are dispatched.
3. **No File Uploads:** Product images must be provided as external HTTPS URLs. There is no multipart image upload pipeline.
4. **Single Currency:** All pricing logic assumes Indian Rupees (INR) represented in paise.

### Future Work
1. Integrate Stripe or Razorpay webhooks for real payment authorization and refunds.
2. Add background job workers (e.g., BullMQ) for sending transactional order emails.
3. Add multi-currency support with dynamic exchange rate lookups.
4. Support AWS S3 or Cloudinary for direct image uploads in the admin product form.

## 9. Conclusion

This project delivers a complete, modular-monolith e-commerce store with strict transactional integrity. By moving concurrency controls into database transactions and using deterministic state transitions, the system prevents overselling, duplicate charges, and data drift. The automated tests verify that all business rules, security boundaries, and accounting invariants hold true under concurrent load.

