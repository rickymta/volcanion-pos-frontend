# Nghiệp Vụ Chuyển Kho (Stock Transfer Flow)

> **Service:** `StockTransferService`  
> **Controller:** `OperationsControllers.cs`

---

## Mục lục

1. [Tổng quan](#1-tổng-quan)
2. [Sơ đồ trạng thái](#2-sơ-đồ-trạng-thái)
3. [Tạo Phiếu Chuyển Kho](#3-tạo-phiếu-chuyển-kho)
4. [Xác nhận Chuyển Kho ⭐](#4-xác-nhận-chuyển-kho-)
5. [Query danh sách](#5-query-danh-sách)
6. [Bảng DB tổng hợp](#6-bảng-db-tổng-hợp)

---

## 1. Tổng quan

StockTransfer dùng để điều chuyển hàng hóa **giữa 2 kho** trong cùng một tenant.  
Hai thao tác kho xảy ra **đồng thời trong một transaction**: xuất kho nguồn và nhập kho đích.

**Đặc điểm:**
- Không ảnh hưởng công nợ (không có đối tác)
- Không có bút toán kế toán (hiện tại — TODO có thể bổ sung DR 156-To / CR 156-From)
- Chỉ có 2 trạng thái: Draft → Completed (không có Cancelled)
- Validate: FromWarehouse phải khác ToWarehouse

---

## 2. Sơ đồ trạng thái

```
StockTransfer (DocumentStatus)
  Draft (0) ──[Confirm]──► Completed (2)
```

---

## 3. Tạo Phiếu Chuyển Kho

**Endpoint:** `POST /api/stock-transfers`

### 3.1 Request Body

```json
{
  "fromWarehouseId": "uuid",
  "toWarehouseId": "uuid",
  "transferDate": "2026-03-05",
  "note": "Điều chuyển từ kho Hà Nội về kho HCM",
  "lines": [
    {
      "productId": "uuid",
      "unitId": "uuid",
      "quantity": 50
    }
  ]
}
```

### 3.2 Validation

| Field | Rule | Lỗi |
|---|---|---|
| `FromWarehouseId` | `NotEmpty` | "Source warehouse is required." |
| `ToWarehouseId` | `NotEmpty` | "Destination warehouse is required." |
| `FromWarehouseId != ToWarehouseId` | Business rule | `AppException("Source and destination warehouse must be different")` |
| `Lines` | `NotEmpty` | "Stock transfer must have at least one line." |
| `Lines[].Quantity` | `> 0` | "Quantity must be greater than 0." |

### 3.3 Xử lý logic

🔒 **Wrapped trong DB transaction**

```
1. Guard: FromWarehouseId != ToWarehouseId
2. Sinh Code = "TF-YYYYMMDD-XXXXXXXX"

3. Tạo StockTransfer:
   Status = Draft (0)

4. Với mỗi dòng:
   ConvertedQuantity = ConvertToBaseUnitAsync(productId, unitId, quantity)
   Tạo StockTransferLine { ProductId, UnitId, Quantity, ConvertedQuantity }

5. SaveChanges + Commit
```

### 3.4 Bảng DB bị ảnh hưởng

**WRITE:**

| Bảng | Column | Giá trị | Ý nghĩa |
|---|---|---|---|
| `StockTransfers` | `Code` | `"TF-YYYYMMDD-..."` | Mã phiếu chuyển |
| `StockTransfers` | `FromWarehouseId` | FK | Kho nguồn |
| `StockTransfers` | `ToWarehouseId` | FK | Kho đích |
| `StockTransfers` | `TransferDate` | date | Ngày chuyển |
| `StockTransfers` | `Status` | `0` (Draft) | Chờ xác nhận |
| `StockTransferLines` | `ProductId` | FK | Sản phẩm |
| `StockTransferLines` | `UnitId` | FK | Đơn vị |
| `StockTransferLines` | `Quantity` | `numeric(18,6)` | SL theo đơn vị |
| `StockTransferLines` | `ConvertedQuantity` | `numeric(18,6)` | SL quy về BaseUnit |

---

## 4. Xác nhận Chuyển Kho ⭐

**Endpoint:** `POST /api/stock-transfers/{id}/confirm`

### 4.1 Guard conditions

| Điều kiện | Hành động |
|---|---|
| StockTransfer không tồn tại | Throw `NotFoundException` |
| `transfer.Status != Draft` | Throw `AppException("Only Draft transfers can be confirmed")` |

### 4.2 Xử lý logic chi tiết

🔒 **Wrapped trong DB transaction**

```
1. Load StockTransfer + Lines
2. Guard: Status == Draft (0)
3. Set transfer.Status = Completed (2)

4. Với mỗi StockTransferLine:
   ┌─────────────────────────────────────────────────────────────┐
   │ 📊 XUẤT KHO NGUỒN (FromWarehouse)                          │
   │                                                             │
   │ UpdateBalanceAsync(                                         │
   │   productId, transfer.FromWarehouseId, -ConvertedQty       │
   │ )                                                           │
   │ → InventoryBalance[productId, FromWarehouse].OnHand -= qty │
   │ → Throw nếu âm                                            │
   │                                                             │
   │ RecordTransactionAsync(                                     │
   │   ProductId      = line.ProductId                          │
   │   WarehouseId    = transfer.FromWarehouseId                │
   │   TransactionType = Out (1)                                │
   │   ReferenceType  = Transfer (3)                            │
   │   ReferenceId    = transfer.Id                             │
   │   Quantity       = ConvertedQty                            │
   │   UnitCost       = 0                                       │
   │   Note           = "Transfer OUT {transfer.Code}"          │
   │ )                                                           │
   └─────────────────────────────────────────────────────────────┘

   ┌─────────────────────────────────────────────────────────────┐
   │ 📊 NHẬP KHO ĐÍCH (ToWarehouse)                             │
   │                                                             │
   │ UpdateBalanceAsync(                                         │
   │   productId, transfer.ToWarehouseId, +ConvertedQty         │
   │ )                                                           │
   │ → InventoryBalance[productId, ToWarehouse].OnHand += qty   │
   │ → Tạo mới nếu chưa tồn tại                               │
   │                                                             │
   │ RecordTransactionAsync(                                     │
   │   ProductId      = line.ProductId                          │
   │   WarehouseId    = transfer.ToWarehouseId                  │
   │   TransactionType = In (0)                                 │
   │   ReferenceType  = Transfer (3)                            │
   │   ReferenceId    = transfer.Id                             │
   │   Quantity       = ConvertedQty                            │
   │   Note           = "Transfer IN {transfer.Code}"           │
   │ )                                                           │
   └─────────────────────────────────────────────────────────────┘

5. SaveChanges + Commit
```

**Kết quả tồn kho sau confirm:**

```
Trước:
  Kho A: ProductX = 100
  Kho B: ProductX = 20

Transfer 30 ProductX từ A → B:

Sau:
  Kho A: ProductX = 70   (100 - 30)
  Kho B: ProductX = 50   (20 + 30)
  
InventoryTransactions:
  [ProductX, KhoA, OUT, Transfer, ref=transfer.Id, qty=30]
  [ProductX, KhoB, IN,  Transfer, ref=transfer.Id, qty=30]
```

### 4.3 Bảng DB bị ảnh hưởng

**READ:**
- `StockTransfers` + `StockTransferLines` — load toàn bộ

**WRITE:**

| Bảng | Column | Giá trị | Ý nghĩa |
|---|---|---|---|
| `StockTransfers` | `Status` | `2` (Completed) | Đã chuyển |
| `InventoryBalances` | `QuantityOnHand` | `-= qty` (FromWH) | Xuất kho nguồn |
| `InventoryBalances` | `QuantityOnHand` | `+= qty` (ToWH) | Nhập kho đích |
| `InventoryBalances` | `LastUpdated` | `DateTime.UtcNow` | Cả 2 balances |
| `InventoryTransactions` | (row 1) | OUT / Transfer / FromWH | Xuất |
| `InventoryTransactions` | (row 2) | IN / Transfer / ToWH | Nhập |

> **2 InventoryTransactions** được tạo cho mỗi StockTransferLine (OUT + IN).

---

## 5. Query danh sách

**Endpoints:**
- `GET /api/stock-transfers` — paginated list
- `GET /api/stock-transfers/{id}` — chi tiết

**Filter params:**

| Param | Cột DB |
|---|---|
| `fromWarehouseId` | `StockTransfers.FromWarehouseId` |
| `toWarehouseId` | `StockTransfers.ToWarehouseId` |
| `status` | `StockTransfers.Status` |
| `fromDate` | `StockTransfers.TransferDate` |
| `toDate` | `StockTransfers.TransferDate` |

**Include navigation:**
- `StockTransfers.FromWarehouse`
- `StockTransfers.ToWarehouse`
- `StockTransferLines.Product`
- `StockTransferLines.Unit`

---

## 6. Bảng DB Tổng Hợp

| Bảng | Vai trò | Giai đoạn |
|---|---|---|
| `Warehouses` | Kho nguồn + kho đích | READ (navigation) |
| `Products` | Master data | READ (quy đổi) |
| `ProductUnitConversions` | BFS graph | READ (quy đổi) |
| `StockTransfers` | Header phiếu | WRITE (Create, Confirm) |
| `StockTransferLines` | Dòng sản phẩm | WRITE (Create) |
| `InventoryBalances` | Số dư kho | WRITE (Confirm: -From, +To) |
| `InventoryTransactions` | Lịch sử kho | WRITE (Confirm: OUT + IN per line) |

### Tóm tắt tác động

| Bước | Tồn kho | Công nợ | Kế toán |
|---|---|---|---|
| Create Transfer | ❌ | ❌ | ❌ |
| **Confirm Transfer** ⭐ | ✅ -FromWH, +ToWH | ❌ | ❌ |
