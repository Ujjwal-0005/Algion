# How It Works

This guide follows one purchase from start to finish.

## Purchase Walkthrough

1. Customer logs in:
   - Page: `/login`
   - API: `POST /api/auth/login`
   - Database: Verifies user password hash with bcrypt. Sets an `httpOnly` JWT session cookie.

2. Customer searches catalogue:
   - Page: `/catalogue`
   - API: `GET /api/products?q=mouse`
   - Database: Runs MongoDB text search against `products` and queries active `variants` to return in-stock status and lowest price.

3. Customer selects a product:
   - Page: `/products/:slug`
   - API: `GET /api/products/:slug`
   - Database: Loads product details and all active variants with current stock availability.

4. Customer adds item to cart:
   - Page: `/products/:slug`
   - API: `POST /api/cart/items` with variant ID and quantity
   - Database: Validates stock. Upserts item in `carts` collection for this customer.

5. Customer reviews cart and checks out:
   - Page: `/cart` and `/checkout`
   - API: `POST /api/checkout` with header `Idempotency-Key` and body `{ addressId }`
   - Database: Starts a MongoDB transaction. Re-prices all lines from live variant prices. Decrements variant stock with conditional query `{ stock: { $gte: qty } }`. Creates order in `PLACED` status. Empties user cart. Writes `auditlogs` record.

6. Customer simulates payment:
   - Page: `/checkout` (simulated payment step)
   - API: `POST /api/orders/:id/pay` with `{ method: "simulated", outcome: "success" }`
   - Database: Conditionally updates status from `PLACED` to `PAID`. Marks `payment.status` as `captured`. Adds entry to `statusHistory` and writes audit log.

7. Admin views order and processes fulfillment:
   - Page: `/admin/orders`
   - API: `PATCH /api/admin/orders/:id/status` with `{ to: "PACKED", expectedStatus: "PAID" }`
   - Database: Verifies `expectedStatus`. Transitions order from `PAID` to `PACKED` in a transaction.

## The Three Main Protections

1. Stock Protection:
   - Stock lives on the variant with a schema constraint `min: 0`.
   - Checkout uses conditional decrement: `{ _id, stock: { $gte: qty } }`. If two people buy the last item at the exact same millisecond, the database updates one and rejects the second with `INSUFFICIENT_STOCK`.

2. Duplicate Order Protection:
   - Every checkout sends an `Idempotency-Key` header.
   - The database has a unique index on `(userId, idempotencyKey)`.
   - If a request is retried with the exact same payload, the server returns the existing order. If the payload differs, it returns `409 DUPLICATE_REQUEST`.

3. Role Protection:
   - Server middleware `requireAuth` verifies the JWT cookie.
   - Admin routes require `requireRole('admin')`. Regular customers receive `403 FORBIDDEN`.
   - When a customer requests an order that belongs to another customer, the server returns `404 NOT_FOUND` so order numbers cannot be probed.

