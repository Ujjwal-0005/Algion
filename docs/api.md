# API Reference

All requests and responses use JSON. All error responses share a single shape:
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request data",
    "details": []
  }
}
```

Sample Request:
`POST /api/checkout`
```json
{
  "addressId": "65b9e0f11a4362b8cf1034ab"
}
```

## Authentication Routes
| Method | Path | Allowed Roles | Description | Main Error Codes |
| --- | --- | --- | --- | --- |
| POST | `/api/auth/register` | Public | Register customer account | VALIDATION_ERROR, CONFLICT |
| POST | `/api/auth/login` | Public | Log in and receive JWT cookie | UNAUTHENTICATED |
| POST | `/api/auth/logout` | Authenticated | Clears auth cookie | None |
| GET | `/api/auth/me` | Authenticated | Get current user profile | UNAUTHENTICATED |
| POST | `/api/auth/addresses` | Authenticated | Add address to profile | VALIDATION_ERROR |
| PATCH | `/api/auth/addresses/:id` | Authenticated | Update user address | NOT_FOUND |
| DELETE | `/api/auth/addresses/:id` | Authenticated | Remove user address | NOT_FOUND |

## Product & Catalogue Routes
| Method | Path | Allowed Roles | Description | Main Error Codes |
| --- | --- | --- | --- | --- |
| GET | `/api/categories` | Public | List active categories | None |
| GET | `/api/products` | Public | Search and filter catalog | None |
| GET | `/api/products/:slug` | Public | Get product details & variants | NOT_FOUND |

## Cart Routes
| Method | Path | Allowed Roles | Description | Main Error Codes |
| --- | --- | --- | --- | --- |
| GET | `/api/cart` | Customer | Get priced cart and warnings | UNAUTHENTICATED |
| POST | `/api/cart/items` | Customer | Add variant to cart | INSUFFICIENT_STOCK, VALIDATION_ERROR |
| PATCH | `/api/cart/items/:id` | Customer | Update item quantity | INSUFFICIENT_STOCK, VALIDATION_ERROR |
| DELETE | `/api/cart/items/:id` | Customer | Remove item from cart | UNAUTHENTICATED |
| POST | `/api/cart/coupon` | Customer | Apply coupon code | NOT_FOUND, VALIDATION_ERROR |
| DELETE | `/api/cart/coupon` | Customer | Remove applied coupon | UNAUTHENTICATED |

## Checkout & Orders Routes
| Method | Path | Allowed Roles | Description | Main Error Codes |
| --- | --- | --- | --- | --- |
| POST | `/api/checkout` | Customer | Place order with Idempotency-Key | INSUFFICIENT_STOCK, DUPLICATE_REQUEST, VALIDATION_ERROR |
| GET | `/api/orders` | Customer | List customer orders | UNAUTHENTICATED |
| GET | `/api/orders/:id` | Customer | View customer order details | NOT_FOUND |
| POST | `/api/orders/:id/pay` | Customer | Simulate payment outcome | INVALID_TRANSITION, VALIDATION_ERROR |
| POST | `/api/orders/:id/cancel`| Customer | Cancel order in PLACED or PAID | INVALID_TRANSITION, NOT_FOUND |

## Admin Routes (Requires admin role)
| Method | Path | Allowed Roles | Description | Main Error Codes |
| --- | --- | --- | --- | --- |
| GET | `/api/admin/categories` | Admin | List all categories | FORBIDDEN |
| POST | `/api/admin/categories` | Admin | Create category | CONFLICT, VALIDATION_ERROR |
| PATCH | `/api/admin/categories/:id`| Admin | Update category | NOT_FOUND |
| DELETE| `/api/admin/categories/:id`| Admin | Delete or deactivate category | NOT_FOUND |
| GET | `/api/admin/products` | Admin | List products with variants | FORBIDDEN |
| POST | `/api/admin/products` | Admin | Create product with variants | VALIDATION_ERROR |
| PATCH | `/api/admin/products/:id` | Admin | Update product | NOT_FOUND |
| DELETE| `/api/admin/products/:id` | Admin | Deactivate product | NOT_FOUND |
| POST | `/api/admin/variants/:id/stock-adjustments` | Admin | Adjust variant inventory | INSUFFICIENT_STOCK, VALIDATION_ERROR |
| GET | `/api/admin/inventory/low-stock` | Admin | List low-stock items | FORBIDDEN |
| GET | `/api/admin/orders` | Admin | List orders with filters | FORBIDDEN |
| GET | `/api/admin/orders/:id` | Admin | Get order details | NOT_FOUND |
| PATCH | `/api/admin/orders/:id/status` | Admin | Change order status safely | CONFLICT, INVALID_TRANSITION |
| GET | `/api/admin/customers` | Admin | List customers with order count | FORBIDDEN |
| GET | `/api/admin/customers/:id` | Admin | Inspect customer order history | NOT_FOUND |
| GET | `/api/admin/coupons` | Admin | List all coupons | FORBIDDEN |
| POST | `/api/admin/coupons` | Admin | Create new coupon | CONFLICT, VALIDATION_ERROR |
| DELETE| `/api/admin/coupons/:id` | Admin | Deactivate coupon | NOT_FOUND |
| GET | `/api/admin/audit-logs` | Admin | View immutable audit trail | FORBIDDEN |
| GET | `/api/admin/reports/summary` | Admin | Aggregated sales metrics | FORBIDDEN |
| GET | `/api/admin/reports/reconciliation` | Admin | System invariants health check | FORBIDDEN |

