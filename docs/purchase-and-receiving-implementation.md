# Triển khai nghiệp vụ Nhập hàng & Nhập kho — Chi tiết kỹ thuật

> **Phiên bản:** Dựa trên source code thực tế tại thời điểm 2026-03-17  
> **Liên quan:** [purchase-flow.md](purchase-flow.md) · [inventory-flow.md](inventory-flow.md) · [financial-flow.md](financial-flow.md)

---

## 1. Tổng quan kiến trúc

Trung tâm của nghiệp vụ nhập hàng là **Sản phẩm (Product)**. Mọi chứng từ mua hàng đều ghi nhận theo từng mã sản phẩm cụ thể — số lượng, đơn vị, giá mua — và chính dữ liệu sản phẩm trên chứng từ là đầu vào để hệ thống tự động cập nhật tồn kho, tính giá vốn, ghi nhận công nợ nhà cung cấp.

```
                         ┌──────────────────────────┐
                         │       Product (SPM)      │
                         │  Code · BaseUnit · Cost  │
                         │  CostingMethod · Batch   │
                         └────┬──────┬──────┬───────┘
                              │      │      │
                 ┌────────────┘      │      └────────────┐
                 ▼                   ▼                   ▼
     ┌───────────────────┐  ┌──────────────────┐  ┌──────────────────┐
     │  PurchaseOrder    │─►│  GoodsReceipt    │─►│  PurchaseReturn  │
     │  + Supplier       │  │  + Warehouse     │  │  (Trả hàng NCC)  │
     │  + Lines[SPM,Qty, │  │  + Lines[SPM,Qty,│  │  + Lines[SPM,Qty,│
     │    Unit,UnitPrice]│  │    Unit,UnitCost]│  │    Unit,UnitCost]│
     └───────────────────┘  └────────┬─────────┘  └────────┬─────────┘
          Draft                      │ confirm             │ confirm
            │                        ▼                     ▼
         Confirmed         ┌───────────────────┐  ┌──────────────────┐
            │              │ InventoryBalance  │  │  Giảm tồn kho    │
         Completed ◄─auto  │ [SPM + Warehouse] │  │  Giảm công nợ AP │
            │              │ QuantityOnHand++  │  │  Bút toán đảo    │
         Cancelled         │ + Inventory Tx    │  └──────────────────┘
                           │ + DebtLedger AP++ │
                           │ + Bút toán kế toán│
                           └───────────────────┘
```

**Nguyên tắc cốt lõi:** Không có nhập hàng nào mà thiếu mã sản phẩm. Mỗi dòng trên chứng từ (PO line, GR line, PR line) đều bắt buộc có `ProductId` + `UnitId` + `Quantity` + giá (UnitPrice/UnitCost). Từ 3 thông tin này, hệ thống quy đổi về đơn vị cơ sở, cập nhật tồn kho theo sản phẩm, và tính giá vốn dựa trên `CostingMethod` của sản phẩm.

### Các layer tham gia

| Layer | Component | Vai trò |
|-------|-----------|---------|
| **API** | `PurchaseOrdersController` | REST endpoints cho đơn mua |
| **API** | `GoodsReceiptsController` | REST endpoints cho phiếu nhập kho |
| **API** | `PurchaseReturnsController` | REST endpoints cho phiếu trả hàng NCC |
| **API** | `InventoryController` | REST endpoints cho tra cứu & điều chỉnh tồn kho |
| **Service** | `PurchaseOrderService` | Xử lý CRUD + confirm/cancel đơn mua |
| **Service** | `GoodsReceiptService` | Xử lý nhập kho + tích hợp inventory/debt/accounting |
| **Service** | `PurchaseReturnService` | Xử lý trả hàng + đảo chiều inventory/debt/accounting |
| **Service** | `InventoryService` | Quản lý tồn kho, quy đổi đơn vị, ghi transaction log |
| **Service** | `DebtService` | Quản lý công nợ (Accounts Payable) |
| **Service** | `AccountingService` | Tạo bút toán kế toán (Journal Entry) |
| **Data** | `AppDbContext` | EF Core DbContext với multi-tenant filter + soft delete |
| **Data** | `IUnitOfWork` | Quản lý database transaction boundary |

---

## 2. Sản phẩm — Trung tâm của nghiệp vụ nhập hàng

### 2.1 Product Entity — Dữ liệu nền tảng

Trước khi nhập hàng, sản phẩm phải được khai báo đầy đủ trong danh mục (`POST /api/v1/products`). Thông tin sản phẩm quyết định cách hệ thống xử lý nhập kho:

| Trường | Ý nghĩa trong nhập hàng |
|--------|-------------------------|
| `Code` | Mã sản phẩm duy nhất (VD: `SP-001`) — bắt buộc trên mỗi dòng chứng từ mua hàng |
| `BaseUnitId` | Đơn vị cơ sở (VD: Chai) — tồn kho luôn lưu theo đơn vị này |
| `PurchaseUnitId` | Đơn vị nhập hàng mặc định (VD: Thùng) — gợi ý trên UI khi tạo PO |
| `CostPrice` | Giá vốn hiện tại (base unit) — dùng làm giá tham khảo khi nhập |
| `VatRate` | Thuế suất VAT mặc định (%) — tự điền khi thêm dòng PO |
| `CostingMethod` | Phương pháp tính giá vốn: `Average` (bình quân gia quyền) hoặc `Fifo` |
| `IsBatchManaged` | Có quản lý theo lô → GoodsReceiptLine bắt buộc có `BatchNumber` |
| `IsExpiryManaged` | Có quản lý hạn sử dụng → GoodsReceiptLine bắt buộc có `ExpiryDate` |
| `CategoryId` | Phân loại sản phẩm — phục vụ báo cáo nhập hàng theo nhóm |
| `Status` | Chỉ sản phẩm `Active` mới được phép thêm vào chứng từ mua hàng mới |

### 2.2 Dòng chảy dữ liệu sản phẩm qua toàn bộ luồng

```
Product Master Data          Chứng từ nhập hàng          Quản lý tồn kho & giá vốn
─────────────────           ──────────────────          ──────────────────────────
                              PurchaseOrderLine
 Product.Code  ──────────►   { ProductId,               InventoryBalance
 Product.PurchaseUnitId ──►     UnitId,          ───►   { ProductId, WarehouseId,
 Product.VatRate ─────────►     Quantity,                  QuantityOnHand (base unit) }
                                UnitPrice,
                                VatRate,         ───►   InventoryTransaction
                                ConvertedQty }          { ProductId, WarehouseId,
                                     │                    Qty, UnitCost,
                              GoodsReceiptLine             BatchNumber, ExpiryDate }
 Product.BaseUnitId ─────►   { ProductId,
 Product.IsBatchManaged ──►     UnitId,          ───►   Product.CostPrice
 Product.IsExpiryManaged ─►     Quantity,                (cập nhật theo CostingMethod)
 Product.CostingMethod ───►     UnitCost,
                                ConvertedQty,
                                BatchNumber,
                                ExpiryDate }
```

**Tóm lại:** Dữ liệu sản phẩm là đầu vào bắt buộc cho mọi giao dịch mua hàng. Khi tạo PO/GR, người dùng chọn mã sản phẩm (`ProductId`), chọn đơn vị nhập (`UnitId`), nhập số lượng và giá. Hệ thống tự động quy đổi về base unit để ghi tồn kho, ghi nhận giá vốn nhập theo `UnitCost`, và kiểm soát lô/hạn sử dụng nếu sản phẩm yêu cầu.

---

## 3. Database Schema

### 3.1 Quan hệ giữa Sản phẩm và Chứng từ mua hàng

```
                    Products
                       │
          ┌────────────┼────────────────────────┐
          │            │                        │
          ▼            ▼                        ▼
PurchaseOrderLines  GoodsReceiptLines  PurchaseReturnLines
  (ProductId FK)      (ProductId FK)     (ProductId FK)
       │                   │                    │
       ▼                   ▼                    ▼
PurchaseOrders        GoodsReceipts       PurchaseReturns
  (SupplierId)        (WarehouseId)        (SupplierId)
                           │
                    ┌──────┴──────┐
                    ▼             ▼
            InventoryBalances  InventoryTransactions
            (ProductId,        (ProductId,
             WarehouseId)       WarehouseId)
```

### 3.2 Bảng tồn kho

| Bảng | Mô tả | Cách ghi |
|------|--------|----------|
| `InventoryBalances` | Tồn kho hiện tại theo cặp (Product, Warehouse) | In-place UPDATE |
| `InventoryTransactions` | Lịch sử biến động kho (append-only audit log) | INSERT only |

### 3.3 Entity chính

**Product** — Sản phẩm (master data, điều kiện tiên quyết):
- `Code`: Mã sản phẩm duy nhất trong tenant (VD: `SP-001`)
- `BaseUnitId` → FK tới `Units` — đơn vị cơ sở, tồn kho tính theo đơn vị này
- `PurchaseUnitId` → FK tới `Units` — đơn vị nhập hàng mặc định
- `CostPrice`: Giá vốn hiện tại (theo base unit)
- `CostingMethod`: `Average` | `Fifo` — quyết định cách tính giá vốn khi nhập/xuất
- `IsBatchManaged`, `IsExpiryManaged`: Quyết định GR line cần `BatchNumber`/`ExpiryDate`
- `UnitConversions` → bảng quy đổi giữa các đơn vị (Thùng→Chai, Hộp→Gói...)

**Supplier** — Nhà cung cấp (gắn với PO header):
- `Code`, `Name`, `PaymentTermDays`, `CreditLimit`, `OpeningBalance`
- Mỗi PO bắt buộc liên kết 1 nhà cung cấp → xác định nguồn hàng + quản lý công nợ AP

**PurchaseOrder** — Đơn mua hàng:
- `Code`: Mã tự sinh theo pattern `PO-{yyyyMMdd}-{random4}` (qua `CodeGenerator.Generate("PO")`)
- `SupplierId` → FK tới `Suppliers`
- `BranchId` → FK tới `Branches` (nullable, phân quyền chi nhánh)
- `Status`: `DocumentStatus` (Draft → Confirmed → Completed / Cancelled)
- Tổng tiền: `TotalAmount`, `DiscountAmount`, `VatAmount`, `GrandTotal`

**PurchaseOrderLine** — Dòng chi tiết (mỗi dòng = 1 sản phẩm):
- `ProductId` → FK bắt buộc tới `Products` — xác định MUA SẢN PHẨM NÀO
- `UnitId` → FK tới `Units` — đơn vị mua (có thể khác BaseUnit, VD: mua theo Thùng)
- `Quantity`: Số lượng mua theo UnitId
- `UnitPrice`: Giá mua trên 1 đơn vị (chưa VAT) — là giá nhập thực tế từ NCC
- `VatRate`: Thuế suất VAT đầu vào (thường lấy từ `Product.VatRate`)
- `ConvertedQuantity`: Số lượng quy đổi về base unit (tính tại thời điểm tạo, lưu lại vĩnh viễn)
- `LineTotal = Quantity × UnitPrice × (1 + VatRate/100)`

**GoodsReceipt** — Phiếu nhập kho:
- `PurchaseOrderId` → FK bắt buộc tới PO gốc
- `WarehouseId` → FK tới kho nhập — xác định NHẬP VÀO KHO NÀO
- `Status`: Draft → Completed (khi confirm) / Cancelled

**GoodsReceiptLine** — Dòng nhập kho (mỗi dòng = 1 sản phẩm):
- `ProductId` → FK bắt buộc tới `Products` — xác định NHẬP SẢN PHẨM NÀO
- `UnitId`, `Quantity`, `ConvertedQuantity`: Đơn vị + số lượng nhập (giống PO line)
- `UnitCost`: Giá nhập thực tế trên 1 đơn vị — LÀ DỮ LIỆU CỐT LÕI ĐỂ TÍNH GIÁ VỐN
- `BatchNumber`: Số lô (bắt buộc nếu `Product.IsBatchManaged = true`)
- `ExpiryDate`: Ngày hết hạn (bắt buộc nếu `Product.IsExpiryManaged = true`)

**InventoryBalance** — Tồn kho hiện tại:
- Key thực tế: `(TenantId, ProductId, WarehouseId)`
- `QuantityOnHand`: Số lượng vật lý (base unit)
- `QuantityReserved`: Đã đặt trước cho Sales Order
- `Xmin`: PostgreSQL system column dùng làm **optimistic concurrency token**

**InventoryTransaction** — Log biến động kho:
- `TransactionType`: `In | Out | Adjust | Return | Transfer | OpeningBalance`
- `ReferenceType`: `Purchase | Sale | Return | Transfer | Adjustment | ...`
- `ReferenceId`: Trỏ về chứng từ gốc (GoodsReceipt.Id, PurchaseReturn.Id, ...)
- `Quantity`: Dương = nhập, Âm = xuất (base unit)

---

## 4. Luồng nghiệp vụ chi tiết

### Điều kiện tiên quyết cho toàn bộ luồng

Trước khi tạo bất kỳ chứng từ mua hàng nào, cần có sẵn:

1. **Sản phẩm** (`Products`) — đã khai báo với đầy đủ: mã, tên, danh mục, đơn vị cơ sở, đơn vị nhập hàng, giá vốn, thuế suất VAT, phương pháp tính giá vốn, cờ quản lý lô/hạn sử dụng
2. **Quy đổi đơn vị** (`ProductUnitConversions`) — nếu mua hàng theo đơn vị khác BaseUnit (VD: mua theo Thùng nhưng tồn kho tính theo Chai), phải có bản ghi quy đổi
3. **Nhà cung cấp** (`Suppliers`) — thông tin NCC, điều khoản thanh toán, hạn mức nợ
4. **Kho hàng** (`Warehouses`) — kho nào sẽ nhận hàng nhập

### 4.1 Tạo đơn mua hàng (PurchaseOrder)

**Endpoint:** `POST /api/v1/purchase-orders`  
**Authorization:** Authenticated user  
**Service:** `PurchaseOrderService.CreateAsync()`

**Luồng xử lý:**

```
1. Bắt đầu DB Transaction
2. Sinh mã tự động: CodeGenerator.Generate("PO") → "PO-20260317-A1B2"
3. Tạo PurchaseOrder { Status = Draft }
4. Với mỗi line trong request:
   a. BuildConversionLookupAsync() — nạp trước bảng quy đổi đơn vị (batch, 2 DB queries)
   b. convLookup.Convert(productId, unitId, quantity) → convertedQuantity (base unit)
   c. LineTotal = Quantity × UnitPrice × (1 + VatRate / 100)
   d. Thêm PurchaseOrderLine
5. Tính tổng:
   - TotalAmount = Σ (Quantity × UnitPrice)
   - VatAmount   = Σ (Quantity × UnitPrice × VatRate / 100)
   - GrandTotal  = TotalAmount − DiscountAmount + VatAmount
6. SaveChanges + Commit Transaction
7. Trả về PurchaseOrderDto (đọc lại từ DB với Include Supplier, Lines, Product, Unit)
```

**Tác động:** Chỉ ghi bản ghi vào DB. Không có tác động kho hay kế toán.

### 4.2 Cập nhật đơn mua hàng

**Endpoint:** `PUT /api/v1/purchase-orders/{id}`  
**Service:** `PurchaseOrderService.UpdateAsync()`

**Guard:** Chỉ cho phép khi `Status == Draft`. Throw `AppException` nếu không phải Draft.

**Logic:** Xóa toàn bộ lines cũ (`po.Lines.Clear()`), tính lại từ đầu với request mới. Tất cả nằm trong 1 transaction.

### 4.3 Xác nhận đơn mua hàng

**Endpoint:** `POST /api/v1/purchase-orders/{id}/confirm`  
**Authorization:** `RequireManager` (Admin hoặc Manager)  
**Service:** `PurchaseOrderService.ConfirmAsync()`

```
1. Guard: Status phải là Draft
2. Set Status = Confirmed
3. SaveChanges
```

**Tác động:** Chỉ đổi trạng thái. Không có side-effect kho/kế toán. PO cần ở trạng thái Confirmed thì mới tạo được GoodsReceipt.

### 4.4 Hủy đơn mua hàng

**Endpoint:** `POST /api/v1/purchase-orders/{id}/cancel`  
**Authorization:** `RequireManager`  
**Service:** `PurchaseOrderService.CancelAsync()`

```
1. Guard: Status không được là Completed
2. Guard: Không được có GoodsReceipt đã Completed liên kết
   → Nếu có, throw: "Cannot cancel a purchase order that has confirmed goods receipts.
     Raise a purchase return instead."
3. Set Status = Cancelled
4. SaveChanges
```

### 4.5 Tạo phiếu nhập kho (GoodsReceipt)

**Endpoint:** `POST /api/v1/goods-receipts`  
**Authorization:** `RequireManager`  
**Service:** `GoodsReceiptService.CreateAsync()`

**Điều kiện tiên quyết:** PO gốc phải ở trạng thái `Confirmed`.

```
1. Validate: PurchaseOrder.Status == Confirmed. Throw nếu không đúng.
2. Bắt đầu DB Transaction
3. Sinh mã: CodeGenerator.Generate("GR") → "GR-20260317-C3D4"
4. Tạo GoodsReceipt { Status = Draft, PurchaseOrderId, WarehouseId }
5. Với mỗi line:
   a. BuildConversionLookupAsync() → quy đổi về base unit
   b. Tạo GoodsReceiptLine { Quantity, ConvertedQuantity, UnitCost, BatchNumber, ExpiryDate }
6. SaveChanges + Commit Transaction
7. Trả về GoodsReceiptDto
```

**Tác động tại thời điểm tạo:** Chỉ ghi bản ghi. Chưa ảnh hưởng tồn kho.

> **Lưu ý:** Một PO có thể có **nhiều** GoodsReceipt (nhập nhiều lần — partial delivery).

### 4.6 Xác nhận nhập kho (GoodsReceipt Confirm) ⭐

**Endpoint:** `POST /api/v1/goods-receipts/{id}/confirm`  
**Authorization:** `RequireManager`  
**Service:** `GoodsReceiptService.ConfirmAsync()`

Đây là **bước quan trọng nhất** — kích hoạt chuỗi side-effects: tồn kho, công nợ, kế toán.

```
1. Guard: GoodsReceipt.Status phải là Draft
2. Bắt đầu DB Transaction
3. Set GoodsReceipt.Status = Completed
4. totalCost = 0

5. VỚI MỖI GoodsReceiptLine:
   ┌──────────────────────────────────────────────────────────────┐
   │ a. Cập nhật tồn kho (InventoryService.UpdateBalanceAsync):   │
   │    - Tìm InventoryBalance(ProductId, WarehouseId)            │
   │    - Nếu chưa có → tạo mới { QuantityOnHand = delta }        │
   │    - Nếu đã có → QuantityOnHand += ConvertedQuantity         │
   │    (Sử dụng optimistic concurrency qua Xmin column)          │
   │                                                              │
   │ b. Ghi log giao dịch (InventoryService.RecordTransaction):   │
   │    InventoryTransaction {                                    │
   │      TransactionType = In,                                   │
   │      ReferenceType = Purchase,                               │
   │      ReferenceId = GoodsReceipt.Id,                          │
   │      Quantity = +ConvertedQuantity,  (dương = nhập)          │
   │      UnitCost = line.UnitCost,                               │
   │      Note = "GR {code}"                                      │
   │    }                                                         │
   │                                                              │
   │ c. totalCost += ConvertedQuantity × UnitCost                 │
   └──────────────────────────────────────────────────────────────┘

6. Ghi nhận công nợ AP (DebtService.AppendEntryAsync):
   DebtLedger {
     PartnerType = Supplier,
     PartnerId = PO.SupplierId,
     ReferenceType = GoodsReceipt,
     ReferenceId = GR.Id,
     DebitAmount = totalCost,    // TĂNG số dư AP (ta nợ NCC thêm)
     CreditAmount = 0,
     Description = "Nhập kho {code}"
   }

7. Ghi bút toán kế toán (AccountingService.CreateFromLinesAsync):
   JournalEntry {
     ReferenceType = GoodsReceipt,
     ReferenceId = GR.Id,
     Lines = [
       { AccountCode = "156", Debit = totalCost, Credit = 0, Note = "Nhập kho" },
       { AccountCode = "331", Debit = 0, Credit = totalCost, Note = "Phải trả NCC" }
     ]
   }
   → Nợ TK 156 (Hàng hóa) / Có TK 331 (Phải trả nhà cung cấp)

8. Kiểm tra PO đã nhận đủ chưa:
   - Lấy TẤT CẢ GoodsReceiptLines liên kết với PO (loại trừ GR bị Cancelled)
   - Lấy TẤT CẢ PurchaseOrderLines của PO
   - Với mỗi PO line, so sánh:
       Σ GR_lines.ConvertedQuantity (cùng ProductId) >= PO_line.ConvertedQuantity?
   - Nếu TẤT CẢ lines đã nhận đủ → PurchaseOrder.Status = Completed

9. SaveChanges + Commit Transaction
10. Trả về GoodsReceiptDto
```

**Bảng bị tác động trong 1 lần confirm:**

| Bảng | Hành động |
|------|-----------|
| `GoodsReceipts` | Status → Completed |
| `InventoryBalances` | QuantityOnHand += (mỗi line) |
| `InventoryTransactions` | INSERT (mỗi line) |
| `DebtLedgers` | INSERT (1 bản ghi tổng hợp) |
| `JournalEntries` | INSERT header |
| `JournalEntryLines` | INSERT 2 dòng (156 và 331) |
| `PurchaseOrders` | Status → Completed (nếu nhận đủ) |

### 4.7 Hủy phiếu nhập kho

**Endpoint:** `POST /api/v1/goods-receipts/{id}/cancel`  
**Service:** `GoodsReceiptService.CancelAsync()`

```
1. Guard: Status phải KHÔNG phải Completed.
   → Nếu đã Completed, throw: "Cannot cancel a completed receipt. Create a return instead."
2. Set Status = Cancelled
3. SaveChanges
```

**Tác động:** Không có side-effect (phiếu chỉ ở Draft mới hủy được).

### 4.8 Trả hàng nhà cung cấp (PurchaseReturn)

**3.8.1 Tạo phiếu trả hàng:**

**Endpoint:** `POST /api/v1/purchase-returns`  
**Service:** `PurchaseReturnService.CreateAsync()`

```
1. Guard: GoodsReceipt gốc phải ở trạng thái Completed
2. Validate số lượng trả:
   - Nạp GoodsReceiptLines của phiếu nhập gốc
   - Tính tổng đã trả trước đó (từ các PurchaseReturn khác không bị Cancelled)
   - Với mỗi line: requestConverted <= (grLine.ConvertedQuantity - alreadyReturned)
   - Throw nếu vượt quá số lượng có thể trả
3. Transaction: Tạo PurchaseReturn { Status = Draft } + Lines
4. TotalReturnAmount = Σ (Quantity × UnitCost)
```

**3.8.2 Xác nhận trả hàng:**

**Endpoint:** `POST /api/v1/purchase-returns/{id}/confirm`  
**Authorization:** `RequireManager`  
**Service:** `PurchaseReturnService.ConfirmAsync()`

```
1. Guard: Status phải là Draft
2. Lấy WarehouseId từ GoodsReceipt gốc (kho nào nhập thì kho đó trả)
3. Bắt đầu DB Transaction, set Status = Completed

4. VỚI MỖI PurchaseReturnLine:
   a. Giảm tồn kho: UpdateBalanceAsync(productId, warehouseId, -ConvertedQuantity)
   b. Ghi log: InventoryTransaction {
        TransactionType = Return,       // (không phải Out)
        ReferenceType = Purchase,
        Quantity = +ConvertedQuantity,   // dương, nhưng service xử lý giảm ở UpdateBalance
      }

5. Giảm công nợ AP:
   DebtLedger {
     DebitAmount = 0,
     CreditAmount = totalReturnAmount    // GIẢM số dư AP
   }

6. Bút toán đảo: Nợ 331 (Giảm AP) / Có 156 (Giảm hàng tồn kho)
   JournalEntry { Lines = [
     ("331", totalReturnAmount, 0, "Giảm AP"),
     ("156", 0, totalReturnAmount, "Giảm hàng tồn kho")
   ]}

7. SaveChanges + Commit Transaction
```

---

## 5. Quy đổi đơn vị (Unit Conversion)

### 4.1 Mô hình dữ liệu

Mỗi sản phẩm có 3 đơn vị đặt trước:
- `BaseUnitId` — đơn vị cơ sở (lưu tồn kho theo đơn vị này)
- `PurchaseUnitId` — đơn vị nhập hàng mặc định
- `SalesUnitId` — đơn vị bán hàng mặc định

Bảng `ProductUnitConversions` lưu tỷ lệ quy đổi giữa các đơn vị. Ví dụ:
```
ProductId | FromUnitId (Thùng) | ToUnitId (Chai) | ConversionRate = 24
→ 1 Thùng = 24 Chai
```

### 4.2 Thuật toán BFS

`InventoryService.ConvertToBaseUnitAsync()` sử dụng **Breadth-First Search** trên đồ thị quy đổi:

```
1. Nạp tất cả ProductUnitConversions cho product
2. Xây graph 2 chiều:
   - A → B, rate = R
   - B → A, rate = 1/R
3. BFS từ fromUnitId → product.BaseUnitId
4. Tích lũy rate dọc đường đi
5. Kết quả: quantity × accumulated_rate
6. Throw nếu không tìm được đường
```

### 4.3 Batch Optimization

`BuildConversionLookupAsync()` tối ưu cho trường hợp nhiều sản phẩm:
- **Luôn chỉ cần 2 DB queries** bất kể số lượng sản phẩm:
  1. Nạp `BaseUnitId` của tất cả products
  2. Nạp tất cả `ProductUnitConversions` cho các products
- Trả về `UnitConversionLookup` — object dùng lại nhiều lần mà không query thêm
- Tránh N+1 khi tạo PO/GR với nhiều dòng sản phẩm

---

## 6. Quản lý tồn kho (Inventory)

### 5.1 UpdateBalanceAsync — Cập nhật tồn kho

```csharp
// delta > 0: nhập kho, delta < 0: xuất kho
async Task UpdateBalanceAsync(productId, warehouseId, delta)
{
    balance = FindOrNull(ProductId, WarehouseId);
    if (balance is null)
    {
        // Tạo mới — chỉ khi nhập (delta > 0)
        Create { QuantityOnHand = delta, QuantityReserved = 0 }
    }
    else
    {
        balance.QuantityOnHand += delta;
        if (QuantityOnHand < 0) throw AppException("Cannot go negative");
    }
}
```

### 5.2 RecordTransactionAsync — Ghi log

Mỗi lần gọi tạo 1 bản ghi `InventoryTransaction` bất biến (append-only). Không bao giờ update hay delete. Đây là audit trail cho tất cả biến động kho.

### 5.3 Concurrency Control

`InventoryBalance.Xmin` sử dụng PostgreSQL system column `xmin` làm **optimistic concurrency token**. EF Core tự kiểm tra khi update — nếu 2 request cùng cập nhật 1 balance thì request sau sẽ gặp `DbUpdateConcurrencyException`.

### 5.4 Các nghiệp vụ khác

| Nghiệp vụ | API | Mô tả |
|-----------|-----|-------|
| Tồn kho đầu kỳ | `POST /inventory/opening-balance` | Ghi đè (SET) QuantityOnHand, không cộng dồn |
| Điều chỉnh | `POST /inventory/adjust` | Tính delta = target - current, rồi update |
| Reserve | (internal) | Khi confirm Sales Order: QuantityReserved += qty |
| Release | (internal) | Khi cancel Sales Order: QuantityReserved -= qty |
| Kiểm tra tồn | (internal) | `Available = OnHand - Reserved`. Throw nếu không đủ |

---

## 7. Tích hợp kế toán & công nợ

### 6.1 Công nợ (Accounts Payable)

Công nợ NCC được theo dõi qua bảng `DebtLedgers` với công thức:
```
Số dư AP = Σ DebitAmount − Σ CreditAmount (cho cùng SupplierId)
```

| Sự kiện | DebitAmount | CreditAmount | Tác động AP |
|---------|-------------|--------------|-------------|
| GR.Confirm (nhập kho) | totalCost | 0 | Tăng nợ |
| PurchaseReturn.Confirm | 0 | totalReturnAmount | Giảm nợ |
| Payment (thanh toán NCC) | 0 | amount | Giảm nợ |

### 6.2 Bút toán kế toán

| Sự kiện | Nợ (Debit) | Có (Credit) |
|---------|------------|-------------|
| GR.Confirm | TK 156 — Hàng hóa | TK 331 — Phải trả NCC |
| PurchaseReturn.Confirm | TK 331 — Phải trả NCC | TK 156 — Hàng hóa |
| Payment NCC | TK 331 — Phải trả NCC | TK 112 — Tiền gửi NH |

---

## 8. Transaction Boundary & Error Handling

### 7.1 Pattern sử dụng

Tất cả operations có side-effect đều được bọc trong explicit transaction:

```csharp
await uow.BeginTransactionAsync(ct);
try
{
    // ... business logic ...
    await uow.SaveChangesAsync(ct);
    await uow.CommitTransactionAsync(ct);
}
catch
{
    await uow.RollbackTransactionAsync(ct);
    throw;
}
```

### 7.2 Atomicity

Khi confirm GoodsReceipt, tất cả các bước (update inventory, record transaction, append debt, create journal entry, check PO completion) nằm trong **cùng 1 transaction**. Nếu bất kỳ bước nào fail, toàn bộ rollback.

### 7.3 Exception Hierarchy

| Exception | HTTP | Khi nào |
|-----------|------|---------|
| `NotFoundException` | 404 | Entity không tồn tại |
| `AppException` | 400 | Vi phạm business rule (sai status, vượt số lượng, ...) |
| `DbUpdateConcurrencyException` | 409 | Xung đột concurrency trên InventoryBalance |

---

## 9. Authorization & Multi-tenancy

### 8.1 Phân quyền

| Endpoint | Policy |
|----------|--------|
| Tạo/cập nhật PO | Authenticated |
| Confirm/Cancel PO | `RequireManager` (Admin, Manager) |
| Tất cả GoodsReceipt | `RequireManager` |
| Tạo PurchaseReturn | Authenticated |
| Confirm PurchaseReturn | `RequireManager` |
| Adjust / Opening Balance | `RequireAdmin` |
| Query balances/transactions | Authenticated |

### 8.2 Multi-tenancy

- Tất cả entity kế thừa `TenantEntity` → có `TenantId`
- `AppDbContext` áp dụng **global query filter** tự động: `!IsDeleted && TenantId == currentTenant`
- `TenantId` được tự động gán khi `SaveChangesAsync()` qua `ApplyTenantId()`
- Mỗi tenant có database riêng (`pos_tenant_{guid}`)

---

## 10. API Endpoints tổng hợp

### Purchase Orders

| Method | Path | Mô tả |
|--------|------|-------|
| `GET` | `/api/v1/purchase-orders` | Danh sách (filter: supplier, status, date range) |
| `GET` | `/api/v1/purchase-orders/{id}` | Chi tiết + lines |
| `POST` | `/api/v1/purchase-orders` | Tạo mới (Draft) |
| `PUT` | `/api/v1/purchase-orders/{id}` | Cập nhật (chỉ Draft) |
| `POST` | `/api/v1/purchase-orders/{id}/confirm` | Xác nhận (Draft → Confirmed) |
| `POST` | `/api/v1/purchase-orders/{id}/cancel` | Hủy |

### Goods Receipts

| Method | Path | Mô tả |
|--------|------|-------|
| `GET` | `/api/v1/goods-receipts` | Danh sách (filter: PO, warehouse, status, date) |
| `GET` | `/api/v1/goods-receipts/{id}` | Chi tiết + lines |
| `POST` | `/api/v1/goods-receipts` | Tạo mới (Draft) — từ PO đã Confirmed |
| `POST` | `/api/v1/goods-receipts/{id}/confirm` | Xác nhận → ghi kho + kế toán |
| `POST` | `/api/v1/goods-receipts/{id}/cancel` | Hủy (chỉ Draft) |

### Purchase Returns

| Method | Path | Mô tả |
|--------|------|-------|
| `GET` | `/api/v1/purchase-returns` | Danh sách (filter: supplier, GR, status, date) |
| `GET` | `/api/v1/purchase-returns/{id}` | Chi tiết + lines |
| `POST` | `/api/v1/purchase-returns` | Tạo mới (Draft) — từ GR đã Completed |
| `POST` | `/api/v1/purchase-returns/{id}/confirm` | Xác nhận → giảm kho + giảm công nợ |

### Inventory

| Method | Path | Mô tả |
|--------|------|-------|
| `GET` | `/api/v1/inventory/balances` | Tồn kho hiện tại (filter: product, warehouse) |
| `GET` | `/api/v1/inventory/transactions` | Lịch sử biến động (filter: product, warehouse, type, date) |
| `POST` | `/api/v1/inventory/adjust` | Điều chỉnh tồn kho (target quantity) |
| `POST` | `/api/v1/inventory/opening-balance` | Nhập tồn đầu kỳ (ghi đè) |

---

## 11. Ví dụ luồng hoàn chỉnh

### Dữ liệu nền (Master Data phải có trước)

```
Sản phẩm:    SP-001 "Nước suối Lavie 500ml"
             BaseUnit = Chai, PurchaseUnit = Thùng
             CostPrice = 3,500đ/chai, VatRate = 10%
             CostingMethod = Average, IsBatchManaged = false

Quy đổi:     1 Thùng = 24 Chai  (ProductUnitConversions)

NCC:         NCC-001 "Công ty TNHH Lavie Việt Nam"
             PaymentTermDays = 30, CreditLimit = 100,000,000

Kho:         WH-HN-01 "Kho Trung tâm Hà Nội"
```

### Scenario: Mua 100 thùng, nhập kho 2 lần (60 + 40), trả 5 thùng lỗi

```
══════════════════════════════════════════════════════════════════
Bước 1: Tạo đơn mua hàng — GHI NHẬN SẢN PHẨM + SỐ LƯỢNG + GIÁ
══════════════════════════════════════════════════════════════════
POST /api/v1/purchase-orders
{
  "supplierId": "{NCC-001}",
  "orderDate": "2026-03-17T00:00:00Z",
  "lines": [{
    "productId": "{SP-001}",        ← mã sản phẩm bắt buộc
    "unitId": "{Thùng}",            ← đơn vị mua (khác base unit)
    "quantity": 100,                 ← số lượng mua
    "unitPrice": 80000,              ← giá mua/thùng (chưa VAT)
    "vatRate": 10                    ← VAT đầu vào
  }],
  "discountAmount": 0
}

Hệ thống tự tính:
  ConvertedQuantity = 100 thùng × 24 = 2400 chai (base unit)
  LineTotal  = 100 × 80,000 × 1.10 = 8,800,000đ
  TotalAmount = 8,000,000  |  VatAmount = 800,000  |  GrandTotal = 8,800,000
→ PO (Draft) — Gắn NCC-001 + SP-001, chưa ảnh hưởng kho/kế toán


══════════════════════════════════════════════════════════════════
Bước 2: Xác nhận đơn mua
══════════════════════════════════════════════════════════════════
POST /api/v1/purchase-orders/{poId}/confirm
→ PO (Confirmed) — Sẵn sàng nhập kho


══════════════════════════════════════════════════════════════════
Bước 3: Nhập kho lần 1 — 60 thùng SP-001 vào kho WH-HN-01
══════════════════════════════════════════════════════════════════
POST /api/v1/goods-receipts
{
  "purchaseOrderId": "{poId}",
  "warehouseId": "{WH-HN-01}",       ← nhập vào kho nào
  "receiptDate": "2026-03-18T00:00:00Z",
  "lines": [{
    "productId": "{SP-001}",          ← cùng sản phẩm như PO
    "unitId": "{Thùng}",
    "quantity": 60,                    ← nhập 60/100 thùng (partial)
    "unitCost": 80000                  ← giá nhập thực tế/thùng
  }]
}
→ GR#1 (Draft)


══════════════════════════════════════════════════════════════════
Bước 4: Xác nhận nhập kho — THỜI ĐIỂM GHI TỒN KHO & GIÁ VỐN
══════════════════════════════════════════════════════════════════
POST /api/v1/goods-receipts/{gr1Id}/confirm

→ Hệ thống thực hiện (trong 1 transaction):

  [TỒN KHO]  InventoryBalance { SP-001, WH-HN-01 }
             QuantityOnHand += 60 × 24 = +1440 chai

  [LỊCH SỬ]  InventoryTransaction {
               ProductId = SP-001, WarehouseId = WH-HN-01
               Type = In, Reference = Purchase
               Qty = +1440, UnitCost = 80000/24 = 3,333đ/chai
             }

  [CÔNG NỢ]  DebtLedger {
               Supplier = NCC-001
               DebitAmount = 60 × 80,000 = 4,800,000đ  (tăng nợ AP)
             }

  [KẾ TOÁN]  JournalEntry:
               Nợ TK 156 (Hàng hóa)    = 4,800,000đ
               Có TK 331 (Phải trả NCC) = 4,800,000đ

  [PO STATUS] Kiểm tra: 1440/2400 chai — chưa đủ → PO vẫn Confirmed


══════════════════════════════════════════════════════════════════
Bước 5: Nhập kho lần 2 — 40 thùng còn lại
══════════════════════════════════════════════════════════════════
(Tạo GR#2 + Confirm tương tự)

→ InventoryBalance { SP-001, WH-HN-01 }.QuantityOnHand += 40 × 24 = +960
→ Tổng tồn kho SP-001 tại WH-HN-01 = 1440 + 960 = 2400 chai
→ Kiểm tra: 2400/2400 — đã nhận đủ → PO.Status → Completed ✓
→ Tổng công nợ NCC-001: 4,800,000 + 3,200,000 = 8,000,000đ


══════════════════════════════════════════════════════════════════
Bước 6: Trả 5 thùng hàng lỗi cho NCC
══════════════════════════════════════════════════════════════════
POST /api/v1/purchase-returns
{
  "goodsReceiptId": "{gr1Id}",
  "supplierId": "{NCC-001}",
  "returnDate": "2026-03-20T00:00:00Z",
  "reason": "Hàng bị méo vỏ, không đạt chất lượng",
  "isRefunded": false,
  "lines": [{
    "productId": "{SP-001}",          ← trả sản phẩm nào
    "unitId": "{Thùng}",
    "quantity": 5,                     ← trả 5 thùng
    "unitCost": 80000
  }]
}

POST /api/v1/purchase-returns/{prId}/confirm
→ InventoryBalance.QuantityOnHand -= 5 × 24 = -120 chai
→ Tồn kho còn lại: 2400 - 120 = 2280 chai
→ Công nợ giảm: 5 × 80,000 = 400,000đ
→ Bút toán đảo: Nợ 331 / Có 156 = 400,000đ
```

### Kết quả cuối cùng

| Đối tượng | Giá trị |
|-----------|----------|
| SP-001 tồn kho tại WH-HN-01 | 2,280 chai |
| Công nợ phải trả NCC-001 | 7,600,000đ (8M − 400K) |
| Giá vốn nhập bình quân SP-001 | ~3,333đ/chai |
| PurchaseOrder status | Completed |
| GoodsReceipt #1, #2 status | Completed |
| PurchaseReturn status | Completed |

---

## 12. Business Rules tóm tắt

| Rule | Vị trí kiểm tra |
|------|-----------------|
| PO chỉ update khi Draft | `PurchaseOrderService.UpdateAsync()` |
| PO chỉ confirm khi Draft | `PurchaseOrderService.ConfirmAsync()` |
| PO không hủy được nếu đã có GR Completed | `PurchaseOrderService.CancelAsync()` |
| GR chỉ tạo được từ PO Confirmed | `GoodsReceiptService.CreateAsync()` |
| GR chỉ confirm khi Draft | `GoodsReceiptService.ConfirmAsync()` |
| GR Completed không hủy được (phải tạo Return) | `GoodsReceiptService.CancelAsync()` |
| PurchaseReturn chỉ tạo từ GR Completed | `PurchaseReturnService.CreateAsync()` |
| Số lượng trả ≤ số lượng đã nhập − đã trả trước đó | `ValidatePurchaseReturnQuantitiesAsync()` |
| Tồn kho không được âm | `InventoryService.UpdateBalanceAsync()` |
| Product code unique per tenant | `ProductService.CreateAsync()` |
| Category code unique per tenant | `CategoryService.CreateAsync()` |
