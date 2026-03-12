# Nghiệp Vụ Tồn Kho (Inventory Flow)

> **Service:** `InventoryService`  
> **Controller:** `InventoryController.cs`  
> **Validator:** `InventoryValidators.cs`

---

## Mục lục

1. [Tổng quan](#1-tổng-quan)
2. [Mô hình dữ liệu tồn kho](#2-mô-hình-dữ-liệu-tồn-kho)
3. [Quy đổi đơn vị (BFS)](#3-quy-đổi-đơn-vị-bfs)
4. [Kiểm tra tồn kho](#4-kiểm-tra-tồn-kho)
5. [Đặt trước tồn kho (Reserve)](#5-đặt-trước-tồn-kho-reserve)
6. [Giải phóng đặt trước (Release Reserved)](#6-giải-phóng-đặt-trước-release-reserved)
7. [Cập nhật số dư (UpdateBalance)](#7-cập-nhật-số-dư-updatebalance)
8. [Ghi lịch sử giao dịch](#8-ghi-lịch-sử-giao-dịch)
9. [Điều chỉnh tồn kho (Adjust)](#9-điều-chỉnh-tồn-kho-adjust)
10. [Số dư đầu kỳ (Opening Balance)](#10-số-dư-đầu-kỳ-opening-balance)
11. [Query tồn kho & lịch sử](#11-query-tồn-kho--lịch-sử)
12. [Bảng DB tổng hợp](#12-bảng-db-tổng-hợp)

---

## 1. Tổng quan

`InventoryService` là **service nội bộ** (internal) — không được gọi trực tiếp từ client.  
Nó được inject vào các service khác: `PurchaseService`, `SalesService`, `OperationsService`.

Hai bảng chính:

| Bảng | Mục đích |
|---|---|
| `InventoryBalances` | Trạng thái hiện tại (mutable) — unique per (ProductId, WarehouseId) |
| `InventoryTransactions` | Lịch sử bất biến — append-only audit log |

---

## 2. Mô hình dữ liệu tồn kho

### InventoryBalance

Unique constraint: `(TenantId, ProductId, WarehouseId)`

| Column | Kiểu | Mô tả |
|---|---|---|
| `ProductId` | `uuid` FK | Sản phẩm |
| `WarehouseId` | `uuid` FK | Kho |
| `QuantityOnHand` | `numeric(18,6)` | Tồn kho thực tế (BaseUnit) |
| `QuantityReserved` | `numeric(18,6)` | Đang bị khóa (chờ giao) |
| `LastUpdated` | `timestamptz` | Lần cập nhật cuối |

**Available quantity** (không có cột DB, tính trong code):
```
Available = QuantityOnHand - QuantityReserved
```

### InventoryTransaction

Append-only — không bao giờ sửa/xóa.

| Column | Kiểu | Mô tả |
|---|---|---|
| `ProductId` | `uuid` FK | Sản phẩm |
| `WarehouseId` | `uuid` FK | Kho |
| `TransactionType` | `int` (enum) | Loại giao dịch (xem bên dưới) |
| `ReferenceType` | `int` (enum) | Nguồn gốc giao dịch |
| `ReferenceId` | `uuid?` | ID chứng từ gốc |
| `Quantity` | `numeric(18,6)` | Số lượng (BaseUnit, luôn dương) |
| `UnitCost` | `numeric(18,4)` | Đơn giá vốn (tại thời điểm giao dịch) |
| `TransactionDate` | `timestamptz` | Thời điểm giao dịch |
| `BatchNumber` | `text?` | Số lô (nếu IsBatchManaged) |
| `ExpiryDate` | `date?` | Hạn sử dụng (nếu IsExpiryManaged) |
| `Note` | `text?` | Ghi chú |

### Enum TransactionType

| Giá trị | Tên | Khi nào |
|---|---|---|
| 0 | In | Nhập kho (GoodsReceipt Confirm, Fail Delivery hoàn lại, Return) |
| 1 | Out | Xuất kho (Start Delivery, PurchaseReturn) |
| 2 | Adjust | Điều chỉnh (API /adjust) |
| 3 | Return | Khách trả hàng (SalesReturn), Trả NCC (PurchaseReturn) |
| 4 | Transfer | Chuyển kho (StockTransfer) |
| 5 | OpeningBalance | Nhập số dư đầu kỳ |

### Enum ReferenceType

| Giá trị | Tên | Liên kết tới |
|---|---|---|
| 0 | Purchase | GoodsReceipts |
| 1 | Sale | SalesOrders |
| 2 | Return | SalesReturns |
| 3 | Transfer | StockTransfers |
| 4 | Adjustment | Không có document |
| 5 | Promotion | (Dành cho tương lai) |
| 6 | Disposal | (Dành cho tương lai) |

---

## 3. Quy đổi đơn vị (BFS)

**Method:** `ConvertToBaseUnitAsync(productId, fromUnitId, quantity)`

### Khi nào được gọi?

Mọi lúc service nhận `quantity` từ người dùng (theo đơn vị bất kỳ) cần lưu về BaseUnit:
- Tạo PO/GR/SO/SalesReturn/PurchaseReturn/StockTransfer lines
- Bất kỳ nghiệp vụ nào cần so sánh với InventoryBalance

### Thuật toán BFS chi tiết

```
Input: productId, fromUnitId, quantity
Output: convertedQuantity (in BaseUnit)

1. Load product.BaseUnitId
2. Nếu fromUnitId == BaseUnitId:
   → return quantity (shortcut, không cần BFS)

3. Load tất cả ProductUnitConversions WHERE ProductId = productId
   Ví dụ: [(Thùng → Chai, rate=24), (Hộp → Chai, rate=12)]

4. Xây dựng bidirectional graph:
   Với mỗi conversion (FromUnitId, ToUnitId, rate):
     graph[FromUnitId].Add((ToUnitId, rate))
     graph[ToUnitId].Add((FromUnitId, 1/rate))   ← inverse

   Ví dụ đầy đủ:
     graph[Thùng] = [(Chai, 24)]
     graph[Chai]  = [(Thùng, 1/24)]
     graph[Hộp]   = [(Chai, 12)]
     graph[Chai]  += [(Hộp, 1/12)]

5. BFS từ fromUnitId đến BaseUnitId:
   queue = [(fromUnitId, accumulatedRate=1.0)]
   visited = {}
   
   While queue not empty:
     (current, rate) = dequeue
     If current in visited: skip
     visited.add(current)
     
     If current == BaseUnitId:
       return quantity × rate  ← ĐÃ TÌM THẤY
     
     For (neighbor, edgeRate) in graph[current]:
       If neighbor not in visited:
         enqueue (neighbor, rate × edgeRate)

6. Nếu không tìm được đường đi:
   throw AppException("No unit conversion path found for product {pid}: ...")
```

### Ví dụ thực tế

```
Sản phẩm: Bia (BaseUnit=Chai)
Conversions:
  Thùng(24) → Chai: rate=24
  Két(4)    → Thùng: rate=4

Nhập 2 Két:
  BFS: Két → Thùng(×4) → Chai(×24)
  ConvertedQuantity = 2 × 4 × 24 = 192 Chai
```

### Bảng DB đọc

| Bảng | Cột | Mục đích |
|---|---|---|
| `Products` | `BaseUnitId` | Đích BFS |
| `ProductUnitConversions` | `FromUnitId, ToUnitId, ConversionRate` | Xây graph |

---

## 4. Kiểm tra tồn kho

**Method:** `CheckStockAsync(productId, warehouseId, quantityInBaseUnit)`

**Được gọi bởi:** `SalesOrderService.ConfirmAsync`

```
1. Load InventoryBalance WHERE ProductId AND WarehouseId

2. available = (balance?.QuantityOnHand ?? 0) - (balance?.QuantityReserved ?? 0)

3. Nếu available < quantityInBaseUnit:
   throw AppException($"Insufficient stock. Available: {available}, Required: {qty}")

4. Nếu không có balance (null): available = 0 → sẽ throw nếu qty > 0
```

**Không thay đổi** bất kỳ dữ liệu nào — chỉ đọc.

---

## 5. Đặt trước tồn kho (Reserve)

**Method:** `ReserveStockAsync(productId, warehouseId, quantityInBaseUnit)`

**Được gọi bởi:** `SalesOrderService.ConfirmAsync` (sau CheckStock)

```
1. Load InventoryBalance (phải tồn tại, nếu không throw)
2. available = OnHand - Reserved

3. Nếu available < quantity:
   throw AppException("Cannot reserve {qty}. Available: {available}")

4. balance.QuantityReserved += quantity
   balance.LastUpdated = DateTime.UtcNow
```

**Bảng DB WRITE:**

| Bảng | Column | Giá trị |
|---|---|---|
| `InventoryBalances` | `QuantityReserved` | `+= quantity` |
| `InventoryBalances` | `LastUpdated` | `DateTime.UtcNow` |

---

## 6. Giải phóng đặt trước (Release Reserved)

**Method:** `ReleaseReservedStockAsync(productId, warehouseId, quantityInBaseUnit)`

**Được gọi bởi:**
- `SalesOrderService.CancelAsync` (hủy SO đang Confirmed)
- `DeliveryService.StartDeliveryAsync` (sau UpdateBalance)
- `DeliveryService.CancelDeliveryAsync` (hủy DO Pending)

```
1. Load InventoryBalance
2. Nếu không tồn tại (null): return (no-op)
3. balance.QuantityReserved = Math.Max(0, Reserved - quantity)
   → Math.Max để tránh âm (safety guard)
4. balance.LastUpdated = DateTime.UtcNow
```

**Bảng DB WRITE:**

| Bảng | Column | Giá trị |
|---|---|---|
| `InventoryBalances` | `QuantityReserved` | `-= quantity` (min 0) |

---

## 7. Cập nhật số dư (UpdateBalance)

**Method:** `UpdateBalanceAsync(productId, warehouseId, delta)`

`delta` có thể dương (nhập) hoặc âm (xuất).

**Được gọi bởi:** GoodsReceipt Confirm, Delivery Start/Fail, SalesReturn Confirm, PurchaseReturn Confirm, StockTransfer Confirm, Adjust, OpeningBalance.

```
1. Load InventoryBalance WHERE ProductId AND WarehouseId (WITH TRACKING)

2. Nếu balance == null (chưa tồn tại):
   Tạo mới:
   InventoryBalance {
     ProductId        = productId
     WarehouseId      = warehouseId
     QuantityOnHand   = delta > 0 ? delta : 0   ← không tạo số âm
     QuantityReserved = 0
     LastUpdated      = DateTime.UtcNow
   }

3. Nếu đã tồn tại:
   balance.QuantityOnHand += delta
   
   Nếu balance.QuantityOnHand < 0:
     throw AppException($"Inventory balance cannot be negative for product {pid}")
   
   balance.LastUpdated = DateTime.UtcNow
```

**Bảng DB WRITE:**

| Bảng | Column | Trường hợp |
|---|---|---|
| `InventoryBalances` | `QuantityOnHand` | `+= delta` (tạo mới hoặc cập nhật) |
| `InventoryBalances` | `LastUpdated` | `DateTime.UtcNow` |

---

## 8. Ghi lịch sử giao dịch

**Method:** `RecordTransactionAsync(request)`

**Luôn được gọi đi kèm** với `UpdateBalanceAsync` — không bao giờ gọi độc lập.

```
Tạo InventoryTransaction:
  ProductId       = request.ProductId
  WarehouseId     = request.WarehouseId
  TransactionType = request.TransactionType  (In/Out/Return/Transfer/...)
  ReferenceType   = request.ReferenceType    (Purchase/Sale/Return/Transfer/...)
  ReferenceId     = request.ReferenceId      (null cho Adjustment)
  Quantity        = request.Quantity         (luôn dương)
  UnitCost        = request.UnitCost
  TransactionDate = DateTime.UtcNow
  BatchNumber     = request.BatchNumber?
  ExpiryDate      = request.ExpiryDate?
  Note            = request.Note?

db.InventoryTransactions.Add(tx)
```

**Không gọi SaveChanges** — caller chịu trách nhiệm commit.

---

## 9. Điều chỉnh tồn kho (Adjust)

**Endpoint:** `POST /api/inventory/adjust`

**Validation:**

| Field | Rule |
|---|---|
| `ProductId` | `NotEmpty` |
| `WarehouseId` | `NotEmpty` |
| `TargetQuantity` | `>= 0` |
| `UnitCost` | `>= 0` |

**Request Body:**

```json
{
  "productId": "uuid",
  "warehouseId": "uuid",
  "targetQuantity": 100,
  "unitCost": 50000,
  "note": "Kiểm kê định kỳ tháng 3"
}
```

**Xử lý logic:**

🔒 **Wrapped trong DB transaction**

```
1. currentOnHand = GetOnHandAsync(productId, warehouseId)

2. delta = targetQuantity - currentOnHand
   Ví dụ: target=100, current=85 → delta=+15 (nhập thêm)
   Ví dụ: target=80,  current=85 → delta=-5  (xuất bớt)

3. UpdateBalanceAsync(productId, warehouseId, delta)
4. RecordTransactionAsync(
     TransactionType = Adjust (2)
     ReferenceType   = Adjustment (4)
     ReferenceId     = null
     Quantity        = delta
     UnitCost        = request.UnitCost
     Note = "Inventory adjustment: {currentOnHand} → {targetQuantity}"
   )

5. SaveChanges + Commit
6. Return InventoryTransactionDto
```

**Bảng DB WRITE:**

| Bảng | Column | Giá trị |
|---|---|---|
| `InventoryBalances` | `QuantityOnHand` | `= targetQuantity` (via delta) |
| `InventoryTransactions` | `TransactionType` | `2` (Adjust) |
| `InventoryTransactions` | `ReferenceType` | `4` (Adjustment) |
| `InventoryTransactions` | `ReferenceId` | `null` |
| `InventoryTransactions` | `Note` | Ghi chú điều chỉnh |

---

## 10. Số dư đầu kỳ (Opening Balance)

**Endpoint:** `POST /api/inventory/opening-balance`

**Request Body:**

```json
{
  "productId": "uuid",
  "warehouseId": "uuid",
  "quantity": 200,
  "unitCost": 48000,
  "note": "Số dư đầu kỳ tháng 1/2026"
}
```

**Validation:**
- `Quantity >= 0` — Opening balance không âm

**Xử lý logic:**

🔒 **Wrapped trong DB transaction**

```
1. Guard: Quantity >= 0

2. Load InventoryBalance (WITH TRACKING)
   Nếu chưa tồn tại: tạo mới với QuantityOnHand = Quantity
   Nếu đã tồn tại: override QuantityOnHand = Quantity  ← ghi đè số hiện tại

3. RecordTransactionAsync(
     TransactionType = OpeningBalance (5)
     ReferenceType   = Adjustment (4)   ← không có enum OpeningBalance trong ReferenceType
     Quantity        = Quantity
     UnitCost        = request.UnitCost
   )

4. SaveChanges + Commit
```

> ⚠️ **Ghi đè hoàn toàn** — `QuantityOnHand` được set bằng `request.Quantity`, không cộng/trừ.

---

## 11. Query tồn kho & lịch sử

### 11.1 Tồn kho hiện tại

**Endpoint:** `GET /api/inventory/balances`

**Filter params:**

| Param | Cột DB |
|---|---|
| `productId` | `InventoryBalances.ProductId` |
| `warehouseId` | `InventoryBalances.WarehouseId` |
| `onlyPositive` | `WHERE QuantityOnHand > 0` |

**Include navigation:** `Product`, `Warehouse`  
**Sort:** `ORDER BY Product.Name ASC`

### 11.2 Lịch sử giao dịch

**Endpoint:** `GET /api/inventory/transactions`

**Filter params:**

| Param | Cột DB |
|---|---|
| `productId` | `InventoryTransactions.ProductId` |
| `warehouseId` | `InventoryTransactions.WarehouseId` |
| `transactionType` | `InventoryTransactions.TransactionType` |
| `fromDate` | `InventoryTransactions.TransactionDate` |
| `toDate` | `InventoryTransactions.TransactionDate` |

**Sort:** `ORDER BY TransactionDate DESC`  
**Pagination:** page + pageSize

---

## 12. Bảng DB Tổng Hợp

| Bảng | Vai trò |
|---|---|
| `Products` | READ — BaseUnitId, CostPrice |
| `ProductUnitConversions` | READ — BFS graph |
| `Warehouses` | READ — navigation |
| `InventoryBalances` | READ+WRITE — trạng thái hiện tại |
| `InventoryTransactions` | WRITE (append-only) — lịch sử |

### Tất cả operations và tác động

| Operation | Method | OnHand | Reserved | Ghi Transaction |
|---|---|---|---|---|
| GR Confirm | UpdateBalance(+) | ✅ + | — | ✅ In |
| SO Confirm — Check | CheckStock | ❌ | — | — |
| SO Confirm — Reserve | ReserveStock | ❌ | ✅ + | — |
| Start Delivery | UpdateBalance(-) + Release | ✅ - | ✅ - | ✅ Out |
| Fail Delivery | UpdateBalance(+) | ✅ + | — | ✅ In |
| Cancel Delivery | Release | ❌ | ✅ - | — |
| Cancel SO | Release | ❌ | ✅ - | — |
| SalesReturn Confirm | UpdateBalance(+) | ✅ + | — | ✅ Return |
| PurchaseReturn Confirm | UpdateBalance(-) | ✅ - | — | ✅ Return |
| StockTransfer Confirm | UpdateBalance(From-) + (To+) | ✅ -/+ | — | ✅ Out+In |
| Adjust | UpdateBalance(delta) | ✅ delta | — | ✅ Adjust |
| Opening Balance | Set directly | ✅ set | — | ✅ OpeningBalance |
