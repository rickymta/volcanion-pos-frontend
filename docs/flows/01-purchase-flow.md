# Nghiệp Vụ Mua Hàng (Purchase Flow)

> **Services:** `PurchaseOrderService`, `GoodsReceiptService`, `PurchaseReturnService`  
> **Controller:** `PurchaseControllers.cs`  
> **Validator:** `PurchaseValidators.cs`

---

## Mục lục

1. [Tổng quan](#1-tổng-quan)
2. [Sơ đồ trạng thái](#2-sơ-đồ-trạng-thái)
3. [Tạo Đơn Mua (Create PurchaseOrder)](#3-tạo-đơn-mua)
4. [Xác nhận Đơn Mua (Confirm PO)](#4-xác-nhận-đơn-mua)
5. [Hủy Đơn Mua (Cancel PO)](#5-hủy-đơn-mua)
6. [Tạo Phiếu Nhập Kho (Create GoodsReceipt)](#6-tạo-phiếu-nhập-kho)
7. [Xác nhận Nhập Kho (Confirm GR) ⭐](#7-xác-nhận-nhập-kho-)
8. [Hủy Phiếu Nhập Kho (Cancel GR)](#8-hủy-phiếu-nhập-kho)
9. [Tạo Phiếu Trả NCC (Create PurchaseReturn)](#9-tạo-phiếu-trả-ncc)
10. [Xác nhận Trả NCC (Confirm PurchaseReturn) ⭐](#10-xác-nhận-trả-ncc-)
11. [Bảng DB tổng hợp](#11-bảng-db-tổng-hợp)

---

## 1. Tổng quan

Luồng mua hàng gồm 3 tầng:

```
Đặt mua (PurchaseOrder)
    └─► Nhập kho (GoodsReceipt) — có thể partial
            └─► Trả hàng (PurchaseReturn) — nếu cần
```

**Đặc điểm quan trọng:**
- Tồn kho chỉ thay đổi khi **Confirm GoodsReceipt**, không phải khi Confirm PO.
- PO hỗ trợ **partial receipt**: nhiều GoodsReceipt cho 1 PO, PO chỉ Completed khi đủ số lượng tất cả dòng.
- Công nợ AP (phải trả NCC) chỉ phát sinh tại bước Confirm GoodsReceipt.

---

## 2. Sơ đồ trạng thái

```
PurchaseOrder
  Draft (0)
    │
    ├─[Confirm]─► Confirmed (1)
    │                  │
    │              [CreateGoodsReceipt × N (partial OK)]
    │                  │
    │              GoodsReceipt
    │              Draft (0) ─[Confirm]─► Completed (2)
    │                         └─[Cancel]─► Cancelled (3)  ← chỉ khi Draft
    │
    ├─[Cancel]─► Cancelled (3)  ← bất kỳ trạng thái trừ Completed
    │
    └─(auto)──► Completed (2)   ← khi tất cả GR lines đủ số lượng PO
```

> `DocumentStatus` enum: Draft=0, Confirmed=1, Completed=2, Cancelled=3

---

## 3. Tạo Đơn Mua

**Endpoint:** `POST /api/purchase-orders`

### 3.1 Request Body

```json
{
  "supplierId": "uuid",
  "orderDate": "2026-03-01",
  "note": "Đặt hàng tháng 3",
  "lines": [
    {
      "productId": "uuid",
      "unitId": "uuid",
      "quantity": 100,
      "unitPrice": 50000,
      "vatRate": 10
    }
  ]
}
```

### 3.2 Validation (FluentValidation)

| Field | Rule | Lỗi |
|---|---|---|
| `SupplierId` | `NotEmpty` | "Supplier is required." |
| `OrderDate` | `NotEmpty` | "Order date is required." |
| `Lines` | `NotEmpty`, min 1 dòng | "Purchase order must have at least one line." |
| `Lines[].ProductId` | `NotEmpty` | "Product is required." |
| `Lines[].UnitId` | `NotEmpty` | "Unit is required." |
| `Lines[].Quantity` | `> 0` | "Quantity must be greater than 0." |
| `Lines[].UnitPrice` | `>= 0` | "Unit price must be non-negative." |
| `Lines[].VatRate` | `>= 0 && <= 100` | "VAT rate must be between 0 and 100." |

### 3.3 Xử lý logic

🔒 **Wrapped trong DB transaction**

```
1. Sinh Code = CodeGenerator.Generate("PO")
   → Format: "PO-YYYYMMDD-XXXXXXXX" (ví dụ: "PO-20260301-A3F2C1D9")

2. Tạo PurchaseOrder:
   Status = Draft (0)

3. Với mỗi dòng:
   a. Gọi InventoryService.ConvertToBaseUnitAsync(productId, unitId, quantity)
      → Load Product.BaseUnitId
      → Nếu unitId == BaseUnitId: trả về quantity (shortcut)
      → Ngược lại: BFS qua ProductUnitConversions để tìm đường chuyển đổi
      → ConvertedQuantity = quantity × (tích rate dọc đường BFS)

   b. Tính LineTotal = quantity × unitPrice × (1 + vatRate/100)
      Lưu vào PurchaseOrderLine.LineTotal

4. Tính header totals:
   TotalAmount  = Σ (quantity × unitPrice)
   VatAmount    = Σ (quantity × unitPrice × vatRate/100)
   GrandTotal   = TotalAmount + VatAmount

5. db.PurchaseOrders.Add(po)
6. SaveChanges + Commit
```

### 3.4 Bảng DB bị ảnh hưởng

**WRITE:**

| Bảng | Column | Giá trị | Ý nghĩa |
|---|---|---|---|
| `PurchaseOrders` | `Id` | `Guid.NewGuid()` | Khóa chính mới |
| `PurchaseOrders` | `Code` | `"PO-YYYYMMDD-..."` | Mã đơn mua |
| `PurchaseOrders` | `SupplierId` | FK | Nhà cung cấp |
| `PurchaseOrders` | `OrderDate` | date | Ngày đặt hàng |
| `PurchaseOrders` | `Status` | `0` (Draft) | Trạng thái ban đầu |
| `PurchaseOrders` | `TotalAmount` | `numeric(18,2)` | Tổng tiền hàng (chưa VAT) |
| `PurchaseOrders` | `VatAmount` | `numeric(18,2)` | Tổng tiền VAT |
| `PurchaseOrders` | `GrandTotal` | `numeric(18,2)` | Tổng cộng (bao gồm VAT) |
| `PurchaseOrderLines` | `Id` | `Guid.NewGuid()` | Khóa chính |
| `PurchaseOrderLines` | `PurchaseOrderId` | FK | Liên kết header |
| `PurchaseOrderLines` | `ProductId` | FK | Sản phẩm |
| `PurchaseOrderLines` | `UnitId` | FK | Đơn vị nhập |
| `PurchaseOrderLines` | `Quantity` | `numeric(18,6)` | Số lượng theo đơn vị nhập |
| `PurchaseOrderLines` | `ConvertedQuantity` | `numeric(18,6)` | Số lượng quy về BaseUnit |
| `PurchaseOrderLines` | `UnitPrice` | `numeric(18,4)` | Đơn giá |
| `PurchaseOrderLines` | `VatRate` | `numeric(5,2)` | Thuế suất (%) |
| `PurchaseOrderLines` | `LineTotal` | `numeric(18,2)` | Thành tiền dòng (có VAT) |

**READ:**
- `Products` — kiểm tra `BaseUnitId`
- `ProductUnitConversions` — graph quy đổi đơn vị (nếu cần BFS)
- `Suppliers` — không validate ở đây (chỉ FK)

---

## 4. Xác nhận Đơn Mua

**Endpoint:** `POST /api/purchase-orders/{id}/confirm`

### 4.1 Guard conditions

| Điều kiện | Hành động |
|---|---|
| PO không tồn tại | Throw `NotFoundException` |
| `po.Status != Draft` | Throw `AppException("Only Draft orders can be confirmed")` |

### 4.2 Xử lý logic

```
1. Load PurchaseOrder by Id (filter TenantId + IsDeleted)
2. Check Status == Draft → nếu không, throw exception
3. Set po.Status = Confirmed (1)
4. SaveChanges (không có transaction riêng — đơn giản)
```

### 4.3 Bảng DB bị ảnh hưởng

**WRITE:**

| Bảng | Column | Giá trị | Ý nghĩa |
|---|---|---|---|
| `PurchaseOrders` | `Status` | `1` (Confirmed) | Đơn đã xác nhận, sẵn sàng nhập kho |
| `PurchaseOrders` | `UpdatedAt` | `DateTime.UtcNow` | Tự động set bởi EF |

**Không có:** thay đổi tồn kho, công nợ, bút toán.

---

## 5. Hủy Đơn Mua

**Endpoint:** `POST /api/purchase-orders/{id}/cancel`

### 5.1 Guard conditions

| Điều kiện | Hành động |
|---|---|
| PO không tồn tại | Throw `NotFoundException` |
| `po.Status == Completed` | Throw `AppException("Completed orders cannot be cancelled")` |

### 5.2 Xử lý logic

```
1. Load PurchaseOrder by Id
2. Check Status != Completed
3. Set po.Status = Cancelled (3)
4. SaveChanges
```

> ⚠️ **Lưu ý:** Nếu PO đã có GoodsReceipt được Confirm (→ tồn kho đã nhập), việc hủy PO **không** đảo ngược tồn kho. Phải dùng `PurchaseReturn` để trả lại hàng.

### 5.3 Bảng DB bị ảnh hưởng

**WRITE:**

| Bảng | Column | Giá trị | Ý nghĩa |
|---|---|---|---|
| `PurchaseOrders` | `Status` | `3` (Cancelled) | Đơn đã hủy |

---

## 6. Tạo Phiếu Nhập Kho

**Endpoint:** `POST /api/goods-receipts`

### 6.1 Request Body

```json
{
  "purchaseOrderId": "uuid",
  "warehouseId": "uuid",
  "receiptDate": "2026-03-05",
  "note": "Nhập kho lần 1",
  "lines": [
    {
      "productId": "uuid",
      "unitId": "uuid",
      "quantity": 50,
      "unitCost": 48000,
      "batchNumber": "BATCH-001",
      "expiryDate": "2027-12-31"
    }
  ]
}
```

### 6.2 Validation

| Field | Rule | Lỗi |
|---|---|---|
| `PurchaseOrderId` | `NotEmpty` | "Purchase order is required." |
| `WarehouseId` | `NotEmpty` | "Warehouse is required." |
| `ReceiptDate` | `NotEmpty` | "Receipt date is required." |
| `Lines` | `NotEmpty` | "Goods receipt must have at least one line." |
| `Lines[].Quantity` | `> 0` | "Quantity must be greater than 0." |
| `Lines[].UnitCost` | `>= 0` | "Unit cost must be non-negative." |

### 6.3 Xử lý logic

🔒 **Wrapped trong DB transaction**

```
1. Load PurchaseOrder (phải tồn tại)
2. Guard: po.Status phải == Confirmed
   → Nếu không: throw AppException("GoodsReceipt can only be created for Confirmed purchase orders")

3. Sinh Code = CodeGenerator.Generate("GR") → "GR-YYYYMMDD-..."
4. Tạo GoodsReceipt:
   PurchaseOrderId = request.PurchaseOrderId
   WarehouseId     = request.WarehouseId
   Status          = Draft (0)

5. Với mỗi dòng:
   ConvertedQuantity = ConvertToBaseUnitAsync(productId, unitId, quantity)
   Tạo GoodsReceiptLine {Quantity, ConvertedQuantity, UnitCost, BatchNumber?, ExpiryDate?}

6. SaveChanges + Commit
```

### 6.4 Bảng DB bị ảnh hưởng

**READ:**
- `PurchaseOrders` — load để validate Status == Confirmed
- `Products` — `BaseUnitId`
- `ProductUnitConversions` — BFS quy đổi

**WRITE:**

| Bảng | Column | Giá trị | Ý nghĩa |
|---|---|---|---|
| `GoodsReceipts` | `Id` | `Guid.NewGuid()` | Khóa chính |
| `GoodsReceipts` | `Code` | `"GR-YYYYMMDD-..."` | Mã phiếu nhập |
| `GoodsReceipts` | `PurchaseOrderId` | FK | Liên kết PO |
| `GoodsReceipts` | `WarehouseId` | FK | Kho nhập hàng |
| `GoodsReceipts` | `ReceiptDate` | date | Ngày nhập kho |
| `GoodsReceipts` | `Status` | `0` (Draft) | Chờ xác nhận |
| `GoodsReceiptLines` | `GoodsReceiptId` | FK | Header |
| `GoodsReceiptLines` | `ProductId` | FK | Sản phẩm |
| `GoodsReceiptLines` | `UnitId` | FK | Đơn vị nhập |
| `GoodsReceiptLines` | `Quantity` | `numeric(18,6)` | SL theo đơn vị nhập |
| `GoodsReceiptLines` | `ConvertedQuantity` | `numeric(18,6)` | SL quy về BaseUnit |
| `GoodsReceiptLines` | `UnitCost` | `numeric(18,4)` | Giá nhập |
| `GoodsReceiptLines` | `BatchNumber` | `text?` | Số lô (nếu có) |
| `GoodsReceiptLines` | `ExpiryDate` | `date?` | Hạn sử dụng (nếu có) |

---

## 7. Xác nhận Nhập Kho ⭐

**Endpoint:** `POST /api/goods-receipts/{id}/confirm`

Đây là bước **quan trọng nhất** của luồng mua hàng — tạo ra 4 side-effect cùng lúc.

### 7.1 Guard conditions

| Điều kiện | Hành động |
|---|---|
| GR không tồn tại | Throw `NotFoundException` |
| `gr.Status != Draft` | Throw `AppException("Only Draft receipts can be confirmed")` |

### 7.2 Xử lý logic chi tiết

🔒 **Wrapped trong DB transaction**

```
1. Load GoodsReceipt (+ Lines + PurchaseOrder)

2. Set gr.Status = Completed (2)

3. Với mỗi GoodsReceiptLine (line):
   ┌─────────────────────────────────────────────────────────────┐
   │ TỒN KHO — CẬP NHẬT SỐ DƯ                                    │
   │                                                             │
   │ UpdateBalanceAsync(productId, warehouseId, +ConvertedQty)   │
   │                                                             │
   │ → Tìm InventoryBalance WHERE ProductId = line.ProductId     │
   │                          AND WarehouseId = gr.WarehouseId   │
   │   Nếu chưa tồn tại: tạo mới với QuantityOnHand = delta      │
   │   Nếu đã tồn tại:                                           │
   │     QuantityOnHand += ConvertedQuantity                     │
   │     LastUpdated = DateTime.UtcNow                           │
   └─────────────────────────────────────────────────────────────┘
   
   ┌─────────────────────────────────────────────────────────────┐
   │ TỒN KHO — GHI LỊCH SỬ GIAO DỊCH                             │
   │                                                             │
   │ RecordTransactionAsync(                                     │
   │   ProductId      = line.ProductId                           │
   │   WarehouseId    = gr.WarehouseId                           │
   │   TransactionType = In (0)                                  │
   │   ReferenceType  = Purchase (0)                             │
   │   ReferenceId    = gr.Id                                    │
   │   Quantity       = line.ConvertedQuantity                   │
   │   UnitCost       = line.UnitCost                            │
   │   BatchNumber    = line.BatchNumber                         │
   │   ExpiryDate     = line.ExpiryDate                          │
   │   Note           = "GR {gr.Code}"                           │
   │ )                                                           │
   └─────────────────────────────────────────────────────────────┘

4. Tính totalCost = Σ (line.ConvertedQuantity × line.UnitCost)

5. 💰 CÔNG NỢ AP — TĂNG NỢ PHẢI TRẢ NCC
   DebtService.AppendEntryAsync(
     PartnerType     = Supplier
     PartnerId       = po.SupplierId
     ReferenceType   = "GoodsReceipt"
     ReferenceId     = gr.Id
     DebitAmount     = totalCost     ← TĂNG số dư AP (Nợ tăng AP)
     CreditAmount    = 0
     BalanceAfter    = currentBalance + totalCost
     Description     = "Nhập kho {gr.Code}"
   )

6. 📒 KẾ TOÁN — TẠO BÚT TOÁN KÉP
   AccountingService.CreateFromLinesAsync(
     ReferenceType = "GoodsReceipt"
     ReferenceId   = gr.Id
     Lines:
       DR 156 (Hàng hóa)        totalCost  ← hàng nhập kho
       CR 331 (Phải trả NCC)    totalCost  ← nợ NCC tăng
   )
   
   Validate: ΣDebit = ΣCredit (= totalCost)

7. KIỂM TRA HOÀN THÀNH PO (partial receipt logic):
   Load tất cả GoodsReceiptLines của cùng PurchaseOrderId
   với điều kiện Status = Completed (+ dòng vừa confirm)
   
   Load tất cả PurchaseOrderLines của PO
   
   allReceived = mọi PO line đã có Σ ConvertedQuantity (GR) >= ConvertedQuantity (PO)?
   
   Nếu allReceived = true → po.Status = Completed (2)
   Nếu false → PO vẫn Confirmed (1), chờ GR tiếp theo

8. SaveChanges + Commit
```

### 7.3 Bảng DB bị ảnh hưởng

**READ:**
- `GoodsReceipts` + `GoodsReceiptLines` — load để xử lý
- `PurchaseOrders` + `PurchaseOrderLines` — kiểm tra partial receipt
- `DebtLedgers` — lấy `BalanceAfter` hiện tại của NCC
- `Accounts` — lookup mã TK 156, 331

**WRITE:**

| Bảng | Column | Giá trị | Ý nghĩa |
|---|---|---|---|
| `GoodsReceipts` | `Status` | `2` (Completed) | Phiếu đã xác nhận |
| `InventoryBalances` | `QuantityOnHand` | `+= ConvertedQty` | Tồn kho tăng |
| `InventoryBalances` | `LastUpdated` | `DateTime.UtcNow` | Cập nhật mốc thời gian |
| `InventoryTransactions` | `ProductId` | FK | Sản phẩm |
| `InventoryTransactions` | `WarehouseId` | FK | Kho |
| `InventoryTransactions` | `TransactionType` | `0` (In) | Nhập kho |
| `InventoryTransactions` | `ReferenceType` | `0` (Purchase) | Từ nhập hàng |
| `InventoryTransactions` | `ReferenceId` | `gr.Id` | Phiếu GR gốc |
| `InventoryTransactions` | `Quantity` | `ConvertedQty` | SL (BaseUnit) |
| `InventoryTransactions` | `UnitCost` | `line.UnitCost` | Giá nhập |
| `InventoryTransactions` | `BatchNumber` | `text?` | Lô hàng |
| `InventoryTransactions` | `ExpiryDate` | `date?` | HSD |
| `DebtLedgers` | `PartnerType` | `1` (Supplier) | Loại đối tác |
| `DebtLedgers` | `PartnerId` | `po.SupplierId` | NCC |
| `DebtLedgers` | `ReferenceType` | `"GoodsReceipt"` | Loại chứng từ |
| `DebtLedgers` | `ReferenceId` | `gr.Id` | Phiếu nhập |
| `DebtLedgers` | `DebitAmount` | `totalCost` | Nợ tăng (AP tăng) |
| `DebtLedgers` | `CreditAmount` | `0` | — |
| `DebtLedgers` | `BalanceAfter` | `prev + totalCost` | Số dư AP mới |
| `JournalEntries` | `Code` | `"JE-YYYYMMDD-..."` | Mã bút toán |
| `JournalEntries` | `ReferenceType` | `"GoodsReceipt"` | Loại chứng từ |
| `JournalEntries` | `ReferenceId` | `gr.Id` | Phiếu nhập |
| `JournalEntryLines` | `AccountId` | FK `TK156` | Tài khoản hàng hóa |
| `JournalEntryLines` | `DebitAmount` | `totalCost` | Nợ TK 156 |
| `JournalEntryLines` | `AccountId` | FK `TK331` | Tài khoản NCC |
| `JournalEntryLines` | `CreditAmount` | `totalCost` | Có TK 331 |
| `PurchaseOrders` | `Status` | `2` (Completed) | *Nếu đủ tất cả lines* |

---

## 8. Hủy Phiếu Nhập Kho

**Endpoint:** `POST /api/goods-receipts/{id}/cancel`

### 8.1 Guard conditions

| Điều kiện | Hành động |
|---|---|
| GR không tồn tại | Throw `NotFoundException` |
| `gr.Status == Completed` | Throw `AppException("Cannot cancel a completed receipt. Create a return instead.")` |

### 8.2 Xử lý logic

```
1. Load GoodsReceipt
2. Guard: Status != Completed
3. Set gr.Status = Cancelled (3)
4. SaveChanges
```

> ⚠️ **Chỉ hủy được khi Draft.** Nếu đã Completed, phải dùng `PurchaseReturn`.  
> **Không thay đổi tồn kho** vì Draft chưa nhập kho.

---

## 9. Tạo Phiếu Trả NCC

**Endpoint:** `POST /api/purchase-returns`

### 9.1 Request Body

```json
{
  "goodsReceiptId": "uuid",
  "supplierId": "uuid",
  "returnDate": "2026-03-10",
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

### 9.2 Guard conditions

| Điều kiện | Hành động |
|---|---|
| GoodsReceipt không tồn tại | Throw `NotFoundException` |
| `gr.Status != Completed` | Throw `AppException("Can only return against a Completed goods receipt")` |

### 9.3 Xử lý logic

🔒 **Wrapped trong DB transaction**

```
1. Load GoodsReceipt (phải Completed)
2. Sinh Code = "PR-YYYYMMDD-..."
3. Tạo PurchaseReturn:
   Status    = Draft (0)
   IsRefunded = request.IsRefunded

4. Với mỗi dòng:
   ConvertedQuantity = ConvertToBaseUnitAsync(productId, unitId, quantity)
   ReturnAmount = quantity × unitCost

5. TotalReturnAmount = Σ ReturnAmount
6. SaveChanges + Commit
```

### 9.4 Bảng DB bị ảnh hưởng

**WRITE:**

| Bảng | Column | Giá trị | Ý nghĩa |
|---|---|---|---|
| `PurchaseReturns` | `Code` | `"PR-YYYYMMDD-..."` | Mã phiếu trả |
| `PurchaseReturns` | `GoodsReceiptId` | FK | GR gốc |
| `PurchaseReturns` | `SupplierId` | FK | NCC |
| `PurchaseReturns` | `ReturnDate` | date | Ngày trả |
| `PurchaseReturns` | `Reason` | `text` | Lý do trả |
| `PurchaseReturns` | `Status` | `0` (Draft) | Chờ xác nhận |
| `PurchaseReturns` | `IsRefunded` | `bool` | NCC hoàn tiền không? |
| `PurchaseReturns` | `TotalReturnAmount` | `numeric(18,2)` | Tổng tiền trả |
| `PurchaseReturnLines` | `ProductId` | FK | Sản phẩm |
| `PurchaseReturnLines` | `Quantity` | `numeric(18,6)` | SL theo đơn vị trả |
| `PurchaseReturnLines` | `ConvertedQuantity` | `numeric(18,6)` | SL quy về BaseUnit |
| `PurchaseReturnLines` | `UnitCost` | `numeric(18,4)` | Giá trả |
| `PurchaseReturnLines` | `ReturnAmount` | `numeric(18,2)` | Thành tiền dòng |

---

## 10. Xác nhận Trả NCC ⭐

**Endpoint:** `POST /api/purchase-returns/{id}/confirm`

### 10.1 Guard conditions

| Điều kiện | Hành động |
|---|---|
| PurchaseReturn không tồn tại | Throw `NotFoundException` |
| `ret.Status != Draft` | Throw `AppException("Only Draft purchase returns can be confirmed")` |
| GoodsReceipt không tồn tại | Throw `NotFoundException` |

### 10.2 Xử lý logic chi tiết

🔒 **Wrapped trong DB transaction**

```
1. Load PurchaseReturn + Lines + GoodsReceipt gốc
2. Lấy warehouseId = goodsReceipt.WarehouseId  ← trả về kho đã nhập

3. Set ret.Status = Completed (2)

4. Với mỗi PurchaseReturnLine:
   ┌─────────────────────────────────────────────────────────────┐
   │ 📊 TỒNG KHO — XUẤT KHO (TRẢ HÀNG)                        │
   │                                                             │
   │ UpdateBalanceAsync(productId, warehouseId, -ConvertedQty)  │
   │ → InventoryBalance.QuantityOnHand -= ConvertedQuantity     │
   │ → Throw nếu QuantityOnHand < 0                            │
   └─────────────────────────────────────────────────────────────┘
   
   ┌─────────────────────────────────────────────────────────────┐
   │ 📊 TỒNG KHO — GHI LỊCH SỬ                                 │
   │ TransactionType = Return (3)                               │
   │ ReferenceType   = Purchase (0)    ← đây là trả hàng mua   │
   │ Note = "Purchase Return {ret.Code}"                        │
   └─────────────────────────────────────────────────────────────┘
   
   totalReturnAmount += ConvertedQty × UnitCost

5. 💰 CÔNG NỢ AP — GIẢM NỢ PHẢI TRẢ NCC
   DebtService.AppendEntryAsync(
     PartnerType   = Supplier
     DebitAmount   = 0
     CreditAmount  = totalReturnAmount    ← GIẢM số dư AP
     BalanceAfter  = currentBalance - totalReturnAmount
   )

6. 📒 KẾ TOÁN — BÚT TOÁN KÉP
   DR 331 (Phải trả NCC)     totalReturnAmount  ← giảm AP
   CR 156 (Hàng hóa)         totalReturnAmount  ← xuất kho

7. SaveChanges + Commit
```

### 10.3 Bảng DB bị ảnh hưởng

**WRITE:**

| Bảng | Column | Giá trị | Ý nghĩa |
|---|---|---|---|
| `PurchaseReturns` | `Status` | `2` (Completed) | Đã xác nhận |
| `InventoryBalances` | `QuantityOnHand` | `-= ConvertedQty` | Tồn kho giảm |
| `InventoryTransactions` | `TransactionType` | `3` (Return) | Trả hàng |
| `InventoryTransactions` | `ReferenceType` | `0` (Purchase) | Liên kết mua hàng |
| `DebtLedgers` | `CreditAmount` | `totalReturnAmount` | Giảm AP |
| `DebtLedgers` | `BalanceAfter` | `prev - amount` | Số dư AP giảm |
| `JournalEntries` | `ReferenceType` | `"PurchaseReturn"` | — |
| `JournalEntryLines` | `AccountId` | FK `TK331` | Nợ TK 331 |
| `JournalEntryLines` | `DebitAmount` | `totalReturnAmount` | DR 331 |
| `JournalEntryLines` | `AccountId` | FK `TK156` | Có TK 156 |
| `JournalEntryLines` | `CreditAmount` | `totalReturnAmount` | CR 156 |

---

## 11. Bảng DB Tổng Hợp

### Các bảng tham gia luồng mua hàng

| Bảng | Vai trò | Giai đoạn |
|---|---|---|
| `Suppliers` | Master data NCC | READ tất cả phases |
| `Products` | Master data SP | READ (quy đổi đơn vị) |
| `Units` | Đơn vị đo | READ (quy đổi) |
| `ProductUnitConversions` | Graph quy đổi BFS | READ (quy đổi) |
| `Warehouses` | Kho hàng | READ (GR, PR) |
| `PurchaseOrders` | Header đặt mua | WRITE (Create, Confirm, Cancel) |
| `PurchaseOrderLines` | Dòng đặt mua | WRITE (Create, Update) |
| `GoodsReceipts` | Phiếu nhập kho | WRITE (Create, Confirm, Cancel) |
| `GoodsReceiptLines` | Dòng nhập kho | WRITE (Create) |
| `PurchaseReturns` | Phiếu trả NCC | WRITE (Create, Confirm) |
| `PurchaseReturnLines` | Dòng trả NCC | WRITE (Create) |
| `InventoryBalances` | Số dư tồn kho | WRITE (Confirm GR, Confirm PR) |
| `InventoryTransactions` | Lịch sử kho | WRITE (Confirm GR, Confirm PR) |
| `DebtLedgers` | Sổ cái công nợ | WRITE (Confirm GR, Confirm PR) |
| `Accounts` | TK kế toán | READ (lookup TK 156, 331) |
| `JournalEntries` | Đầu bút toán | WRITE (Confirm GR, Confirm PR) |
| `JournalEntryLines` | Dòng bút toán | WRITE (Confirm GR, Confirm PR) |

### Tóm tắt tác động theo bước

| Bước | Tồn kho | Công nợ | Kế toán |
|---|---|---|---|
| Create PO | ❌ | ❌ | ❌ |
| Confirm PO | ❌ | ❌ | ❌ |
| Cancel PO | ❌ | ❌ | ❌ |
| Create GR | ❌ | ❌ | ❌ |
| **Confirm GR** ⭐ | ✅ IN | ✅ AP+ | ✅ DR156/CR331 |
| Cancel GR | ❌ | ❌ | ❌ |
| Create PR | ❌ | ❌ | ❌ |
| **Confirm PR** ⭐ | ✅ OUT | ✅ AP- | ✅ DR331/CR156 |
