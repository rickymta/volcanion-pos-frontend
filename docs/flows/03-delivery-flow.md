# Nghiệp Vụ Giao Hàng (Delivery Flow)

> **Service:** `DeliveryService`  
> **Controller:** `OperationsControllers.cs`

---

## Mục lục

1. [Tổng quan](#1-tổng-quan)
2. [Sơ đồ trạng thái](#2-sơ-đồ-trạng-thái)
3. [Bắt đầu giao hàng (Start Delivery) ⭐](#3-bắt-đầu-giao-hàng-)
4. [Hoàn thành giao hàng (Complete Delivery)](#4-hoàn-thành-giao-hàng)
5. [Giao hàng thất bại (Fail Delivery) ⭐](#5-giao-hàng-thất-bại-)
6. [Hủy lệnh giao (Cancel Delivery)](#6-hủy-lệnh-giao)
7. [Query danh sách & chi tiết](#7-query-danh-sách--chi-tiết)
8. [Bảng DB tổng hợp](#8-bảng-db-tổng-hợp)

---

## 1. Tổng quan

`DeliveryOrder` được tạo tự động khi `SalesOrder` Confirmed.  
Luồng giao hàng quản lý **thực tế xuất kho vật lý** — hàng chỉ rời kho khi shipper bắt đầu giao (`StartDelivery`).

**Thiết kế quan trọng:**
- **SO Confirm** → chỉ `reserve` tồn kho (`QuantityReserved += qty`), hàng chưa rời kho
- **Start Delivery** → mới thực sự xuất kho (`QuantityOnHand -= qty`, `QuantityReserved -= qty`)
- **Fail Delivery** → đảo ngược: nhập lại kho (`QuantityOnHand += qty`)
- **Cancel Delivery (Pending)** → hủy trước khi giao: chỉ release reservation

---

## 2. Sơ đồ trạng thái

```
DeliveryOrder (DeliveryStatus enum)
  Pending (0) ──[Cancel]──► Cancelled (4)
     │
  [Start]
     ↓
  InTransit (1) ──[Complete]──► Delivered (2)
       └──────────[Fail]──────► Failed (3)
```

> `DeliveryStatus` enum: Pending=0, InTransit=1, Delivered=2, Failed=3, Cancelled=4

---

## 3. Bắt đầu giao hàng ⭐

**Endpoint:** `POST /api/delivery-orders/{id}/start`

### 3.1 Guard conditions

| Điều kiện | Hành động |
|---|---|
| DeliveryOrder không tồn tại | Throw `NotFoundException` |
| `d.Status != Pending` | Throw `AppException("Only Pending delivery orders can be started")` |

### 3.2 Xử lý logic chi tiết

🔒 **Wrapped trong DB transaction**

```
1. Load DeliveryOrder by Id
2. Guard: Status == Pending (0)

3. Load SalesOrder + Lines (via d.SalesOrderId)

4. Set d.Status = InTransit (1)
   Set d.DeliveryDate = DateTime.UtcNow

5. Với mỗi SalesOrderLine:
   ┌─────────────────────────────────────────────────────────────┐
   │ 📊 XUẤT KHO VẬT LÝ                                         │
   │                                                             │
   │ UpdateBalanceAsync(productId, d.WarehouseId, -ConvertedQty)│
   │                                                             │
   │ → InventoryBalance:                                        │
   │     QuantityOnHand -= ConvertedQuantity  ← hàng rời kho   │
   │     Throw nếu QuantityOnHand < 0                          │
   └─────────────────────────────────────────────────────────────┘
   
   ┌─────────────────────────────────────────────────────────────┐
   │ 📊 GIẢI PHÓNG RESERVATION                                   │
   │                                                             │
   │ ReleaseReservedStockAsync(productId, d.WarehouseId, qty)   │
   │                                                             │
   │ → InventoryBalance:                                        │
   │     QuantityReserved -= ConvertedQuantity                  │
   │     Math.Max(0, ...) để tránh âm                          │
   └─────────────────────────────────────────────────────────────┘
   
   ┌─────────────────────────────────────────────────────────────┐
   │ 📊 GHI LỊCH SỬ GIAO DỊCH                                   │
   │                                                             │
   │ RecordTransactionAsync(                                     │
   │   ProductId      = line.ProductId                          │
   │   WarehouseId    = d.WarehouseId                           │
   │   TransactionType = Out (1)                                │
   │   ReferenceType  = Sale (1)                                │
   │   ReferenceId    = order.Id                                │
   │   Quantity       = line.ConvertedQuantity                  │
   │   UnitCost       = 0                                       │
   │   Note           = "Delivery started: DO {d.Code}"        │
   │ )                                                           │
   └─────────────────────────────────────────────────────────────┘

6. SaveChanges + Commit
```

### 3.3 Trạng thái tồn kho sau mỗi bước

```
Trước SO Confirm:
  QuantityOnHand   = 100
  QuantityReserved = 0
  Available        = 100

Sau SO Confirm (CheckStock + Reserve):
  QuantityOnHand   = 100   ← không đổi
  QuantityReserved = 5     ← tăng lên
  Available        = 95    ← giảm

Sau Start Delivery (UpdateBalance + ReleaseReserved):
  QuantityOnHand   = 95    ← giảm (hàng ra ngoài)
  QuantityReserved = 0     ← về 0
  Available        = 95    ← không đổi so với sau Reserve
```

### 3.4 Bảng DB bị ảnh hưởng

**READ:**
- `DeliveryOrders` — load header
- `SalesOrders` + `SalesOrderLines` — danh sách sản phẩm/số lượng

**WRITE:**

| Bảng | Column | Giá trị | Ý nghĩa |
|---|---|---|---|
| `DeliveryOrders` | `Status` | `1` (InTransit) | Đang giao |
| `DeliveryOrders` | `DeliveryDate` | `DateTime.UtcNow` | Thời điểm bắt đầu giao |
| `InventoryBalances` | `QuantityOnHand` | `-= ConvertedQty` | Xuất kho vật lý |
| `InventoryBalances` | `QuantityReserved` | `-= ConvertedQty` | Giải phóng lock |
| `InventoryBalances` | `LastUpdated` | `DateTime.UtcNow` | — |
| `InventoryTransactions` | `TransactionType` | `1` (Out) | Xuất kho |
| `InventoryTransactions` | `ReferenceType` | `1` (Sale) | Từ bán hàng |
| `InventoryTransactions` | `ReferenceId` | `order.Id` | SalesOrder gốc |
| `InventoryTransactions` | `Quantity` | `ConvertedQty` | Số lượng (BaseUnit) |
| `InventoryTransactions` | `Note` | `"Delivery started: DO..."` | Ghi chú |

**Không có:** thay đổi công nợ hay bút toán — những thứ này đã được ghi tại SO Confirm.

---

## 4. Hoàn thành giao hàng

**Endpoint:** `POST /api/delivery-orders/{id}/complete`

### 4.1 Request Body

```json
{
  "proofImageUrl": "https://cdn.example.com/proof.jpg",
  "receiverName": "Nguyễn Văn A",
  "isCodCollected": false
}
```

### 4.2 Guard conditions

| Điều kiện | Hành động |
|---|---|
| DeliveryOrder không tồn tại | Throw `NotFoundException` |
| `d.Status != InTransit` | Throw `AppException("Only InTransit delivery orders can be completed")` |

### 4.3 Xử lý logic

```
1. Load DeliveryOrder
2. Guard: Status == InTransit (1)

3. Set d.Status     = Delivered (2)
   Set d.ProofImageUrl = request.ProofImageUrl
   Set d.IsCodCollected = request.IsCodCollected
   If request.ReceiverName != null:
     Set d.ReceiverName = request.ReceiverName

4. Load SalesOrder (by d.SalesOrderId)
   Set order.Status = Completed (2)  ← SO hoàn thành

5. SaveChanges (không có transaction riêng)
```

### 4.4 Bảng DB bị ảnh hưởng

**WRITE:**

| Bảng | Column | Giá trị | Ý nghĩa |
|---|---|---|---|
| `DeliveryOrders` | `Status` | `2` (Delivered) | Đã giao |
| `DeliveryOrders` | `ProofImageUrl` | `text` | Ảnh xác nhận giao |
| `DeliveryOrders` | `ReceiverName` | `text?` | Tên người nhận |
| `DeliveryOrders` | `IsCodCollected` | `bool` | Đã thu tiền COD? |
| `SalesOrders` | `Status` | `2` (Completed) | Đơn hoàn thành |

**Không có:** thay đổi tồn kho (đã xuất ở Start), công nợ, bút toán.

---

## 5. Giao hàng thất bại ⭐

**Endpoint:** `POST /api/delivery-orders/{id}/fail`

**Body:** `{ "reason": "Khách không ở nhà" }` (optional)

### 5.1 Guard conditions

| Điều kiện | Hành động |
|---|---|
| DeliveryOrder không tồn tại | Throw `NotFoundException` |
| `d.Status != InTransit` | Throw `AppException("Only InTransit delivery orders can be marked as failed")` |

### 5.2 Xử lý logic chi tiết

🔒 **Wrapped trong DB transaction**

```
1. Load DeliveryOrder
2. Guard: Status == InTransit (1)

3. Load SalesOrder + Lines

4. Set d.Status = Failed (3)
   If reason != null: d.Note = reason

5. ĐẢO NGƯỢC XUẤT KHO — nhập lại hàng:
   Với mỗi SalesOrderLine:
   ┌─────────────────────────────────────────────────────────────┐
   │ 📊 NHẬP LẠI KHO (đảo ngược Start Delivery)                │
   │                                                             │
   │ UpdateBalanceAsync(productId, d.WarehouseId, +ConvertedQty)│
   │ → InventoryBalance.QuantityOnHand += ConvertedQuantity     │
   │                                                             │
   │ RecordTransactionAsync(                                     │
   │   TransactionType = In (0)                                 │
   │   ReferenceType   = Sale (1)                               │
   │   Note = "Delivery failed — stock returned: DO {d.Code}"  │
   │ )                                                           │
   └─────────────────────────────────────────────────────────────┘

   ⚠️ KHÔNG tạo lại QuantityReserved vì hàng đã "tự do" sau khi
   StartDelivery đã giải phóng reservation.

6. SaveChanges + Commit
```

> ⚠️ **Lưu ý:** Sau Fail, hàng quay về kho nhưng SO vẫn ở Confirmed (không tự động reverse về Draft).  
> DeliveryOrder ở trạng thái Failed — không thể thử giao lại trên cùng DO.  
> Nếu muốn giao lại, cần tạo DeliveryOrder mới (hiện chưa có API).

### 5.3 Bảng DB bị ảnh hưởng

**WRITE:**

| Bảng | Column | Giá trị | Ý nghĩa |
|---|---|---|---|
| `DeliveryOrders` | `Status` | `3` (Failed) | Giao thất bại |
| `DeliveryOrders` | `Note` | `reason` | Lý do thất bại |
| `InventoryBalances` | `QuantityOnHand` | `+= ConvertedQty` | Hàng quay về kho |
| `InventoryTransactions` | `TransactionType` | `0` (In) | Nhập lại |
| `InventoryTransactions` | `Note` | `"Delivery failed..."` | Ghi chú đảo ngược |

---

## 6. Hủy lệnh giao

**Endpoint:** `POST /api/delivery-orders/{id}/cancel`

**Body:** `{ "reason": "Khách hủy" }` (optional)

### 6.1 Guard conditions

| Điều kiện | Hành động |
|---|---|
| DeliveryOrder không tồn tại | Throw `NotFoundException` |
| `d.Status != Pending` | Throw `AppException("Only Pending delivery orders can be cancelled")` |

### 6.2 Xử lý logic

🔒 **Wrapped trong DB transaction**

```
1. Load DeliveryOrder
2. Guard: Status == Pending (0)  ← trước khi Start

3. Load SalesOrder + Lines

4. Set d.Status = Cancelled (4)
   If reason != null: d.Note = reason

5. GIẢI PHÓNG RESERVATION (hàng chưa xuất):
   Với mỗi SalesOrderLine:
   ┌─────────────────────────────────────────────────────────────┐
   │ 📊 RELEASE RESERVATION                                      │
   │                                                             │
   │ ReleaseReservedStockAsync(productId, d.WarehouseId, qty)   │
   │ → InventoryBalance.QuantityReserved -= ConvertedQty        │
   │ → QuantityOnHand KHÔNG thay đổi                           │
   └─────────────────────────────────────────────────────────────┘

6. SaveChanges + Commit
```

> **Chú ý:** Hủy DO ở Pending không thay đổi AR hay JournalEntry đã ghi tại SO Confirm.  
> SO vẫn ở trạng thái Confirmed sau khi hủy DO.

### 6.3 So sánh Fail vs Cancel

| Khía cạnh | Fail Delivery | Cancel Delivery |
|---|---|---|
| Điều kiện | Phải InTransit | Phải Pending |
| Hàng đã xuất | Có (tại StartDelivery) | Chưa |
| Hành động kho | Nhập lại (+QuantityOnHand) | Release reservation (-QuantityReserved) |
| Bút toán | Không thay đổi | Không thay đổi |
| Công nợ | Không thay đổi | Không thay đổi |

---

## 7. Query danh sách & chi tiết

**Endpoints:**
- `GET /api/delivery-orders` — paginated list
- `GET /api/delivery-orders/{id}` — chi tiết

**Filter params:**

| Param | Áp dụng | Cột DB |
|---|---|---|
| `salesOrderId` | Lọc theo đơn hàng | `DeliveryOrders.SalesOrderId` |
| `status` | Lọc theo trạng thái | `DeliveryOrders.Status` |
| `fromDate` | Từ ngày | `DeliveryOrders.DeliveryDate` |
| `toDate` | Đến ngày | `DeliveryOrders.DeliveryDate` |

**Include navigation** khi query:
- `DeliveryOrders.SalesOrder` — tên/code đơn hàng
- `DeliveryOrders.Warehouse` — tên kho

---

## 8. Bảng DB Tổng Hợp

| Bảng | Vai trò | Giai đoạn |
|---|---|---|
| `SalesOrders` | Đơn hàng gốc + lines | READ (tất cả ops) |
| `SalesOrderLines` | Danh sách sản phẩm/SL | READ (Start, Fail, Cancel) |
| `Warehouses` | Kho xuất hàng | READ (navigation) |
| `DeliveryOrders` | Lệnh giao hàng | WRITE (Start, Complete, Fail, Cancel) |
| `InventoryBalances` | Số dư tồn kho | WRITE (Start: -OnHand, -Reserved; Fail: +OnHand; Cancel: -Reserved) |
| `InventoryTransactions` | Lịch sử kho | WRITE (Start: OUT; Fail: IN) |

### Tóm tắt tác động theo bước

| Bước | Tồn kho | Công nợ | Kế toán |
|---|---|---|---|
| Start Delivery ⭐ | ✅ -OnHand, -Reserved | ❌ | ❌ |
| Complete Delivery | ❌ | ❌ | ❌ |
| Fail Delivery ⭐ | ✅ +OnHand (reverse) | ❌ | ❌ |
| Cancel Delivery | ✅ -Reserved | ❌ | ❌ |
