# POS Backend — Luồng Nghiệp Vụ Tổng Quan

> **Phiên bản:** 2.1 | **Ngày cập nhật:** 2026-03-08  
> **Công nghệ:** .NET 10 · PostgreSQL · PGBouncer · Redis · OpenTelemetry · Hangfire · Serilog

---

## Mục lục

1. [Tổng quan hệ thống](#1-tổng-quan-hệ-thống)
2. [Kiến trúc phân lớp](#2-kiến-trúc-phân-lớp)
3. [Dữ liệu danh mục (Master Data)](#3-dữ-liệu-danh-mục-master-data)
4. [Luồng Mua Hàng (Purchase)](#4-luồng-mua-hàng-purchase)
5. [Luồng Bán Hàng (Sales)](#5-luồng-bán-hàng-sales)
6. [Luồng Giao Hàng (Delivery)](#6-luồng-giao-hàng-delivery)
7. [Luồng Trả Hàng — Bán (Sales Return)](#7-luồng-trả-hàng--bán-sales-return)
8. [Luồng Trả Hàng — Mua (Purchase Return)](#8-luồng-trả-hàng--mua-purchase-return)
9. [Luồng Chuyển Kho (Stock Transfer)](#9-luồng-chuyển-kho-stock-transfer)
10. [Luồng Thanh Toán (Payment)](#10-luồng-thanh-toán-payment)
11. [Kho Hàng & Tồn Kho (Inventory)](#11-kho-hàng--tồn-kho-inventory)
12. [Kế Toán Tự Động (Accounting)](#12-kế-toán-tự-động-accounting)
13. [Công Nợ (Debt Ledger)](#13-công-nợ-debt-ledger)
14. [Luồng tích hợp đầu‑cuối](#14-luồng-tích-hợp-đầucuối)
15. [Multi‑Tenancy & Bảo mật](#15-multitenancy--bảo-mật)
16. [Background Jobs](#16-background-jobs)
17. [Observability (Giám sát & Log)](#17-observability-giám-sát--log)
18. [API tóm tắt](#18-api-tóm-tắt)
19. [Thống kê dự án](#19-thống-kê-dự-án)

---

## 1. Tổng quan hệ thống

Hệ thống **POS Backend** là nền tảng SaaS quản lý bán lẻ / bán buôn đa chi nhánh, bao gồm:

| Miền nghiệp vụ | Mô tả |
|---|---|
| **Mua hàng** | Đặt mua nhà cung cấp, nhập kho (full/partial), ghi nợ phải trả (AP) |
| **Bán hàng** | Đặt hàng khách, kiểm tra & đặt trước tồn kho, lập hóa đơn, ghi nợ phải thu (AR) |
| **Giao hàng** | Theo dõi vận chuyển, xác nhận/thất bại/hủy đơn giao |
| **Trả hàng** | Nhận hàng trả từ khách (SalesReturn), trả hàng cho NCC (PurchaseReturn) |
| **Thanh toán** | Thu AR / Chi AP, đối soát công nợ, hỗ trợ tiền mặt & chuyển khoản |
| **Tồn kho** | Theo dõi số lượng theo kho, quy đổi đơn vị (BFS), điều chỉnh, số dư đầu kỳ |
| **Kế toán** | Bút toán kép tự động theo chuẩn VAS, báo cáo lãi lỗ, số dư tài khoản |
| **Danh mục** | Sản phẩm, danh mục cây, kho, khách hàng, nhà cung cấp, đơn vị đo |
| **Chi nhánh** | Quản lý hệ thống chi nhánh phân cấp, phân quyền truy cập theo chi nhánh |
| **RBAC & Bảo mật** | JWT access/refresh token, RBAC theo Role/Permission/Branch, lịch sử đăng nhập |

---

## 2. Kiến trúc phân lớp

```
┌──────────────────────────────────────────────────────────────────┐
│  Client (Web / Mobile / POS Terminal)                            │
└─────────────────────────┬────────────────────────────────────────┘
                          │ HTTP/REST + JWT Bearer
┌─────────────────────────▼────────────────────────────────────────┐
│  POS.Api (.NET 10)                                               │
│  Controllers (22) · Middleware (Tenant, Exception, Idempotency)  │
│  Rate Limiting · CORS · HealthChecks · Swagger                   │
└─────────────────────────┬────────────────────────────────────────┘
                          │
┌─────────────────────────▼────────────────────────────────────────┐
│  POS.Services                                                    │
│  SalesOrderService · InvoiceService · PurchaseOrderService       │
│  GoodsReceiptService · DeliveryService · SalesReturnService      │
│  PurchaseReturnService · StockTransferService                    │
│  InventoryService · PaymentService · DebtService                 │
│  AccountingService · MasterDataServices (Product/Category/...)   │
└──────┬─────────────────────────────────────┬─────────────────────┘
       │                                     │
┌──────▼──────────┐                ┌─────────▼──────────┐
│  POS.Data       │                │  POS.Caching       │
│  AppDbContext   │                │  RedisCacheService │
│  Repository<T>  │                │  IDistributedCache │
│  UnitOfWork     │                └────────────────────┘
│  DapperContext  │
└──────┬──────────┘
       │
┌──────▼────────────────────────────────────────────────────────────┐
│  PostgreSQL (qua PGBouncer :6432)                                 │
└───────────────────────────────────────────────────────────────────┘

POS.Core           — Entities · DTOs · Interfaces · Enums · Utilities
POS.BackgroundJobs — Hangfire Jobs
POS.Observability  — Serilog + OpenTelemetry + Prometheus
```

---

## 3. Dữ liệu danh mục (Master Data)

Là nền tảng cho mọi nghiệp vụ. Phải được thiết lập trước khi sử dụng các luồng chính.

### 3.1 Sản phẩm (`Product`)

```
Product
├── Code / Name / Description
├── CategoryId          → Category (cây danh mục đệ quy)
├── BaseUnitId          → Unit    (đơn vị kho — mọi tồn kho lưu theo đơn vị này)
├── PurchaseUnitId      → Unit    (đơn vị mua — chuyển về BaseUnit khi nhập)
├── SalesUnitId         → Unit    (đơn vị bán — chuyển về BaseUnit khi xuất)
├── CostPrice / SalePrice
├── VatRate             → 0–100 (phần trăm, ví dụ: 10 = 10%)
├── IsBatchManaged      → quản lý theo lô hàng
├── IsExpiryManaged     → quản lý hạn sử dụng (HSD)
└── UnitConversions[]   → tỷ lệ quy đổi giữa các đơn vị (hỗ trợ bắc cầu n-chiều)
```

**Quy đổi đơn vị (BFS):** `ConvertToBaseUnitAsync` xây đồ thị hai chiều từ tất cả `ProductUnitConversion` của sản phẩm, sau đó BFS từ `fromUnit` đến `baseUnit`, nhân tích các edge-rate dọc đường đi. Hỗ trợ chuyển đổi bắc cầu (A→B→C).

*Ví dụ:* Nhập 10 thùng (1 thùng = 24 chai) → `ConvertedQuantity = 240 chai` (BaseUnit = chai).

### 3.2 Danh mục (`Category`)

Cây đệ quy (`ParentCategoryId → Category`). API trả toàn bộ cây qua `GET /api/categories`.

### 3.3 Kho hàng (`Warehouse`)

Mỗi tenant có thể có nhiều kho. Mọi biến động tồn kho đều gắn `WarehouseId`. Hỗ trợ soft-delete (guard: không xóa kho đang có tồn kho ≠ 0).

### 3.4 Khách hàng (`Customer`) & Nhà cung cấp (`Supplier`)

```
Customer / Supplier
├── Code / Name / Phone / Email / Address / TaxCode
├── CreditLimit         → hạn mức công nợ tối đa
├── PaymentTermDays     → thời hạn thanh toán (ngày)
└── OpeningBalance      → số dư nợ đầu kỳ
```

### 3.5 Chi nhánh (`Branch`)

Hỗ trợ cấu trúc phân cấp: Tổng chi nhánh → Chi nhánh con (cây n-cấp).

```
Branch
├── Code / Name / Address / Phone
├── ParentBranchId  → null = chi nhánh gốc; uuid = có cha
├── SubBranches[]   → danh sách chi nhánh con
├── Warehouses[]    → kho thuộc chi nhánh này
└── Status          → Active(10) / Inactive(11)
```

API: `GET /api/branches/tree` (cây phân cấp), CRUD tại `/api/branches`.

### 3.6 Đơn vị đo (`Unit`) & Tỷ lệ quy đổi (`ProductUnitConversion`)

- `Unit`: id, name (Hộp, Thùng, Chai, Kg, ...).
- `ProductUnitConversion`: `(ProductId, FromUnitId, ToUnitId, ConversionRate)` — unique per pair.

---

## 4. Luồng Mua Hàng (Purchase)

### 4.1 Sơ đồ trạng thái

```
PurchaseOrder
  Draft ──[Confirm]──► Confirmed ──[Cancel]──► Cancelled
                           │
                    [CreateGoodsReceipt]
                           │
                           ▼
                    GoodsReceipt
                  Draft ──[Confirm]──► Completed
                       └──[Cancel]──► Cancelled  (chỉ khi Draft)
```

### 4.2 Tạo & Xác nhận Đơn Mua

- `POST /api/purchase-orders` → Draft
- `POST /api/purchase-orders/{id}/confirm` → Confirmed (không có tác động kho/kế toán)
- `POST /api/purchase-orders/{id}/cancel` → Cancelled (bất kỳ trạng thái trừ Completed)

### 4.3 Tạo Phiếu Nhập Kho

`POST /api/goods-receipts` → GoodsReceipt Draft, liên kết `PurchaseOrderId`.  
Mỗi `GoodsReceiptLine`: ProductId, UnitId, Quantity, UnitCost, BatchNumber?, ExpiryDate?.

### 4.4 Xác nhận Nhập Kho ⭐

`POST /api/goods-receipts/{id}/confirm`

```
GoodsReceipt.ConfirmAsync()
    │
    ├─► [Với mỗi line]
    │     ConvertToBaseUnit(productId, unitId, qty)
    │     UpdateBalanceAsync(+ConvertedQuantity)
    │     RecordTransactionAsync(Type=In, RefType=Purchase)
    │     totalCost += ConvertedQuantity × UnitCost
    │
    ├─► DebtService.AppendEntryAsync(
    │       PartnerType=Supplier,
    │       DebitAmount=totalCost, CreditAmount=0)     ← AP TĂNG (debit)
    │       BalanceAfter = currentBalance + totalCost
    │
    ├─► AccountingService → JournalEntry:
    │       DR 156 (Hàng hóa)   /  CR 331 (Phải trả NCC)
    │
    └─► Kiểm tra partial receipt:
          Nếu tất cả PO lines đã nhận đủ → PO.Status = Completed
          Nếu chưa → PO vẫn Confirmed (hỗ trợ partial receipt)
```

### 4.5 Hủy Phiếu Nhập

`POST /api/goods-receipts/{id}/cancel` — chỉ khi Draft. Khi đã Completed phải dùng PurchaseReturn.

---

## 5. Luồng Bán Hàng (Sales)

### 5.1 Sơ đồ trạng thái

```
SalesOrder
  Draft ──[Confirm]──► Confirmed ──[Cancel]──► Cancelled
                           │                       ↑
                           │     (ReleaseReserved nếu đang Confirmed)
                           │
                  ┌────────┴──────────────────┐
                  ▼                           ▼
            Invoice (Confirmed)       DeliveryOrder (Pending)
                  │
            Payments[]
```

### 5.2 Tạo Đơn Hàng

`POST /api/sales-orders` → Draft

Tính tự động tại tạo:
```
LineTotal  = Quantity × UnitPrice × (1 + VatRate/100) - DiscountAmount
GrandTotal = TotalAmount - DiscountAmount + VatAmount
```
> Lưu ý: `VatRate` là phần trăm (0–100), ví dụ `VatRate=10` = thuế 10%.

### 5.3 Xác nhận Đơn Hàng ⭐

`POST /api/sales-orders/{id}/confirm`

```
SalesOrder.ConfirmAsync()
    │
    ├─► [1] Kiểm tra tồn kho (mỗi line)
    │        CheckStockAsync(productId, warehouseId, ConvertedQuantity)
    │        → Throw AppException("Insufficient stock") nếu không đủ
    │        Available = QuantityOnHand - QuantityReserved
    │
    ├─► [2] Đặt trước tồn kho (mỗi line)
    │        ReserveStockAsync()
    │        → InventoryBalance.QuantityReserved += ConvertedQuantity
    │        ⚠️  Chưa xuất kho thực sự — hàng vẫn ở kho, chỉ "khóa" số lượng
    │
    ├─► [3] Tạo Invoice (Confirmed)
    │        Code = INV-YYYYMMDD-XXXXXXXX
    │        InvoiceLines[] = copy từ SalesOrderLines
    │
    ├─► [4] Tạo DeliveryOrder (Pending)
    │        Code = DO-YYYYMMDD-XXXXXXXX
    │        WarehouseId = kho đang Active
    │
    ├─► [5] Ghi công nợ AR
    │        DebtService.AppendEntryAsync(
    │            PartnerType=Customer,
    │            DebitAmount=GrandTotal, CreditAmount=0)
    │
    └─► [6] Tạo bút toán kế toán
             JournalEntry (Ref=SalesOrder):
               DR 131 (Phải thu KH)      /  CR 511 (Doanh thu)
               DR 131 (điều chỉnh VAT)   /  CR 3331 (Thuế GTGT đầu ra)
               DR 632 (Giá vốn)          /  CR 156 (Hàng hóa)
```

### 5.4 Hủy Đơn Hàng

`POST /api/sales-orders/{id}/cancel`

- Nếu đang `Confirmed`: `ReleaseReservedStockAsync` mỗi line (bỏ khóa tồn kho)
- Không thể hủy khi đã `Completed`

---

## 6. Luồng Giao Hàng (Delivery)

### 6.1 Sơ đồ trạng thái

```
DeliveryOrder
  Pending ──[Cancel]──► Cancelled   (chỉ trước khi bắt đầu giao)
     │
  [Start]
     │
  InTransit ──[Complete]──► Delivered
       └──[Fail]──► Failed
```

### 6.2 Bắt Đầu Giao Hàng ⭐

`POST /api/delivery-orders/{id}/start` — Chuyển `Pending → InTransit`

```
DeliveryService.StartDeliveryAsync()
    │
    ├─► Load SalesOrder + Lines
    │
    └─► [Với mỗi SO line — wrapped in DB transaction]
          UpdateBalanceAsync(-ConvertedQuantity)    ← xuất kho thực sự
          ReleaseReservedStockAsync(ConvertedQuantity)  ← bỏ khóa reservation
          RecordTransactionAsync(Type=Out, RefType=Sale)
```

> **Thiết kế quan trọng:** Tồn kho thực sự chỉ rời kho tại bước `StartDelivery`, không phải tại `SO Confirm`. SO Confirm chỉ kiểm tra và đặt trước (`QuantityReserved++`).

### 6.3 Giao Thành Công

`POST /api/delivery-orders/{id}/complete` — `InTransit → Delivered`  
Body: `{ proofImageUrl, receiverName, isCodCollected }`  
Ghi nhận `ReceiverName`, `ProofImageUrl`. Tự động set `SalesOrder.Status = Completed`.

### 6.4 Giao Thất Bại / Đảo Ngược Inventory OUT

`POST /api/delivery-orders/{id}/fail` — `InTransit → Failed`  
Body: `string? reason`

```
DeliveryService.FailDeliveryAsync()
    └─► [Với mỗi SO line]
          UpdateBalanceAsync(+ConvertedQuantity)    ← nhập lại kho
          RecordTransactionAsync(Type=In, RefType=Sale)
```

### 6.5 Hủy Đơn Giao Hàng

`POST /api/delivery-orders/{id}/cancel` — chỉ khi `Pending` (trước khi Start)

```
DeliveryService.CancelDeliveryAsync()
    └─► [Với mỗi SO line]
          ReleaseReservedStockAsync(qty)    ← bỏ reservation (hàng chưa xuất)
```

> Dùng khi cần hủy đơn giao trước khi shipper nhận hàng. Hàng vẫn còn trong kho (chưa qua Start nên chưa UpdateBalance).

---

## 7. Luồng Trả Hàng — Bán (Sales Return)

### 7.1 Sơ đồ trạng thái

```
SalesReturn
  Draft ──[Confirm]──► Completed
```

### 7.2 Tạo Phiếu Trả Hàng

`POST /api/sales-returns`  
Phải liên kết với một Invoice đang `Confirmed` hoặc `Completed`.  
`IsRefunded = true` nếu hoàn tiền mặt cho khách.

### 7.3 Xác nhận Trả Hàng ⭐

`POST /api/sales-returns/{id}/confirm`

```
SalesReturnService.ConfirmAsync()
    │
    ├─► [Với mỗi line]
    │     UpdateBalanceAsync(+ConvertedQuantity)   ← nhập lại kho
    │     RecordTransactionAsync(Type=Return, RefType=Return)
    │
    ├─► DebtService.AppendEntryAsync(
    │       PartnerType=Customer,
    │       DebitAmount=0, CreditAmount=TotalRefundAmount)  ← AR giảm
    │
    ├─► Journal 1 — doanh thu giảm:
    │       DR 511 (Doanh thu)      /  CR 131 (Phải thu KH)
    │
    ├─► Journal 2 — hoàn COGS (nếu cogs > 0):
    │       DR 156 (Hàng hóa)      /  CR 632 (Giá vốn)
    │       cogs = sum(ConvertedQuantity × product.CostPrice)
    │
    └─► Nếu IsRefunded = true:
            Tạo Payment { PaymentType=Refund }
            DebtService.AppendEntryAsync(CreditAmount=TotalRefundAmount)
            Journal 3 — xuất quỹ hoàn tiền:
               DR 131 (Phải thu KH — xóa nợ)  /  CR 111 (Tiền mặt)
```

---

## 8. Luồng Trả Hàng — Mua (Purchase Return)

### 8.1 Sơ đồ trạng thái

```
PurchaseReturn
  Draft ──[Confirm]──► Completed
```

### 8.2 Tạo & Xác nhận

`POST /api/purchase-returns` → Draft  
`POST /api/purchase-returns/{id}/confirm` → Completed

```
PurchaseReturnService.ConfirmAsync()
    │
    ├─► [Với mỗi line]
    │     UpdateBalanceAsync(-ConvertedQuantity)   ← xuất hàng trả về NCC
    │     RecordTransactionAsync(Type=Out, RefType=PurchaseReturn)
    │
    ├─► DebtService.AppendEntryAsync(
    │       PartnerType=Supplier,
    │       DebitAmount=TotalAmount, CreditAmount=0)  ← AP giảm (debit)
    │
    └─► JournalEntry — ghi nợ đảo chiều:
            DR 331 (Phải trả NCC)   /  CR 156 (Hàng hóa)
```

---

## 9. Luồng Chuyển Kho (Stock Transfer)

### 9.1 Sơ đồ trạng thái

```
StockTransfer
  Draft ──[Confirm]──► Completed
```

### 9.2 Tạo & Xác nhận

`POST /api/stock-transfers` → Draft  
`POST /api/stock-transfers/{id}/confirm` → Completed

```
StockTransferService.ConfirmAsync()
    │
    ├─► [Với mỗi line]
    │     UpdateBalanceAsync(-qty, fromWarehouse)  ← xuất kho nguồn
    │     UpdateBalanceAsync(+qty, toWarehouse)    ← nhập kho đích
    │     RecordTransactionAsync(Type=Transfer, fromWarehouse)
    │     RecordTransactionAsync(Type=Transfer, toWarehouse)
    │
    └─► JournalEntry:
            DR 156-ToWarehouse   /  CR 156-FromWarehouse
```

---

## 10. Luồng Thanh Toán (Payment)

### 10.1 Thu AR — Khách thanh toán

`POST /api/payments`

```json
{
  "partnerType": "Customer",
  "partnerId": "<customerId>",
  "referenceType": "Invoice",
  "referenceId": "<invoiceId>",
  "amount": 5000000,
  "paymentMethod": "BankTransfer",
  "invoiceId": "<invoiceId>"
}
```

```
PaymentService.RecordPaymentAsync()
    │
    ├─► Tạo Payment { PaymentType=Receipt, PaymentMethod=BankTransfer }
    │
    ├─► Invoice.PaidAmount += amount  (nếu InvoiceId có)
    │
    ├─► DebtService.AppendEntryAsync(
    │       PartnerType=Customer,
    │       DebitAmount=0, CreditAmount=amount)   ← AR giảm
    │
    └─► JournalEntry (tài khoản tiền chọn theo PaymentMethod):
            Cash:        DR 111 / CR 131
            BankTransfer: DR 112 / CR 131
```

### 10.2 Chi AP — Thanh toán nhà cung cấp

Tương tự nhưng `PartnerType=Supplier`:

```
JournalEntry:
  Cash:        DR 331 / CR 111
  BankTransfer: DR 331 / CR 112
```

### 10.3 PaymentMethod Enum

| Giá trị | Tài khoản | Mô tả |
|---|---|---|
| `Cash = 0` | TK 111 | Tiền mặt |
| `BankTransfer = 1` | TK 112 | Chuyển khoản ngân hàng |

### 10.4 Tra cứu công nợ

| API | Mô tả |
|---|---|
| `GET /api/debt/{partnerId}/balance?partnerType=Customer` | Số dư AR/AP hiện tại |
| `GET /api/debt/{partnerId}/ledger?partnerType=Customer&page=1&pageSize=20` | Lịch sử biến động công nợ (phân trang) |

---

## 11. Kho Hàng & Tồn Kho (Inventory)

### 11.1 Mô hình dữ liệu

```
InventoryBalance (trạng thái hiện tại — unique per ProductId+WarehouseId)
  QuantityOnHand    ← số lượng thực có (base unit)
  QuantityReserved  ← đang chờ xuất (đã confirm SO nhưng chưa StartDelivery)
  AvailableQty      = QuantityOnHand - QuantityReserved (tính tự động khi check)
  LastUpdated

InventoryTransaction (audit log bất biến)
  TransactionType  : In | Out | Adjust | Transfer | Return | OpeningBalance
  ReferenceType    : GoodsReceipt | SalesOrder | SalesReturn | PurchaseReturn
                     StockTransfer | Adjustment | OpeningBalance
  Quantity (base unit)
  UnitCost
  BatchNumber / ExpiryDate  (khi IsBatchManaged/IsExpiryManaged)
```

### 11.2 Quy đổi đơn vị (BFS)

```
ConvertToBaseUnitAsync(productId, fromUnitId, quantity)
  1. Nếu fromUnitId == product.BaseUnitId → return quantity (shortcut)
  2. Load tất cả ProductUnitConversion của product
  3. Xây bidirectional graph: (A→B, rate) + (B→A, 1/rate)
  4. BFS từ fromUnitId → baseUnitId, nhân tích edge-rate
  5. Throw AppException nếu không tìm được đường đi
```

### 11.3 Điều chỉnh tồn kho

`POST /api/inventory/adjust`  
`delta = targetQuantity - currentOnHand` → `UpdateBalanceAsync(delta)` + `RecordTransactionAsync(Adjust)`

### 11.4 Số dư đầu kỳ

`POST /api/inventory/opening-balance`  
Ghi đè `QuantityOnHand` về `OpeningQuantity`, tạo `InventoryTransaction(OpeningBalance)`.

---

## 12. Kế Toán Tự Động (Accounting)

### 12.1 Hệ thống tài khoản (VAS — seeded)

| Mã | Tên | Loại |
|---|---|---|
| 111 | Tiền mặt | Asset |
| 112 | Tiền gửi ngân hàng | Asset |
| 131 | Phải thu khách hàng | Asset |
| 156 | Hàng hóa | Asset |
| 331 | Phải trả nhà cung cấp | Liability |
| 511 | Doanh thu bán hàng | Revenue |
| 632 | Giá vốn hàng bán | Expense |
| 3331 | Thuế GTGT đầu ra | Liability |
| 3333 | Thuế thu nhập doanh nghiệp | Liability |

Cấu trúc cây: `Account.ParentAccountId → Account`.

### 12.2 Bảng bút toán tự động

| Sự kiện | Nợ (DR) | Có (CR) |
|---|---|---|
| Xác nhận nhập kho (GoodsReceipt) | 156 Hàng hóa | 331 Phải trả NCC |
| Xác nhận đơn bán (SalesOrder Confirm) | 131 Phải thu KH | 511 Doanh thu |
|   ↳ phần VAT | — (gộp trong 131) | 3331 Thuế GTGT |
|   ↳ giá vốn | 632 Giá vốn | 156 Hàng hóa |
| Thu tiền khách (Cash) | 111 Tiền mặt | 131 Phải thu KH |
| Thu tiền khách (Bank) | 112 Ngân hàng | 131 Phải thu KH |
| Trả tiền NCC (Cash) | 331 Phải trả NCC | 111 Tiền mặt |
| Trả tiền NCC (Bank) | 331 Phải trả NCC | 112 Ngân hàng |
| Trả hàng từ khách — doanh thu | 511 Doanh thu | 131 Phải thu KH |
| Trả hàng từ khách — COGS hoàn | 156 Hàng hóa | 632 Giá vốn |
| Hoàn tiền mặt cho khách | 131 Phải thu KH | 111 Tiền mặt |
| Trả hàng cho NCC | 331 Phải trả NCC | 156 Hàng hóa |

### 12.3 Nguyên tắc kép

```csharp
// AccountingService.GenerateJournalEntryAsync
if (totalDebit != totalCredit)
    throw new AppException("Journal entry is not balanced: debit != credit");
```

Mọi `JournalEntry` đều được validate `ΣDebit = ΣCredit` trước khi lưu.

---

## 13. Công Nợ (Debt Ledger)

`DebtLedger` là sổ cái phụ bất biến — **không sửa/xóa**, chỉ tạo bút toán đảo chiều.

```
DebtLedger
  PartnerType       : Customer | Supplier
  PartnerId
  ReferenceType     : SalesOrder | GoodsReceipt | Payment | SalesReturn | ...
  ReferenceId
  DebitAmount       : công nợ tăng
  CreditAmount      : công nợ giảm
  BalanceAfter      = previousBalance + DebitAmount - CreditAmount
  TransactionDate
```

**Công nợ khách hàng (AR):**

| Sự kiện | Debit | Credit | Kết quả |
|---|---|---|---|
| SO Confirm (Invoice) | GrandTotal | — | AR tăng |
| Payment thu AR | — | Amount | AR giảm |
| SalesReturn confirm | — | TotalRefundAmount | AR giảm |

**Công nợ nhà cung cấp (AP):**

| Sự kiện | Debit | Credit | Kết quả |
|---|---|---|---|
| GoodsReceipt confirm | TotalCost | — | AP tăng |
| Payment chi AP | Amount | — | AP giảm |
| PurchaseReturn confirm | TotalAmount | — | AP giảm |

---

## 14. Luồng tích hợp đầu‑cuối

### 14.1 Kịch bản bán lẻ tại quầy

```
POST /api/sales-orders          ← tạo SO Draft
POST /api/sales-orders/{id}/confirm
    CheckStock + ReserveStock
    Tạo Invoice + DeliveryOrder (Pending)
    Ghi AR debt + Journal (131/511/3331/632/156)

POST /api/payments              ← thu tiền ngay
    Invoice.PaidAmount += amount
    Ghi AR debt giảm
    Journal DR 111 / CR 131

POST /api/delivery-orders/{id}/start   ← shipper nhận hàng
    UpdateBalance(-qty) + ReleaseReserved + RecordTransaction(Out)

POST /api/delivery-orders/{id}/complete ← giao tận tay
    SO.Status = Completed
```

### 14.2 Kịch bản bán buôn (giao hàng + thanh toán sau)

```
POST /api/sales-orders → confirm → DeliveryOrder created
POST /api/delivery-orders/{id}/start       ← xuất kho
POST /api/delivery-orders/{id}/complete    ← xác nhận giao

(Sau N ngày)
POST /api/payments    ← khách chuyển khoản
```

### 14.3 Kịch bản nhập hàng

```
POST /api/purchase-orders → confirm
POST /api/goods-receipts        ← hàng về kho (có thể partial)
POST /api/goods-receipts/{id}/confirm
    Inventory IN + AP debt + Journal DR 156 / CR 331
    (Nếu đủ tất cả lines → PO.Status = Completed)

(Đến hạn)
POST /api/payments    ← trả tiền NCC
    AP debt giảm + Journal DR 331 / CR 112
```

### 14.4 Kịch bản khách trả hàng + hoàn tiền

```
POST /api/sales-returns         ← IsRefunded=true, liên kết InvoiceId
POST /api/sales-returns/{id}/confirm
    Inventory IN (restock)
    AR giảm
    Journal DR 511 / CR 131  (doanh thu giảm)
    Journal DR 156 / CR 632  (hoàn COGS)
    Payment{Refund} + Journal DR 131 / CR 111  (xuất quỹ)
```

### 14.5 Kịch bản điều chuyển hàng giữa kho

```
POST /api/stock-transfers       ← khai báo FromWarehouse, ToWarehouse
POST /api/stock-transfers/{id}/confirm
    Inventory OUT fromWarehouse + IN toWarehouse
    Journal DR 156-To / CR 156-From
```

---

## 15. Multi‑Tenancy & Bảo mật

### 15.1 Kiến trúc multi-tenant (shared DB)

```
HTTP Request
    │
    ▼
TenantMiddleware
    └── Đọc X-Tenant-Id header → ghi vào TenantContext (Scoped)

AppDbContext.SaveChangesAsync()
    └── tự động set entity.TenantId = tenantContext.TenantId
        khi EntityState == Added

EF Global Query Filter (tự động mọi query):
    → WHERE TenantId = @current AND IsDeleted = false
    (Ngoại lệ: Permissions không có TenantId — global, không bị filter)
```

### 15.2 Authentication (JWT)

- **Access Token**: HS256, hết hạn sau **60 phút** (`ExpiryMinutes=60`)
- **Refresh Token**: opaque, BCrypt hash lưu DB, hết hạn sau **7 ngày** (`RefreshTokenExpiryDays=7`)
- `POST /api/auth/login` → ghi `LoginHistory` (IP + UserAgent) + trả `accessToken` + `refreshToken`

**JWT Claims:**

| Claim | Giá trị |
|---|---|
| `sub` | User.Id (Guid) |
| `email` | User.Email |
| `jti` | Guid ngẫu nhiên (JWT ID) |
| `name` (ClaimTypes) | User.Username |
| `role` (ClaimTypes) | User.Role (UserRole enum: Admin/Manager/Staff/Viewer) |
| `full_name` | User.FullName |
| `tenant_id` | TenantId |
| `all_branches` | `"true"` hoặc `"false"` (User.IsAllBranches) |
| `branch_id` | Multi-value — một claim per chi nhánh được phép |

### 15.3 RBAC — Role-Based Access Control

Hai lớp phân quyền:

| Lớp | Cơ chế | Áp dụng khi |
|---|---|---|
| **Policy** (role-level) | `[Authorize(Policy = "Staff")]` | Tất cả API endpoint |
| **Permission** (fine-grained) | `Permission.Code` check trong service | Tương lai / custom logic |

**3 Policy được định nghĩa (`Policies.cs`):**

| Policy | Cho phép role |
|---|---|
| `RequireAdmin` | Admin |
| `RequireManager` | Admin, Manager |
| `RequireStaff` | Admin, Manager, Staff |

**Bảng RBAC (5 bảng mới):**

| Bảng | Mục đích |
|---|---|
| `Roles` | Vai trò scoped theo tenant (4 system role + custom) |
| `Permissions` | 36 quyền global (seed sẵn, không tạo qua API) |
| `RolePermissions` | Role ↔ Permission (many-to-many) |
| `UserRoles` | User ↔ Role (many-to-many) |
| `LoginHistories` | Audit log mỗi lần đăng nhập (IP + UserAgent + kết quả) |

### 15.4 Phân quyền chi nhánh

```
User.IsAllBranches = true  → truy cập mọi chi nhánh (Admin)
User.IsAllBranches = false → chỉ chi nhánh trong UserBranches
    └── ICurrentUserContext.HasBranchAccess(branchId) → bool
```

`ICurrentUserContext` được inject vào service layer để kiểm tra quyền chi nhánh tại runtime.

### 15.5 Idempotency

`IdempotencyMiddleware` — header `X-Idempotency-Key`:
- Lần đầu: thực thi bình thường, cache response trong Redis 24h
- Lần sau (cùng key): trả cached response ngay, không tái thực thi

### 15.6 Audit Trail & Soft Delete

- `BaseEntity`: `CreatedAt`, `CreatedBy`, `UpdatedAt`, `UpdatedBy` (set tự động)
- `IsDeleted = false` — xóa mềm, không xóa vật lý

---

## 16. Background Jobs

Sử dụng **Hangfire** với PostgreSQL storage. Dashboard tại `/hangfire`.

| Job | Lịch | Mục đích |
|---|---|---|
| `SampleCleanupJob` | Hàng ngày | Placeholder (`// TODO`) |
| *(Kế hoạch)* `DebtReminderJob` | Hàng ngày | Thông báo nhắc nợ quá hạn |
| *(Kế hoạch)* `LowStockAlertJob` | Mỗi 6 giờ | Cảnh báo tồn kho dưới ngưỡng |
| *(Kế hoạch)* `DailyRevenueReportJob` | Cuối ngày | Tổng hợp doanh thu |

---

## 17. Observability (Giám sát & Log)

### 17.1 Structured Logging (Serilog)

| Sink | Môi trường |
|---|---|
| Console | Development |
| Grafana Loki (`:3100`) | Production |
| Elasticsearch (`:9200`) | Production |

### 17.2 Distributed Tracing & Metrics (OpenTelemetry)

```
OpenTelemetry Tracing → OTLP → Grafana Tempo
  - ASP.NET Core · HttpClient · EF Core

OpenTelemetry Metrics → /metrics endpoint → Prometheus → Grafana
  - ASP.NET Core metrics (request duration, count, errors)
```

### 17.3 Health Checks

`GET /health` kiểm tra: PostgreSQL Write, PostgreSQL Read, Redis

---

## 18. API tóm tắt

### Auth

| Method | Endpoint | Mô tả | Quyền |
|---|---|---|---|
| POST | `/api/auth/login` | Đăng nhập → JWT + ghi LoginHistory | Public |
| POST | `/api/auth/register` | Tạo user mới trong tenant | Admin |
| POST | `/api/auth/refresh` | Làm mới access + refresh token | Public |
| POST | `/api/auth/logout` | Thu hồi refresh token | Auth |
| GET | `/api/auth/me` | Thông tin user hiện tại | Auth |
| POST | `/api/auth/change-password` | Đổi mật khẩu | Auth |
| GET | `/api/auth/users` | Danh sách users của tenant | Admin |
| GET | `/api/auth/users/{id}` | Chi tiết user | Admin |
| PUT | `/api/auth/users/{id}` | Cập nhật role / status / IsAllBranches | Admin |
| POST | `/api/auth/users/{id}/branches` | Gán danh sách chi nhánh cho user | Admin |
| POST | `/api/auth/users/{id}/roles` | Gán danh sách roles cho user | Admin |
| GET | `/api/auth/login-history` | Lịch sử đăng nhập (Admin: all, User: own) | Auth |

### Roles & Permissions

| Method | Endpoint | Mô tả |
|---|---|---|
| GET | `/api/roles` | Danh sách roles của tenant |
| GET | `/api/roles/{id}` | Chi tiết role |
| POST | `/api/roles` | Tạo role mới (non-system) |
| PUT | `/api/roles/{id}` | Cập nhật tên / mô tả role |
| DELETE | `/api/roles/{id}` | Xóa role (soft-delete, không xóa system role) |
| PUT | `/api/roles/{id}/permissions` | Gán danh sách Permissions cho role |
| GET | `/api/roles/permissions` | Tất cả Permissions trong hệ thống |

### Master Data

| Method | Endpoint | Mô tả |
|---|---|---|
| GET/POST/PUT/DELETE | `/api/products` | CRUD sản phẩm |
| GET | `/api/categories` | Cây danh mục |
| POST/PUT/DELETE | `/api/categories` | Thêm/sửa/xóa danh mục |
| GET/POST/PUT/DELETE | `/api/warehouses` | CRUD kho |
| GET/POST/PUT/DELETE | `/api/customers` | CRUD khách hàng |
| GET/POST/PUT/DELETE | `/api/suppliers` | CRUD nhà cung cấp |
| GET/POST/PUT/DELETE | `/api/units` | CRUD đơn vị đo |
| GET/POST/PUT/DELETE | `/api/products/{id}/unit-conversions` | CRUD tỷ lệ quy đổi |
| GET | `/api/branches/tree` | Cây chi nhánh phân cấp |
| GET/POST/PUT/DELETE | `/api/branches` | CRUD chi nhánh |

### Purchase

| Method | Endpoint | Mô tả |
|---|---|---|
| GET/POST/PUT | `/api/purchase-orders` | CRUD đơn mua |
| POST | `/api/purchase-orders/{id}/confirm` | Xác nhận |
| POST | `/api/purchase-orders/{id}/cancel` | Hủy |
| GET | `/api/goods-receipts/{id}` | Chi tiết phiếu nhập |
| POST | `/api/goods-receipts` | Tạo phiếu nhập |
| POST | `/api/goods-receipts/{id}/confirm` | Xác nhận nhập kho ⭐ |
| POST | `/api/goods-receipts/{id}/cancel` | Hủy (chỉ Draft) |
| GET/POST | `/api/purchase-returns` | Danh sách / Tạo phiếu trả NCC |
| POST | `/api/purchase-returns/{id}/confirm` | Xác nhận trả NCC ⭐ |

### Sales

| Method | Endpoint | Mô tả |
|---|---|---|
| GET/POST/PUT | `/api/sales-orders` | CRUD đơn bán |
| POST | `/api/sales-orders/{id}/confirm` | Xác nhận đơn bán ⭐ |
| POST | `/api/sales-orders/{id}/cancel` | Hủy (release reserved) |
| GET | `/api/invoices` | Danh sách hóa đơn |
| GET | `/api/invoices/{id}` | Chi tiết hóa đơn |

### Operations

| Method | Endpoint | Mô tả |
|---|---|---|
| GET | `/api/delivery-orders` | Danh sách phiếu giao |
| GET | `/api/delivery-orders/{id}` | Chi tiết |
| POST | `/api/delivery-orders/{id}/start` | Bắt đầu giao → xuất kho ⭐ |
| POST | `/api/delivery-orders/{id}/complete` | Giao thành công |
| POST | `/api/delivery-orders/{id}/fail` | Giao thất bại → nhập lại |
| POST | `/api/delivery-orders/{id}/cancel` | Hủy (Pending only) → release reserved |
| GET/POST | `/api/sales-returns` | Danh sách / Tạo phiếu trả |
| POST | `/api/sales-returns/{id}/confirm` | Xác nhận trả hàng ⭐ |
| GET/POST | `/api/stock-transfers` | Danh sách / Tạo phiếu chuyển kho |
| POST | `/api/stock-transfers/{id}/confirm` | Xác nhận chuyển kho ⭐ |

### Inventory

| Method | Endpoint | Mô tả |
|---|---|---|
| GET | `/api/inventory/balances` | Tồn kho hiện tại (filter product/warehouse) |
| GET | `/api/inventory/transactions` | Lịch sử giao dịch kho |
| POST | `/api/inventory/adjust` | Điều chỉnh tồn kho về số lượng mục tiêu |
| POST | `/api/inventory/opening-balance` | Nhập số dư đầu kỳ |

### Finance

| Method | Endpoint | Mô tả |
|---|---|---|
| GET/POST | `/api/payments` | Danh sách / Ghi nhận thanh toán |
| GET | `/api/payments/{id}` | Chi tiết payment |
| GET | `/api/debt/{partnerId}/balance` | Số dư công nợ |
| GET | `/api/debt/{partnerId}/ledger` | Lịch sử công nợ (phân trang) |
| GET | `/api/accounting/accounts` | Danh sách tài khoản kế toán |
| GET | `/api/accounting/accounts/{code}` | Chi tiết tài khoản |
| GET | `/api/accounting/journal-entries` | Sổ nhật ký (filter ngày/ref) |

### Reports

| Method | Endpoint | Mô tả |
|---|---|---|
| GET | `/api/reports/profit-loss` | Báo cáo lãi lỗ (Dapper SQL) |
| GET | `/api/reports/account-balances` | Số dư tài khoản kế toán |

### Admin

| Method | Endpoint | Mô tả |
|---|---|---|
| POST | `/api/admin/seed` | Seed data (Admin only) |

---

## 19. Thống kê dự án

| Metric | Giá trị |
|---|---|
| Solution projects | 7 src + 6 tests = **13** |
| Entities (tổng) | **37** (28 nghiệp vụ + 5 RBAC/Auth + 2 Branch + 2 User-join) |
| Enums | **11** |
| DTOs | **90+** records |
| Service interfaces | **20** (thêm `IRoleService`) |
| Controllers | **23** concrete + 1 base (thêm `RoleController`) |
| Validators | **33+** (FluentValidation) |
| EF Migrations | **3** |
| Tests passing | **194** (0 failed) |
| Docker services | **8** (PostgreSQL, PGBouncer, Redis, Grafana, Loki, Tempo, Prometheus, Elasticsearch) |
| API endpoints | **~85** actions |
| RBAC Permissions seeded | **36** (11 modules) |

---

*Tài liệu được cập nhật từ phân tích source code trực tiếp. Phiên bản 2.1 phản ánh đầy đủ trạng thái Phase 11 (RBAC + Branch + LoginHistory).*
