# POS Backend – API Reference

> **Version:** v1 · **Base URL:** `http://localhost:5000`  
> **API Prefix:** `/api/v1` (except `/api/health`)

---

## Table of Contents

1. [Common Conventions](#common-conventions)  
2. [Health](#health)  
3. [Authentication & Users](#authentication--users)  
4. [Roles & Permissions](#roles--permissions)  
5. [Admin](#admin)  
6. [Master Data](#master-data)  
   - [Categories](#categories)  
   - [Products](#products)  
   - [Units](#units)  
   - [Branches](#branches)  
   - [Warehouses](#warehouses)  
   - [Customers](#customers)  
   - [Suppliers](#suppliers)  
7. [Sales](#sales)  
   - [Sales Orders](#sales-orders)  
   - [Invoices](#invoices)  
8. [Purchase](#purchase)  
   - [Purchase Orders](#purchase-orders)  
   - [Goods Receipts](#goods-receipts)  
   - [Purchase Returns](#purchase-returns)  
9. [Operations](#operations)  
   - [Sales Returns](#sales-returns)  
   - [Delivery Orders](#delivery-orders)  
   - [Stock Transfers](#stock-transfers)  
10. [Inventory](#inventory)  
11. [Financial](#financial)  
    - [Payments](#payments)  
    - [Debt Ledger](#debt-ledger)  
    - [Accounting](#accounting)  
    - [Operating Expenses](#operating-expenses)  
12. [Reports](#reports)  

---

## Common Conventions

### Required Headers

| Header | Value | Notes |
|---|---|---|
| `Content-Type` | `application/json` | For POST/PUT requests |
| `Authorization` | `Bearer <accessToken>` | All protected endpoints |
| `X-Tenant-Id` | `<tenantId>` (UUID) | All endpoints (public login/refresh included) |

### Roles (least → most privileged)

| Role | Description |
|---|---|
| `Staff` | Read-only on most resources |
| `Manager` | Create / update most business documents |
| `Admin` | Full access, including delete and seed |

Custom roles with fine-grained permissions are supported via the Roles API.

### Response Envelope

Every response is wrapped in:

```json
{
  "success": true,
  "message": "string",
  "data": {},
  "errors": null,
  "traceId": "string"
}
```

- On **success** — `success: true`, `data` contains the payload.
- On **error** — `success: false`, `data: null`, `errors` contains an array of error strings.

### Paginated Response

List endpoints return:

```json
{
  "success": true,
  "data": {
    "items": [],
    "totalCount": 100,
    "page": 1,
    "pageSize": 20
  }
}
```

### Standard Error Codes

| Status | Meaning |
|---|---|
| `400` | Bad request – missing field, wrong type, invalid Guid |
| `401` | Unauthenticated – missing or expired JWT |
| `403` | Forbidden – role / permission insufficient |
| `404` | Entity not found |
| `409` | Conflict – duplicate code, state machine violation |
| `422` | Validation failed (FluentValidation) |
| `429` | Rate limit exceeded |
| `500` | Unexpected server error |

### Rate Limiting

| Group | Limit |
|---|---|
| Auth endpoints (`/api/v1/auth/*`) | 10 requests / minute |
| All other endpoints | 200 requests / minute |

---

## Health

> No authentication required.

---

### `GET /api/health`

Returns overall health status.

**Response `200 OK`**
```json
{ "status": "Healthy", "totalDuration": "00:00:00.012" }
```

---

### `GET /api/health/version`

Returns application version information.

**Response `200 OK`**
```json
{ "version": "1.0.0", "environment": "Development" }
```

---

## Authentication & Users

> Base path: `/api/v1/auth`  
> Rate limited: **10 req/min**

---

### `POST /api/v1/auth/login`

Authenticate and obtain JWT tokens.  
**Auth:** None. **X-Tenant-Id:** Required.

**Request Body**
```json
{
  "username": "admin",
  "password": "Admin@123"
}
```

| Field | Type | Required | Notes |
|---|---|---|---|
| `username` | string | ✅ | Min 3 chars |
| `password` | string | ✅ | Min 6 chars |

**Response Cases**

| Status | Condition | Example `data` |
|---|---|---|
| `200 OK` | Valid credentials | `AuthTokenResponse` (see below) |
| `400` | Missing fields | `errors: ["Username is required"]` |
| `401` | Wrong username or password | `message: "Invalid credentials"` |
| `404` | Tenant not found | `message: "Tenant not found"` |
| `422` | Validation failed | `errors: ["Password must be at least 6 characters"]` |
| `429` | Rate limit | `message: "Too many requests"` |

**`AuthTokenResponse`**
```json
{
  "accessToken": "eyJhbGci...",
  "refreshToken": "dGhpcyBpcyBh...",
  "expiresAt": "2024-01-01T12:00:00Z",
  "tokenType": "Bearer"
}
```

---

### `POST /api/v1/auth/refresh`

Obtain a new access token using a refresh token.  
**Auth:** None. **X-Tenant-Id:** Required.

**Request Body**
```json
{ "refreshToken": "dGhpcyBpcyBh..." }
```

**Response Cases**

| Status | Condition |
|---|---|
| `200 OK` | New `AuthTokenResponse` returned |
| `401` | Refresh token expired or invalid |
| `404` | Tenant not found |

---

### `POST /api/v1/auth/register`

Register a new user. **Role: Admin**

**Request Body**
```json
{
  "username": "john.doe",
  "email": "john@example.com",
  "password": "Secret@123",
  "fullName": "John Doe",
  "role": "Staff",
  "isAllBranches": false
}
```

| Field | Type | Required | Notes |
|---|---|---|---|
| `username` | string | ✅ | Min 3, max 50 |
| `email` | string | ✅ | Valid email |
| `password` | string | ✅ | Min 6 chars |
| `fullName` | string | ✅ | Max 100 |
| `role` | enum | ❌ | `Staff` (default), `Manager`, `Admin` |
| `isAllBranches` | bool | ❌ | `false` (default) |

**Response Cases**

| Status | Condition |
|---|---|
| `201 Created` | `UserDto` created |
| `400` | Bad request |
| `401` | Not authenticated |
| `403` | Not Admin |
| `409` | Username already exists |
| `422` | Validation failed |

---

### `POST /api/v1/auth/logout`

Revoke the current user's refresh token. **Auth: Required**

**Request Body:** _(none)_

| Status | Condition |
|---|---|
| `200 OK` | Logged out successfully |
| `401` | Not authenticated |

---

### `POST /api/v1/auth/change-password`

Change the authenticated user's password. **Auth: Required**

**Request Body**
```json
{
  "currentPassword": "OldPass@1",
  "newPassword": "NewPass@1",
  "confirmNewPassword": "NewPass@1"
}
```

| Status | Condition |
|---|---|
| `200 OK` | Password changed |
| `400` | New passwords don't match |
| `401` | Not authenticated or wrong current password |
| `422` | Validation failed |

---

### `GET /api/v1/auth/me`

Get current authenticated user's profile. **Auth: Required**

**Response `200 OK`** — `UserDto`
```json
{
  "id": "00000000-0000-0000-0000-000000000001",
  "username": "admin",
  "email": "admin@tenant.com",
  "fullName": "System Admin",
  "status": "Active",
  "tenantId": "00000000-0000-0000-0000-000000000002",
  "isAllBranches": true,
  "branchIds": [],
  "roleIds": ["00000000-0000-0000-0000-000000000003"]
}
```

| Status | Condition |
|---|---|
| `200 OK` | Profile returned |
| `401` | Not authenticated |

---

### `GET /api/v1/auth/users`

List all users. **Role: Admin**

**Query Parameters**

| Param | Type | Default | Notes |
|---|---|---|---|
| `keyword` | string | — | Search username/email/fullName |
| `status` | enum | — | `Active`, `Inactive` |
| `page` | int | 1 | |
| `pageSize` | int | 20 | |

| Status | Condition |
|---|---|
| `200 OK` | `PagedResult<UserDto>` |
| `401` | Not authenticated |
| `403` | Not Admin |

---

### `GET /api/v1/auth/users/{id}`

Get a specific user. **Role: Admin**

| Status | Condition |
|---|---|
| `200 OK` | `UserDto` |
| `401` | Not authenticated |
| `403` | Not Admin |
| `404` | User not found |

---

### `PUT /api/v1/auth/users/{id}`

Update a user's status and branch access. **Role: Admin**

**Request Body**
```json
{
  "status": "Active",
  "isAllBranches": false
}
```

| Status | Condition |
|---|---|
| `200 OK` | `UserDto` updated |
| `401` / `403` | Auth/role error |
| `404` | User not found |

---

### `POST /api/v1/auth/users/{id}/branches`

Assign branches to a user (replaces existing). **Role: Admin**

**Request Body**
```json
{
  "branchIds": ["00000000-0000-0000-0000-000000000010"],
  "isAllBranches": false
}
```

| Status | Condition |
|---|---|
| `200 OK` | Branches updated |
| `400` | Invalid branch IDs |
| `403` | Not Admin |
| `404` | User not found |

---

### `POST /api/v1/auth/users/{id}/roles`

Assign roles to a user (replaces existing). **Role: Admin**

**Request Body**
```json
{
  "roleIds": ["00000000-0000-0000-0000-000000000020"]
}
```

| Status | Condition |
|---|---|
| `200 OK` | Roles updated |
| `403` | Not Admin |
| `404` | User / role not found |

---

### `GET /api/v1/auth/login-history`

Get login history. **Auth: Required** (own history), Admin can query any user via `userId` param.

**Query Parameters**

| Param | Type | Default | Notes |
|---|---|---|---|
| `userId` | Guid | — | Admin only; omit for own history |
| `fromDate` | datetime | — | |
| `toDate` | datetime | — | |
| `page` | int | 1 | |
| `pageSize` | int | 20 | |

**Response `200 OK`** — `PagedResult<LoginHistoryDto>`
```json
{
  "items": [{
    "id": "...",
    "userId": "...",
    "username": "admin",
    "ipAddress": "127.0.0.1",
    "userAgent": "PostmanRuntime/7.x",
    "isSuccess": true,
    "failureReason": null,
    "loginAt": "2024-01-01T10:00:00Z"
  }],
  "totalCount": 1,
  "page": 1,
  "pageSize": 20
}
```

---

## Roles & Permissions

> Base path: `/api/v1/roles`  
> **Role required: Admin** for all endpoints

---

### `GET /api/v1/roles`

List all roles.

**Response `200 OK`** — `IEnumerable<RoleDto>`

---

### `GET /api/v1/roles/{id}`

Get a role by ID.

| Status | Condition |
|---|---|
| `200 OK` | `RoleDto` with permissions |
| `404` | Role not found |

---

### `POST /api/v1/roles`

Create a new role.

**Request Body**
```json
{
  "name": "Warehouse Manager",
  "description": "Manages warehouse operations"
}
```

| Status | Condition |
|---|---|
| `201 Created` | `RoleDto` |
| `409` | Role name already exists |
| `422` | Validation failed |

---

### `PUT /api/v1/roles/{id}`

Update a role.

**Request Body**
```json
{
  "name": "Warehouse Manager",
  "description": "Updated description"
}
```

| Status | Condition |
|---|---|
| `200 OK` | `RoleDto` updated |
| `404` | Role not found |
| `409` | Duplicate name |

---

### `DELETE /api/v1/roles/{id}`

Delete a role.

| Status | Condition |
|---|---|
| `200 OK` | Deleted |
| `400` | Cannot delete system role |
| `404` | Role not found |
| `409` | Role is still assigned to users |

---

### `PUT /api/v1/roles/{id}/permissions`

Replace the permissions assigned to a role.

**Request Body**
```json
{
  "permissionIds": ["00000000-0000-0000-0000-000000000001"]
}
```

| Status | Condition |
|---|---|
| `200 OK` | Updated `RoleDto` |
| `404` | Role or permission not found |

---

### `GET /api/v1/roles/permissions`

List all available system permissions.

**Response `200 OK`** — `IEnumerable<PermissionDto>`
```json
[{
  "id": "...",
  "code": "products.read",
  "name": "View Products",
  "group": "Products",
  "description": null
}]
```

---

## Admin

> **Role required: Admin**

---

### `POST /api/v1/admin/seed`

Seed initial data (tenant, admin user, master data). Used for first-time setup.

| Status | Condition |
|---|---|
| `200 OK` | Seed completed |
| `409` | Data already seeded |
| `403` | Not Admin |

---

## Master Data

---

### Categories

> Base path: `/api/v1/categories`

#### `GET /api/v1/categories`

List categories. **Auth: Required**

| Param | Type | Default |
|---|---|---|
| `keyword` | string | — |
| `status` | enum | — |
| `page` | int | 1 |
| `pageSize` | int | 20 |

**Response `200 OK`** — `PagedResult<CategoryDto>`

---

#### `GET /api/v1/categories/{id}`

Get a category by ID. **Auth: Required**

| Status | Condition |
|---|---|
| `200 OK` | `CategoryDto` |
| `404` | Not found |

---

#### `POST /api/v1/categories`

Create a category. **Role: Manager**

**Request Body**
```json
{
  "code": "CAT001",
  "name": "Beverages",
  "description": "All drink products",
  "parentCategoryId": null
}
```

| Status | Condition |
|---|---|
| `201 Created` | `CategoryDto` |
| `409` | Duplicate code |
| `422` | Validation failed |

---

#### `PUT /api/v1/categories/{id}`

Update a category. **Role: Manager**

**Request Body** — same fields as create plus `status`

| Status | Condition |
|---|---|
| `200 OK` | `CategoryDto` updated |
| `404` | Not found |
| `409` | Duplicate code |

---

#### `DELETE /api/v1/categories/{id}`

Delete a category. **Role: Admin**

| Status | Condition |
|---|---|
| `200 OK` | Deleted |
| `400` | Category has products |
| `404` | Not found |

---

### Products

> Base path: `/api/v1/products`

**`ProductDto` fields:**

| Field | Type | Notes |
|---|---|---|
| `id` | Guid | |
| `code` | string | Unique |
| `name` | string | |
| `description` | string? | |
| `categoryId` | Guid | |
| `categoryName` | string | |
| `baseUnitId` | Guid | |
| `baseUnitName` | string | |
| `purchaseUnitId` | Guid | |
| `purchaseUnitName` | string | |
| `sellingPrice` | decimal | |
| `costPrice` | decimal | |
| `vatRate` | decimal | e.g. 0.1 = 10% |
| `barcode` | string? | |
| `status` | enum | `Active`, `Inactive` |

---

#### `GET /api/v1/products`

List products. **Auth: Required**

| Param | Type | Default |
|---|---|---|
| `keyword` | string | — |
| `categoryId` | Guid | — |
| `status` | enum | — |
| `page` | int | 1 |
| `pageSize` | int | 20 |

**Response `200 OK`** — `PagedResult<ProductDto>`

---

#### `GET /api/v1/products/{id}`

Get product by ID. **Auth: Required**

| Status | Condition |
|---|---|
| `200 OK` | `ProductDto` |
| `404` | Not found |

---

#### `POST /api/v1/products`

Create a product. **Role: Manager**

**Request Body**
```json
{
  "code": "P001",
  "name": "Coca Cola 330ml",
  "description": "Carbonated beverage",
  "categoryId": "00000000-0000-0000-0000-000000000001",
  "baseUnitId": "00000000-0000-0000-0000-000000000002",
  "purchaseUnitId": "00000000-0000-0000-0000-000000000002",
  "sellingPrice": 15000,
  "costPrice": 10000,
  "vatRate": 0.1,
  "barcode": "8935049100001"
}
```

| Status | Condition |
|---|---|
| `201 Created` | `ProductDto` |
| `409` | Duplicate code |
| `422` | Validation failed |

---

#### `PUT /api/v1/products/{id}`

Update a product. **Role: Manager**

**Request Body** — same as create plus `status`

---

#### `DELETE /api/v1/products/{id}`

Delete a product. **Role: Admin**

| Status | Condition |
|---|---|
| `200 OK` | Deleted |
| `400` | Product has order lines |
| `404` | Not found |

---

### Units

> Base path: `/api/v1/units`  
> Standard CRUD. **Read:** Any auth. **Create/Update:** Manager. **Delete:** Admin.

**Request Body (create/update)**
```json
{
  "code": "PCS",
  "name": "Piece",
  "description": null
}
```

| Field | Type | Required |
|---|---|---|
| `code` | string | ✅ |
| `name` | string | ✅ |
| `description` | string? | ❌ |

**Response Cases** (same pattern for all master data):

| Status | Condition |
|---|---|
| `200 OK` | Get / update |
| `201 Created` | Create |
| `404` | Not found |
| `409` | Duplicate code |
| `422` | Validation failed |

---

### Branches

> Base path: `/api/v1/branches`  
> **Write: Admin only**

---

#### `GET /api/v1/branches/tree`

Returns branch hierarchy as a tree. **Auth: Required**

**Response `200 OK`** — `IEnumerable<BranchDto>` (nested `subBranches`)

---

#### `GET /api/v1/branches`

List branches (flat, paginated). **Auth: Required**

| Param | Type | Default |
|---|---|---|
| `keyword` | string | — |
| `status` | enum | — |
| `page` | int | 1 |
| `pageSize` | int | 20 |

---

#### `GET /api/v1/branches/{id}`

Get a branch by ID. **Auth: Required**

---

#### `POST /api/v1/branches`

Create a branch. **Role: Admin**

**Request Body**
```json
{
  "code": "HCM-01",
  "name": "Ho Chi Minh – Branch 1",
  "address": "123 Nguyen Hue, Q1",
  "phone": "0901234567",
  "parentBranchId": null
}
```

---

#### `PUT /api/v1/branches/{id}`

Update a branch. **Role: Admin**

**Request Body** — same as create plus `status`

---

#### `DELETE /api/v1/branches/{id}`

Delete a branch. **Role: Admin**

| Status | Condition |
|---|---|
| `200 OK` | Deleted |
| `400` | Branch has sub-branches or users |
| `404` | Not found |

---

### Warehouses

> Base path: `/api/v1/warehouses`  
> **Read:** Any auth. **Write:** Manager/Admin.

**Request Body (create)**
```json
{
  "code": "WH001",
  "name": "Main Warehouse",
  "address": "456 Industrial Zone",
  "branchId": "00000000-0000-0000-0000-000000000001"
}
```

---

### Customers

> Base path: `/api/v1/customers`  
> **Read:** Any auth. **Create/Update:** Manager. **Delete:** Admin.

**`CustomerDto` fields:**

| Field | Type |
|---|---|
| `id` | Guid |
| `code` | string |
| `name` | string |
| `phone` | string? |
| `email` | string? |
| `address` | string? |
| `taxCode` | string? |
| `creditLimit` | decimal |
| `paymentTermDays` | int |
| `openingBalance` | decimal |
| `status` | enum |

**Request Body (create)**
```json
{
  "code": "CUS001",
  "name": "Nguyen Van A",
  "phone": "0901234567",
  "email": "nguyenvana@email.com",
  "address": "789 Le Loi, Q3",
  "taxCode": null,
  "creditLimit": 10000000,
  "paymentTermDays": 30,
  "openingBalance": 0
}
```

**Query Params (list):** `keyword`, `status`, `page`, `pageSize`

---

### Suppliers

> Base path: `/api/v1/suppliers`  
> Same structure as Customers. **Read:** Any auth. **Write:** Manager/Admin.

**Request Body (create)**
```json
{
  "code": "SUP001",
  "name": "ABC Trading Co.",
  "phone": "0287654321",
  "email": "contact@abc.com",
  "address": "100 Cong Hoa",
  "taxCode": "0123456789",
  "creditLimit": 50000000,
  "paymentTermDays": 30,
  "openingBalance": 0
}
```

---

## Sales

### Sales Orders

> Base path: `/api/v1/sales-orders`

---

#### `GET /api/v1/sales-orders`

List sales orders. **Auth: Required**

**Query Parameters**

| Param | Type | Default |
|---|---|---|
| `customerId` | Guid | — |
| `status` | enum | — |
| `fromDate` | datetime | — |
| `toDate` | datetime | — |
| `page` | int | 1 |
| `pageSize` | int | 20 |

**`DocumentStatus` enum:** `Draft`, `Confirmed`, `Cancelled`, `Completed`

---

#### `GET /api/v1/sales-orders/{id}`

Get a sales order. **Auth: Required**

---

#### `POST /api/v1/sales-orders`

Create a draft sales order. **Auth: Required**

**Request Body**
```json
{
  "customerId": "00000000-0000-0000-0000-000000000001",
  "orderDate": "2024-01-15T10:00:00Z",
  "note": "Urgent order",
  "lines": [
    {
      "productId": "00000000-0000-0000-0000-000000000010",
      "unitId": "00000000-0000-0000-0000-000000000002",
      "quantity": 10,
      "unitPrice": 15000,
      "discountAmount": 0,
      "vatRate": 0.1
    }
  ]
}
```

| Field | Type | Required | Notes |
|---|---|---|---|
| `customerId` | Guid? | ❌ | null = walk-in customer |
| `orderDate` | datetime | ✅ | |
| `note` | string? | ❌ | |
| `lines` | array | ✅ | Min 1 line |
| `lines[].productId` | Guid | ✅ | |
| `lines[].unitId` | Guid | ✅ | |
| `lines[].quantity` | decimal | ✅ | > 0 |
| `lines[].unitPrice` | decimal | ✅ | >= 0 |
| `lines[].discountAmount` | decimal | ❌ | default 0 |
| `lines[].vatRate` | decimal | ❌ | default 0 (e.g. 0.1 = 10%) |

| Status | Condition |
|---|---|
| `201 Created` | `SalesOrderDto` |
| `404` | Product / customer / unit not found |
| `422` | Validation failed |

---

#### `PUT /api/v1/sales-orders/{id}`

Update a draft sales order. **Auth: Required**

> Only allowed if status is `Draft`

**Request Body** — same as create.

| Status | Condition |
|---|---|
| `200 OK` | Updated `SalesOrderDto` |
| `400` | Order is not in Draft status |
| `404` | Not found |

---

#### `POST /api/v1/sales-orders/{id}/confirm`

Confirm a sales order, allocating inventory. **Role: Manager**

**Request Body** _(optional)_
```json
{ "warehouseId": "00000000-0000-0000-0000-000000000001" }
```

| Status | Condition |
|---|---|
| `200 OK` | `SalesOrderDto` confirmed |
| `400` | Already confirmed / cancelled |
| `409` | Insufficient stock |
| `404` | Not found |

---

#### `POST /api/v1/sales-orders/{id}/cancel`

Cancel a sales order. **Role: Manager**

**Request Body** _(optional)_
```json
{ "reason": "Customer cancelled" }
```

| Status | Condition |
|---|---|
| `200 OK` | Cancelled |
| `400` | Already confirmed / completed |
| `404` | Not found |

---

### Invoices

> Base path: `/api/v1/invoices`  
> Invoices are auto-generated when a Sales Order is confirmed.  
> **Auth: Required** (read-only)

---

#### `GET /api/v1/invoices`

List invoices.

**Query Parameters**

| Param | Type |
|---|---|
| `customerId` | Guid |
| `status` | enum |
| `fromDate` | datetime |
| `toDate` | datetime |
| `page` | int |
| `pageSize` | int |

---

#### `GET /api/v1/invoices/{id}`

Get an invoice.

**`InvoiceDto` includes:** `paidAmount`, `remainingAmount`, `paymentMethod`, `lines[]`

---

## Purchase

### Purchase Orders

> Base path: `/api/v1/purchase-orders`

---

#### `GET /api/v1/purchase-orders`

List purchase orders. **Auth: Required**

**Query params:** `supplierId`, `status`, `fromDate`, `toDate`, `page`, `pageSize`

---

#### `GET /api/v1/purchase-orders/{id}`

Get a purchase order. **Auth: Required**

---

#### `POST /api/v1/purchase-orders`

Create a draft purchase order. **Auth: Required**

**Request Body**
```json
{
  "supplierId": "00000000-0000-0000-0000-000000000001",
  "orderDate": "2024-01-15T10:00:00Z",
  "expectedDeliveryDate": "2024-01-22T10:00:00Z",
  "note": "Q1 restock",
  "lines": [
    {
      "productId": "00000000-0000-0000-0000-000000000010",
      "unitId": "00000000-0000-0000-0000-000000000002",
      "quantity": 100,
      "unitPrice": 9000,
      "discountAmount": 0,
      "vatRate": 0.1
    }
  ]
}
```

| Status | Condition |
|---|---|
| `201 Created` | `PurchaseOrderDto` |
| `404` | Supplier / product not found |
| `422` | Validation failed |

---

#### `PUT /api/v1/purchase-orders/{id}`

Update a draft purchase order. **Auth: Required**

---

#### `POST /api/v1/purchase-orders/{id}/confirm`

Confirm a purchase order. **Role: Manager**

| Status | Condition |
|---|---|
| `200 OK` | Confirmed |
| `400` | Not in Draft status |
| `404` | Not found |

---

#### `POST /api/v1/purchase-orders/{id}/cancel`

Cancel a purchase order. **Role: Manager**

**Request Body:** `{ "reason": "Supplier unavailable" }`

---

### Goods Receipts

> Base path: `/api/v1/goods-receipts`  
> **Role: Manager**

---

#### `GET /api/v1/goods-receipts`

List goods receipts.

**Query params:** `purchaseOrderId`, `warehouseId`, `status`, `fromDate`, `toDate`, `page`, `pageSize`

---

#### `GET /api/v1/goods-receipts/{id}`

Get a goods receipt.

---

#### `POST /api/v1/goods-receipts`

Create a goods receipt. **Role: Manager**

**Request Body**
```json
{
  "purchaseOrderId": "00000000-0000-0000-0000-000000000001",
  "warehouseId": "00000000-0000-0000-0000-000000000002",
  "receiptDate": "2024-01-22T09:00:00Z",
  "note": "Partial delivery",
  "lines": [
    {
      "purchaseOrderLineId": "00000000-0000-0000-0000-000000000003",
      "productId": "00000000-0000-0000-0000-000000000010",
      "unitId": "00000000-0000-0000-0000-000000000002",
      "receivedQuantity": 50,
      "unitCost": 9000,
      "batchNumber": "BATCH-2024-01",
      "expiryDate": null
    }
  ]
}
```

| Status | Condition |
|---|---|
| `201 Created` | `GoodsReceiptDto` |
| `400` | Purchase order not confirmed |
| `404` | Purchase order / warehouse not found |

---

#### `POST /api/v1/goods-receipts/{id}/confirm`

Confirm a goods receipt (updates inventory). **Role: Manager**

| Status | Condition |
|---|---|
| `200 OK` | Confirmed, inventory updated |
| `400` | Already confirmed |

---

#### `POST /api/v1/goods-receipts/{id}/cancel`

Cancel a goods receipt. **Role: Manager**

**Request Body:** `{ "reason": "Wrong items received" }`

---

### Purchase Returns

> Base path: `/api/v1/purchase-returns`

---

#### `GET /api/v1/purchase-returns`

List purchase returns. **Auth: Required**

---

#### `GET /api/v1/purchase-returns/{id}`

Get a purchase return. **Auth: Required**

---

#### `POST /api/v1/purchase-returns`

Create a purchase return. **Auth: Required**

**Request Body**
```json
{
  "supplierId": "00000000-0000-0000-0000-000000000001",
  "purchaseOrderId": "00000000-0000-0000-0000-000000000002",
  "warehouseId": "00000000-0000-0000-0000-000000000003",
  "returnDate": "2024-01-25T10:00:00Z",
  "note": "Defective items",
  "lines": [
    {
      "productId": "00000000-0000-0000-0000-000000000010",
      "unitId": "00000000-0000-0000-0000-000000000002",
      "quantity": 5,
      "unitPrice": 9000
    }
  ]
}
```

| Status | Condition |
|---|---|
| `201 Created` | `PurchaseReturnDto` |
| `404` | Supplier / product not found |

---

#### `POST /api/v1/purchase-returns/{id}/confirm`

Confirm the purchase return (reduces inventory). **Role: Manager**

| Status | Condition |
|---|---|
| `200 OK` | Confirmed |
| `409` | Insufficient stock |

---

## Operations

### Sales Returns

> Base path: `/api/v1/sales-returns`

---

#### `GET /api/v1/sales-returns`

List sales returns. **Auth: Required**

---

#### `GET /api/v1/sales-returns/{id}`

Get a sales return. **Auth: Required**

---

#### `POST /api/v1/sales-returns`

Create a sales return. **Auth: Required**

**Request Body**
```json
{
  "customerId": "00000000-0000-0000-0000-000000000001",
  "salesOrderId": "00000000-0000-0000-0000-000000000002",
  "invoiceId": "00000000-0000-0000-0000-000000000003",
  "warehouseId": "00000000-0000-0000-0000-000000000004",
  "returnDate": "2024-01-20T10:00:00Z",
  "note": "Incorrect item",
  "lines": [
    {
      "productId": "00000000-0000-0000-0000-000000000010",
      "unitId": "00000000-0000-0000-0000-000000000002",
      "quantity": 2,
      "unitPrice": 15000
    }
  ]
}
```

---

#### `POST /api/v1/sales-returns/{id}/confirm`

Confirm a sales return. **Role: Manager**

---

### Delivery Orders

> Base path: `/api/v1/delivery-orders`  
> Delivery orders are auto-created when a Sales Order is confirmed.

---

#### `GET /api/v1/delivery-orders`

List delivery orders. **Auth: Required**

**Query params:** `salesOrderId`, `status`, `fromDate`, `toDate`, `page`, `pageSize`

**`DeliveryStatus` enum:** `Pending`, `InProgress`, `Completed`, `Failed`, `Cancelled`

---

#### `GET /api/v1/delivery-orders/{id}`

Get a delivery order. **Auth: Required**

---

#### `POST /api/v1/delivery-orders/{id}/start`

Start a delivery. **Auth: Required**

**Request Body** _(optional)_
```json
{
  "shipperName": "Tran Van B"
}
```

---

#### `POST /api/v1/delivery-orders/{id}/complete`

Complete a delivery. **Auth: Required**

**Request Body**
```json
{
  "proofImageUrl": "https://cdn.example.com/proof.jpg",
  "isCodCollected": true,
  "receiverName": "Nguyen Van C"
}
```

| Status | Condition |
|---|---|
| `200 OK` | Completed |
| `400` | Not in InProgress status |

---

#### `POST /api/v1/delivery-orders/{id}/fail`

Mark a delivery as failed. **Role: Manager**

**Request Body:** `{ "reason": "Recipient unavailable" }`

---

#### `POST /api/v1/delivery-orders/{id}/cancel`

Cancel a delivery. **Role: Manager**

**Request Body:** `{ "reason": "Order cancelled" }`

---

### Stock Transfers

> Base path: `/api/v1/stock-transfers`

---

#### `GET /api/v1/stock-transfers`

List stock transfers. **Auth: Required**

---

#### `GET /api/v1/stock-transfers/{id}`

Get a stock transfer. **Auth: Required**

---

#### `POST /api/v1/stock-transfers`

Create a stock transfer between warehouses. **Auth: Required**

**Request Body**
```json
{
  "sourceWarehouseId": "00000000-0000-0000-0000-000000000001",
  "destinationWarehouseId": "00000000-0000-0000-0000-000000000002",
  "transferDate": "2024-01-15T09:00:00Z",
  "note": "Monthly rebalancing",
  "lines": [
    {
      "productId": "00000000-0000-0000-0000-000000000010",
      "unitId": "00000000-0000-0000-0000-000000000002",
      "quantity": 20,
      "unitCost": 10000
    }
  ]
}
```

| Status | Condition |
|---|---|
| `201 Created` | `StockTransferDto` |
| `400` | Same source/destination warehouse |
| `409` | Insufficient stock |

---

#### `POST /api/v1/stock-transfers/{id}/confirm`

Confirm the transfer (moves inventory). **Role: Manager**

---

## Inventory

> Base path: `/api/v1/inventory`

---

### `GET /api/v1/inventory/balances`

Query current inventory stock levels. **Auth: Required**

**Query Parameters**

| Param | Type | Default | Notes |
|---|---|---|---|
| `productId` | Guid | — | Filter by product |
| `warehouseId` | Guid | — | Filter by warehouse |
| `onlyPositive` | bool | false | Show only items with stock > 0 |
| `page` | int | 1 | |
| `pageSize` | int | 50 | |

**Response `200 OK`** — `PagedResult<InventoryBalanceDto>`
```json
{
  "items": [{
    "productId": "...",
    "productCode": "P001",
    "productName": "Coca Cola 330ml",
    "warehouseId": "...",
    "warehouseName": "Main Warehouse",
    "quantityOnHand": 100,
    "quantityReserved": 10,
    "quantityAvailable": 90,
    "lastUpdated": "2024-01-15T10:00:00Z"
  }]
}
```

---

### `GET /api/v1/inventory/transactions`

Query inventory transaction history. **Auth: Required**

**Query Parameters**

| Param | Type |
|---|---|
| `productId` | Guid |
| `warehouseId` | Guid |
| `transactionType` | enum |
| `fromDate` | datetime |
| `toDate` | datetime |
| `page` | int |
| `pageSize` | int |

**`InventoryTransactionType` enum:** `In`, `Out`, `Transfer`, `Adjustment`, `Opening`

---

### `POST /api/v1/inventory/adjust`

Manual inventory adjustment. **Role: Admin**

**Request Body**
```json
{
  "productId": "00000000-0000-0000-0000-000000000010",
  "warehouseId": "00000000-0000-0000-0000-000000000001",
  "quantity": -5,
  "unitCost": 10000,
  "note": "Damaged goods written off"
}
```

> Positive quantity = stock increase; negative = decrease.

| Status | Condition |
|---|---|
| `200 OK` | Adjusted |
| `409` | Resulting balance would be negative |

---

### `POST /api/v1/inventory/opening-balance`

Set opening inventory balance. **Role: Admin**

**Request Body**
```json
{
  "productId": "00000000-0000-0000-0000-000000000010",
  "warehouseId": "00000000-0000-0000-0000-000000000001",
  "quantity": 200,
  "unitCost": 9500,
  "effectiveDate": "2024-01-01T00:00:00Z",
  "note": "Year-start opening balance"
}
```

| Status | Condition |
|---|---|
| `200 OK` | Opening balance set |
| `409` | Opening balance already exists for this product/warehouse |

---

## Financial

### Payments

> Base path: `/api/v1/payments`  
> **Role: Manager**

---

#### `GET /api/v1/payments`

List payments.

**Query params:** `partnerId`, `partnerType`, `fromDate`, `toDate`, `page`, `pageSize`

---

#### `GET /api/v1/payments/{id}`

Get a payment.

**`PaymentDto` fields:**

| Field | Type | Notes |
|---|---|---|
| `id` | Guid | |
| `partnerType` | enum | `Customer`, `Supplier` |
| `partnerId` | Guid | |
| `partnerName` | string | |
| `paymentType` | enum | `Receipt` (from customer), `Disbursement` (to supplier) |
| `paymentDate` | datetime | |
| `amount` | decimal | |
| `referenceType` | enum | Document type |
| `referenceId` | Guid | Document ID |
| `paymentMethod` | enum? | `Cash`, `BankTransfer` |
| `note` | string? | |
| `invoiceId` | Guid? | |

---

#### `POST /api/v1/payments`

Record a payment. **Role: Manager**

**Request Body**
```json
{
  "partnerType": "Customer",
  "partnerId": "00000000-0000-0000-0000-000000000001",
  "paymentType": "Receipt",
  "paymentDate": "2024-01-16T14:00:00Z",
  "amount": 165000,
  "referenceType": "Invoice",
  "referenceId": "00000000-0000-0000-0000-000000000005",
  "paymentMethod": "Cash",
  "note": "Full payment for invoice INV-001",
  "invoiceId": "00000000-0000-0000-0000-000000000005"
}
```

| Status | Condition |
|---|---|
| `201 Created` | `PaymentDto` |
| `400` | Amount exceeds outstanding balance |
| `404` | Partner / reference not found |

---

### Debt Ledger

> Base path: `/api/v1/debt`  
> **Role: Manager**

---

#### `GET /api/v1/debt/{partnerId}/ledger`

Get debt ledger (transaction history) for a partner.

**Query params:** `partnerType` (required), `fromDate`, `toDate`, `page`, `pageSize`

**Response `200 OK`** — `PagedResult<DebtLedgerDto>`
```json
{
  "items": [{
    "id": "...",
    "partnerType": "Customer",
    "partnerId": "...",
    "referenceType": "Invoice",
    "referenceId": "...",
    "debitAmount": 165000,
    "creditAmount": 0,
    "balanceAfter": 165000,
    "transactionDate": "2024-01-15T10:00:00Z",
    "description": "Invoice INV-001"
  }]
}
```

---

#### `GET /api/v1/debt/{partnerId}/balance`

Get current outstanding balance for a partner.

**Query params:** `partnerType` (required)

**Response `200 OK`**
```json
{
  "partnerId": "...",
  "partnerType": "Customer",
  "balance": 165000
}
```

---

### Accounting

> Base path: `/api/v1/accounting`  
> **Role: Manager**

---

#### `GET /api/v1/accounting/accounts`

List all chart-of-accounts entries.

**Response `200 OK`** — `IEnumerable<AccountDto>`
```json
[{
  "id": "...",
  "code": "131",
  "name": "Trade Receivables",
  "accountType": "Asset",
  "normalBalance": "Debit",
  "description": null,
  "parentAccountId": null,
  "parentAccountCode": null
}]
```

---

#### `GET /api/v1/accounting/accounts/{code}`

Get account by code (e.g., `131`).

---

#### `GET /api/v1/accounting/journal-entries`

List journal entries.

**Query params:** `referenceType`, `referenceId`, `fromDate`, `toDate`, `page`, `pageSize`

**`DocumentReferenceType` enum:** `SalesOrder`, `Invoice`, `PurchaseOrder`, `GoodsReceipt`, `PurchaseReturn`, `SalesReturn`, `Payment`, `OperatingExpense`, `StockTransfer`, `Adjustment`

---

### Operating Expenses

> Base path: `/api/v1/operating-expenses`  
> **Role: Manager**

---

#### `GET /api/v1/operating-expenses`

List operating expenses.

**Query params:** `expenseType`, `status`, `fromDate`, `toDate`, `page`, `pageSize`

---

#### `GET /api/v1/operating-expenses/{id}`

Get an operating expense.

**`OperatingExpenseDto` includes:** `allocations[]`

---

#### `POST /api/v1/operating-expenses`

Record an operating expense. **Role: Manager**

**Request Body**
```json
{
  "expenseType": "SalesExpense",
  "description": "Sales team bonus January",
  "amount": 5000000,
  "expenseDate": "2024-01-31T17:00:00Z",
  "expenseAccountCode": "641",
  "paymentAccountCode": "111"
}
```

| Field | Notes |
|---|---|
| `expenseType` | `SalesExpense` or `AdminExpense` |
| `expenseAccountCode` | e.g. `"641"` (selling) or `"642"` (admin) |
| `paymentAccountCode` | `"111"` (cash), `"112"` (bank), `"331"` (payable) |

| Status | Condition |
|---|---|
| `201 Created` | `OperatingExpenseDto` |
| `404` | Account code not found |

---

#### `POST /api/v1/operating-expenses/{id}/confirm`

Confirm an operating expense. **Role: Manager**

---

#### `POST /api/v1/operating-expenses/allocate`

Allocate an expense to a cost center. **Role: Manager**

**Request Body**
```json
{
  "operatingExpenseId": "00000000-0000-0000-0000-000000000001",
  "allocatedAmount": 2500000,
  "allocationDate": "2024-01-31T17:00:00Z",
  "note": "50% allocated to Q1"
}
```

---

## Reports

> Base path: `/api/v1/reports`  
> **Role: Manager**

---

### `GET /api/v1/reports/profit-loss`

Profit & Loss summary for a period.

**Query Parameters**

| Param | Type | Required | Notes |
|---|---|---|---|
| `fromDate` | datetime | ✅ | Start of period |
| `toDate` | datetime | ✅ | End of period |

**Response `200 OK`**
```json
{
  "revenue": 50000000,
  "costOfGoodsSold": 30000000,
  "grossProfit": 20000000,
  "operatingExpenses": 5000000,
  "netProfit": 15000000,
  "fromDate": "2024-01-01T00:00:00Z",
  "toDate": "2024-01-31T23:59:59Z"
}
```

---

### `GET /api/v1/reports/account-balances`

Account balance summary across the chart of accounts.

**Query Parameters:** `fromDate`, `toDate`

**Response `200 OK`** — `IEnumerable<AccountBalanceDto>`
```json
[{
  "accountCode": "131",
  "accountName": "Trade Receivables",
  "openingBalance": 0,
  "totalDebit": 165000,
  "totalCredit": 0,
  "closingBalance": 165000
}]
```

---

*Generated from source code — see controllers in `src/POS.Api/Controllers/` for implementation details.*
