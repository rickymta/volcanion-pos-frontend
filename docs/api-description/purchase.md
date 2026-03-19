# Nghiệp vụ Nhập hàng, Nhập kho & Trả hàng NCC (Purchase, Goods Receipt, Purchase Return)

> **Phiên bản tài liệu:** 1.0 — 2026-03-18  
> **Liên quan:** [products.md](products.md) · [purchase/\_overview.md](purchase/_overview.md) · [inventory/\_overview.md](inventory/_overview.md)

---

## 1. Tổng quan

Module nhập hàng bao gồm 4 nhóm chức năng:

| Nhóm | Route | Mô tả |
|---|---|---|
| **Đơn mua hàng** | `/api/v1/purchase-orders` | Tạo, duyệt, hủy đơn đặt hàng nhà cung cấp |
| **Phiếu nhập kho** | `/api/v1/goods-receipts` | Nhận hàng vào kho dựa trên PO đã duyệt |
| **Trả hàng NCC** | `/api/v1/purchase-returns` | Trả hàng lỗi / thừa cho nhà cung cấp |
| **Tồn kho** | `/api/v1/inventory` | Tra cứu tồn kho, lịch sử, điều chỉnh, tồn đầu kỳ |

### Luồng nghiệp vụ chuẩn

```
1. Tạo PO (Draft)
2. Confirm PO → status = Confirmed
3. Tạo GoodsReceipt (chọn PO đã confirmed, chọn kho) → Draft
4. Confirm GoodsReceipt → hàng nhập kho, công nợ NCC tăng, bút toán kế toán
5. (Tuỳ chọn) Tạo PurchaseReturn → Confirm → hàng giảm kho, công nợ NCC giảm
```

### Xác thực & phân quyền

Tất cả endpoint yêu cầu JWT token + header `X-Tenant-Id`.

| Nhóm | GET | POST tạo mới | PUT cập nhật | POST action (confirm/cancel) |
|---|---|---|---|---|
| PurchaseOrders | Mọi role | Mọi role | Mọi role | **RequireManager** |
| GoodsReceipts | **RequireManager** | **RequireManager** | — | **RequireManager** |
| PurchaseReturns | Mọi role | Mọi role | — | **RequireManager** |
| Inventory (GET) | Mọi role | — | — | — |
| Inventory (POST) | — | **RequireAdmin** | — | — |

> `GoodsReceiptsController` có `[Authorize(Policy = RequireManager)]` ở cấp controller → toàn bộ endpoint yêu cầu Manager+.

### Headers bắt buộc

| Header | Giá trị | Ghi chú |
|---|---|---|
| `Authorization` | `Bearer {jwt_token}` | Bắt buộc |
| `X-Tenant-Id` | `{tenant_guid}` | Bắt buộc — thiếu sẽ bị 400 |
| `Content-Type` | `application/json` | Cho POST/PUT |
| `Idempotency-Key` | `{guid}` | Tuỳ chọn cho POST/PUT — tránh duplicate, cache 24h |

### Rate limit

200 req/phút (general limiter) cho tất cả endpoint.

---

## 2. Mô hình dữ liệu

### 2.1. Đơn mua hàng (PurchaseOrder)

```
PurchaseOrder {
    Id              : UUID
    Code            : string          -- mã tự sinh "PO-{yyyyMMdd}-{random4}"
    SupplierId      : UUID            -- FK → Suppliers
    BranchId        : UUID?           -- FK → Branches (phân quyền chi nhánh)
    OrderDate       : datetime
    Status          : DocumentStatus  -- Draft → Confirmed → Completed / Cancelled
    Note            : string?
    TotalAmount     : decimal         -- Σ (qty × unitPrice)
    DiscountAmount  : decimal
    VatAmount       : decimal         -- Σ (qty × unitPrice × vatRate / 100)
    GrandTotal      : decimal         -- total - discount + vat
    Lines           : PurchaseOrderLine[]
}

PurchaseOrderLine {
    Id                : UUID
    PurchaseOrderId   : UUID
    ProductId         : UUID          -- FK → Products — sản phẩm mua
    UnitId            : UUID          -- FK → Units — đơn vị mua (có thể khác base unit)
    Quantity          : decimal       -- số lượng theo UnitId
    UnitPrice         : decimal       -- giá mua / đơn vị (chưa VAT)
    VatRate           : decimal       -- thuế VAT %
    ConvertedQuantity : decimal       -- quy đổi về base unit (tự tính)
    LineTotal         : decimal       -- qty × unitPrice × (1 + vatRate/100)
}
```

### 2.2. Phiếu nhập kho (GoodsReceipt)

```
GoodsReceipt {
    Id               : UUID
    Code             : string          -- mã tự sinh "GR-{yyyyMMdd}-{random4}"
    PurchaseOrderId  : UUID            -- FK → PurchaseOrders (bắt buộc)
    WarehouseId      : UUID            -- FK → Warehouses — kho nhập
    ReceiptDate      : datetime
    Status           : DocumentStatus  -- Draft → Confirmed / Cancelled
    Note             : string?
    Lines            : GoodsReceiptLine[]
}

GoodsReceiptLine {
    Id                : UUID
    GoodsReceiptId    : UUID
    ProductId         : UUID          -- FK → Products
    UnitId            : UUID          -- FK → Units
    Quantity          : decimal       -- số lượng nhập theo UnitId
    ConvertedQuantity : decimal       -- quy đổi về base unit (tự tính)
    UnitCost          : decimal       -- giá nhập thực tế / đơn vị
    BatchNumber       : string?       -- số lô (bắt buộc nếu Product.IsBatchManaged)
    ExpiryDate        : datetime?     -- hạn sử dụng (bắt buộc nếu Product.IsExpiryManaged)
}
```

### 2.3. Phiếu trả hàng NCC (PurchaseReturn)

```
PurchaseReturn {
    Id                : UUID
    Code              : string          -- mã tự sinh "PR-{yyyyMMdd}-{random4}"
    GoodsReceiptId    : UUID            -- FK → GoodsReceipts (phiếu nhập gốc)
    SupplierId        : UUID            -- FK → Suppliers
    ReturnDate        : datetime
    Reason            : string?
    Status            : DocumentStatus  -- Draft → Confirmed / Cancelled
    TotalReturnAmount : decimal         -- Σ (qty × unitCost)
    IsRefunded        : bool            -- NCC đã hoàn tiền chưa
    Lines             : PurchaseReturnLine[]
}

PurchaseReturnLine {
    Id                : UUID
    PurchaseReturnId  : UUID
    ProductId         : UUID          -- FK → Products
    UnitId            : UUID          -- FK → Units
    Quantity          : decimal       -- số lượng trả theo UnitId
    ConvertedQuantity : decimal       -- quy đổi về base unit (tự tính)
    UnitCost          : decimal       -- giá trả / đơn vị
    ReturnAmount      : decimal       -- qty × unitCost
}
```

### 2.4. Tồn kho (Inventory)

```
InventoryBalance {
    ProductId         : UUID          -- FK → Products
    WarehouseId       : UUID          -- FK → Warehouses
    QuantityOnHand    : decimal       -- tồn kho vật lý (base unit)
    QuantityReserved  : decimal       -- đã đặt trước cho Sales Order
    Xmin              : uint32        -- optimistic concurrency token (PostgreSQL)
}

InventoryTransaction {
    Id                : UUID
    ProductId         : UUID
    WarehouseId       : UUID
    TransactionType   : InventoryTransactionType
    ReferenceType     : InventoryReferenceType
    ReferenceId       : UUID?         -- trỏ về chứng từ gốc
    Quantity          : decimal       -- dương = nhập, âm = xuất
    UnitCost          : decimal
    BatchNumber       : string?
    ExpiryDate        : datetime?
    Note              : string?
    CreatedAt         : datetime
}
```

### 2.5. Enums

#### DocumentStatus

| Giá trị | Tên | Mô tả |
|---|---|---|
| `0` | `Draft` | Bản nháp — cho phép chỉnh sửa, xóa |
| `1` | `Confirmed` | Đã xác nhận — ghi nhận kho / kế toán |
| `2` | `Completed` | Hoàn thành — PO đã nhận đủ hàng |
| `3` | `Cancelled` | Đã hủy |

#### InventoryTransactionType

| Giá trị | Tên | Mô tả |
|---|---|---|
| `0` | `In` | Nhập kho |
| `1` | `Out` | Xuất kho |
| `2` | `Adjust` | Điều chỉnh |
| `3` | `Return` | Trả hàng |
| `4` | `Transfer` | Chuyển kho |
| `5` | `OpeningBalance` | Tồn đầu kỳ |

#### InventoryReferenceType

| Giá trị | Tên | Mô tả |
|---|---|---|
| `0` | `Purchase` | GoodsReceipt |
| `1` | `Sale` | Invoice / SalesOrder |
| `2` | `Return` | SalesReturn / PurchaseReturn |
| `3` | `Transfer` | StockTransfer |
| `4` | `Adjustment` | Điều chỉnh thủ công |
| `5` | `Promotion` | Khuyến mãi, tặng hàng |
| `6` | `Disposal` | Thanh lý, tiêu hủy |

> JSON API trả enum dạng **string** (VD: `"Draft"`, `"In"`) nhờ `JsonStringEnumConverter`.

---

## 3. Business Rules

### 3.1. Đơn mua hàng (PurchaseOrder)

| Rule | Chi tiết |
|---|---|
| **Chỉ cập nhật khi Draft** | `UpdateAsync` throw `400` nếu PO không ở status Draft |
| **Chỉ confirm khi Draft** | `ConfirmAsync` throw `400` nếu PO không ở status Draft |
| **Không hủy khi đã có GR Confirmed** | `CancelAsync` throw `400` kèm message: "Cannot cancel a purchase order that has confirmed goods receipts. Raise a purchase return instead." |
| **Không hủy khi đã Completed** | PO Completed không thể hủy |
| **Mã tự sinh** | `CodeGenerator.Generate("PO")` → `"PO-20260317-A1B2"` |
| **Tính tổng tự động** | `TotalAmount`, `VatAmount`, `GrandTotal` được tính từ lines |
| **Quy đổi đơn vị** | `ConvertedQuantity` tính bằng BFS qua bảng `ProductUnitConversions` |

### 3.2. Phiếu nhập kho (GoodsReceipt)

| Rule | Chi tiết |
|---|---|
| **PO phải ở Confirmed** | Tạo GR từ PO chưa confirmed → `400` |
| **Chỉ confirm khi Draft** | Confirm GR không ở Draft → `400` |
| **Không hủy khi Confirmed** | GR đã Confirmed → `400` kèm: "Cannot cancel a completed receipt. Create a return instead." |
| **Nhập một phần** | Một PO có thể có nhiều GR (partial delivery) |
| **Tự chuyển PO Completed** | Khi confirm GR, nếu Σ converted qty ≥ PO converted qty → PO status = Completed |
| **Side-effects khi confirm** | Cộng tồn kho, ghi InventoryTransaction, tạo DebtLedger (AP++), tạo JournalEntry (Nợ 156 / Có 331) |

### 3.3. Phiếu trả hàng NCC (PurchaseReturn)

| Rule | Chi tiết |
|---|---|
| **GR phải ở Confirmed** | Tạo PR từ GR chưa confirmed → `400` |
| **Số lượng trả ≤ có thể trả** | `requestQty ≤ (grLineQty − Σ previousReturnQty)` → `400` nếu vượt |
| **Chỉ confirm khi Draft** | Confirm PR không ở Draft → `400` |
| **Side-effects khi confirm** | Giảm tồn kho, ghi InventoryTransaction (Return), giảm DebtLedger (AP−−), tạo JournalEntry đảo (Nợ 331 / Có 156) |

### 3.4. Tồn kho (Inventory)

| Rule | Chi tiết |
|---|---|
| **Tồn kho không âm** | `UpdateBalanceAsync` throw `400` nếu `QuantityOnHand` sẽ < 0 |
| **Optimistic concurrency** | `Xmin` column → `DbUpdateConcurrencyException` → `409` nếu 2 request cùng update |
| **Opening balance ghi đè** | `SetOpeningBalance` set tuyệt đối, không cộng dồn |
| **Adjust tính delta** | `delta = targetQuantity − currentOnHand` |

---

## 4. API Endpoints

### 4.1. Đơn mua hàng — `/api/v1/purchase-orders`

| Method | Endpoint | Policy | Mô tả |
|---|---|---|---|
| `GET` | `/api/v1/purchase-orders` | Mọi role | Danh sách (filter, phân trang) |
| `GET` | `/api/v1/purchase-orders/{id}` | Mọi role | Chi tiết + lines |
| `POST` | `/api/v1/purchase-orders` | Mọi role | Tạo mới (Draft) |
| `PUT` | `/api/v1/purchase-orders/{id}` | Mọi role | Cập nhật (chỉ Draft) |
| `POST` | `/api/v1/purchase-orders/{id}/confirm` | Manager, Admin | Xác nhận (Draft → Confirmed) |
| `POST` | `/api/v1/purchase-orders/{id}/cancel` | Manager, Admin | Hủy |

#### GET /api/v1/purchase-orders — Danh sách

**Query parameters:**

| Tham số | Kiểu | Bắt buộc | Mô tả |
|---|---|---|---|
| `supplierId` | guid | Không | Lọc theo nhà cung cấp |
| `status` | int | Không | `0`=Draft, `1`=Confirmed, `2`=Cancelled |
| `fromDate` | datetime | Không | Từ ngày đặt (UTC) |
| `toDate` | datetime | Không | Đến ngày đặt (UTC) |
| `page` | int | Không | Mặc định: 1 |
| `pageSize` | int | Không | Mặc định: 20 |

**Response 200:**

```json
{
  "data": {
    "items": [
      {
        "id": "po-uuid-1",
        "code": "PO-20260310-001",
        "supplierId": "sup-uuid-1",
        "supplierName": "Công ty TNHH ABC",
        "orderDate": "2026-03-10T08:00:00Z",
        "status": "Draft",
        "note": "Đặt hàng tháng 3",
        "totalAmount": 10000000,
        "discountAmount": 500000,
        "vatAmount": 950000,
        "grandTotal": 10450000,
        "lines": []
      }
    ],
    "totalCount": 1,
    "page": 1,
    "pageSize": 20,
    "totalPages": 1,
    "hasNextPage": false,
    "hasPreviousPage": false
  },
  "success": true,
  "message": null
}
```

#### GET /api/v1/purchase-orders/{id} — Chi tiết

**Path parameters:**

| Tham số | Kiểu | Mô tả |
|---|---|---|
| `id` | guid | ID đơn đặt hàng |

**Response 200:**

```json
{
  "data": {
    "id": "po-uuid-1",
    "code": "PO-20260310-001",
    "supplierId": "sup-uuid-1",
    "supplierName": "Công ty TNHH ABC",
    "orderDate": "2026-03-10T08:00:00Z",
    "status": "Draft",
    "note": "Đặt hàng tháng 3",
    "totalAmount": 10000000,
    "discountAmount": 500000,
    "vatAmount": 950000,
    "grandTotal": 10450000,
    "lines": [
      {
        "id": "pol-uuid-1",
        "productId": "prod-uuid-1",
        "productName": "Cà phê Arabica",
        "unitId": "unit-uuid-kg",
        "unitName": "Kg",
        "quantity": 100,
        "unitPrice": 100000,
        "vatRate": 10,
        "convertedQuantity": 100000,
        "lineTotal": 11000000
      }
    ]
  },
  "success": true,
  "message": null
}
```

#### POST /api/v1/purchase-orders — Tạo mới

**Request body:**

```json
{
  "supplierId": "sup-uuid-1",
  "orderDate": "2026-03-10T08:00:00Z",
  "note": "Đặt hàng tháng 3",
  "discountAmount": 500000,
  "lines": [
    {
      "productId": "prod-uuid-1",
      "unitId": "unit-uuid-kg",
      "quantity": 100,
      "unitPrice": 100000,
      "vatRate": 10
    }
  ]
}
```

**Validation:**

| Trường | Quy tắc |
|---|---|
| `supplierId` | Bắt buộc |
| `orderDate` | Bắt buộc, ≤ today + 30 ngày |
| `note` | Tối đa 500 ký tự |
| `lines` | ≥ 1 dòng |
| `lines[].productId` | Bắt buộc |
| `lines[].unitId` | Bắt buộc |
| `lines[].quantity` | > 0 |
| `lines[].unitPrice` | ≥ 0 |
| `lines[].vatRate` | 0 – 100 |

**Logic:**

```
Tạo PO (status = Draft)
Tính totalAmount = Σ (quantity × unitPrice)
Tính vatAmount   = Σ (quantity × unitPrice × vatRate / 100)
grandTotal       = totalAmount + vatAmount − discountAmount
ConvertedQuantity = quy đổi về base unit qua BFS
```

**Response 201:** Trả về `PurchaseOrderDto` vừa tạo.

#### PUT /api/v1/purchase-orders/{id} — Cập nhật

Chỉ cho phép khi PO ở trạng thái **Draft**. Request body giống POST. Toàn bộ lines cũ bị thay thế bằng lines mới.

**Response 200:** Trả về `PurchaseOrderDto` đã cập nhật.

#### POST /api/v1/purchase-orders/{id}/confirm — Xác nhận

Chuyển PO từ **Draft** → **Confirmed**. Sau khi xác nhận, PO có thể dùng để tạo `GoodsReceipt`.

**Response 200:** Trả về `PurchaseOrderDto` (status = `Confirmed`).

#### POST /api/v1/purchase-orders/{id}/cancel — Hủy

**Request body (tuỳ chọn):**

```json
{
  "reason": "Nhà cung cấp không đáp ứng được yêu cầu"
}
```

**Guard:** Không hủy được khi PO đã Completed hoặc đã có GoodsReceipt Confirmed.

**Response 200:**

```json
{
  "data": "Cancelled",
  "success": true,
  "message": null
}
```

---

### 4.2. Phiếu nhập kho — `/api/v1/goods-receipts`

> **Tất cả endpoint yêu cầu Manager hoặc Admin** (`[Authorize(Policy = RequireManager)]` cấp controller).

| Method | Endpoint | Mô tả |
|---|---|---|
| `GET` | `/api/v1/goods-receipts` | Danh sách (filter, phân trang) |
| `GET` | `/api/v1/goods-receipts/{id}` | Chi tiết + lines |
| `POST` | `/api/v1/goods-receipts` | Tạo mới (Draft) — từ PO đã Confirmed |
| `POST` | `/api/v1/goods-receipts/{id}/confirm` | Xác nhận → ghi kho + kế toán |
| `POST` | `/api/v1/goods-receipts/{id}/cancel` | Hủy (chỉ Draft) |

#### GET /api/v1/goods-receipts — Danh sách

**Query parameters:**

| Tham số | Kiểu | Bắt buộc | Mô tả |
|---|---|---|---|
| `purchaseOrderId` | guid | Không | Lọc theo PO |
| `warehouseId` | guid | Không | Lọc theo kho nhập |
| `status` | int | Không | `0`=Draft, `1`=Confirmed, `2`=Cancelled |
| `fromDate` | datetime | Không | Từ ngày (UTC) |
| `toDate` | datetime | Không | Đến ngày (UTC) |
| `page` | int | Không | Mặc định: 1 |
| `pageSize` | int | Không | Mặc định: 20 |

**Response 200:**

```json
{
  "data": {
    "items": [
      {
        "id": "gr-uuid-1",
        "code": "GR-20260310-001",
        "purchaseOrderId": "po-uuid-1",
        "purchaseOrderCode": "PO-20260310-001",
        "warehouseId": "wh-uuid-1",
        "warehouseName": "Kho chính",
        "receiptDate": "2026-03-10T14:00:00Z",
        "status": "Draft",
        "note": null,
        "lines": []
      }
    ],
    "totalCount": 1,
    "page": 1,
    "pageSize": 20,
    "totalPages": 1,
    "hasNextPage": false,
    "hasPreviousPage": false
  },
  "success": true,
  "message": null
}
```

#### GET /api/v1/goods-receipts/{id} — Chi tiết

**Response 200:**

```json
{
  "data": {
    "id": "gr-uuid-1",
    "code": "GR-20260310-001",
    "purchaseOrderId": "po-uuid-1",
    "purchaseOrderCode": "PO-20260310-001",
    "warehouseId": "wh-uuid-1",
    "warehouseName": "Kho chính",
    "receiptDate": "2026-03-10T14:00:00Z",
    "status": "Draft",
    "note": null,
    "lines": [
      {
        "id": "grl-uuid-1",
        "productId": "prod-uuid-1",
        "productName": "Cà phê Arabica",
        "unitId": "unit-uuid-kg",
        "unitName": "Kg",
        "quantity": 80,
        "convertedQuantity": 80000,
        "unitCost": 100000,
        "batchNumber": null,
        "expiryDate": null
      }
    ]
  },
  "success": true,
  "message": null
}
```

#### POST /api/v1/goods-receipts — Tạo mới

> Có thể nhập một phần (số lượng < PO). Nhiều GoodsReceipt có thể liên kết 1 PO.

**Request body:**

```json
{
  "purchaseOrderId": "po-uuid-1",
  "warehouseId": "wh-uuid-1",
  "receiptDate": "2026-03-10T14:00:00Z",
  "note": "Nhập lô 1",
  "lines": [
    {
      "productId": "prod-uuid-1",
      "unitId": "unit-uuid-kg",
      "quantity": 80,
      "unitCost": 100000,
      "batchNumber": null,
      "expiryDate": null
    }
  ]
}
```

**Validation:**

| Trường | Quy tắc |
|---|---|
| `purchaseOrderId` | Bắt buộc |
| `warehouseId` | Bắt buộc |
| `receiptDate` | Bắt buộc |
| `note` | Tối đa 500 ký tự |
| `lines` | ≥ 1 dòng |
| `lines[].productId` | Bắt buộc |
| `lines[].unitId` | Bắt buộc |
| `lines[].quantity` | > 0 |
| `lines[].unitCost` | ≥ 0 |
| `lines[].batchNumber` | Tối đa 50 ký tự (bắt buộc nếu product `isBatchManaged`) |
| `lines[].expiryDate` | Phải là ngày tương lai (bắt buộc nếu product `isExpiryManaged`) |

**Response 201:** Trả về `GoodsReceiptDto` vừa tạo.

#### POST /api/v1/goods-receipts/{id}/confirm — Xác nhận nhập kho ⭐

Đây là **bước quan trọng nhất** — kích hoạt chuỗi side-effects trong cùng 1 database transaction:

| Bước | Hành động | Bảng bị tác động |
|------|-----------|------------------|
| 1 | Chuyển status → Confirmed | `GoodsReceipts` |
| 2 | Cộng tồn kho (`QuantityOnHand += ConvertedQuantity`) cho mỗi line | `InventoryBalances` |
| 3 | Ghi log biến động kho (type = `In`, ref = `Purchase`) | `InventoryTransactions` |
| 4 | Tăng công nợ NCC (Debit = totalCost) | `DebtLedgers` |
| 5 | Tạo bút toán kế toán: Nợ TK 156 / Có TK 331 | `JournalEntries`, `JournalEntryLines` |
| 6 | Kiểm tra PO đã nhận đủ → nếu đủ, chuyển PO → Completed | `PurchaseOrders` |

**Response 200:** Trả về `GoodsReceiptDto` (status = `Confirmed`).

#### POST /api/v1/goods-receipts/{id}/cancel — Hủy

Chỉ hủy được khi phiếu ở trạng thái **Draft**. GR Confirmed không thể hủy — phải tạo PurchaseReturn.

**Response 200:**

```json
{
  "data": "Cancelled",
  "success": true,
  "message": null
}
```

---

### 4.3. Trả hàng NCC — `/api/v1/purchase-returns`

| Method | Endpoint | Policy | Mô tả |
|---|---|---|---|
| `GET` | `/api/v1/purchase-returns` | Mọi role | Danh sách (filter, phân trang) |
| `GET` | `/api/v1/purchase-returns/{id}` | Mọi role | Chi tiết + lines |
| `POST` | `/api/v1/purchase-returns` | Mọi role | Tạo mới (Draft) — từ GR đã Confirmed |
| `POST` | `/api/v1/purchase-returns/{id}/confirm` | Manager, Admin | Xác nhận → giảm kho + giảm công nợ |

#### GET /api/v1/purchase-returns — Danh sách

**Query parameters:**

| Tham số | Kiểu | Bắt buộc | Mô tả |
|---|---|---|---|
| `supplierId` | guid | Không | Lọc theo nhà cung cấp |
| `goodsReceiptId` | guid | Không | Lọc theo phiếu nhập kho gốc |
| `status` | int | Không | `0`=Draft, `1`=Confirmed, `2`=Cancelled |
| `fromDate` | datetime | Không | Từ ngày (UTC) |
| `toDate` | datetime | Không | Đến ngày (UTC) |
| `page` | int | Không | Mặc định: 1 |
| `pageSize` | int | Không | Mặc định: 20 |

**Response 200:**

```json
{
  "data": {
    "items": [
      {
        "id": "pr-uuid-1",
        "code": "PR-20260310-001",
        "goodsReceiptId": "gr-uuid-1",
        "goodsReceiptCode": "GR-20260310-001",
        "supplierId": "sup-uuid-1",
        "supplierName": "Công ty TNHH ABC",
        "returnDate": "2026-03-10T15:00:00Z",
        "reason": "Hàng không đúng quy cách",
        "status": "Draft",
        "totalReturnAmount": 500000,
        "isRefunded": false,
        "lines": []
      }
    ],
    "totalCount": 1,
    "page": 1,
    "pageSize": 20,
    "totalPages": 1,
    "hasNextPage": false,
    "hasPreviousPage": false
  },
  "success": true,
  "message": null
}
```

#### GET /api/v1/purchase-returns/{id} — Chi tiết

**Response 200:**

```json
{
  "data": {
    "id": "pr-uuid-1",
    "code": "PR-20260310-001",
    "goodsReceiptId": "gr-uuid-1",
    "goodsReceiptCode": "GR-20260310-001",
    "supplierId": "sup-uuid-1",
    "supplierName": "Công ty TNHH ABC",
    "returnDate": "2026-03-10T15:00:00Z",
    "reason": "Hàng không đúng quy cách",
    "status": "Draft",
    "totalReturnAmount": 500000,
    "isRefunded": false,
    "lines": [
      {
        "id": "prl-uuid-1",
        "productId": "prod-uuid-1",
        "productName": "Cà phê Arabica",
        "unitId": "unit-uuid-kg",
        "unitName": "Kg",
        "quantity": 5,
        "convertedQuantity": 5000,
        "unitCost": 100000,
        "returnAmount": 500000
      }
    ]
  },
  "success": true,
  "message": null
}
```

#### POST /api/v1/purchase-returns — Tạo mới

> Tồn kho chỉ giảm và công nợ chỉ được ghi nhận sau khi **Confirm**.

**Request body:**

```json
{
  "goodsReceiptId": "gr-uuid-1",
  "supplierId": "sup-uuid-1",
  "returnDate": "2026-03-10T15:00:00Z",
  "reason": "Hàng không đúng quy cách",
  "isRefunded": false,
  "lines": [
    {
      "productId": "prod-uuid-1",
      "unitId": "unit-uuid-kg",
      "quantity": 5,
      "unitCost": 100000
    }
  ]
}
```

**Validation:**

| Trường | Quy tắc |
|---|---|
| `goodsReceiptId` | Bắt buộc |
| `supplierId` | Bắt buộc |
| `returnDate` | Bắt buộc, ≤ today + 1 ngày |
| `reason` | Tối đa 500 ký tự |
| `lines` | ≥ 1 dòng |
| `lines[].productId` | Bắt buộc |
| `lines[].unitId` | Bắt buộc |
| `lines[].quantity` | > 0, ≤ (đã nhập − đã trả trước đó) |
| `lines[].unitCost` | ≥ 0 |

**Response 201:** Trả về `PurchaseReturnDto` vừa tạo.

#### POST /api/v1/purchase-returns/{id}/confirm — Xác nhận trả hàng

Side-effects trong cùng 1 database transaction:

| Bước | Hành động | Bảng bị tác động |
|------|-----------|------------------|
| 1 | Chuyển status → Confirmed | `PurchaseReturns` |
| 2 | Giảm tồn kho (`QuantityOnHand −= ConvertedQuantity`) cho mỗi line | `InventoryBalances` |
| 3 | Ghi log biến động kho (type = `Return`, ref = `Purchase`) | `InventoryTransactions` |
| 4 | Giảm công nợ NCC (Credit = totalReturnAmount) | `DebtLedgers` |
| 5 | Tạo bút toán đảo: Nợ TK 331 / Có TK 156 | `JournalEntries`, `JournalEntryLines` |

**Response 200:** Trả về `PurchaseReturnDto` (status = `Confirmed`).

---

### 4.4. Tồn kho — `/api/v1/inventory`

| Method | Endpoint | Policy | Mô tả |
|---|---|---|---|
| `GET` | `/api/v1/inventory/balances` | Mọi role | Tồn kho hiện tại (filter, phân trang) |
| `GET` | `/api/v1/inventory/transactions` | Mọi role | Lịch sử biến động kho |
| `POST` | `/api/v1/inventory/adjust` | **Admin** | Điều chỉnh tồn kho |
| `POST` | `/api/v1/inventory/opening-balance` | **Admin** | Nhập tồn đầu kỳ |

#### GET /api/v1/inventory/balances — Tồn kho hiện tại

**Query parameters:**

| Tham số | Kiểu | Bắt buộc | Mô tả |
|---|---|---|---|
| `productId` | guid | Không | Lọc theo sản phẩm |
| `warehouseId` | guid | Không | Lọc theo kho |
| `onlyPositive` | bool | Không | Chỉ hiện tồn kho > 0 (mặc định: false) |
| `page` | int | Không | Mặc định: 1 |
| `pageSize` | int | Không | Mặc định: 50 |

**Response 200:**

```json
{
  "data": {
    "items": [
      {
        "productId": "prod-uuid-1",
        "productCode": "SP-001",
        "productName": "Cà phê Arabica",
        "warehouseId": "wh-uuid-1",
        "warehouseName": "Kho chính",
        "quantityOnHand": 2280,
        "quantityReserved": 0,
        "quantityAvailable": 2280,
        "lastUpdated": "2026-03-18T10:00:00Z"
      }
    ],
    "totalCount": 1,
    "page": 1,
    "pageSize": 50,
    "totalPages": 1,
    "hasNextPage": false,
    "hasPreviousPage": false
  },
  "success": true,
  "message": null
}
```

> `quantityAvailable = quantityOnHand − quantityReserved`

#### GET /api/v1/inventory/transactions — Lịch sử biến động

**Query parameters:**

| Tham số | Kiểu | Bắt buộc | Mô tả |
|---|---|---|---|
| `productId` | guid | Không | Lọc theo sản phẩm |
| `warehouseId` | guid | Không | Lọc theo kho |
| `transactionType` | int | Không | `0`=In, `1`=Out, `2`=Adjust, `3`=Return, `4`=Transfer, `5`=OpeningBalance |
| `fromDate` | datetime | Không | Từ ngày (UTC) |
| `toDate` | datetime | Không | Đến ngày (UTC) |
| `page` | int | Không | Mặc định: 1 |
| `pageSize` | int | Không | Mặc định: 50 |

**Response 200:**

```json
{
  "data": {
    "items": [
      {
        "id": "tx-uuid-1",
        "productId": "prod-uuid-1",
        "productName": "Cà phê Arabica",
        "warehouseId": "wh-uuid-1",
        "warehouseName": "Kho chính",
        "transactionType": "In",
        "referenceType": "Purchase",
        "referenceId": "gr-uuid-1",
        "quantity": 1440,
        "unitCost": 100000,
        "batchNumber": null,
        "expiryDate": null,
        "note": "GR GR-20260310-001",
        "createdAt": "2026-03-10T14:30:00Z"
      }
    ],
    "totalCount": 1,
    "page": 1,
    "pageSize": 50,
    "totalPages": 1,
    "hasNextPage": false,
    "hasPreviousPage": false
  },
  "success": true,
  "message": null
}
```

#### POST /api/v1/inventory/adjust — Điều chỉnh tồn kho

> Yêu cầu quyền **Admin**. Delta được tính tự động: `delta = targetQuantity − currentOnHand`.

**Request body:**

```json
{
  "productId": "prod-uuid-1",
  "warehouseId": "wh-uuid-1",
  "targetQuantity": 1000,
  "unitCost": 100000,
  "note": "Kiểm kê cuối tháng"
}
```

**Validation:**

| Trường | Quy tắc |
|---|---|
| `productId` | Bắt buộc |
| `warehouseId` | Bắt buộc |
| `targetQuantity` | ≥ 0 |
| `unitCost` | ≥ 0 |
| `note` | Tối đa 500 ký tự |

**Response 200:** Trả về `InventoryTransactionDto` vừa tạo.

#### POST /api/v1/inventory/opening-balance — Tồn đầu kỳ

> Yêu cầu quyền **Admin**. Ghi đè tuyệt đối (`QuantityOnHand = quantity`), không cộng dồn.

**Request body:**

```json
{
  "productId": "prod-uuid-1",
  "warehouseId": "wh-uuid-1",
  "quantity": 500,
  "unitCost": 100000,
  "note": "Tồn đầu kỳ tháng 3"
}
```

**Validation:**

| Trường | Quy tắc |
|---|---|
| `productId` | Bắt buộc |
| `warehouseId` | Bắt buộc |
| `quantity` | ≥ 0 |
| `unitCost` | ≥ 0 |
| `note` | Tối đa 500 ký tự |

**Response 200:** Trả về `InventoryTransactionDto` vừa tạo.

---

## 5. Lỗi thường gặp

| HTTP | Tình huống |
|---|---|
| `400` | Thiếu trường bắt buộc (supplierId, productId, unitId...) |
| `400` | PO không ở Draft khi update / confirm |
| `400` | PO đã có GR Confirmed khi cancel |
| `400` | GR đã Confirmed khi cancel ("Create a return instead") |
| `400` | GR tạo từ PO chưa Confirmed |
| `400` | Số lượng trả vượt quá số lượng có thể trả |
| `400` | Tồn kho không đủ khi confirm PurchaseReturn |
| `401` | Chưa xác thực (JWT token thiếu hoặc hết hạn) |
| `403` | Không đủ quyền (Staff cố confirm PO / truy cập GR) |
| `404` | Entity không tồn tại (PO, GR, PR, Product, Supplier, Warehouse) |
| `409` | Xung đột concurrency trên InventoryBalance (Xmin mismatch) |
| `422` | Validation lỗi (FluentValidation — trả `ValidationProblemDetails`) |
| `429` | Rate limit (> 200 req/phút) |

### Error response format

```json
{
  "success": false,
  "message": "Cannot cancel a purchase order that has confirmed goods receipts. Raise a purchase return instead.",
  "data": null,
  "errors": [],
  "traceId": "00-abc123-def456-01"
}
```

Validation error (422):

```json
{
  "type": "https://tools.ietf.org/html/rfc9110#section-15.5.1",
  "title": "One or more validation errors occurred.",
  "status": 422,
  "errors": {
    "Lines[0].Quantity": ["'Quantity' must be greater than '0'."],
    "SupplierId": ["'Supplier Id' must not be empty."]
  }
}
```

---

## 6. Ví dụ luồng hoàn chỉnh

### Scenario: Mua 100 thùng, nhập kho 2 lần (60 + 40), trả 5 thùng lỗi

```
Bước 1 — Tạo đơn mua hàng
──────────────────────────
POST /api/v1/purchase-orders
{ supplierId, orderDate, lines: [{ productId, unitId, quantity: 100, unitPrice: 80000, vatRate: 10 }] }
→ 201: PO (Draft), code = "PO-20260317-A1B2", grandTotal = 8,800,000

Bước 2 — Xác nhận đơn mua
──────────────────────────
POST /api/v1/purchase-orders/{poId}/confirm
→ 200: PO (Confirmed)

Bước 3 — Nhập kho lần 1 (60 thùng)
────────────────────────────────────
POST /api/v1/goods-receipts
{ purchaseOrderId, warehouseId, receiptDate, lines: [{ productId, unitId, quantity: 60, unitCost: 80000 }] }
→ 201: GR#1 (Draft)

POST /api/v1/goods-receipts/{gr1Id}/confirm
→ 200: GR#1 (Confirmed)
   Side-effects: InventoryBalance +1440 chai, DebtLedger +4,800,000, JournalEntry (Nợ156/Có331)
   PO vẫn Confirmed (chưa nhận đủ: 1440/2400 chai)

Bước 4 — Nhập kho lần 2 (40 thùng)
────────────────────────────────────
POST /api/v1/goods-receipts + confirm (tương tự)
→ InventoryBalance +960 chai → tổng 2400 chai
   PO → Completed (nhận đủ 2400/2400 chai)

Bước 5 — Trả 5 thùng lỗi
──────────────────────────
POST /api/v1/purchase-returns
{ goodsReceiptId: gr1Id, supplierId, returnDate, reason: "Hàng bị méo vỏ", isRefunded: false,
  lines: [{ productId, unitId, quantity: 5, unitCost: 80000 }] }
→ 201: PR (Draft)

POST /api/v1/purchase-returns/{prId}/confirm
→ 200: PR (Confirmed)
   Side-effects: InventoryBalance −120 chai → tổng 2280 chai
                 DebtLedger −400,000 → công nợ NCC = 7,600,000
                 JournalEntry (Nợ331/Có156)
```

### Kết quả cuối cùng

| Đối tượng | Giá trị |
|-----------|---------|
| Tồn kho SP-001 tại Kho chính | 2,280 chai (base unit) |
| Công nợ phải trả NCC | 7,600,000 đ |
| PurchaseOrder | Completed |
| GoodsReceipt #1, #2 | Confirmed |
| PurchaseReturn | Confirmed |

---

## 7. Liên kết trong hệ thống

| Bảng | Liên kết | Ghi chú |
|---|---|---|
| `Suppliers` | `PurchaseOrders.SupplierId` | NCC gắn với đơn mua |
| `Products` | `PurchaseOrderLines.ProductId` | Sản phẩm trên dòng PO |
| `Products` | `GoodsReceiptLines.ProductId` | Sản phẩm trên dòng GR |
| `Products` | `PurchaseReturnLines.ProductId` | Sản phẩm trên dòng PR |
| `PurchaseOrders` | `GoodsReceipts.PurchaseOrderId` | GR tạo từ PO |
| `GoodsReceipts` | `PurchaseReturns.GoodsReceiptId` | PR tạo từ GR |
| `Warehouses` | `GoodsReceipts.WarehouseId` | Kho nhập |
| `InventoryBalances` | `(ProductId, WarehouseId)` | Tồn kho hiện tại |
| `InventoryTransactions` | `ReferenceId` → GR.Id / PR.Id | Lịch sử kho |
| `DebtLedgers` | `PartnerId` → Supplier.Id | Công nợ NCC |
| `JournalEntries` | `ReferenceId` → GR.Id / PR.Id | Bút toán kế toán |
