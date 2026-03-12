# Luồng Quản lý Tồn kho (Inventory Flow)

> **Liên quan:** [../api-description/inventory/](../api-description/inventory/) · [../api-description/operations/](../api-description/operations/)  
> **Database:** [../database/inventory/](../database/inventory/)

---

## 1. Tổng quan

Tồn kho được theo dõi theo cặp **(ProductId, WarehouseId)** trong bảng `InventoryBalances`.  
Mọi biến động đều được ghi append-only vào `InventoryTransactions`.

```
InventoryBalance
├── QuantityOnHand      — Số lượng vật lý trong kho
├── QuantityReserved    — Đã reserve cho SO (chưa xuất thực tế)
└── QuantityAvailable   = OnHand − Reserved   (computed)
```

### Nguyên nhân biến động tồn kho

| Sự kiện | Loại | OnHand | Reserved |
|---|---|---|---|
| SO.Confirm | SaleReservation | — | ++ |
| DO.Start | Sale (Out) | -- | -- |
| DO.Fail | SaleRestock | ++ | — |
| GR.Confirm | Purchase (In) | ++ | — |
| SalesReturn.Confirm | SalesReturn (In) | ++ | — |
| PurchaseReturn.Confirm | PurchaseReturn (Out) | -- | — |
| StockTransfer.Confirm | Transfer (Out/In) | ±± | — |
| Inventory.Adjust | Adjustment | = newQty | — |
| Inventory.OpeningBalance | OpeningBalance | = qty | — |

---

## 2. Tồn kho đầu kỳ (Opening Balance)

> **Yêu cầu quyền:** `RequireManager`  
> Sử dụng khi khởi tạo hệ thống lần đầu hoặc đầu kỳ kế toán.

### API Call

```
POST /api/v1/inventory/opening-balance
Authorization: Bearer {accessToken}
Content-Type: application/json

{
  "items": [
    {
      "productId": 10,
      "warehouseId": 1,
      "quantity": 500,    // theo BaseUnit
      "unitCost": 75000
    },
    {
      "productId": 11,
      "warehouseId": 1,
      "quantity": 200,
      "unitCost": 45000
    }
  ]
}
```

### Logic xử lý

```
Với mỗi item:
  1. Tìm hoặc tạo InventoryBalance { ProductId, WarehouseId, TenantId }
  2. SET InventoryBalance.QuantityOnHand = quantity   // không cộng dồn — ghi đè
  3. InventoryTransaction { Type=OpeningBalance, Qty=quantity }
```

**API:** [`POST /api/v1/inventory/opening-balance`](../api-description/inventory/POST_opening-balance.md)  
**Bảng:** [`InventoryBalances`](../database/inventory/InventoryBalances.md) · [`InventoryTransactions`](../database/inventory/InventoryTransactions.md)

> **Lưu ý:** Đây là thao tác ghi đè — không cộng dồn. Nên thực hiện một lần khi khởi tạo hệ thống.

---

## 3. Điều chỉnh tồn kho (Inventory Adjustment)

> **Yêu cầu quyền:** `RequireManager`  
> Dùng sau kiểm kê để đồng bộ số sách với số thực tế.

### API Call

```
POST /api/v1/inventory/adjust
Authorization: Bearer {accessToken}
Content-Type: application/json

{
  "warehouseId": 1,
  "adjustDate": "2024-01-31",
  "reason": "Kiểm kê cuối tháng",
  "items": [
    {
      "productId": 10,
      "newQuantity": 485,     // số lượng thực đếm được
      "note": "Hao hụt tự nhiên 15 đơn vị"
    }
  ]
}
```

### Logic xử lý

```
Với mỗi item:
  1. Lấy InventoryBalance { ProductId, WarehouseId }
  2. Difference = newQuantity − QuantityOnHand
  3. SET InventoryBalance.QuantityOnHand = newQuantity
  4. InventoryTransaction { Type=Adjustment, Qty=Difference }
     // Difference > 0: nhập thêm; Difference < 0: xuất bớt
```

**API:** [`POST /api/v1/inventory/adjust`](../api-description/inventory/POST_adjust.md)

---

## 4. Điều chuyển kho (Stock Transfer)

Chuyển hàng giữa 2 kho trong cùng tenant.

### 4.1 Tạo phiếu điều chuyển

```
POST /api/v1/stock-transfers
{
  "fromWarehouseId": 1,
  "toWarehouseId": 2,
  "transferDate": "2024-02-01",
  "note": "Bổ sung hàng cho kho chi nhánh 2",
  "lines": [
    {
      "productId": 10,
      "unitId": 5,
      "quantity": 50,
      "note": ""
    }
  ]
}
```

**Response:** `201 Created` — `StockTransfer` với `Status = Draft`

**API:** [`POST /api/v1/stock-transfers`](../api-description/operations/POST_stock-transfers.md)  
**Bảng:** [`StockTransfers`](../database/operations/StockTransfers.md) · [`StockTransferLines`](../database/operations/StockTransferLines.md)

### 4.2 Xác nhận điều chuyển

```
POST /api/v1/stock-transfers/{id}/confirm
```

### Logic xử lý (trong Transaction)

```
Với mỗi StockTransferLine:
  1. ConvertedQty = Quantity × ConversionRate (→ BaseUnit)
  2. Kiểm tra: FromWarehouse.AvailableQty >= ConvertedQty
  3. InventoryBalance[FromWarehouse].QuantityOnHand -= ConvertedQty
     → InventoryTransaction { Type=Out, Reference=StockTransferOut }
  4. InventoryBalance[ToWarehouse].QuantityOnHand += ConvertedQty
     → InventoryTransaction { Type=In, Reference=StockTransferIn }

5. StockTransfer.Status = Confirmed
```

**API:** [`POST /api/v1/stock-transfers/{id}/confirm`](../api-description/operations/POST_stock-transfers_{id}_confirm.md)

---

## 5. Xem tồn kho hiện tại

```
GET /api/v1/inventory/balances
Query params:
  ?warehouseId=1          // lọc theo kho
  ?productId=10           // lọc theo sản phẩm
  ?categoryId=5           // lọc theo danh mục
  ?lowStock=true          // chỉ hiển thị hàng sắp hết

Response:
[
  {
    "productId": 10,
    "productName": "Nước suối 500ml",
    "warehouseId": 1,
    "warehouseName": "Kho Trung tâm",
    "baseUnit": "Cái",
    "quantityOnHand": 485,
    "quantityReserved": 30,
    "quantityAvailable": 455
  }
]
```

**API:** [`GET /api/v1/inventory/balances`](../api-description/inventory/GET_balances.md)

---

## 6. Xem lịch sử giao dịch kho

```
GET /api/v1/inventory/transactions
Query params:
  ?warehouseId=1
  ?productId=10
  ?type=Out               // In / Out / Adjustment / OpeningBalance
  ?fromDate=2024-01-01
  ?toDate=2024-01-31
  ?page=1&pageSize=50

Response:
[
  {
    "id": 1001,
    "transactionDate": "2024-01-15T10:30:00Z",
    "type": "Out",
    "referenceType": "Sale",
    "referenceId": 501,    // DeliveryOrderId
    "productId": 10,
    "warehouseId": 1,
    "quantity": -30,       // âm = xuất; dương = nhập
    "unitCost": 75000,
    "runningBalance": 455
  }
]
```

**API:** [`GET /api/v1/inventory/transactions`](../api-description/inventory/GET_transactions.md)

---

## 7. Trạng thái (Status FSM)

### StockTransfer

```
Draft ──[confirm]──► Confirmed
```

---

## 8. Mô hình quy đổi đơn vị

Tất cả tồn kho lưu theo **BaseUnit**. Khi giao dịch với đơn vị khác:

```
SaleUnit (Thùng: 24 Cái)
  → ConversionRate = 24
  → Qty bán = 3 thùng → Qty xuất kho = 3 × 24 = 72 Cái

Graph ProductUnitConversions:
  Cái ──(1:24)──► Thùng
  Cái ──(1:6)───► Lốc
  Lốc ──(1:4)───► Thùng

BFS tìm đường ngắn nhất từ SaleUnit → BaseUnit để lấy ConversionRate.
```

---

## 9. Bảng dữ liệu liên quan

| Bảng | Vai trò |
|---|---|
| [`InventoryBalances`](../database/inventory/InventoryBalances.md) | Số dư tồn kho hiện tại |
| [`InventoryTransactions`](../database/inventory/InventoryTransactions.md) | Lịch sử biến động (append-only) |
| [`StockTransfers`](../database/operations/StockTransfers.md) | Phiếu điều chuyển kho |
| [`StockTransferLines`](../database/operations/StockTransferLines.md) | Chi tiết dòng điều chuyển |
| [`ProductUnitConversions`](../database/master-data/ProductUnitConversions.md) | Graph quy đổi đơn vị |
