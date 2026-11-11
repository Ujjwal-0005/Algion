# Acceptance Tests Guide

All automated tests use Jest, Supertest, and MongoMemoryReplSet (with WiredTiger replica set support).

## Acceptance Test 1 (A1)
- What it does:
  Registers a new customer, adds a delivery address, searches for a product in the catalogue, adds 2 units to the cart, checks out with an idempotency key, and simulates a successful payment.
- Proving result:
  The order status transitions to `PAID`, variant inventory decreases by 2, and the order is visible in both the customer's `/api/orders` list and the admin's `/api/admin/orders` portal.

## Acceptance Test 2 (A2)
- What it does:
  Creates an exclusive product with exactly 1 unit of stock. Two different customers add that item to their cart and execute checkout simultaneously using `Promise.all`.
- Proving result:
  Exactly one customer succeeds with HTTP 201, while the second receives HTTP 400 with code `INSUFFICIENT_STOCK`. Stock reaches 0 and is never negative. A subsequent negative admin inventory adjustment is rejected.

## Acceptance Test 3 (A3)
- What it does:
  Sends 5 identical checkout requests in parallel with the exact same `Idempotency-Key` and address payload. Then sends a 6th request reusing that same key but with a different address ID.
- Proving result:
  Exactly one order document exists in the database. All 5 parallel calls return successful HTTP 200/201 responses. The mismatched 6th call returns HTTP 409 `DUPLICATE_REQUEST`.

## Acceptance Test 4 (A4)
- What it does:
  Tests stock restoration and state rules across declined payments, order cancellations, and concurrent operations.
- Proving result:
  Simulated payment decline sets status to `PAYMENT_FAILED` and increments stock back up. Cancelling an order restores stock once; a second cancel returns `409 INVALID_TRANSITION`. Attempting to cancel a shipped order returns `409 INVALID_TRANSITION`. Concurrent payment and cancellation results in exactly one winner.

## Acceptance Test 5 (A5)
- What it does:
  Tests role security, data isolation, optimistic status concurrency, and mathematical system invariants.
- Proving result:
  Customer token on an admin route returns HTTP 403 `FORBIDDEN`. Requesting another customer's order ID returns HTTP 404 `NOT_FOUND` (preventing ID enumeration). Admin status change with stale `expectedStatus` returns HTTP 409 `CONFLICT`. The reconciliation endpoint confirms:
  1. Sum of daily revenue series equals gross revenue.
  2. Sum of order status counts equals total order count.
  3. Current stock plus reserved units equals initial stock plus audit-logged adjustments.

## Commands to Run Tests

```bash
# Run the entire test suite (backend & frontend)
npm test

# Run backend unit tests only
npm run test:unit

# Run backend integration acceptance tests only
npm run test:integration

# Run frontend tests only
npm --prefix client test
```

