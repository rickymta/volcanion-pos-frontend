# InventoryController — Tổng quan

> **Base route:** `/api/v1/inventory`
> **Rate limiter:** `general` — 200 requests/phút (kế thừa từ `BaseApiController`)

---

## Phân quyền

| Endpoint | Auth | Mô tả |
|---|---|---|
| `GET /inventory/balances` | JWT (any role) | Xem tồn kho |
| `GET /inventory/transactions` | JWT (any role) | Xem lịch sử giao dịch |
| `POST /inventory/adjust` | JWT **RequireAdmin** | Điều chỉnh tồn kho |
| `POST /inventory/opening-balance` | JWT **RequireAdmin** | Nhập tồn đầu kỳ |

> GET endpoints yêu cầu JWT hợp lệ nhưng không giới hạn role (Admin/Manager/Staff/Viewer đều xem được).  
> POST endpoints yêu cầu `RequireAdmin` (chỉ Admin).

---

## Danh sách endpoints

| Method | Endpoint | Mô tả |
|---|---|---|
| `GET` | `/inventory/balances` | Xem số dư tồn kho (có lọc, phân trang) |
| `GET` | `/inventory/transactions` | Xem lịch sử giao dịch kho |
| `POST` | `/inventory/adjust` | Điều chỉnh tồn kho về số lượng mục tiêu |
| `POST` | `/inventory/opening-balance` | Nhập tồn kho đầu kỳ (ghi đè tuyệt đối) |

---

## Middleware Pipeline

```
Client Request
    ↓
[1] ExceptionHandlingMiddleware        — bắt mọi exception, trả ApiResponse chuẩn
    ↓
[2] RequestResponseLoggingMiddleware   — log method, path, status, elapsed, body
    ↓
[3] TenantMiddleware                   — đọc X-Tenant-Id header → TenantContext
    ↓
[4] Authentication (JWT Bearer)        — validate access token
    ↓
[5] Authorization                      — Authorize (GET) / RequireAdmin (POST)
    ↓
[6] RateLimitingMiddleware (general)   — 200 req/min fixed window
    ↓
[7] FluentValidationActionFilter       — validate request body DTO
    ↓
[8] Controller Action
```

---

## Enums liên quan

### InventoryTransactionType
| Value | Mô tả |
|---|---|
| `0` In | Nhập kho (mua hàng, nhận chuyển kho, nhận hàng trả lại) |
| `1` Out | Xuất kho (bán hàng, chuyển kho đi, trả hàng nhà cung cấp) |
| `2` Adjust | Điều chỉnh kiểm kê |
| `3` OpeningBalance | Tồn kho đầu kỳ |

### InventoryReferenceType
| Value | Mô tả |
|---|---|
| `0` Purchase | Nhập từ mua hàng (liên kết GoodsReceipt) |
| `1` Sale | Xuất bán hàng (liên kết Invoice) |
| `2` Transfer | Chuyển kho nội bộ |
| `3` Return | Hàng trả lại |
| `4` Adjustment | Điều chỉnh kiểm kê |

---

## Format Response chuẩn

```jsonc
// Thành công
{ "success": true, "message": "...", "data": { ... }, "errors": [] }

// Lỗi
{ "success": false, "message": "...", "data": null, "errors": [{"field":"..","message":".."}], "traceId": "..." }
```
