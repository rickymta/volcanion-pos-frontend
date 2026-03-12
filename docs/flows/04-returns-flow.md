# Nghiệp Vụ Trả Hàng (Returns Flow)

> **Services:** `SalesReturnService`, `PurchaseReturnService`  
> **Controller:** `OperationsControllers.cs`, `PurchaseControllers.cs`

---

## Mục lục

1. [Tổng quan](#1-tổng-quan)
2. [Trả Hàng Bán — SalesReturn](#2-trả-hàng-bán--salesreturn)
   - [2.1 Tạo phiếu trả](#21-tạo-phiếu-trả-salesreturn)
   - [2.2 Xác nhận trả hàng bán ⭐](#22-xác-nhận-trả-hàng-bán-)
3. [Trả Hàng Mua — PurchaseReturn](#3-trả-hàng-mua--purchasereturn)
   - [3.1 Tạo phiếu trả NCC](#31-tạo-phiếu-trả-ncc)
   - [3.2 Xác nhận trả hàng mua ⭐](#32-xác-nhận-trả-hàng-mua-)
4. [So sánh hai loại trả hàng](#4-so-sánh-hai-loại-trả-hàng)
5. [Bảng DB tổng hợp](#5-bảng-db-tổng-hợp)

---

## 1. Tổng quan

Hệ thống có 2 loại trả hàng:

| Loại | Chiều | Trigger | Tác động kho |
|---|---|---|---|
| `SalesReturn` | Khách hàng → Cửa hàng | Invoice Confirmed/Completed | Nhập lại kho |
| `PurchaseReturn` | Cửa hàng → NCC | GoodsReceipt Completed | Xuất khỏi kho |

---

## 2. Trả Hàng Bán — SalesReturn

### 2.1 Tạo phiếu trả (SalesReturn)

**Endpoint:** `POST /api/sales-returns`

#### Request Body

```json
{
  "invoiceId": "uuid",
  "customerId": "uuid",
  "returnDate": "2026-03-08",
  "reason": "Hàng bị lỗi",
  "isRefunded": true,
  "lines": [
    {
      "productId": "uuid",
      "unitId": "uuid",
      "quantity": 2,
      "unitPrice": 120000
    }
  ]
}
```

#### Guard conditions

| Điều kiện | Hành động |
|---|---|
| Invoice không tồn tại | Throw `NotFoundException` |
| `invoice.Status != Confirmed && != Completed` | Throw `AppException("Can only return against a Confirmed or Completed invoice")` |

#### Xử lý logic

🔒 **Wrapped trong DB transaction**

```
1. Load Invoice (phải Confirmed hoặc Completed)
2. Sinh Code = "RET-YYYYMMDD-XXXXXXXX"

3. Tạo SalesReturn:
   Status     = Draft (0)
   IsRefunded = request.IsRefunded  ← có hoàn tiền mặt không?

4. Với mỗi dòng:
   ConvertedQuantity = ConvertToBaseUnitAsync(productId, unitId, quantity)
   RefundAmount = quantity × unitPrice

5. TotalRefundAmount = Σ RefundAmount
6. SaveChanges + Commit
```

#### Bảng DB bị ảnh hưởng

**READ:**
- `Invoices` — validate Status

**WRITE:**

| Bảng | Column | Giá trị | Ý nghĩa |
|---|---|---|---|
| `SalesReturns` | `Code` | `"RET-YYYYMMDD-..."` | Mã phiếu trả |
| `SalesReturns` | `InvoiceId` | FK | Hóa đơn gốc |
| `SalesReturns` | `CustomerId` | FK | Khách hàng |
| `SalesReturns` | `ReturnDate` | date | Ngày trả |
| `SalesReturns` | `Reason` | `text` | Lý do trả |
| `SalesReturns` | `Status` | `0` (Draft) | Chờ xác nhận |
| `SalesReturns` | `IsRefunded` | `bool` | Hoàn tiền mặt? |
| `SalesReturns` | `TotalRefundAmount` | `numeric(18,2)` | Tổng tiền hoàn |
| `SalesReturnLines` | `ProductId` | FK | Sản phẩm |
| `SalesReturnLines` | `UnitId` | FK | Đơn vị |
| `SalesReturnLines` | `Quantity` | `numeric(18,6)` | SL theo đơn vị trả |
| `SalesReturnLines` | `ConvertedQuantity` | `numeric(18,6)` | SL quy về BaseUnit |
| `SalesReturnLines` | `UnitPrice` | `numeric(18,4)` | Giá trả |
| `SalesReturnLines` | `RefundAmount` | `numeric(18,2)` | Tiền hoàn dòng |

---

### 2.2 Xác nhận trả hàng bán ⭐

**Endpoint:** `POST /api/sales-returns/{id}/confirm`

Đây là bước phức tạp nhất — có thể tạo **3 journal entries** tùy `IsRefunded`.

#### Guard conditions

| Điều kiện | Hành động |
|---|---|
| SalesReturn không tồn tại | Throw `NotFoundException` |
| `ret.Status != Draft` | Throw `AppException("Only Draft returns can be confirmed")` |
| Không tìm được warehouse | Throw `AppException("No warehouse found for return")` |

#### Xử lý logic chi tiết

🔒 **Wrapped trong DB transaction**

```
1. Load SalesReturn + Lines
2. Tìm warehouse từ DeliveryOrder liên kết:
   JOIN DeliveryOrders d ON d.SalesOrderId = Invoice.SalesOrderId
   → warehouseId = d.WarehouseId
   → Fallback: first Active warehouse nếu không tìm được DO

3. Prefetch product.CostPrice cho COGS reversal:
   Dictionary<ProductId, CostPrice> costMap

4. Set ret.Status = Completed (2)

5. Với mỗi SalesReturnLine:
   ┌─────────────────────────────────────────────────────────────┐
   │ 📊 NHẬP LẠI KHO                                             │
   │                                                             │
   │ UpdateBalanceAsync(productId, warehouseId, +ConvertedQty)  │
   │ → InventoryBalance.QuantityOnHand += ConvertedQty          │
   │                                                             │
   │ RecordTransactionAsync(                                     │
   │   TransactionType = Return (3)                             │
   │   ReferenceType   = Return (2)                             │
   │   Note = "Sales return {ret.Code}"                         │ 
   │ )                                                           │
   └─────────────────────────────────────────────────────────────┘

6. 💰 CÔNG NỢ AR — GIẢM PHẢI THU KHÁCH HÀNG:
   AppendEntryAsync(
     PartnerType   = Customer
     DebitAmount   = 0
     CreditAmount  = ret.TotalRefundAmount   ← AR giảm
     BalanceAfter  = currentBalance - TotalRefundAmount
     Description   = "Sales return {ret.Code}"
   )

7. 📒 JOURNAL 1 — ĐẢO NGƯỢC DOANH THU:
   DR 511 (Doanh thu)     = TotalRefundAmount  ← doanh thu giảm
   CR 131 (Phải thu KH)   = TotalRefundAmount  ← AR giảm

8. 📒 JOURNAL 2 — ĐẢO NGƯỢC COGS (nếu cogs > 0):
   cogs = Σ (line.ConvertedQuantity × costMap[line.ProductId])
   
   Nếu cogs > 0:
     DR 156 (Hàng hóa)  = cogs  ← hàng quay về kho
     CR 632 (Giá vốn)   = cogs  ← giảm giá vốn đã ghi

9. NẾU IsRefunded = true (hoàn tiền mặt):
   ┌─────────────────────────────────────────────────────────────┐
   │ 💰 TẠO PAYMENT RECORD (hoàn tiền)                          │
   │                                                             │
   │ Payment {                                                   │
   │   PartnerType  = Customer                                   │
   │   PaymentType  = Refund (2)                                │
   │   Amount       = TotalRefundAmount                         │
   │   ReferenceType = "SalesReturn"                            │
   │   ReferenceId  = ret.Id                                    │
   │ }                                                           │
   └─────────────────────────────────────────────────────────────┘
   
   AppendEntryAsync(
     ReferenceType = "SalesReturnRefund"
     CreditAmount  = TotalRefundAmount  ← AR giảm thêm lần nữa
   )
   
   📒 JOURNAL 3 — XUẤT QUỸ HOÀN TIỀN:
   DR 131 (Phải thu KH)  = TotalRefundAmount  ← xóa AR còn lại
   CR 111 (Tiền mặt)     = TotalRefundAmount  ← tiền ra khỏi két

10. SaveChanges + Commit
```

#### Bảng DB bị ảnh hưởng

**READ:**
- `DeliveryOrders` — tìm warehouse
- `Invoices` — navigation
- `Products` — `CostPrice` cho COGS reversal
- `DebtLedgers` — current balance

**WRITE:**

| Bảng | Column | Giá trị | Ý nghĩa |
|---|---|---|---|
| `SalesReturns` | `Status` | `2` (Completed) | Đã xác nhận |
| `InventoryBalances` | `QuantityOnHand` | `+= ConvertedQty` | Nhập lại kho |
| `InventoryTransactions` | `TransactionType` | `3` (Return) | Trả hàng |
| `InventoryTransactions` | `ReferenceType` | `2` (Return) | Từ sales return |
| `DebtLedgers` | `CreditAmount` | `TotalRefundAmount` | AR giảm |
| `(DebtLedgers)` | `CreditAmount` | `TotalRefundAmount` | AR giảm thêm (nếu IsRefunded) |
| `JournalEntries` | `ReferenceType` | `"SalesReturn"` | Journal doanh thu |
| `JournalEntryLines` | DR 511 | `TotalRefundAmount` | Đảo doanh thu |
| `JournalEntryLines` | CR 131 | `TotalRefundAmount` | Giảm AR |
| `JournalEntries` | `ReferenceType` | `"SalesReturn"` | Journal COGS |
| `JournalEntryLines` | DR 156 | `cogs` | Nhập lại kho |
| `JournalEntryLines` | CR 632 | `cogs` | Đảo COGS |
| `Payments` | `PaymentType` | `2` (Refund) | *Nếu IsRefunded* |
| `JournalEntries` | `ReferenceType` | `"SalesReturnRefund"` | *Nếu IsRefunded* |
| `JournalEntryLines` | DR 131 | `TotalRefundAmount` | *Nếu IsRefunded* |
| `JournalEntryLines` | CR 111 | `TotalRefundAmount` | Tiền mặt hoàn *Nếu IsRefunded* |

---

## 3. Trả Hàng Mua — PurchaseReturn

### 3.1 Tạo phiếu trả NCC

**Endpoint:** `POST /api/purchase-returns`

#### Request Body

```json
{
  "goodsReceiptId": "uuid",
  "supplierId": "uuid",
  "returnDate": "2026-03-08",
  "reason": "Hàng bị hỏng",
  "isRefunded": false,
  "lines": [
    {
      "productId": "uuid",
      "unitId": "uuid",
      "quantity": 10,
      "unitCost": 48000
    }
  ]
}
```

#### Guard conditions

| Điều kiện | Hành động |
|---|---|
| GoodsReceipt không tồn tại | Throw `NotFoundException` |
| `gr.Status != Completed` | Throw `AppException("Can only return against a Completed goods receipt")` |

#### Xử lý logic

🔒 **Wrapped trong DB transaction**

```
1. Load GoodsReceipt (phải Completed)
2. Sinh Code = "PR-YYYYMMDD-XXXXXXXX"
3. Tạo PurchaseReturn { Status = Draft, IsRefunded, Reason }
4. Với mỗi dòng:
   ConvertedQuantity = ConvertToBaseUnitAsync(...)
   ReturnAmount = quantity × unitCost
5. TotalReturnAmount = Σ ReturnAmount
6. SaveChanges + Commit
```

#### Bảng DB bị ảnh hưởng

| Bảng | Column | Giá trị | Ý nghĩa |
|---|---|---|---|
| `PurchaseReturns` | `Code` | `"PR-YYYYMMDD-..."` | Mã phiếu |
| `PurchaseReturns` | `GoodsReceiptId` | FK | GR gốc |
| `PurchaseReturns` | `SupplierId` | FK | NCC |
| `PurchaseReturns` | `ReturnDate` | date | Ngày trả |
| `PurchaseReturns` | `Reason` | `text` | Lý do |
| `PurchaseReturns` | `Status` | `0` (Draft) | Chờ xác nhận |
| `PurchaseReturns` | `IsRefunded` | `bool` | NCC hoàn tiền? |
| `PurchaseReturns` | `TotalReturnAmount` | `numeric(18,2)` | Tổng tiền trả |
| `PurchaseReturnLines` | `Quantity` | `numeric(18,6)` | SL theo đơn vị |
| `PurchaseReturnLines` | `ConvertedQuantity` | `numeric(18,6)` | SL BaseUnit |
| `PurchaseReturnLines` | `UnitCost` | `numeric(18,4)` | Giá trả |
| `PurchaseReturnLines` | `ReturnAmount` | `numeric(18,2)` | Thành tiền dòng |

---

### 3.2 Xác nhận trả hàng mua ⭐

**Endpoint:** `POST /api/purchase-returns/{id}/confirm`

#### Guard conditions

| Điều kiện | Hành động |
|---|---|
| PurchaseReturn không tồn tại | Throw `NotFoundException` |
| `ret.Status != Draft` | Throw `AppException("Only Draft purchase returns can be confirmed")` |
| GoodsReceipt không tồn tại | Throw `NotFoundException` |

#### Xử lý logic chi tiết

🔒 **Wrapped trong DB transaction**

```
1. Load PurchaseReturn + Lines
2. Load GoodsReceipt gốc → lấy warehouseId = gr.WarehouseId

3. Set ret.Status = Completed (2)

4. Với mỗi PurchaseReturnLine:
   ┌─────────────────────────────────────────────────────────────┐
   │ 📊 XUẤT KHO (TRẢ VỀ NCC)                                   │
   │                                                             │
   │ UpdateBalanceAsync(productId, warehouseId, -ConvertedQty)  │
   │ → InventoryBalance.QuantityOnHand -= ConvertedQty          │
   │                                                             │
   │ RecordTransactionAsync(                                     │
   │   TransactionType = Return (3)                             │
   │   ⚠️  ReferenceType = Purchase (0)  ← không phải Return!  │
   │   Note = "Purchase Return {ret.Code}"                      │
   │ )                                                           │
   └─────────────────────────────────────────────────────────────┘
   
   totalReturnAmount += ConvertedQty × UnitCost

5. 💰 CÔNG NỢ AP — GIẢM PHẢI TRẢ NCC:
   AppendEntryAsync(
     PartnerType   = Supplier
     DebitAmount   = 0
     CreditAmount  = totalReturnAmount   ← AP giảm
     BalanceAfter  = currentBalance - totalReturnAmount
   )

6. 📒 KẾ TOÁN — BÚT TOÁN:
   DR 331 (Phải trả NCC)  = totalReturnAmount  ← AP giảm
   CR 156 (Hàng hóa)      = totalReturnAmount  ← xuất kho

7. SaveChanges + Commit
```

> ⚠️ **Chi tiết về `ReferenceType`:** `PurchaseReturn` dùng `ReferenceType = Purchase (0)` (không phải Return=2) vì giao dịch này thuộc context mua hàng, chỉ là hướng ngược lại.

#### Bảng DB bị ảnh hưởng

| Bảng | Column | Giá trị | Ý nghĩa |
|---|---|---|---|
| `PurchaseReturns` | `Status` | `2` (Completed) | Xác nhận |
| `InventoryBalances` | `QuantityOnHand` | `-= ConvertedQty` | Xuất kho |
| `InventoryTransactions` | `TransactionType` | `3` (Return) | Trả hàng |
| `InventoryTransactions` | `ReferenceType` | `0` (Purchase) | Purchase context |
| `DebtLedgers` | `CreditAmount` | `totalReturnAmount` | AP giảm |
| `JournalEntryLines` | DR 331 | `totalReturnAmount` | Giảm AP |
| `JournalEntryLines` | CR 156 | `totalReturnAmount` | Giảm tồn kho |

---

## 4. So sánh hai loại trả hàng

| Khía cạnh | SalesReturn | PurchaseReturn |
|---|---|---|
| Chiều hàng | Khách → Cửa hàng | Cửa hàng → NCC |
| Điều kiện | Invoice Confirmed/Completed | GoodsReceipt Completed |
| Tồn kho | +QuantityOnHand (nhập lại) | -QuantityOnHand (xuất đi) |
| Công nợ | AR giảm (Customer Credit) | AP giảm (Supplier Credit) |
| Bút toán 1 | DR 511 / CR 131 | DR 331 / CR 156 |
| Bút toán 2 | DR 156 / CR 632 (COGS reverse) | — |
| Bút toán 3 | DR 131 / CR 111 *(nếu IsRefunded)* | — |
| Payment | Tạo Payment{Refund} *(nếu IsRefunded)* | Không tạo Payment |

---

## 5. Bảng DB Tổng Hợp

| Bảng | SalesReturn | PurchaseReturn |
|---|---|---|
| `Invoices` | READ (validate) | — |
| `GoodsReceipts` | — | READ (get warehouseId) |
| `SalesReturns` | WRITE | — |
| `SalesReturnLines` | WRITE | — |
| `PurchaseReturns` | — | WRITE |
| `PurchaseReturnLines` | — | WRITE |
| `InventoryBalances` | +OnHand | -OnHand |
| `InventoryTransactions` | Return/Return | Return/Purchase |
| `DebtLedgers` | Customer Credit | Supplier Credit |
| `JournalEntries` | 2-3 entries | 1 entry |
| `Payments` | *(nếu IsRefunded)* | — |
