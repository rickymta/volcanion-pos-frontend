# Nghiệp Vụ Bán Hàng (Sales Flow)

> **Services:** `SalesOrderService`, `InvoiceService`  
> **Controller:** `SalesControllers.cs`  
> **Validator:** `SalesValidators.cs`

---

## Mục lục

1. [Tổng quan](#1-tổng-quan)
2. [Sơ đồ trạng thái](#2-sơ-đồ-trạng-thái)
3. [Tạo Đơn Hàng (Create SalesOrder)](#3-tạo-đơn-hàng)
4. [Xác nhận Đơn Hàng (Confirm SO) ⭐](#4-xác-nhận-đơn-hàng-)
5. [Hủy Đơn Hàng (Cancel SO)](#5-hủy-đơn-hàng)
6. [Xem Hóa Đơn (Invoice)](#6-xem-hóa-đơn)
7. [Bảng DB tổng hợp](#7-bảng-db-tổng-hợp)

---

## 1. Tổng quan

Luồng bán hàng tập trung vào `SalesOrder`. Khi Confirm SO, hệ thống tự động:

1. Kiểm tra và **đặt trước** (reserve) tồn kho → hàng chưa xuất vật lý
2. Tạo **Invoice** (hóa đơn) — trạng thái Confirmed
3. Tạo **DeliveryOrder** (lệnh giao hàng) — trạng thái Pending
4. Ghi **công nợ AR** (phải thu khách hàng)
5. Tạo **bút toán kép** (131/511/3331/632/156)

**Thiết kế quan trọng:**  
Tồn kho chỉ **xuất vật lý** (UpdateBalance -qty) tại bước `StartDelivery`, không phải tại `SO Confirm`.  
SO Confirm chỉ **reserve** (khóa) số lượng → `InventoryBalance.QuantityReserved += qty`.

---

## 2. Sơ đồ trạng thái

```
SalesOrder
  Draft (0)
    │
    ├─[Confirm]─► Confirmed (1) ──────────────► Invoice (Confirmed)
    │                  │                    └──► DeliveryOrder (Pending)
    │              [Cancel]─► Cancelled (3)
    │              (release QuantityReserved)
    │
    └─(auto via CompleteDelivery)──► Completed (2)
```

---

## 3. Tạo Đơn Hàng

**Endpoint:** `POST /api/sales-orders`

### 3.1 Request Body

```json
{
  "customerId": "uuid",
  "orderDate": "2026-03-01",
  "note": "Đơn hàng khách lẻ",
  "lines": [
    {
      "productId": "uuid",
      "unitId": "uuid",
      "quantity": 5,
      "unitPrice": 120000,
      "discountAmount": 0,
      "vatRate": 10
    }
  ]
}
```

### 3.2 Validation (FluentValidation)

| Field | Rule | Lỗi |
|---|---|---|
| `CustomerId` | `NotEmpty` | "Customer is required." |
| `OrderDate` | `NotEmpty` | "Order date is required." |
| `Lines` | `NotEmpty` | "Sales order must have at least one line." |
| `Lines[].ProductId` | `NotEmpty` | "Product is required." |
| `Lines[].UnitId` | `NotEmpty` | "Unit is required." |
| `Lines[].Quantity` | `> 0` | "Quantity must be greater than 0." |
| `Lines[].UnitPrice` | `>= 0` | "Unit price must be non-negative." |
| `Lines[].DiscountAmount` | `>= 0` | "Discount amount must be non-negative." |
| `Lines[].VatRate` | `>= 0 && <= 100` | "VAT rate must be between 0 and 100." |

### 3.3 Xử lý logic

🔒 **Wrapped trong DB transaction**

```
1. Sinh Code = CodeGenerator.Generate("SO") → "SO-YYYYMMDD-XXXXXXXX"

2. Tạo SalesOrder:
   Status = Draft (0)

3. Với mỗi dòng:
   ConvertedQuantity = ConvertToBaseUnitAsync(productId, unitId, quantity)
   
   subTotal   = quantity × unitPrice - discountAmount
   LineTotal  = subTotal × (1 + vatRate/100)
   
   Tạo SalesOrderLine { ProductId, UnitId, Quantity, UnitPrice,
                        DiscountAmount, VatRate, ConvertedQuantity, LineTotal }

4. Tính header totals:
   TotalAmount    = Σ (quantity × unitPrice)
   DiscountAmount = Σ line.DiscountAmount
   VatAmount      = Σ ((quantity × unitPrice - discount) × vatRate/100)
   GrandTotal     = TotalAmount - DiscountAmount + VatAmount

5. SaveChanges + Commit
```

### 3.4 Công thức tính giá

```
SubTotal  = Quantity × UnitPrice - DiscountAmount
LineTotal = SubTotal × (1 + VatRate / 100)

Header:
  TotalAmount    = Σ (Quantity × UnitPrice)          ← chưa trừ discount, chưa có VAT
  DiscountAmount = Σ line.DiscountAmount
  VatAmount      = Σ (SubTotal × VatRate/100)
  GrandTotal     = TotalAmount - DiscountAmount + VatAmount
```

### 3.5 Bảng DB bị ảnh hưởng

**WRITE:**

| Bảng | Column | Giá trị | Ý nghĩa |
|---|---|---|---|
| `SalesOrders` | `Id` | `Guid.NewGuid()` | Khóa chính |
| `SalesOrders` | `Code` | `"SO-YYYYMMDD-..."` | Mã đơn hàng |
| `SalesOrders` | `CustomerId` | FK | Khách hàng |
| `SalesOrders` | `OrderDate` | date | Ngày đặt hàng |
| `SalesOrders` | `Status` | `0` (Draft) | Trạng thái ban đầu |
| `SalesOrders` | `TotalAmount` | `numeric(18,2)` | Tổng tiền hàng |
| `SalesOrders` | `DiscountAmount` | `numeric(18,2)` | Tổng chiết khấu |
| `SalesOrders` | `VatAmount` | `numeric(18,2)` | Tổng VAT |
| `SalesOrders` | `GrandTotal` | `numeric(18,2)` | Tổng cộng thanh toán |
| `SalesOrderLines` | `SalesOrderId` | FK | Header |
| `SalesOrderLines` | `ProductId` | FK | Sản phẩm |
| `SalesOrderLines` | `UnitId` | FK | Đơn vị bán |
| `SalesOrderLines` | `Quantity` | `numeric(18,6)` | SL theo đơn vị bán |
| `SalesOrderLines` | `ConvertedQuantity` | `numeric(18,6)` | SL quy về BaseUnit |
| `SalesOrderLines` | `UnitPrice` | `numeric(18,4)` | Đơn giá |
| `SalesOrderLines` | `DiscountAmount` | `numeric(18,2)` | Chiết khấu dòng |
| `SalesOrderLines` | `VatRate` | `numeric(5,2)` | Thuế suất (%) |
| `SalesOrderLines` | `LineTotal` | `numeric(18,2)` | Thành tiền dòng (đã VAT) |

---

## 4. Xác nhận Đơn Hàng ⭐

**Endpoint:** `POST /api/sales-orders/{id}/confirm`

Đây là bước tạo ra **5 loại side-effect** trong 1 transaction.

### 4.1 Guard conditions

| Điều kiện | Hành động |
|---|---|
| SO không tồn tại | Throw `NotFoundException` |
| `order.Status != Draft` | Throw `AppException("Only Draft orders can be confirmed")` |
| Không có kho Active | Throw `AppException("No active warehouse found")` |
| Tồn kho không đủ | Throw `AppException("Insufficient stock. Available: X, Required: Y")` |

### 4.2 Xử lý logic chi tiết

🔒 **Wrapped trong DB transaction**

```
1. Load SalesOrder + Lines
2. Load warehouse: Warehouses WHERE Status = Confirmed(1) LIMIT 1

3. KIỂM TRA TỒN KHO (mỗi line):
   ┌─────────────────────────────────────────────────────────────┐
   │ 📊 KIỂM TRA AVAILABILITY                                   │
   │                                                             │
   │ CheckStockAsync(productId, warehouse.Id, ConvertedQty)     │
   │                                                             │
   │ → Load InventoryBalance WHERE ProductId AND WarehouseId    │
   │ → available = QuantityOnHand - QuantityReserved            │
   │ → Nếu available < ConvertedQty:                           │
   │     throw AppException("Insufficient stock")               │
   └─────────────────────────────────────────────────────────────┘

4. ĐẶT TRƯỚC TỒN KHO (mỗi line):
   ┌─────────────────────────────────────────────────────────────┐
   │ 📊 RESERVE STOCK (chưa xuất ra)                            │
   │                                                             │
   │ ReserveStockAsync(productId, warehouse.Id, ConvertedQty)   │
   │                                                             │
   │ → InventoryBalance.QuantityReserved += ConvertedQty        │
   │ → QuantityOnHand KHÔNG thay đổi                           │
   │ → Hàng vẫn ở kho nhưng bị "khóa", không available         │
   └─────────────────────────────────────────────────────────────┘

5. Set order.Status = Confirmed (1)

6. TẠO DELIVERYORDER:
   Code = "DO-YYYYMMDD-..."
   SalesOrderId = order.Id
   WarehouseId  = warehouse.Id
   Status       = Pending (0)   ← DeliveryStatus.Pending
   CodAmount    = 0
   IsCodCollected = false

7. TẠO INVOICE:
   Code         = "INV-YYYYMMDD-..."
   SalesOrderId = order.Id
   CustomerId   = order.CustomerId
   InvoiceType  = Retail (0)
   InvoiceDate  = DateTime.UtcNow
   Status       = Confirmed (1)
   TotalAmount  = order.TotalAmount
   DiscountAmount = order.DiscountAmount
   VatAmount    = order.VatAmount
   GrandTotal   = order.GrandTotal
   PaidAmount   = 0    ← chưa thanh toán
   Lines = copy từ SalesOrderLines (ProductId, UnitId, Qty, UnitPrice, Discount, VatRate, LineTotal)

8. 💰 CÔNG NỢ AR — TĂNG PHẢI THU KHÁCH HÀNG:
   DebtService.AppendEntryAsync(
     PartnerType   = Customer
     PartnerId     = order.CustomerId
     ReferenceType = "SalesOrder"
     ReferenceId   = order.Id
     DebitAmount   = order.GrandTotal  ← TĂNG AR
     CreditAmount  = 0
     BalanceAfter  = currentBalance + GrandTotal
     Description   = "Bán hàng {order.Code}"
   )

9. 📒 KẾ TOÁN — BÚT TOÁN KÉP (prefetch product.CostPrice):
   cogs = Σ (line.ConvertedQuantity × product.CostPrice)

   JournalEntry Lines:
     DR 131 (Phải thu KH)     = order.GrandTotal
     CR 511 (Doanh thu)       = order.TotalAmount - order.DiscountAmount
     CR 3331 (Thuế GTGT)      = order.VatAmount
     DR 632 (Giá vốn)         = cogs
     CR 156 (Hàng hóa)        = cogs
   
   Validate: ΣDebit = ΣCredit
   GrandTotal = (TotalAmount - Discount) + VatAmount = DR 131
   so: GrandTotal = (TotalAmount - Discount + VatAmount) = 511 + 3331
   cogs DR = cogs CR ✓

10. SaveChanges + Commit
```

### 4.3 Bảng DB bị ảnh hưởng

**READ:**
- `Warehouses` — Confirmed warehouse
- `InventoryBalances` — check availability mỗi line
- `Products` — `CostPrice` để tính COGS
- `DebtLedgers` — current balance của customer
- `Accounts` — lookup TK 131, 511, 3331, 632, 156

**WRITE:**

| Bảng | Column | Giá trị | Ý nghĩa |
|---|---|---|---|
| `SalesOrders` | `Status` | `1` (Confirmed) | Đơn đã xác nhận |
| `InventoryBalances` | `QuantityReserved` | `+= ConvertedQty` | Hàng bị "khóa" |
| `InventoryBalances` | `LastUpdated` | `DateTime.UtcNow` | Thời gian cập nhật |
| `DeliveryOrders` | `Id` | `Guid.NewGuid()` | Lệnh giao mới |
| `DeliveryOrders` | `Code` | `"DO-YYYYMMDD-..."` | Mã lệnh giao |
| `DeliveryOrders` | `SalesOrderId` | FK | Đơn hàng gốc |
| `DeliveryOrders` | `WarehouseId` | FK | Kho xuất hàng |
| `DeliveryOrders` | `Status` | `0` (Pending) | Chờ bắt đầu giao |
| `Invoices` | `Id` | `Guid.NewGuid()` | Hóa đơn mới |
| `Invoices` | `Code` | `"INV-YYYYMMDD-..."` | Mã hóa đơn |
| `Invoices` | `SalesOrderId` | FK | Đơn hàng |
| `Invoices` | `CustomerId` | FK | Khách hàng |
| `Invoices` | `InvoiceType` | `0` (Retail) | Hóa đơn bán lẻ |
| `Invoices` | `Status` | `1` (Confirmed) | Đã phát hành |
| `Invoices` | `TotalAmount` | `numeric(18,2)` | Tổng tiền hàng |
| `Invoices` | `PaidAmount` | `0` | Chưa thanh toán |
| `InvoiceLines` | mọi cột | copy từ SOLine | Dữ liệu giống SO |
| `DebtLedgers` | `PartnerType` | `0` (Customer) | Loại đối tác |
| `DebtLedgers` | `DebitAmount` | `order.GrandTotal` | AR tăng |
| `DebtLedgers` | `BalanceAfter` | `prev + GrandTotal` | Số dư AR mới |
| `JournalEntries` | `ReferenceType` | `"SalesOrder"` | — |
| `JournalEntryLines` | `AccountId` | FK `TK131` | DR 131 (Phải thu) |
| `JournalEntryLines` | `DebitAmount` | `GrandTotal` | — |
| `JournalEntryLines` | `AccountId` | FK `TK511` | CR 511 (Doanh thu) |
| `JournalEntryLines` | `CreditAmount` | `Total - Disc` | — |
| `JournalEntryLines` | `AccountId` | FK `TK3331` | CR 3331 (VAT) |
| `JournalEntryLines` | `CreditAmount` | `VatAmount` | — |
| `JournalEntryLines` | `AccountId` | FK `TK632` | DR 632 (Giá vốn) |
| `JournalEntryLines` | `DebitAmount` | `cogs` | — |
| `JournalEntryLines` | `AccountId` | FK `TK156` | CR 156 (Xuất kho) |
| `JournalEntryLines` | `CreditAmount` | `cogs` | — |

---

## 5. Hủy Đơn Hàng

**Endpoint:** `POST /api/sales-orders/{id}/cancel`

### 5.1 Guard conditions

| Điều kiện | Hành động |
|---|---|
| SO không tồn tại | Throw `NotFoundException` |
| `order.Status == Completed` | Throw `AppException("Completed orders cannot be cancelled")` |

### 5.2 Xử lý logic

```
1. Load SalesOrder + Lines
2. Guard: Status != Completed

3. Nếu Status == Confirmed:
   ┌─────────────────────────────────────────────────────────────┐
   │ 📊 GIẢI PHÓNG RESERVATION                                   │
   │                                                             │
   │ Load warehouse (first Active)                              │
   │ Với mỗi line:                                              │
   │   ReleaseReservedStockAsync(productId, warehouse.Id, qty)  │
   │   → InventoryBalance.QuantityReserved -= ConvertedQty      │
   │   → Math.Max(0, ...) để tránh âm                          │
   └─────────────────────────────────────────────────────────────┘

4. Set order.Status = Cancelled (3)
5. SaveChanges
```

> ⚠️ Hủy khi Draft (0): không có side-effect tồn kho.  
> ⚠️ Hủy khi Confirmed (1): giải phóng `QuantityReserved`.  
> ⚠️ **Không đảo ngược** bút toán kế toán hay công nợ khi hủy SO Confirmed.

### 5.3 Bảng DB bị ảnh hưởng

**WRITE:**

| Bảng | Column | Giá trị | Ý nghĩa |
|---|---|---|---|
| `SalesOrders` | `Status` | `3` (Cancelled) | Đơn đã hủy |
| `InventoryBalances` | `QuantityReserved` | `-= ConvertedQty` | *Nếu Confirmed* |

---

## 6. Xem Hóa Đơn

**Endpoints:**
- `GET /api/invoices` — Danh sách hóa đơn (paginated)
- `GET /api/invoices/{id}` — Chi tiết hóa đơn

**Read-only service** — `InvoiceService` chỉ có query, không có write operations.

### 6.1 Response fields quan trọng

| Field | Nguồn | Ý nghĩa |
|---|---|---|
| `Code` | `Invoices.Code` | Mã hóa đơn "INV-..." |
| `Status` | `Invoices.Status` | Confirmed (1) / Completed (2) |
| `TotalAmount` | `Invoices.TotalAmount` | Tiền hàng trước chiết khấu |
| `DiscountAmount` | `Invoices.DiscountAmount` | Tổng chiết khấu |
| `VatAmount` | `Invoices.VatAmount` | Tổng thuế GTGT |
| `GrandTotal` | `Invoices.GrandTotal` | Tổng phải thanh toán |
| `PaidAmount` | `Invoices.PaidAmount` | Đã thanh toán (cập nhật khi ghi Payment) |
| `RemainingAmount` | Tính tự động | `GrandTotal - PaidAmount` *(computed in code, not stored in DB — `builder.Ignore()`)* |
| `PaymentMethod` | `Invoices.PaymentMethod` | Phương thức thanh toán (nếu có) |

> **Lưu ý:** `RemainingAmount` được tính tại layer mapping (`GrandTotal - PaidAmount`), **không có cột DB** xứng tên — EF bỏ qua (`builder.Ignore()`).

---

## 7. Bảng DB Tổng Hợp

### Các bảng tham gia luồng bán hàng

| Bảng | Vai trò | Giai đoạn |
|---|---|---|
| `Customers` | Master data KH | READ tất cả phases |
| `Products` | Master data SP + CostPrice | READ (convert + COGS) |
| `Units` | Đơn vị đo | READ (convert) |
| `ProductUnitConversions` | BFS graph | READ (convert) |
| `Warehouses` | Kho xuất hàng | READ (Confirm SO) |
| `SalesOrders` | Header đơn hàng | WRITE (Create, Confirm, Cancel) |
| `SalesOrderLines` | Dòng đơn hàng | WRITE (Create, Update) |
| `Invoices` | Hóa đơn | WRITE (Confirm SO — auto-created) |
| `InvoiceLines` | Dòng hóa đơn | WRITE (Confirm SO — copy from SOLines) |
| `DeliveryOrders` | Lệnh giao hàng | WRITE (Confirm SO — auto-created) |
| `InventoryBalances` | Số dư tồn kho | WRITE (Confirm SO: reserve; Cancel SO: release) |
| `DebtLedgers` | Sổ cái AR | WRITE (Confirm SO: AR tăng) |
| `Accounts` | TK kế toán | READ (lookup 131, 511, 3331, 632, 156) |
| `JournalEntries` | Sổ nhật ký | WRITE (Confirm SO) |
| `JournalEntryLines` | Dòng bút toán | WRITE (Confirm SO) |

### Tóm tắt tác động theo bước

| Bước | Tồn kho | Công nợ | Kế toán |
|---|---|---|---|
| Create SO | ❌ | ❌ | ❌ |
| **Confirm SO** ⭐ | ✅ Reserve | ✅ AR+ | ✅ DR131/CR511/3331/DR632/CR156 |
| Cancel SO (Draft) | ❌ | ❌ | ❌ |
| Cancel SO (Confirmed) | ✅ Release | ❌ | ❌ |
| Invoice (read-only) | ❌ | ❌ | ❌ |
