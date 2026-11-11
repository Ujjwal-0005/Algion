# Modular-Monolith E-Commerce Web Application

This project is a modular-monolith e-commerce store built with MongoDB, Express, React with Vite, and Node.js.
It handles user registration, catalog search, cart operations, atomic checkout with inventory management, simulated payments, and admin auditing.
All currency is tracked as whole paise in the database to prevent floating-point calculation errors.

## Architecture

The system is a modular monolith where the client and server live in one repository. The React client communicates with the Express backend through JSON APIs, and the backend handles transactions directly on a MongoDB replica set.

```
+--------------------+        HTTP / JSON API        +--------------------+
|    React Client    | <===========================> |   Express Server   |
| (Vite, React Router|                               | (Routes/Controllers|
+--------------------+                               +---------+----------+
                                                               |
                                                               | Mongoose Driver
                                                               v
                                                     +--------------------+
                                                     | MongoDB Replica Set|
                                                     | (rs0, WiredTiger)  |
                                                     +--------------------+
```

The server is organized into four distinct layers:
- **Routes:** Define endpoint paths, HTTP verbs, and map request middleware. They do not contain application logic.
- **Controllers:** Read incoming HTTP requests, unpack payloads, invoke services, and return status codes with JSON responses. They never call Mongoose models directly.
- **Services:** Contain all domain rules, transactional checkout steps, state checks, and pricing logic. Only services speak to models.
- **Models:** Define Mongoose schemas, data types, field validators, and collection indexes.

## Tech Stack

- **Runtime:** Node.js v22.13.1
- **Backend Framework:** Express ^4.21.2
- **Database:** MongoDB 7.0 with Mongoose ^8.9.5
- **Frontend:** React ^19.3.1 with Vite ^8.3.6
- **Routing:** React Router ^7.1.3
- **Validation:** Zod ^3.24.1
- **Security:** bcrypt ^5.1.1, jsonwebtoken ^9.0.2, cookie-parser ^1.4.7
- **API Documentation:** Swagger UI Express ^5.0.1, YAMLJS ^0.3.0
- **Testing:** Jest ^29.7.0, Supertest ^7.0.0, mongodb-memory-server ^10.1.3, Vitest ^3.0.4, React Testing Library ^16.2.0

## Prerequisites

- **Node.js:** v20.0.0 or higher (v22.13.1 tested)
- **Docker & Docker Compose:** Docker version 20.10+ (v29 tested) with Compose v2+

## Setup

Follow these exact steps in order:

1. Clone the repository and navigate into it:
   ```bash
   git clone https://github.com/example/ecommerce-modular-monolith.git
   cd ecommerce-modular-monolith
   ```

2. Install all dependencies across the workspace:
   ```bash
   npm install
   npm --prefix server install
   npm --prefix client install
   ```

3. Create the environment file:
   ```bash
   cp .env.example .env
   ```
   The backend loads the root `.env` file directly (or `server/.env` if present), while the Vite client reads environment variables via the development proxy without needing a separate client `.env`.

4. Start the MongoDB replica set with Docker:
   ```bash
   docker compose up -d
   ```
   The `mongo-init` service in `docker-compose.yml` initiates the single-node replica set (`rs0`) automatically once the database is healthy. If you run MongoDB outside Docker, initiate it manually in mongosh:
   ```bash
   mongosh --eval 'rs.initiate({ _id: "rs0", members: [{ _id: 0, host: "localhost:27017" }] })'
   ```

5. Run database migrations to build indexes:
   ```bash
   npm run migrate
   ```

6. Seed the initial categories, products, admin, and test users:
   ```bash
   npm run seed
   ```

7. Start the backend server (runs on port 5000):
   ```bash
   npm run dev:server
   ```

8. In a second terminal, start the frontend client:
   ```bash
   npm run dev:client
   ```

9. Open your browser and navigate to:
   ```
   http://localhost:5173
   ```

## Environment Variables

These variables are defined in `.env.example`:

| Name | Example Value | Required/Optional | What It Does |
| --- | --- | --- | --- |
| `PORT` | `5000` | Optional | Port number for Express backend. Default is 5000. |
| `NODE_ENV` | `development` | Optional | Environment mode (`development`, `test`, `production`). |
| `MONGODB_URI` | `your_mongo_uri` | Required | Connection string to MongoDB replica set. |
| `JWT_SECRET` | `your_secret_key` | Required | Secret key used to sign and verify authentication JWTs. |
| `JWT_EXPIRES_IN` | `7d` | Optional | JWT lifetime (e.g., `7d` for seven days). |
| `COOKIE_SECRET` | `localcookiesecret1234567890` | Required | Secret string used by cookie-parser to sign cookies. |
| `CLIENT_URL` | `http://localhost:5173` | Required | Frontend origin URL allowed by CORS policy. |
| `TAX_RATE_BPS` | `1800` | Optional | GST tax rate in basis points (1800 bps = 18%). |
| `SHIPPING_FLAT_MINOR`| `4900` | Optional | Standard shipping fee in paise (4900 paise = ₹49). |
| `FREE_SHIPPING_MIN_MINOR` | `99900` | Optional | Minimum subtotal in paise for free shipping (99900 paise = ₹999). |
| `LOW_STOCK_THRESHOLD` | `5` | Optional | Stock quantity threshold for admin low-stock alert reporting. |

## Demo Credentials

These accounts are created by running `npm run seed`:

| Role | Email | Password |
| --- | --- | --- |
| Admin | `admin@example.com` | `Admin@12345` |
| Customer 1 | `customer1@example.com` | `Customer@12345` |
| Customer 2 | `customer2@example.com` | `Customer@12345` |

A promotional coupon `WELCOME10` is also created (10% discount on subtotals above ₹500).

## Database Setup

1. **Schema Creation:** Schemas are declared in Mongoose under `server/src/models`. Mongoose sets up collections and field validators when the application starts.
2. **Migrations:** Located in `server/migrations`. The script `npm run migrate` runs numbered migration files in sequence (such as `001_indexes.js`) and stores applied versions in a `migrations` collection so each runs only once.
3. **Database Resets:** To wipe and re-initialize the database from scratch, run:
   ```bash
   npm run seed -- --reset
   ```
   This clears existing documents from users, categories, products, variants, carts, coupons, orders, and audit logs before inserting fresh seed data.

## API Documentation

- Interactive Swagger UI: [http://localhost:5000/api/docs](http://localhost:5000/api/docs)
- Raw OpenAPI 3.0.3 specification: [docs/openapi.yaml](docs/openapi.yaml)
- API reference summary: [docs/api.md](docs/api.md)

## Database Diagram

The complete entity-relationship diagram and index listings are documented in [docs/database.md](docs/database.md).

## Test Commands

- **Run all test suites (server and client):**
  ```bash
  npm test
  ```
  Runs the Jest backend suite and the Vitest frontend suite.

- **Run backend unit tests only:**
  ```bash
  npm run test:unit
  ```
  Tests pure pricing math (discount caps, GST rounding, shipping thresholds), order state transitions, Zod validation schemas, and idempotency request-hash generation.

- **Run backend integration tests only:**
  ```bash
  npm run test:integration
  ```
  Runs Supertest against the Express app and an in-memory replica set. Covers Acceptance Tests A1 through A5 (concurrent purchases, race conditions on single-stock items, parallel idempotency checks, payment decline stock restoration, authorization isolation, and reconciliation audits).

## Demo Walkthrough

### Customer Purchase Flow
1. Open `http://localhost:5173/login` and log in with `customer1@example.com` / `Customer@12345`.
2. Browse `/catalogue` or type "mouse" into the search bar.
3. Click on "Ergonomic Wireless Mouse", choose an active variant, and click "Add to Cart".
4. Click "Cart" in the top bar. Enter coupon code `WELCOME10` and click "Apply".
5. Click "Proceed to Checkout", select the default shipping address, and click "Place Order".
6. On the simulated payment screen, click "Simulate Success". The status updates to `PAID`.
7. Go to "My Orders" to review the order summary and timeline.

### Admin Review Flow
1. Click "Logout" and log in with `admin@example.com` / `Admin@12345`.
2. Navigate to `/admin/orders` to see the customer order in status `PAID`.
3. Click "Manage" on the order and click "Mark as PACKED" to transition it.
4. Visit `/admin` (Dashboard) to verify the gross revenue card and verify that the green reconciliation banner reports that all database invariants pass.

## Project Structure

```
algion/
|-- client/               # React client application (Vite, React Router)
|   |-- src/              # React source code, contexts, pages, components
|   +-- package.json      # Client dependencies and test scripts
|-- server/               # Express backend application
|   |-- src/              # Server layers: routes, controllers, services, models
|   |-- migrations/       # Numbered migration files
|   |-- tests/            # Unit and integration test suites
|   +-- package.json      # Server dependencies and test scripts
|-- docs/                 # Architecture guides, API reference, technical report
|-- docker-compose.yml    # MongoDB 7.0 replica set configuration
|-- .env.example          # Sample environment variables
+-- package.json          # Root workspace configuration
```

## Known Limitations

- **Simulated Payments Only:** No live payment gateway (Stripe or Razorpay) is integrated. The outcome is chosen using success and decline simulation buttons.
- **Simulated Refunds:** Cancelling a paid order sets `payment.status` to `refunded_simulated` (while the order `status` becomes `CANCELLED`) and restores stock, but transfers no real money.
- **Customer Cancellation Restrictions:** Customers can only cancel orders in `PLACED` state. Orders in `PAID` state must be cancelled and refunded by an admin.
- **Address Limit:** Each user is restricted to a maximum of 10 embedded shipping addresses.
- **No Email Sending:** The app records orders and audits internally, but does not send confirmation emails.
- **Image URLs Only:** Products accept external image URL strings. There is no file upload or S3 bucket integration.
- **Single Currency:** The application only calculates in INR (paise). It does not support multi-currency exchanges.
- **Manual Status Updates:** Status changes (`PACKED`, `SHIPPED`, `DELIVERED`) are performed manually by admins through buttons. There is no shipping carrier API integration.

## Technical Report

For full architectural details, concurrency controls, and design decision rationales, read the [Technical Report](docs/TECHNICAL_REPORT.md).
