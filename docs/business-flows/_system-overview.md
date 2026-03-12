# POS Backend — Tổng quan hệ thống

> **Version:** 1.0 | **Ngày cập nhật:** 2026-03-10  
> **Stack:** .NET 10 · PostgreSQL · EF Core 10 · JWT Auth · Multi-tenancy

---

## 1. Giới thiệu

Hệ thống **POS (Point of Sale) Backend** là nền tảng SaaS quản lý bán hàng đa chi nhánh. Một tenant đại diện cho một doanh nghiệp — toàn bộ dữ liệu được phân tách hoàn toàn theo `TenantId`.

### Nguyên tắc thiết kế cốt lõi

| Nguyên tắc | Thực thi |
|---|---|
| **Multi-tenancy** | Row-level isolation — mọi bảng có `TenantId`, EF Global Filter tự động áp dụng |
| **Soft-delete** | Không xóa vật lý — `IsDeleted = true`, EF Global Filter ẩn khỏi mọi query |
| **Bút toán kép** | Mọi sự kiện nghiệp vụ tạo `JournalEntry` + `JournalEntryLines` tự động (ΣDebit = ΣCredit) |
| **Append-only audit** | `InventoryTransactions`, `DebtLedgers`, `LoginHistories` không bao giờ update/delete |
| **BFS Unit Conversion** | Quy đổi đơn vị qua graph `ProductUnitConversions` — mọi tồn kho lưu theo BaseUnit |
| **Stock reservation** | SO.Confirm reserve tồn kho → DeliveryOrder.Start mới xuất kho thực tế |

---

## 2. Kiến trúc module

```
┌────────────────────────────────────────────────────────────────────────┐
│                         POS API (ASP.NET Core 10)                      │
│                                                                        │
│  ┌──────────┐  ┌──────────┐  ┌────────────┐  ┌──────────────────────┐  │
│  │   Auth   │  │  Admin   │  │   Health   │  │       Reports        │  │
│  └──────────┘  └──────────┘  └────────────┘  └──────────────────────┘  │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │                     Master Data                                  │  │
│  │  Products · Categories · Units · Warehouses · Branches           │  │
│  │  Customers · Suppliers · ProductUnitConversions                  │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────────────┐  │
│  │    Sales     │  │   Purchase   │  │         Operations           │  │
│  │  SalesOrders │  │  PurchOrders │  │  DeliveryOrders              │  │
│  │  Invoices    │  │  GoodsRecpts │  │  SalesReturns                │  │
│  └──────────────┘  │  PurchReturn │  │  StockTransfers              │  │
│                    └──────────────┘  └──────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │                       Financial                                  │  │
│  │  Payments · DebtLedgers · Accounts · JournalEntries              │  │
│  │  OperatingExpenses · InventoryBalances · InventoryTransactions   │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │                       RBAC                                       │  │
│  │                  Roles · Permissions · UserRoles                 │  │
│  └──────────────────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Luồng nghiệp vụ tổng quan

### 3.1 Vòng đời đơn bán hàng (Sales Cycle)

```
[Khách hàng]
     │
     ▼
POST /sales-orders          ── Tạo đơn nháp (Draft)
     │
     ▼
POST /sales-orders/{id}/confirm  ─────────────────────────────────────────┐
     │                                                                    │
     │  Auto-tạo:                                                         │
     ├─> Invoice (Confirmed)          ─> POST /payments → PaidAmount++    │
     └─> DeliveryOrder (Pending)                                          │
              │                                                           │
              ▼                                                           │
     POST /delivery-orders/{id}/start  ── Xuất kho (OnHand--, Reserved--) │
              │                                                           │
         ┌────┴────┐                                                      │
         ▼         ▼                                                      │
      Complete   Fail                                                     │
         │         └─> Hoàn kho (OnHand++)                                │
         │                                                                │
         ▼         ┌──────────────────────────────────────────────────────┘
     SO.Completed  │
                   ▼
     POST /sales-returns   ── Trả hàng → nhập lại kho + giảm AR
```

### 3.2 Vòng đời đơn mua hàng (Purchase Cycle)

```
[Nhà cung cấp]
     │
     ▼
POST /purchase-orders          ── Tạo đơn mua nháp (Draft)
     │
     ▼
POST /purchase-orders/{id}/confirm  ── PO xác nhận
     │
     ▼
POST /goods-receipts           ── Nhập kho (có thể nhiều lần — partial)
     │
     ▼
POST /goods-receipts/{id}/confirm  ── Xác nhận nhập
     │  OnHand++  |  DR 156 / CR 331  |  AP tăng
     │
     └─> Khi tất cả lines đủ: PO.Status = Completed
     
     │  (Tùy chọn)
     ▼
POST /purchase-returns         ── Trả hàng về NCC
     │  OnHand--  |  DR 331 / CR 156  |  AP giảm
```

### 3.3 Vòng đời thanh toán (Payment Cycle)

```
[AR — Thu tiền khách]
  Invoice (PaidAmount < GrandTotal)
     │
     ▼
POST /payments   ── PaymentType=Receive, PartnerType=Customer
     │  DR 111/112  /  CR 131
     │  Invoice.PaidAmount += amount
     └─> Invoice.RemainingAmount = 0  →  Status=Completed

[AP — Trả NCC]
  GoodsReceipt xác nhận  →  AP tăng
     │
     ▼
POST /payments   ── PaymentType=Pay, PartnerType=Supplier
     │  DR 331  /  CR 111/112
```

### 3.4 Quản lý tồn kho (Inventory Cycle)

```
Nhập tồn đầu kỳ:
  POST /inventory/opening-balance  ──> InventoryBalance khởi tạo

Điều chuyển kho:
  POST /stock-transfers  ──> Draft
  POST /stock-transfers/{id}/confirm  ──> From.OnHand-- / To.OnHand++

Điều chỉnh tồn:
  POST /inventory/adjust  ──> InventoryBalance.OnHand = newQty
                           ──> InventoryTransaction(Adjust)
```

### 3.5 Xác thực & Phân quyền (Auth & RBAC)

```
POST /auth/login  ──> AccessToken (15 min) + RefreshToken (7 days)
                  ──> LoginHistory append-only

POST /auth/refresh  ──> Token mới
POST /auth/logout   ──> RefreshToken vô hiệu

Admin quản lý vai trò:
  POST /roles  ──> Tạo vai trò
  PUT /roles/{id}/permissions  ──> Gán quyền (REPLACE toàn bộ)
  POST /users/{id}/roles  ──> Gán role cho user
```

---

## 4. Ma trận quyền truy cập API

| Module | Endpoint chính | Xem | Tạo/Sửa | Xác nhận/Hủy |
|---|---|---|---|---|
| Master Data | /products, /customers... | Staff+ | Staff+ | Staff+ |
| Sales Orders | /sales-orders | Staff+ | Staff+ | **Manager+** |
| Invoices | /invoices | Staff+ | Auto | Auto |
| Delivery | /delivery-orders | Staff+ | Auto | Staff+ |
| Sales Returns | /sales-returns | Staff+ | Staff+ | Staff+ |
| Purchase Orders | /purchase-orders | Staff+ | Staff+ | **Manager+** |
| Goods Receipts | /goods-receipts | Staff+ | Staff+ | Staff+ |
| Purchase Returns | /purchase-returns | Staff+ | Staff+ | Staff+ |
| Stock Transfers | /stock-transfers | Staff+ | Staff+ | Staff+ |
| Inventory | /inventory/... | Staff+ | **Manager+** | **Manager+** |
| Payments | /payments | Staff+ | Staff+ | Auto |
| Financial | /accounts, /journal-entries | Staff+ | **Manager+** | **Manager+** |
| Reports | /reports/... | **Manager+** | — | — |
| Roles/Permissions | /roles | **Admin** | **Admin** | **Admin** |
| Users | /users | **Admin** | **Admin** | — |
| Admin | /admin/seed | **Admin** | **Admin** | — |

> **Staff+** = mọi role có quyền. **Manager+** = Manager và Admin. **Admin** = chỉ Admin.

---

## 5. Sơ đồ quan hệ luồng nghiệp vụ

```
          ┌───────────────┐
          │  Master Data  │ ◄─── Cơ sở cho mọi luồng
          │ Products/Units│
          │ Customers/Sup │
          │ Warehouses    │
          └──────┬────────┘
                 │ tham chiếu
    ┌────────────┼─────────────────────┐
    ▼            ▼                     ▼
┌──────────┐  ┌──────────┐    ┌──────────────┐
│  SALES   │  │ PURCHASE │    │  INVENTORY   │
│ SO→INV   │  │ PO→GR    │    │  Balance     │
│ →DO      │  │ →PR      │    │  Transactions│
└────┬─────┘  └─────┬────┘    └──────────────┘
     │              │                 ▲
     │ tạo AR/AP    │ tạo AP          │ OnHand±
     ▼              ▼
┌──────────────────────────────────────┐
│            FINANCIAL                 │
│  DebtLedgers (AR/AP tracking)        │
│  Payments (thu AR / trả AP)          │
│  JournalEntries (double-entry)       │
│  Accounts (VAS chart of accounts)    │
│  OperatingExpenses (chi phí)         │
└──────────────────────────────────────┘
     ▲
     │ báo cáo từ
┌────┴───────┐
│  REPORTS   │
│ P&L Report │
│ Balances   │
└────────────┘
```

---

## 6. Tài liệu tham chiếu

### Luồng chi tiết (./flows/)
- [auth-and-rbac.md](auth-and-rbac.md) — Xác thực, phân quyền, quản lý user/role
- [sales-flow.md](sales-flow.md) — Đặt hàng → giao hàng → thanh toán
- [purchase-flow.md](purchase-flow.md) — Đặt mua → nhập kho → trả NCC
- [returns-flow.md](returns-flow.md) — Trả hàng bán + trả hàng mua
- [inventory-flow.md](inventory-flow.md) — Tồn kho: điều chuyển, điều chỉnh, đầu kỳ
- [financial-flow.md](financial-flow.md) — Thanh toán, bút toán kế toán, báo cáo
- [master-data-flow.md](master-data-flow.md) — Quản lý danh mục, sản phẩm, đơn vị

### API Reference (../api-description/)
- [../api-description/auth/](../api-description/auth/) | [sales/](../api-description/sales/) | [purchase/](../api-description/purchase/)
- [../api-description/operations/](../api-description/operations/) | [financial/](../api-description/financial/) | [inventory/](../api-description/inventory/)
- [../api-description/master-data/](../api-description/master-data/) | [reports/](../api-description/reports/) | [role/](../api-description/role/)

### Database (../database/)
- [../database/_overview.md](../database/_overview.md)
- [../database/_conventions.md](../database/_conventions.md)
- [../database/_enums.md](../database/_enums.md)
