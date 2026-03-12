# POS Backend — Tài liệu Nghiệp Vụ Chi Tiết

> **Thư mục này** chứa tài liệu mô tả chi tiết từng nghiệp vụ: điểm bắt đầu, logic xử lý từng bước, bảng/cột DB được đọc/ghi, và các side-effect (tồn kho, công nợ, kế toán).

---

## Danh sách tài liệu

| File | Nghiệp vụ | Mô tả ngắn |
|---|---|---|
| [01-purchase-flow.md](01-purchase-flow.md) | **Mua hàng** | Đặt mua NCC → Nhập kho → Ghi công nợ AP + bút toán kép |
| [02-sales-flow.md](02-sales-flow.md) | **Bán hàng** | Tạo đơn → Xác nhận (check+reserve tồn kho) → Invoice → DeliveryOrder |
| [03-delivery-flow.md](03-delivery-flow.md) | **Giao hàng** | Bắt đầu giao (xuất kho thực sự) → Hoàn thành / Thất bại / Hủy |
| [04-returns-flow.md](04-returns-flow.md) | **Trả hàng** | Khách trả (SalesReturn) + Trả NCC (PurchaseReturn) — nhập/xuất kho, hoàn công nợ |
| [05-stock-transfer-flow.md](05-stock-transfer-flow.md) | **Chuyển kho** | Xuất kho nguồn + Nhập kho đích cùng lúc |
| [06-inventory-flow.md](06-inventory-flow.md) | **Tồn kho** | Quy đổi đơn vị BFS, kiểm tra/đặt trước/cập nhật số dư, điều chỉnh |
| [07-payment-flow.md](07-payment-flow.md) | **Thanh toán & Công nợ** | Thu AR / Chi AP → Cập nhật DebtLedger + bút toán tiền |
| [08-accounting-flow.md](08-accounting-flow.md) | **Kế toán tự động** | Bút toán kép tự động theo VAS cho mọi sự kiện nghiệp vụ |
| [../authorization-guide.md](../authorization-guide.md) | **RBAC & Bảo mật** | Phân quyền Role/Permission/Branch, JWT, LoginHistory, seeding |

---

## Quy ước đọc tài liệu

### Ký hiệu bảng DB

Trong mỗi file, các bảng được ký hiệu như sau:

```
→ [TenBang]  cột_được_đọc/ghi
```

Ví dụ:
```
→ [PurchaseOrders]  Id, Code, Status (READ)
→ [PurchaseOrders]  Status = Confirmed (WRITE)
```

### Luồng xử lý (Flow)

Mỗi operation được mô tả theo cấu trúc:

```
1. Validate input
2. Business rule checks  
3. DB operations (trong transaction)
4. Side effects (inventory / debt / accounting)
5. Commit / Rollback
```

### Màu sắc nghiệp vụ

- ⭐ = Bước quan trọng nhất, có nhiều side-effect
- ⚠️ = Điều kiện guard / validation đặc biệt
- 🔒 = Wrapped trong DB transaction
- 📊 = Tác động tồn kho
- 💰 = Tác động công nợ
- 📒 = Tác động bút toán kế toán

---

## Kiến trúc tổng quát

```
API Request
    ↓ X-Tenant-Id header → TenantMiddleware (inject TenantId)
    ↓ JWT Bearer → [Authorize(Policy)] → RBAC (RequireAdmin/Manager/Staff)
    ↓ X-Idempotency-Key → IdempotencyMiddleware (Redis cache 24h)
    ↓ FluentValidation (input format/range validation)
    ↓ Controller → Service (inject ICurrentUserContext)
    ↓ BeginTransaction
    ↓ Business Logic + DB ops
    ↓ Side effects: Inventory / DebtLedger / JournalEntry / LoginHistory
    ↓ Commit (hoặc Rollback on exception)
    ↓ Return DTO
```

Mọi query EF đều tự động filter `WHERE TenantId = @current AND IsDeleted = false` qua Global Query Filter.  
Ngoại lệ: bảng `Permissions` (global, không có TenantId) — không bị filter.

### RBAC nhanh

| Policy | Cho phép | Endpoint điển hình |
|---|---|---|
| `RequireAdmin` | Admin | Auth users, Roles, Admin seed |
| `RequireManager` | Admin, Manager | Xác nhận PO/GR, xử lý trả hàng |
| `RequireStaff` | Admin, Manager, Staff | Tạo đơn hàng, thanh toán |
| *(none)* | Tất cả đã authen | GET /me, đổi mật khẩu |

---

## Cấu trúc bảng chung (Base Columns)

Tất cả bảng đều có các cột sau:

| Cột | Kiểu | Mô tả |
|---|---|---|
| `Id` | `uuid` | Khóa chính, tự sinh `Guid.NewGuid()` |
| `TenantId` | `uuid` | Tenant sở hữu record (tự động inject) |
| `CreatedAt` | `timestamptz` | Thời điểm tạo (UTC, tự động) |
| `CreatedBy` | `text` | Username tạo (từ JWT claim) |
| `UpdatedAt` | `timestamptz` | Thời điểm cập nhật cuối (UTC) |
| `UpdatedBy` | `text` | Username cập nhật (từ JWT claim) |
| `IsDeleted` | `boolean` | Soft-delete flag, mặc định `false` |
