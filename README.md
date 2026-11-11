# Modular-Monolith E-Commerce Web Application

A full-stack modular-monolith e-commerce store built with the MERN stack (MongoDB, Express, React with Vite, Node.js).
It guarantees transactional stock safety, prevents duplicate orders with idempotency keys, and provides an admin operations portal.
All monetary amounts are stored as whole paise (integers) to prevent floating-point rounding errors.

## Requirements

- Node.js v20+ or v22+
- Docker and Docker Compose (for running MongoDB replica set)

## Setup Steps

1. Install root, server, and client dependencies:
   ```bash
   npm install
   npm --prefix server install
   npm --prefix client install
   ```

2. Copy environment configuration:
   ```bash
   cp .env.example .env
   ```

3. Start MongoDB replica set:
   ```bash
   docker compose up -d
   ```

4. Run database migrations:
   ```bash
   npm run migrate
   ```

5. Seed database with initial catalog, admin, and test users:
   ```bash
   npm run seed
   ```
   *(To wipe and reseed clean collections, run `npm run seed -- --reset`)*

6. Start server and client:
   ```bash
   # Terminal 1: backend server on http://localhost:5000
   npm run dev:server

   # Terminal 2: frontend client on http://localhost:5173
   npm run dev:client
   ```

## Seeded Test Accounts

- Admin: `admin@example.com` / `Admin@12345`
- Customer 1: `customer1@example.com` / `Customer@12345`
- Customer 2: `customer2@example.com` / `Customer@12345`
- Coupon: `WELCOME10` (10% off, minimum subtotal ₹500)

## Run Tests

```bash
# Run all backend and frontend tests
npm test

# Run backend unit tests only
npm run test:unit

# Run backend integration tests only
npm run test:integration
```

## Try It (5 Steps)

1. Open `http://localhost:5173/login` in your browser and sign in with `customer1@example.com` / `Customer@12345`.
2. Browse the catalogue, open "Ergonomic Wireless Mouse", select a variant, and click "Add to Cart".
3. Open the Cart, verify the line totals and 18% GST calculation, then click "Proceed to Checkout".
4. Select the default address, click "Place Order", and on the payment screen choose "Simulate Success".
5. Log out, sign in with `admin@example.com` / `Admin@12345`, open `/admin/orders` to see the new order in state `PAID`, and check `/admin` to verify that the reconciliation report passes.

## Assumptions

- No email notifications, image uploads, multi-currency conversions, or external payment gateways are included.
- Tax rate is set to 18% GST (1800 basis points) on post-discount subtotal.
- Flat shipping is ₹49 (4900 paise), and shipping is free for post-discount subtotals of ₹999 (99900 paise) or more.
- Low stock threshold is configured at 5 units.

## Documentation Links

- [How It Works](file:///d:/algion/docs/how-it-works.md)
- [Database Models & Indexes](file:///d:/algion/docs/database.md)
- [Order Status State Machine](file:///d:/algion/docs/order-status.md)
- [API Reference](file:///d:/algion/docs/api.md)
- [Acceptance Tests Guide](file:///d:/algion/docs/tests.md)
- [Project Explained (Presentation)](file:///d:/algion/docs/project-explained.md)

