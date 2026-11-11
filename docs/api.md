# API Reference

The base URL for all endpoints is `http://localhost:5000/api`.

## Interactive Documentation & Specification

- **Swagger UI:** [http://localhost:5000/api/docs](http://localhost:5000/api/docs)
- **Raw OpenAPI 3.0.3 Spec:** [openapi.yaml](file:///d:/algion/docs/openapi.yaml) (served at `http://localhost:5000/api/docs/openapi.yaml`)

## Authentication

Authentication uses an `httpOnly`, `sameSite: 'lax'` cookie named `token`.
When a user calls `POST /api/auth/login` or `POST /api/auth/register`, the server issues a signed JWT in this cookie.
Subsequent browser requests include this cookie automatically with `credentials: 'include'`.
Calling `POST /api/auth/logout` clears the cookie.

## Standard Error Response

Every error response returns a single standard JSON structure:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request data",
    "details": [
      {
        "path": "email",
        "message": "Invalid email address"
      }
    ]
  }
}
```

## Error Codes

- `VALIDATION_ERROR` (400): Request body, parameter, or query does not match the Zod validation schema.
- `INSUFFICIENT_STOCK` (400): Requested quantity exceeds available variant inventory or admin delta would produce negative stock.
- `UNAUTHENTICATED` (401): Missing, expired, or invalid authentication token.
- `FORBIDDEN` (403): User role lacks permission to access the requested resource.
- `NOT_FOUND` (404): Requested document does not exist, or another customer's order was requested.
- `CONFLICT` (409): Resource violates a unique index constraint or concurrent admin expectedStatus check failed.
- `INVALID_TRANSITION` (409): Requested order state change is not allowed by the order state machine.
- `DUPLICATE_REQUEST` (409): Idempotency key was reused with a different request payload.
- `PAYMENT_DECLINED` (400): Payment simulator declined the transaction.
