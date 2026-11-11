# Project Explained

Speaking notes for a short presentation.

Good morning! Today I want to walk you through the e-commerce web application I built using the MERN stack.

## The Problem
Many online stores face three critical problems:
1. Overselling: two customers buy the last item at the same second.
2. Duplicate orders: a customer double-clicks the purchase button or their network disconnects.
3. Accounting drift: floats cause rounding mistakes, or order totals do not match bank deposits.

## What I Built
I built a modular monolith with Node.js, Express, MongoDB with Mongoose, and a React Vite frontend.
The architecture enforces strict separation: routes call controllers, controllers call services, and only services interact with database models.
Every price is saved as an integer in minor units (paise). We never use floats.

## How a Purchase Works
1. A customer registers or logs in with their email and password.
2. They browse items with live text search, category filters, and price ranges.
3. They select a variant, add it to their cart, and review calculated discounts, 18% GST, and shipping.
4. During checkout, an Idempotency-Key header is generated.
5. In one atomic MongoDB transaction, stock is reserved and the order is placed.
6. The customer simulates payment: success moves the order to PAID, while a decline marks it PAYMENT_FAILED and immediately restores stock.

## How I Stopped Overselling
I put stock constraints in two places:
1. In the database schema: `stock` has `min: 0`.
2. In the query filter: during checkout, we update with `{ _id, stock: { $gte: quantity } }` and `$inc: { stock: -quantity }`.
If two people try to buy the last unit at the exact same moment, only one update matches. The second is rejected with `INSUFFICIENT_STOCK`.

## How I Stopped Duplicate Orders
I used idempotency keys and request hashes.
When an order is created, we store the user ID, the idempotency key, and a SHA-256 hash of the checkout payload.
If the frontend sends the same request five times in parallel, the database checks the compound unique index and returns the existing order. If someone reuses the key with different items or addresses, the system rejects it with `409 DUPLICATE_REQUEST`.

## How I Tested It
I wrote unit tests with Jest for pure pricing math, state machine transitions, and Zod validation schemas.
I wrote integration tests with Supertest against an in-memory replica set.
All acceptance tests pass:
- Race conditions on the last inventory unit.
- Parallel duplicate checkout attempts.
- Order cancellations and stock restoration.
- Reconciliation checks that verify every single rupee and inventory unit.

## What I Would Add Next
If I had more time, I would connect a real payment gateway webhook like Stripe or Razorpay, add transactional email notifications, and support customer product reviews.

Thank you!

