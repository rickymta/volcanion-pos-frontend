# FinancialControllers — Tổng quan

> File `FinancialControllers.cs` chứa **4 controllers** trên 4 base route khác nhau.
> Tất cả đều yêu cầu **RequireManager** (Admin hoặc Manager role) và kế thừa rate limiter `general` (200 req/phút) từ `BaseApiController`.

---

## Danh sách controllers & endpoints

### PaymentsController — `/api/v1/payments`

| Method | Endpoint | Mô tả |
|---|---|---|
| `GET` | `/payments` | Danh sách phiếu thanh toán (phân trang, lọc) |
| `GET` | `/payments/{id}` | Chi tiết phiếu thanh toán |
| `POST` | `/payments` | Ghi nhận thanh toán mới |

### DebtController — `/api/v1/debt`

| Method | Endpoint | Mô tả |
|---|---|---|
| `GET` | `/debt/{partnerId}/ledger` | Sổ cái công nợ của đối tác |
| `GET` | `/debt/{partnerId}/balance` | Số dư công nợ hiện tại của đối tác |

### AccountingController — `/api/v1/accounting`

| Method | Endpoint | Mô tả |
|---|---|---|
| `GET` | `/accounting/accounts` | Danh sách tài khoản kế toán (chart of accounts) |
| `GET` | `/accounting/accounts/{code}` | Chi tiết tài khoản theo mã |
| `GET` | `/accounting/journal-entries` | Danh sách bút toán (lọc theo chứng từ, ngày) |

### OperatingExpenseController — `/api/v1/operating-expenses`

| Method | Endpoint | Mô tả |
|---|---|---|
| `GET` | `/operating-expenses` | Danh sách chi phí hoạt động (phân trang, lọc) |
| `GET` | `/operating-expenses/{id}` | Chi tiết chi phí |
| `POST` | `/operating-expenses` | Tạo chi phí mới (trạng thái Draft) |
| `POST` | `/operating-expenses/{id}/confirm` | Xác nhận chi phí → tạo bút toán |
| `POST` | `/operating-expenses/allocate` | Phân bổ chi phí vào giá vốn hàng bán |

---

## Middleware Pipeline (chung)

```
Client Request
    ↓
[1] ExceptionHandlingMiddleware        — bắt mọi exception, trả ApiResponse chuẩn
    ↓
[2] RequestResponseLoggingMiddleware   — log method, path, status, elapsed, body (JSON ≤ 4 096 bytes)
    ↓
[3] TenantMiddleware                   — đọc X-Tenant-Id header → TenantContext
    ↓
[4] Authentication (JWT Bearer)        — validate access token
    ↓
[5] Authorization (RequireManager)     — kiểm tra role = Admin hoặc Manager
    ↓
[6] RateLimitingMiddleware (general)   — 200 req/min fixed window
    ↓
[7] FluentValidationActionFilter       — validate request body DTO
    ↓
[8] Controller Action
```

### Chi tiết middleware

| Middleware | Hành vi |
|---|---|
| **ExceptionHandlingMiddleware** | `AppException` → 4xx; `NotFoundException` → 404; `ForbiddenException` → 403; `ValidationException` → 400 kèm `errors[]`; Exception khác → 500. Luôn kèm `traceId`. |
| **TenantMiddleware** | Đọc `X-Tenant-Id: {guid}`. Nếu có `Authorization` mà thiếu `X-Tenant-Id` → 400. |
| **JWT Bearer** | HS256, validate iss/aud/signature. Claims: `sub`, `tenant_id`, `role[]`, `branch_id[]`. Hết hạn → 401. |
| **Authorization (RequireManager)** | `RequireRole("Admin", "Manager")` — tức là Admin hoặc Manager. Staff/Viewer → 403. |
| **RateLimiter (general)** | 200 req/phút per IP, QueueLimit = 0. Vượt quá → 429. |
| **FluentValidationActionFilter** | Validate DTO. Lỗi → `400 {"success":false,"errors":[{"field":"...","message":"..."}]}`. |

---

## Format Response chuẩn

```jsonc
// Thành công
{ "success": true, "message": "...", "data": { ... }, "errors": [] }

// Lỗi
{ "success": false, "message": "...", "data": null, "errors": [{"field":"..","message":".."}], "traceId": "..." }
```

---

## Enums liên quan

### PartnerType
| Value | Mô tả |
|---|---|
| `0` Customer | Khách hàng — công nợ phải thu (TK 131) |
| `1` Supplier | Nhà cung cấp — công nợ phải trả (TK 331) |

### PaymentType
| Value | Mô tả |
|---|---|
| `0` Receive | Thu tiền từ khách hàng |
| `1` Pay | Chi tiền cho nhà cung cấp |
| `2` Refund | Hoàn tiền cho khách hàng |

### PaymentMethod
| Value | Mô tả |
|---|---|
| `0` Cash | Tiền mặt → TK 111 |
| `1` BankTransfer | Chuyển khoản → TK 112 |

### ExpenseType (enum dùng cho chi phí hoạt động)
- Xem file `src/POS.Core/Enums/ExpenseType.cs`

### DocumentReferenceType
- Xác định loại chứng từ nguồn cho bút toán: `Invoice`, `Payment`, `GoodsReceipt`, `SalesReturn`, `Expense`, v.v.
