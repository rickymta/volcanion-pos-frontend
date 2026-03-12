# POS Backend — Database Description

> **RDBMS:** PostgreSQL (qua PGBouncer :6432)  
> **ORM:** Entity Framework Core 10 (code-first)  
> **Phiên bản:** 1.1 | **Ngày cập nhật:** 2026-03-08  
> **Tổng số bảng:** 37

---

## Mục lục

1. [Quy ước chung](#1-quy-ước-chung)
2. [ERD tổng quan](#2-erd-tổng-quan)
3. [Nhóm: Danh mục & Người dùng](#3-nhóm-danh-mục--người-dùng)
4. [Nhóm: Tồn kho](#4-nhóm-tồn-kho)
5. [Nhóm: Mua hàng](#5-nhóm-mua-hàng)
6. [Nhóm: Bán hàng](#6-nhóm-bán-hàng)
7. [Nhóm: Giao hàng & Chuyển kho](#7-nhóm-giao-hàng--chuyển-kho)
8. [Nhóm: Tài chính](#8-nhóm-tài-chính)
9. [Nhóm: Phân quyền & Bảo mật](#9-nhóm-phân-quyền--bảo-mật)
10. [Enum Reference](#10-enum-reference)
11. [Index & Constraint tổng hợp](#11-index--constraint-tổng-hợp)
12. [Sơ đồ quan hệ chi tiết](#12-sơ-đồ-quan-hệ-chi-tiết)

---

## 1. Quy ước chung

### Base columns — có trên **mọi** bảng

| Cột | Kiểu PostgreSQL | Ràng buộc | Mô tả |
|---|---|---|---|
| `Id` | `uuid` | PK, DEFAULT gen_random_uuid() | Khóa chính — GUID tự sinh |
| `TenantId` | `uuid` | NOT NULL | Multi-tenancy — phân tách dữ liệu hoàn toàn theo tenant |
| `CreatedAt` | `timestamptz` | NOT NULL | Thời điểm tạo bản ghi (UTC) |
| `CreatedBy` | `text` | NULL | Username người tạo |
| `UpdatedAt` | `timestamptz` | NULL | Thời điểm cập nhật gần nhất |
| `UpdatedBy` | `text` | NULL | Username người cập nhật |
| `IsDeleted` | `boolean` | NOT NULL DEFAULT false | Soft-delete — EF Global Filter tự loại bỏ mọi query |

> **Soft-delete:** Mọi query qua EF đều được tự động filter `WHERE "TenantId" = @current AND "IsDeleted" = false`. Dữ liệu không bao giờ bị xóa vật lý.

### Quy tắc kiểu dữ liệu

| Loại dữ liệu | Kiểu PostgreSQL | Precision |
|---|---|---|
| Số tiền | `numeric(18,2)` | 2 chữ số thập phân |
| Số lượng hàng hóa | `numeric(18,6)` | 6 chữ số (hỗ trợ đơn vị nhỏ, phân số) |
| Đơn giá / Giá vốn | `numeric(18,4)` | 4 chữ số thập phân |
| Tỷ lệ VAT / Conversion rate | `numeric(5,2)` | 0.00 – 100.00 |

### Quy tắc mã chứng từ (Code)

Format: `PREFIX-YYYYMMDD-XXXXXXXX` (8 ký tự hex ngẫu nhiên)

| Bảng | Prefix | Ví dụ |
|---|---|---|
| SalesOrders | SO | SO-20260308-3A9F1B2C |
| Invoices | INV | INV-20260308-3A9F1B2C |
| DeliveryOrders | DO | DO-20260308-3A9F1B2C |
| PurchaseOrders | PO | PO-20260308-3A9F1B2C |
| GoodsReceipts | GR | GR-20260308-3A9F1B2C |
| SalesReturns | RET | RET-20260308-3A9F1B2C |
| PurchaseReturns | PRET | PRET-20260308-3A9F1B2C |
| StockTransfers | ST | ST-20260308-3A9F1B2C |
| JournalEntries | JE | JE-20260308-3A9F1B2C |

---

## 2. ERD tổng quan

```
┌──────┐   ┌──────────┐    ┌──────┐    ┌──────────┐
│Users │   │Categories│    │Units │    │Branches  │
└──┬───┘   └────┬─────┘    └──┬───┘    └────┬─────┘
   │            │             │ (BaseUnit/PurchaseUnit/SalesUnit)
   │            └──────┬──────┘             │
   │                   │               ┌────▼────┐
   │              ┌────▼─────┐         │Warehos. │
   ├──UserBranches─►         │         └─────────┘
   ├──UserRoles───►          │
   └──LoginHist.──►          │
                  │ Products │───►┌────────────────────────┐
                  └────┬─────┘    │ ProductUnitConversions │
                       │          └────────────────────────┘
          ┌────────────┼────────────┐
          │            │            │
   ┌──────▼──────┐ ┌───▼──────────┐ └── (FK từ tất cả các bảng Lines)
   │InventoryBal │ │InventoryTxns │
   └─────────────┘ └──────────────┘

┌──────────┐   ┌───────────────┐   ┌──────────────────┐
│Suppliers │──►│ PurchaseOrders│──►│  GoodsReceipts   │──►┌────────────────┐
└──────────┘   └───────────────┘   └──────────────────┘   │PurchaseReturns │
                                                          └────────────────┘

┌──────────┐   ┌───────────────┐   ┌──────────┐
│Customers │──►│  SalesOrders  │──►│ Invoices │──►┌─────────────┐
└──────────┘   └───────┬───────┘   └────┬─────┘   │SalesReturns │
                       │                │         └─────────────┘
                ┌──────▼────────┐  ┌────▼──────┐
                │DeliveryOrders │  │ Payments  │
                └───────────────┘  └───────────┘

┌────────────────┐   ┌──────────┐   ┌───────────────┐   ┌──────────────────┐
│ StockTransfers │   │DebtLedgrs│   │JournalEntries │──►│JournalEntryLines │
└────────────────┘   └──────────┘   └───────────────┘   └─────────┬────────┘
                                                                  │
                                                             ┌────▼────┐
                                                             │Accounts │
                                                             └─────────┘

┌───────┐   ┌──────────────┐   ┌──────────────┐   ┌─────────────────┐
│ Roles │──►│RolePermissions│◄──│ Permissions  │   │  LoginHistories │
└───┬───┘   └──────────────┘   └──────────────┘   └─────────────────┘
    │
┌───▼──────┐
│ UserRoles│  (nối Users ↔ Roles)
└──────────┘
```

---

## 3. Nhóm: Danh mục & Người dùng

### 3.1 Bảng `Users`

Người dùng hệ thống phục vụ xác thực (JWT) và RBAC.

> Tên bảng lowercase — exception duy nhất so với quy tắc PascalCase.

| Cột | Kiểu | Nullable | Ràng buộc | Mô tả |
|---|---|---|---|---|
| `Username` | `varchar(100)` | NO | UNIQUE(TenantId, Username) | Tên đăng nhập |
| `Email` | `varchar(200)` | NO | UNIQUE(TenantId, Email) | Email đăng nhập |
| `PasswordHash` | `varchar(100)` | NO | | BCrypt hash của mật khẩu thô |
| `FullName` | `varchar(200)` | NO | | Họ và tên hiển thị |
| `Role` | `integer` | NO | | `UserRole`: Admin=1, Manager=2, Staff=3, Viewer=4 |
| `Status` | `integer` | NO | DEFAULT 10 | `DocumentStatus`: Active=10, Inactive=11 |
| `RefreshTokenHash` | `varchar(100)` | YES | | Hash của refresh token đang có hiệu lực |
| `RefreshTokenExpiry` | `timestamptz` | YES | | Thời hạn hết của refresh token |
| `IsAllBranches` | `boolean` | NO | DEFAULT false | Nếu true: được truy cập tất cả chi nhánh trong tenant; false: chỉ các chi nhánh trong `UserBranches` |

---

### 3.2 Bảng `Categories`

Danh mục sản phẩm dạng **cây đệ quy n-cấp**.

| Cột | Kiểu | Nullable | Ràng buộc | Mô tả |
|---|---|---|---|---|
| `Name` | `varchar(255)` | NO | | Tên danh mục |
| `Description` | `varchar(1000)` | YES | | Mô tả |
| `ParentCategoryId` | `uuid` | YES | FK → Categories(Id) RESTRICT | Danh mục cha — NULL nếu là gốc |

**Quan hệ:** Self-referencing 1:N (cây đa cấp) | `1:N → Products`

---

### 3.3 Bảng `Units`

Đơn vị đo lường dùng cho sản phẩm.

| Cột | Kiểu | Nullable | Ràng buộc | Mô tả |
|---|---|---|---|---|
| `Name` | `varchar(100)` | NO | UNIQUE(TenantId, Name) | Tên đầy đủ: Hộp, Thùng, Lít, Kg |
| `Symbol` | `varchar(20)` | NO | | Ký hiệu viết tắt: hộp, thùng, l, kg |
| `IsBaseUnit` | `boolean` | NO | DEFAULT false | Đánh dấu đơn vị cơ bản của tenant |

---

### 3.4 Bảng `Products`

Sản phẩm / hàng hóa trung tâm — được tham chiếu bởi hầu hết mọi bảng.

| Cột | Kiểu | Nullable | Ràng buộc | Mô tả |
|---|---|---|---|---|
| `Code` | `varchar(50)` | NO | UNIQUE(TenantId, Code) | Mã sản phẩm nội bộ |
| `Name` | `varchar(255)` | NO | | Tên sản phẩm |
| `Description` | `varchar(1000)` | YES | | Mô tả chi tiết |
| `CategoryId` | `uuid` | NO | FK → Categories RESTRICT | Danh mục |
| `BaseUnitId` | `uuid` | NO | FK → Units RESTRICT | **Đơn vị kho** — tồn kho luôn lưu theo đơn vị này |
| `PurchaseUnitId` | `uuid` | NO | FK → Units RESTRICT | Đơn vị nhập hàng mặc định |
| `SalesUnitId` | `uuid` | NO | FK → Units RESTRICT | Đơn vị bán hàng mặc định |
| `CostPrice` | `numeric(18,4)` | NO | DEFAULT 0 | Giá vốn nhập kho mặc định |
| `SalePrice` | `numeric(18,4)` | NO | DEFAULT 0 | Giá bán lẻ niêm yết |
| `VatRate` | `numeric(5,2)` | NO | DEFAULT 0, range [0,100] | Thuế VAT phần trăm (10 = 10%) |
| `IsBatchManaged` | `boolean` | NO | DEFAULT false | Quản lý theo số lô (BatchNumber bắt buộc) |
| `IsExpiryManaged` | `boolean` | NO | DEFAULT false | Quản lý theo HSD (ExpiryDate bắt buộc) |
| `Status` | `integer` | NO | DEFAULT 10 | `DocumentStatus`: Active=10, Inactive=11 |

**Quan hệ:** `CategoryId → Categories` | `BaseUnitId/PurchaseUnitId/SalesUnitId → Units` | `1:N → ProductUnitConversions` | `1:N → InventoryBalances`

---

### 3.5 Bảng `ProductUnitConversions`

Tỷ lệ quy đổi giữa các đơn vị trên từng sản phẩm. Dùng để BFS (Breadth-First Search) quy đổi về BaseUnit khi nhập/xuất kho.

| Cột | Kiểu | Nullable | Ràng buộc | Mô tả |
|---|---|---|---|---|
| `ProductId` | `uuid` | NO | FK → Products CASCADE | Sản phẩm |
| `FromUnitId` | `uuid` | NO | FK → Units RESTRICT | Đơn vị nguồn |
| `ToUnitId` | `uuid` | NO | FK → Units RESTRICT | Đơn vị đích |
| `ConversionRate` | `numeric(18,6)` | NO | | `1 FromUnit = ConversionRate ToUnit` |

**Ràng buộc unique:** `(ProductId, FromUnitId, ToUnitId)`

**Ví dụ:** ProductId=Bia_Lon, From=Thùng, To=Chai, Rate=24 → 1 thùng = 24 chai.  
Graph là **hai chiều**: khi lưu A→B (rate=r) thì hệ thống suy ngược B→A (rate=1/r) trong BFS.

---

### 3.6 Bảng `Warehouses`

Kho hàng vật lý.

| Cột | Kiểu | Nullable | Ràng buộc | Mô tả |
|---|---|---|---|---|
| `Code` | `varchar(50)` | NO | UNIQUE(TenantId, Code) | Mã kho |
| `Name` | `varchar(255)` | NO | | Tên kho |
| `Address` | `varchar(500)` | YES | | Địa chỉ kho |
| `BranchId` | `uuid` | YES | FK → Branches SET NULL | Chi nhánh quản lý kho này |
| `Status` | `integer` | NO | DEFAULT 10 | Active=10, Inactive=11 |

**Lưu ý:** SO.Confirm lấy kho đầu tiên có `Status = Confirmed(1)`.

---

### 3.7 Bảng `Customers`

Khách hàng.

| Cột | Kiểu | Nullable | Ràng buộc | Mô tả |
|---|---|---|---|---|
| `Code` | `varchar(50)` | NO | UNIQUE(TenantId, Code) | Mã khách hàng |
| `Name` | `varchar(255)` | NO | | Họ tên / Tên công ty |
| `Phone` | `varchar(20)` | YES | | Số điện thoại |
| `Email` | `varchar(255)` | YES | | Địa chỉ email |
| `Address` | `varchar(500)` | YES | | Địa chỉ |
| `TaxCode` | `varchar(20)` | YES | | Mã số thuế (cho hóa đơn VAT) |
| `CreditLimit` | `numeric(18,2)` | NO | DEFAULT 0 | Hạn mức công nợ tối đa |
| `PaymentTermDays` | `integer` | NO | DEFAULT 0 | Thời hạn thanh toán (ngày) |
| `OpeningBalance` | `numeric(18,2)` | NO | DEFAULT 0 | Số dư AR đầu kỳ |
| `Status` | `integer` | NO | DEFAULT 1 | Active=10, Inactive=11 |

**Quan hệ:** `1:N → SalesOrders` | `1:N → DebtLedgers` | `1:N → SalesReturns`

---

### 3.8 Bảng `Suppliers`

Nhà cung cấp hàng hóa.

| Cột | Kiểu | Nullable | Ràng buộc | Mô tả |
|---|---|---|---|---|
| `Code` | `varchar(50)` | NO | UNIQUE(TenantId, Code) | Mã nhà cung cấp |
| `Name` | `varchar(255)` | NO | | Tên công ty / cá nhân |
| `Phone` | `varchar(20)` | YES | | Số điện thoại |
| `Email` | `varchar(255)` | YES | | Email |
| `Address` | `varchar(500)` | YES | | Địa chỉ |
| `TaxCode` | `varchar(20)` | YES | | Mã số thuế |
| `PaymentTermDays` | `integer` | NO | DEFAULT 0 | Thời hạn thanh toán (ngày) |
| `OpeningBalance` | `numeric(18,2)` | NO | DEFAULT 0 | Số dư AP đầu kỳ |
| `Status` | `integer` | NO | DEFAULT 1 | Active=10, Inactive=11 |

**Quan hệ:** `1:N → PurchaseOrders` | `1:N → DebtLedgers` | `1:N → PurchaseReturns`

---

### 3.9 Bảng `Branches`

Chi nhánh của doanh nghiệp — hỗ trợ cấu trúc **phân cấp** (Tổng chi nhánh → Chi nhánh con).

| Cột | Kiểu | Nullable | Ràng buộc | Mô tả |
|---|---|---|---|---|
| `Code` | `varchar(50)` | NO | UNIQUE(TenantId, Code) | Mã chi nhánh, ví dụ: HQ, CN-HN-01 |
| `Name` | `varchar(255)` | NO | | Tên chi nhánh |
| `Address` | `varchar(500)` | YES | | Địa chỉ chi nhánh |
| `Phone` | `varchar(20)` | YES | | Số điện thoại |
| `ParentBranchId` | `uuid` | YES | FK → Branches(Id) RESTRICT | Chi nhánh cha — NULL nếu là tổng chi nhánh (gốc) |
| `Status` | `integer` | NO | DEFAULT 10 | Active=10, Inactive=11 |

**Quan hệ:** Self-referencing 1:N (cây đa cấp) | `1:N → Warehouses` | `N:M ↔ Users (qua UserBranches)`

---

### 3.10 Bảng `UserBranches`

Bảng nối **User ↔ Branch** (many-to-many) — xác định chi nhánh nào user được phép truy cập.

> Nếu `User.IsAllBranches = true` thì bảng này bỏ qua; user truy cập mọi chi nhánh của tenant.

| Cột | Kiểu | Nullable | Ràng buộc | Mô tả |
|---|---|---|---|---|
| `UserId` | `uuid` | NO | PK, FK → Users CASCADE | Người dùng |
| `BranchId` | `uuid` | NO | PK, FK → Branches CASCADE | Chi nhánh được phép |

**Khóa chính:** Composite `(UserId, BranchId)`

---

## 4. Nhóm: Tồn kho

### 4.1 Bảng `InventoryBalances`

**Tồn kho hiện tại** — duy nhất 1 bản ghi per `(TenantId, ProductId, WarehouseId)`. Được cập nhật trực tiếp (in-place update) khi nhập/xuất.

| Cột | Kiểu | Nullable | Ràng buộc | Mô tả |
|---|---|---|---|---|
| `ProductId` | `uuid` | NO | FK → Products RESTRICT | Sản phẩm |
| `WarehouseId` | `uuid` | NO | FK → Warehouses RESTRICT | Kho |
| `QuantityOnHand` | `numeric(18,6)` | NO | DEFAULT 0, ≥ 0 | Số lượng tồn thực tế (base unit) |
| `QuantityReserved` | `numeric(18,6)` | NO | DEFAULT 0, ≥ 0 | Số lượng đã đặt trước (chờ xuất — từ SO Confirmed) |
| `LastUpdated` | `timestamptz` | NO | | Thời điểm cập nhật lần cuối |

**Ràng buộc unique:** `(TenantId, ProductId, WarehouseId)`

**Công thức kiểm tra:**
```
AvailableQty = QuantityOnHand - QuantityReserved
```
Khi `SO.Confirm`: `AvailableQty >= ConvertedQuantity` → nếu không đủ throw `AppException`.  
Khi `DeliveryOrder.Start`: `QuantityOnHand -= qty` + `QuantityReserved -= qty` (cùng lúc).

---

### 4.2 Bảng `InventoryTransactions`

**Audit log bất biến** của mọi biến động kho — **append-only, không sửa/xóa**.

| Cột | Kiểu | Nullable | Mô tả |
|---|---|---|---|
| `ProductId` | `uuid` | NO | Sản phẩm |
| `WarehouseId` | `uuid` | NO | Kho |
| `TransactionType` | `integer` | NO | Enum `InventoryTransactionType` (In/Out/Adjust/Return/Transfer/OpeningBalance) |
| `ReferenceType` | `integer` | NO | Enum `InventoryReferenceType` — loại chứng từ gốc |
| `ReferenceId` | `uuid` | YES | ID chứng từ gốc |
| `Quantity` | `numeric(18,6)` | NO | **Dương = nhập**, **Âm = xuất** (base unit) |
| `UnitCost` | `numeric(18,4)` | NO | Giá vốn tại thời điểm giao dịch |
| `TransactionDate` | `timestamptz` | NO | Thời điểm phát sinh |
| `Note` | `varchar(500)` | YES | Ghi chú |
| `BatchNumber` | `varchar(100)` | YES | Số lô (khi `IsBatchManaged = true`) |
| `ExpiryDate` | `timestamptz` | YES | Ngày HSD (khi `IsExpiryManaged = true`) |

**Index:** `(TenantId, ProductId, TransactionDate)` | `(TenantId, ReferenceType, ReferenceId)`

| TransactionType | ReferenceType | Được tạo bởi |
|---|---|---|
| In(0) | Purchase(0) | `GoodsReceipt.ConfirmAsync` |
| Out(1) | Sale(1) | `DeliveryOrder.StartDeliveryAsync` |
| In(0) | Sale(1) | `DeliveryOrder.FailDeliveryAsync` — đảo ngược OUT |
| Return(3) | Return(2) | `SalesReturn.ConfirmAsync` |
| Out(1) | Purchase(?) | `PurchaseReturn.ConfirmAsync` |
| Transfer(4) | Transfer(3) | `StockTransfer.ConfirmAsync` (2 records: OUT + IN) |
| Adjust(2) | Adjustment(4) | `InventoryService.AdjustAsync` |
| OpeningBalance(5) | — | `InventoryService.SetOpeningBalanceAsync` |

---

## 5. Nhóm: Mua hàng

### 5.1 Bảng `PurchaseOrders`

Đơn đặt mua hàng từ nhà cung cấp.

| Cột | Kiểu | Nullable | Ràng buộc | Mô tả |
|---|---|---|---|---|
| `Code` | `varchar(50)` | NO | UNIQUE(TenantId, Code) | Mã đơn mua |
| `SupplierId` | `uuid` | NO | FK → Suppliers RESTRICT | Nhà cung cấp |
| `OrderDate` | `timestamptz` | NO | DEFAULT now() | Ngày đặt hàng |
| `Status` | `integer` | NO | DEFAULT Draft(0) | Draft→Confirmed→Completed / Cancelled |
| `Note` | `varchar(1000)` | YES | | Ghi chú |
| `TotalAmount` | `numeric(18,2)` | NO | | Tổng tiền hàng (trước VAT) |
| `VatAmount` | `numeric(18,2)` | NO | | Tổng tiền thuế VAT |
| `GrandTotal` | `numeric(18,2)` | NO | | = TotalAmount + VatAmount |

**Vòng đời:** `Draft →[Confirm]→ Confirmed →[GR full]→ Completed` hoặc `→[Cancel]→ Cancelled`

**Partial receipt:** PO chuyển sang `Completed` chỉ khi **tất cả** `PurchaseOrderLines` đã được nhận đủ qua các `GoodsReceipts`.

---

### 5.2 Bảng `PurchaseOrderLines`

Dòng chi tiết đơn mua.

| Cột | Kiểu | Nullable | Mô tả |
|---|---|---|---|
| `PurchaseOrderId` | `uuid` | NO | FK → PurchaseOrders CASCADE |
| `ProductId` | `uuid` | NO | FK → Products RESTRICT |
| `UnitId` | `uuid` | NO | FK → Units RESTRICT — đơn vị nhập |
| `Quantity` | `numeric(18,6)` | NO | Số lượng theo đơn vị nhập |
| `UnitPrice` | `numeric(18,4)` | NO | Đơn giá nhập |
| `VatRate` | `numeric(5,2)` | NO | Thuế VAT (%) |
| `ConvertedQuantity` | `numeric(18,6)` | NO | Quy đổi về base unit (BFS tại thời điểm tạo) |
| `LineTotal` | `numeric(18,2)` | NO | = Quantity × UnitPrice |

---

### 5.3 Bảng `GoodsReceipts`

Phiếu nhập kho — 1 đơn mua có thể có **nhiều** phiếu nhập (partial receipt).

| Cột | Kiểu | Nullable | Ràng buộc | Mô tả |
|---|---|---|---|---|
| `Code` | `varchar(50)` | NO | UNIQUE(TenantId, Code) | Mã phiếu nhập |
| `PurchaseOrderId` | `uuid` | NO | FK → PurchaseOrders RESTRICT | Đơn mua gốc |
| `WarehouseId` | `uuid` | NO | FK → Warehouses RESTRICT | Kho nhận hàng |
| `ReceiptDate` | `timestamptz` | NO | DEFAULT now() | Ngày nhận hàng |
| `Status` | `integer` | NO | DEFAULT Draft(0) | Draft→Completed / Cancelled |
| `Note` | `varchar(1000)` | YES | | Ghi chú |

**Khi Confirm:**
1. `InventoryBalance += ConvertedQuantity` (IN)
2. `InventoryTransaction(Type=In, RefType=Purchase)` tạo mới
3. `DebtLedger(Supplier, DebitAmount=totalCost)` — AP tăng
4. `JournalEntry: DR 156 / CR 331`
5. Kiểm tra nếu tất cả PO lines đủ → PO.Status = Completed

---

### 5.4 Bảng `GoodsReceiptLines`

Dòng chi tiết phiếu nhập.

| Cột | Kiểu | Nullable | Mô tả |
|---|---|---|---|
| `GoodsReceiptId` | `uuid` | NO | FK → GoodsReceipts CASCADE |
| `ProductId` | `uuid` | NO | FK → Products RESTRICT |
| `UnitId` | `uuid` | NO | FK → Units RESTRICT |
| `Quantity` | `numeric(18,6)` | NO | Số lượng thực nhận (đơn vị nhập) |
| `ConvertedQuantity` | `numeric(18,6)` | NO | Quy đổi về base unit |
| `UnitCost` | `numeric(18,4)` | NO | Giá vốn nhập thực tế |
| `BatchNumber` | `varchar(100)` | YES | Số lô (khi IsBatchManaged=true) |
| `ExpiryDate` | `timestamptz` | YES | Hạn sử dụng (khi IsExpiryManaged=true) |

---

### 5.5 Bảng `PurchaseReturns`

Phiếu trả hàng về nhà cung cấp.

| Cột | Kiểu | Nullable | Ràng buộc | Mô tả |
|---|---|---|---|---|
| `Code` | `varchar(50)` | NO | UNIQUE(TenantId, Code) | Mã phiếu trả NCC |
| `GoodsReceiptId` | `uuid` | NO | FK → GoodsReceipts RESTRICT | Phiếu nhập gốc |
| `SupplierId` | `uuid` | NO | FK → Suppliers RESTRICT | Nhà cung cấp |
| `ReturnDate` | `timestamptz` | NO | DEFAULT now() | Ngày trả hàng |
| `Reason` | `varchar(500)` | YES | | Lý do trả |
| `Status` | `integer` | NO | DEFAULT Draft(0) | Draft→Completed |
| `TotalReturnAmount` | `numeric(18,2)` | NO | | Tổng giá trị hàng trả |
| `IsRefunded` | `boolean` | NO | DEFAULT false | Đã nhận tiền hoàn từ NCC |

**Khi Confirm:** Inventory OUT + DebtLedger(AP giảm) + JournalEntry(DR 331 / CR 156)

---

### 5.6 Bảng `PurchaseReturnLines`

| Cột | Kiểu | Nullable | Mô tả |
|---|---|---|---|
| `PurchaseReturnId` | `uuid` | NO | FK → PurchaseReturns CASCADE |
| `ProductId` | `uuid` | NO | FK → Products RESTRICT |
| `UnitId` | `uuid` | NO | FK → Units RESTRICT |
| `Quantity` | `numeric(18,6)` | NO | Số lượng trả |
| `ConvertedQuantity` | `numeric(18,6)` | NO | Quy đổi về base unit |
| `UnitCost` | `numeric(18,4)` | NO | Giá vốn khi trả |
| `ReturnAmount` | `numeric(18,2)` | NO | = ConvertedQuantity × UnitCost |

---

## 6. Nhóm: Bán hàng

### 6.1 Bảng `SalesOrders`

Đơn hàng bán.

| Cột | Kiểu | Nullable | Ràng buộc | Mô tả |
|---|---|---|---|---|
| `Code` | `varchar(50)` | NO | UNIQUE(TenantId, Code) | Mã đơn hàng |
| `CustomerId` | `uuid` | NO | FK → Customers RESTRICT | Khách hàng |
| `OrderDate` | `timestamptz` | NO | DEFAULT now() | Ngày đặt hàng |
| `Status` | `integer` | NO | DEFAULT Draft(0) | Draft→Confirmed→Completed / Cancelled |
| `Note` | `varchar(1000)` | YES | | Ghi chú |
| `TotalAmount` | `numeric(18,2)` | NO | | Tổng tiền hàng (trước chiết khấu, trước VAT) |
| `DiscountAmount` | `numeric(18,2)` | NO | | Chiết khấu tổng đơn |
| `VatAmount` | `numeric(18,2)` | NO | | Tổng thuế VAT |
| `GrandTotal` | `numeric(18,2)` | NO | | = TotalAmount − DiscountAmount + VatAmount |

**Khi Confirm (không xuất kho):**
- CheckStock + ReserveStock (QuantityReserved++)
- Tạo `Invoice(Confirmed)` + `DeliveryOrder(Pending)`
- `DebtLedger(Customer, DebitAmount=GrandTotal)` — AR tăng
- `JournalEntry: DR131 / CR511 / CR3331 / DR632 / CR156`

---

### 6.2 Bảng `SalesOrderLines`

| Cột | Kiểu | Nullable | Mô tả |
|---|---|---|---|
| `SalesOrderId` | `uuid` | NO | FK → SalesOrders CASCADE |
| `ProductId` | `uuid` | NO | FK → Products RESTRICT |
| `UnitId` | `uuid` | NO | FK → Units RESTRICT |
| `Quantity` | `numeric(18,6)` | NO | Số lượng theo đơn vị bán |
| `UnitPrice` | `numeric(18,4)` | NO | Đơn giá bán |
| `DiscountAmount` | `numeric(18,2)` | NO | Chiết khấu dòng |
| `VatRate` | `numeric(5,2)` | NO | Thuế VAT (%) |
| `ConvertedQuantity` | `numeric(18,6)` | NO | Số lượng quy đổi về base unit |
| `LineTotal` | `numeric(18,2)` | NO | = Quantity × UnitPrice × (1 + VatRate/100) − DiscountAmount |

---

### 6.3 Bảng `Invoices`

Hóa đơn bán hàng — tạo tự động khi SO được Confirm (1:1 với SalesOrder).

| Cột | Kiểu | Nullable | Ràng buộc | Mô tả |
|---|---|---|---|---|
| `Code` | `varchar(50)` | NO | UNIQUE(TenantId, Code) | Mã hóa đơn |
| `SalesOrderId` | `uuid` | NO | FK → SalesOrders RESTRICT (1:1) | Đơn hàng gốc |
| `CustomerId` | `uuid` | NO | FK → Customers RESTRICT | Khách hàng |
| `InvoiceType` | `integer` | NO | DEFAULT 0 | Retail=0, Vat=1, Electronic=2 |
| `InvoiceDate` | `timestamptz` | NO | DEFAULT now() | Ngày phát hành |
| `Status` | `integer` | NO | DEFAULT Confirmed(1) | Confirmed→Completed |
| `TotalAmount` | `numeric(18,2)` | NO | | Tổng tiền chưa VAT chưa chiết khấu |
| `DiscountAmount` | `numeric(18,2)` | NO | | Chiết khấu |
| `VatAmount` | `numeric(18,2)` | NO | | Thuế VAT |
| `GrandTotal` | `numeric(18,2)` | NO | | Tổng phải thu |
| `PaidAmount` | `numeric(18,2)` | NO | DEFAULT 0 | Tổng đã thanh toán |
| `PaymentMethod` | `varchar(50)` | YES | | Phương thức thanh toán mặc định |
| `Note` | `varchar(1000)` | YES | | Ghi chú |

> `RemainingAmount = GrandTotal - PaidAmount` được tính trong code, **không** lưu DB (EF `Ignore`).

**Quan hệ:** `1:N → InvoiceLines` | `1:N → Payments` | `1:N → SalesReturns`

---

### 6.4 Bảng `InvoiceLines`

Dòng chi tiết hóa đơn — copy từ SalesOrderLines khi tạo Invoice, sau đó độc lập.

| Cột | Kiểu | Nullable | Mô tả |
|---|---|---|---|
| `InvoiceId` | `uuid` | NO | FK → Invoices CASCADE |
| `ProductId` | `uuid` | NO | FK → Products RESTRICT |
| `UnitId` | `uuid` | NO | FK → Units RESTRICT |
| `Quantity` | `numeric(18,6)` | NO | Số lượng |
| `UnitPrice` | `numeric(18,4)` | NO | Đơn giá |
| `DiscountAmount` | `numeric(18,2)` | NO | Chiết khấu dòng |
| `VatRate` | `numeric(5,2)` | NO | Thuế VAT (%) |
| `LineTotal` | `numeric(18,2)` | NO | Thành tiền dòng |

---

### 6.5 Bảng `SalesReturns`

Phiếu trả hàng từ khách.

| Cột | Kiểu | Nullable | Ràng buộc | Mô tả |
|---|---|---|---|---|
| `Code` | `varchar(50)` | NO | UNIQUE(TenantId, Code) | Mã phiếu trả |
| `InvoiceId` | `uuid` | NO | FK → Invoices RESTRICT | Hóa đơn gốc |
| `CustomerId` | `uuid` | NO | FK → Customers RESTRICT | Khách hàng |
| `ReturnDate` | `timestamptz` | NO | DEFAULT now() | Ngày trả hàng |
| `Reason` | `varchar(500)` | YES | | Lý do trả |
| `Status` | `integer` | NO | DEFAULT Draft(0) | Draft→Completed |
| `TotalRefundAmount` | `numeric(18,2)` | NO | | Tổng tiền hoàn |
| `IsRefunded` | `boolean` | NO | DEFAULT false | `true` = hoàn tiền mặt ngay cho khách |

**Khi Confirm:**
1. `InventoryBalance += qty` — restock hàng trả
2. `InventoryTransaction(Return)`
3. `DebtLedger(Customer, CreditAmount=TotalRefundAmount)` — AR giảm
4. `JournalEntry 1: DR511 / CR131` — giảm doanh thu
5. `JournalEntry 2: DR156 / CR632` — hoàn COGS (nếu cogs > 0)
6. Nếu `IsRefunded=true`: tạo `Payment(Refund)` + `JournalEntry 3: DR131 / CR111`

---

### 6.6 Bảng `SalesReturnLines`

| Cột | Kiểu | Nullable | Mô tả |
|---|---|---|---|
| `SalesReturnId` | `uuid` | NO | FK → SalesReturns CASCADE |
| `ProductId` | `uuid` | NO | FK → Products RESTRICT |
| `UnitId` | `uuid` | NO | FK → Units RESTRICT |
| `Quantity` | `numeric(18,6)` | NO | Số lượng trả |
| `ConvertedQuantity` | `numeric(18,6)` | NO | Quy đổi về base unit |
| `UnitPrice` | `numeric(18,4)` | NO | Giá bán gốc |
| `RefundAmount` | `numeric(18,2)` | NO | Tiền hoàn dòng này |

---

## 7. Nhóm: Giao hàng & Chuyển kho

### 7.1 Bảng `DeliveryOrders`

Phiếu giao hàng — tạo tự động khi SO Confirm (1:N với SalesOrder, thường là 1:1).

| Cột | Kiểu | Nullable | Ràng buộc | Mô tả |
|---|---|---|---|---|
| `Code` | `varchar(50)` | NO | UNIQUE(TenantId, Code) | Mã phiếu giao |
| `SalesOrderId` | `uuid` | NO | FK → SalesOrders RESTRICT | Đơn hàng gốc |
| `WarehouseId` | `uuid` | NO | FK → Warehouses RESTRICT | Kho xuất hàng |
| `DeliveryDate` | `timestamptz` | YES | | Ngày bắt đầu giao (set khi Start) |
| `Status` | `integer` | NO | DEFAULT Pending(0) | Xem bảng DeliveryStatus |
| `ShipperName` | `varchar(255)` | YES | | Tên shipper |
| `ReceiverName` | `varchar(255)` | YES | | Tên người nhận |
| `ReceiverPhone` | `varchar(20)` | YES | | SĐT người nhận |
| `DeliveryAddress` | `varchar(500)` | YES | | Địa chỉ giao hàng |
| `ProofImageUrl` | `varchar(500)` | YES | | URL ảnh xác nhận giao thành công |
| `Note` | `varchar(500)` | YES | | Ghi chú hoặc lý do hủy/thất bại |
| `CodAmount` | `numeric(18,2)` | NO | DEFAULT 0 | Tiền COD cần thu |
| `IsCodCollected` | `boolean` | NO | DEFAULT false | Đã thu tiền COD |

**Vòng đời trạng thái `Status`:**

```
Pending(0) ──[Start]──► InTransit(1) ──[Complete]──► Delivered(2)
                                    └──[Fail]──────► Failed(3)
Pending(0) ──[Cancel]─────────────────────────────► Cancelled(4)
```

| Hành động | Tác động DB |
|---|---|
| `Start` | `InventoryBalance.OnHand -= qty` + `Reserved -= qty` + `InventoryTransaction(Out)` |
| `Complete` | `SalesOrder.Status = Completed` |
| `Fail` | `InventoryBalance.OnHand += qty` + `InventoryTransaction(In, refSale)` |
| `Cancel` | `InventoryBalance.Reserved -= qty` (chỉ release reservation, hàng chưa xuất kho) |

---

### 7.2 Bảng `StockTransfers`

Phiếu điều chuyển hàng giữa hai kho.

| Cột | Kiểu | Nullable | Ràng buộc | Mô tả |
|---|---|---|---|---|
| `Code` | `varchar(50)` | NO | UNIQUE(TenantId, Code) | Mã phiếu chuyển kho |
| `FromWarehouseId` | `uuid` | NO | FK → Warehouses RESTRICT | Kho nguồn (xuất) |
| `ToWarehouseId` | `uuid` | NO | FK → Warehouses RESTRICT | Kho đích (nhập) |
| `TransferDate` | `timestamptz` | NO | DEFAULT now() | Ngày điều chuyển |
| `Status` | `integer` | NO | DEFAULT Draft(0) | Draft→Completed |
| `Note` | `varchar(500)` | YES | | Ghi chú |

**Khi Confirm:** `FromWarehouse.Balance -= qty` + `ToWarehouse.Balance += qty` + 2 `InventoryTransactions` + `JournalEntry(DR156-To / CR156-From)`

---

### 7.3 Bảng `StockTransferLines`

| Cột | Kiểu | Nullable | Mô tả |
|---|---|---|---|
| `StockTransferId` | `uuid` | NO | FK → StockTransfers CASCADE |
| `ProductId` | `uuid` | NO | FK → Products RESTRICT |
| `UnitId` | `uuid` | NO | FK → Units RESTRICT |
| `Quantity` | `numeric(18,6)` | NO | Số lượng điều chuyển (đơn vị nhập) |
| `ConvertedQuantity` | `numeric(18,6)` | NO | Quy đổi về base unit |

---

## 8. Nhóm: Tài chính

### 8.1 Bảng `Payments`

Ghi nhận thu/chi tiền (AR thu, AP trả, Refund hoàn).

| Cột | Kiểu | Nullable | Ràng buộc | Mô tả |
|---|---|---|---|---|
| `PartnerType` | `integer` | NO | | Customer=0, Supplier=1 |
| `PartnerId` | `uuid` | NO | | ID khách hàng hoặc NCC |
| `PaymentType` | `integer` | NO | | Receive=0, Pay=1, Refund=2 |
| `PaymentDate` | `timestamptz` | NO | DEFAULT now() | Ngày giao dịch |
| `Amount` | `numeric(18,2)` | NO | | Số tiền |
| `ReferenceType` | `varchar(100)` | NO | | Loại chứng từ: "Invoice", "PurchaseOrder" |
| `ReferenceId` | `uuid` | NO | | ID chứng từ liên kết |
| `PaymentMethod` | `varchar(50)` | YES | Stored as string enum | "Cash" → TK111, "BankTransfer" → TK112 |
| `Note` | `varchar(500)` | YES | | Ghi chú |
| `InvoiceId` | `uuid` | YES | FK → Invoices SET NULL | Hóa đơn liên kết (nullable) |

**Index:** `(TenantId, PartnerType, PartnerId)`

**Tác động khi tạo Payment:**
- `Invoice.PaidAmount += amount` (nếu có InvoiceId)
- `DebtLedger` bút toán giảm AR (Customer) hoặc giảm AP (Supplier)
- `JournalEntry`: kế toán tiền vào/ra theo PaymentMethod

---

### 8.2 Bảng `DebtLedgers`

Sổ cái công nợ **append-only** — không bao giờ update hay delete. Ghi nhận mọi phát sinh AR/AP.

| Cột | Kiểu | Nullable | Ràng buộc | Mô tả |
|---|---|---|---|---|
| `PartnerType` | `integer` | NO | | Customer=0, Supplier=1 |
| `PartnerId` | `uuid` | NO | | ID đối tác |
| `ReferenceType` | `varchar(100)` | NO | | Loại chứng từ gốc tạo ra bút toán này |
| `ReferenceId` | `uuid` | NO | | ID chứng từ |
| `DebitAmount` | `numeric(18,2)` | NO | DEFAULT 0 | Phát sinh tăng công nợ |
| `CreditAmount` | `numeric(18,2)` | NO | DEFAULT 0 | Phát sinh giảm công nợ |
| `BalanceAfter` | `numeric(18,2)` | NO | | Số dư sau bút toán = previousBalance + Debit − Credit |
| `TransactionDate` | `timestamptz` | NO | | Thời điểm phát sinh |
| `Description` | `varchar(500)` | YES | | Mô tả |
| `CustomerId` | `uuid` | YES | FK → Customers RESTRICT | Optional link (khi Customer) |
| `SupplierId` | `uuid` | YES | FK → Suppliers RESTRICT | Optional link (khi Supplier) |

**Index:** `(TenantId, PartnerType, PartnerId, TransactionDate)`

**Quy ước Debit/Credit:**

| Phát sinh | PartnerType | DebitAmount | CreditAmount | Kết quả |
|---|---|---|---|---|
| SO Confirm → Invoice | Customer | GrandTotal | 0 | AR tăng |
| Payment thu AR | Customer | 0 | Amount | AR giảm |
| SalesReturn Confirm | Customer | 0 | TotalRefundAmount | AR giảm |
| GoodsReceipt Confirm | Supplier | TotalCost | 0 | AP tăng |
| Payment chi AP | Supplier | Amount | 0 | AP giảm |
| PurchaseReturn Confirm | Supplier | TotalAmount | 0 | AP giảm |

---

### 8.3 Bảng `Accounts`

Hệ thống tài khoản kế toán theo chuẩn VAS — **seeded sẵn**, cấu trúc cây.

| Cột | Kiểu | Nullable | Ràng buộc | Mô tả |
|---|---|---|---|---|
| `Code` | `varchar(20)` | NO | UNIQUE(TenantId, Code) | Mã tài khoản: 111, 131, 156, 331, 511, 632... |
| `Name` | `varchar(255)` | NO | | Tên tài khoản |
| `AccountType` | `integer` | NO | | Asset=0, Liability=1, Equity=2, Revenue=3, Expense=4 |
| `ParentAccountId` | `uuid` | YES | FK → Accounts(Id) RESTRICT | Tài khoản cha (null = gốc) |

**Tài khoản chính được seeded:**

| Mã | Tên | `AccountType` |
|---|---|---|
| 111 | Tiền mặt | Asset(0) |
| 112 | Tiền gửi ngân hàng | Asset(0) |
| 131 | Phải thu khách hàng | Asset(0) |
| 156 | Hàng hóa | Asset(0) |
| 331 | Phải trả nhà cung cấp | Liability(1) |
| 511 | Doanh thu bán hàng | Revenue(3) |
| 632 | Giá vốn hàng bán | Expense(4) |
| 3331 | Thuế GTGT đầu ra | Liability(1) |
| 3333 | Thuế TNDN | Liability(1) |

---

### 8.4 Bảng `JournalEntries`

Đầu phiếu bút toán kế toán. Mỗi sự kiện nghiệp vụ tạo 1 JournalEntry.

| Cột | Kiểu | Nullable | Ràng buộc | Mô tả |
|---|---|---|---|---|
| `Code` | `varchar(50)` | NO | UNIQUE(TenantId, Code) | Mã bút toán |
| `ReferenceType` | `varchar(100)` | YES | | Loại chứng từ gốc: SalesOrder, GoodsReceipt, Payment... |
| `ReferenceId` | `uuid` | NO | | ID chứng từ |
| `EntryDate` | `timestamptz` | NO | DEFAULT now() | Ngày hạch toán |
| `Description` | `varchar(500)` | YES | | Diễn giải |

**Index:** `(TenantId, ReferenceType, ReferenceId)`

---

### 8.5 Bảng `JournalEntryLines`

Dòng bút toán kép — tối thiểu 2 dòng/bút toán, `ΣDebit = ΣCredit` (validated).

| Cột | Kiểu | Nullable | Ràng buộc | Mô tả |
|---|---|---|---|---|
| `JournalEntryId` | `uuid` | NO | FK → JournalEntries CASCADE | Bút toán cha |
| `AccountId` | `uuid` | NO | FK → Accounts RESTRICT | Tài khoản kế toán |
| `DebitAmount` | `numeric(18,2)` | NO | DEFAULT 0 | Số tiền Nợ |
| `CreditAmount` | `numeric(18,2)` | NO | DEFAULT 0 | Số tiền Có |
| `Description` | `varchar(500)` | YES | | Diễn giải dòng |

**Bảng bút toán tự động theo sự kiện:**

| Sự kiện | DR (Nợ) | CR (Có) |
|---|---|---|
| SO Confirm — phải thu | 131 | — |
| SO Confirm — doanh thu | — | 511 |
| SO Confirm — VAT | — | 3331 |
| SO Confirm — giá vốn | 632 | — |
| SO Confirm — xuất kho (giá trị) | — | 156 |
| GoodsReceipt Confirm | 156 | 331 |
| Payment thu AR (Cash) | 111 | 131 |
| Payment thu AR (Bank) | 112 | 131 |
| Payment chi AP (Cash) | 331 | 111 |
| Payment chi AP (Bank) | 331 | 112 |
| SalesReturn — doanh thu hoàn | 511 | 131 |
| SalesReturn — COGS hoàn | 156 | 632 |
| SalesReturn — hoàn tiền mặt | 131 | 111 |
| PurchaseReturn | 331 | 156 |
| StockTransfer | 156 (kho đích) | 156 (kho nguồn) |

---

## 9. Nhóm: Phân quyền & Bảo mật

### 9.1 Bảng `Roles`

Vai trò trong hệ thống RBAC — **scoped theo tenant**. Mỗi tenant có bộ vai trò riêng (cả mặc định lẫn tùy chỉnh).

| Cột | Kiểu | Nullable | Ràng buộc | Mô tả |
|---|---|---|---|---|
| `Name` | `varchar(100)` | NO | UNIQUE(TenantId, Name) | Tên vai trò, ví dụ: Admin, Kế toán, Thu ngân |
| `Description` | `varchar(500)` | YES | | Mô tả ngắn về vai trò |
| `IsSystemRole` | `boolean` | NO | DEFAULT false | Nếu true: vai trò hệ thống — không thể xóa qua API |

**Seeded sẵn 4 vai trò hệ thống:** Admin, Manager, Staff, Viewer (IsSystemRole=true).

**Quan hệ:** `1:N → RolePermissions` | `1:N → UserRoles`

---

### 9.2 Bảng `Permissions`

Quyền hạn trong hệ thống RBAC — **dùng chung toàn hệ thống** (không phân theo tenant). Được seed sẵn, không thể tạo/xóa qua API.

> Kế thừa `BaseEntity` (không có TenantId) — EF global filter không áp dụng bảng này.

| Cột | Kiểu | Nullable | Ràng buộc | Mô tả |
|---|---|---|---|---|
| `Code` | `varchar(100)` | NO | UNIQUE | Mã quyền duy nhất theo format `{module}.{action}`, ví dụ: `sales.create` |
| `Name` | `varchar(200)` | NO | | Tên hiển thị, ví dụ: "Tạo đơn bán hàng" |
| `Group` | `varchar(100)` | YES | | Nhóm module, ví dụ: "Bán hàng" |
| `Description` | `varchar(500)` | YES | | Mô tả chi tiết quyền |

**36 quyền được seeded theo 11 module:**

| Module | Quyền |
|---|---|
| Sản phẩm | `products.view`, `products.create`, `products.edit`, `products.delete` |
| Danh mục & ĐVT | `catalog.categories.manage`, `catalog.units.manage` |
| Kho hàng | `warehouses.view`, `warehouses.manage` |
| Khách hàng | `customers.view`, `customers.manage` |
| Nhà cung cấp | `suppliers.view`, `suppliers.manage` |
| Bán hàng | `sales.view`, `sales.create`, `sales.confirm`, `sales.return`, `sales.delete` |
| Mua hàng | `purchasing.view`, `purchasing.create`, `purchasing.confirm`, `purchasing.return`, `purchasing.delete` |
| Tồn kho | `inventory.view`, `inventory.transfer`, `inventory.adjust` |
| Tài chính | `finance.view`, `finance.payment.manage`, `finance.account.manage`, `finance.journal.manage`, `finance.expense.manage` |
| Báo cáo | `reports.view`, `reports.export` |
| Chi nhánh | `branches.view`, `branches.manage` |
| Người dùng | `users.view`, `users.manage` |

**Quan hệ:** `1:N → RolePermissions`

---

### 9.3 Bảng `RolePermissions`

Bảng nối **Role ↔ Permission** (many-to-many) — xác định tập quyền hạn của một vai trò.

| Cột | Kiểu | Nullable | Ràng buộc | Mô tả |
|---|---|---|---|---|
| `RoleId` | `uuid` | NO | PK, FK → Roles CASCADE | Vai trò |
| `PermissionId` | `uuid` | NO | PK, FK → Permissions CASCADE | Quyền hạn |

**Khóa chính:** Composite `(RoleId, PermissionId)`

---

### 9.4 Bảng `UserRoles`

Bảng nối **User ↔ Role** (many-to-many) — một user có thể đảm nhiệm nhiều vai trò trong cùng tenant.

> Tên entity C#: `UserRoleAssignment`; tên bảng DB: `UserRoles`.

| Cột | Kiểu | Nullable | Ràng buộc | Mô tả |
|---|---|---|---|---|
| `UserId` | `uuid` | NO | PK, FK → Users CASCADE | Người dùng |
| `RoleId` | `uuid` | NO | PK, FK → Roles CASCADE | Vai trò được gán |

**Khóa chính:** Composite `(UserId, RoleId)`

---

### 9.5 Bảng `LoginHistories`

Ghi lại mọi lần đăng nhập (thành công và thất bại) — **append-only**, phục vụ kiểm toán bảo mật.

| Cột | Kiểu | Nullable | Ràng buộc | Mô tả |
|---|---|---|---|---|
| `UserId` | `uuid` | NO | FK → Users CASCADE | Người dùng thực hiện đăng nhập |
| `IpAddress` | `varchar(50)` | YES | | Địa chỉ IP của client |
| `UserAgent` | `varchar(500)` | YES | | Chuỗi User-Agent của trình duyệt / ứng dụng |
| `IsSuccess` | `boolean` | NO | | `true` = đăng nhập thành công; `false` = thất bại |
| `FailureReason` | `varchar(200)` | YES | | Lý do thất bại (ví dụ: "Invalid password") |
| `LoginAt` | `timestamptz` | NO | DEFAULT now() | Thời điểm thực hiện đăng nhập (UTC) |

**Index:** `(TenantId, UserId, LoginAt DESC)`

---

## 10. Enum Reference

### `DocumentStatus` (integer)
| Giá trị | Tên | Dùng cho |
|---|---|---|
| 0 | Draft | Chứng từ mới tạo, chưa xác nhận |
| 1 | Confirmed | Đã xác nhận, có hiệu lực |
| 2 | Completed | Hoàn thành toàn bộ |
| 3 | Cancelled | Đã hủy |
| 10 | Active | Master data đang hoạt động |
| 11 | Inactive | Master data ngừng hoạt động |

### `DeliveryStatus` (integer)
| Giá trị | Tên | Hàng tồn kho |
|---|---|---|
| 0 | Pending | Reserved (chưa rời kho) |
| 1 | InTransit | Đã xuất kho (OnHand giảm) |
| 2 | Delivered | Giao thành công |
| 3 | Failed | Đã hoàn kho (OnHand tăng lại) |
| 4 | Cancelled | Reserved released (hàng chưa xuất) |

### `InventoryTransactionType` (integer)
| Giá trị | Tên |
|---|---|
| 0 | In |
| 1 | Out |
| 2 | Adjust |
| 3 | Return |
| 4 | Transfer |
| 5 | OpeningBalance |

### `InventoryReferenceType` (integer)
| Giá trị | Tên |
|---|---|
| 0 | Purchase |
| 1 | Sale |
| 2 | Return |
| 3 | Transfer |
| 4 | Adjustment |
| 5 | Promotion |
| 6 | Disposal |

### `PaymentMethod` (stored as `varchar` string)
| Enum value | DB value | Tài khoản kế toán |
|---|---|---|
| Cash = 0 | `"Cash"` | TK 111 Tiền mặt |
| BankTransfer = 1 | `"BankTransfer"` | TK 112 Tiền gửi ngân hàng |

> Lưu dưới dạng **string** (không phải int) qua EF `HasConversion<string>()` để dễ đọc khi query DB trực tiếp.

### `PaymentType` (integer)
| Giá trị | Tên | Mô tả |
|---|---|---|
| 0 | Receive | Thu tiền từ khách (AR) |
| 1 | Pay | Trả tiền cho NCC (AP) |
| 2 | Refund | Hoàn tiền cho khách (SalesReturn.IsRefunded) |

### `PartnerType` (integer)
| Giá trị | Tên |
|---|---|
| 0 | Customer |
| 1 | Supplier |

### `UserRole` (integer)
| Giá trị | Tên | Quyền |
|---|---|---|
| 1 | Admin | Toàn quyền + cấu hình tenant |
| 2 | Manager | POS + bán hàng + kho cơ bản |
| 3 | Staff | POS + bán hàng |
| 4 | Viewer | Chỉ đọc báo cáo |

### `AccountType` (integer)
| Giá trị | Tên |
|---|---|
| 0 | Asset |
| 1 | Liability |
| 2 | Equity |
| 3 | Revenue |
| 4 | Expense |

### `InvoiceType` (integer)
| Giá trị | Tên |
|---|---|
| 0 | Retail |
| 1 | Vat |
| 2 | Electronic |

### `CostingMethod` (integer — chưa áp dụng đầy đủ)
| Giá trị | Tên |
|---|---|
| 0 | Fifo |
| 1 | Average |

---

## 11. Index & Constraint tổng hợp

| Bảng | Cột(s) | Loại |
|---|---|---|
| `Users` | (TenantId, Username) | UNIQUE |
| `Users` | (TenantId, Email) | UNIQUE |
| `Units` | (TenantId, Name) | UNIQUE |
| `Products` | (TenantId, Code) | UNIQUE |
| `ProductUnitConversions` | (ProductId, FromUnitId, ToUnitId) | UNIQUE |
| `Warehouses` | (TenantId, Code) | UNIQUE |
| `Customers` | (TenantId, Code) | UNIQUE |
| `Suppliers` | (TenantId, Code) | UNIQUE |
| `InventoryBalances` | (TenantId, ProductId, WarehouseId) | UNIQUE |
| `InventoryTransactions` | (TenantId, ProductId, TransactionDate) | Non-unique |
| `InventoryTransactions` | (TenantId, ReferenceType, ReferenceId) | Non-unique |
| `SalesOrders` | (TenantId, Code) | UNIQUE |
| `Invoices` | (TenantId, Code) | UNIQUE |
| `DeliveryOrders` | (TenantId, Code) | UNIQUE |
| `PurchaseOrders` | (TenantId, Code) | UNIQUE |
| `GoodsReceipts` | (TenantId, Code) | UNIQUE |
| `PurchaseReturns` | (TenantId, Code) | UNIQUE |
| `SalesReturns` | (TenantId, Code) | UNIQUE |
| `StockTransfers` | (TenantId, Code) | UNIQUE |
| `Payments` | (TenantId, PartnerType, PartnerId) | Non-unique |
| `DebtLedgers` | (TenantId, PartnerType, PartnerId, TransactionDate) | Non-unique |
| `Accounts` | (TenantId, Code) | UNIQUE |
| `JournalEntries` | (TenantId, Code) | UNIQUE |
| `JournalEntries` | (TenantId, ReferenceType, ReferenceId) | Non-unique |
| `Branches` | (TenantId, Code) | UNIQUE |
| `UserBranches` | (UserId, BranchId) | PK (Composite) |
| `Roles` | (TenantId, Name) | UNIQUE |
| `Permissions` | Code | UNIQUE (global) |
| `RolePermissions` | (RoleId, PermissionId) | PK (Composite) |
| `UserRoles` | (UserId, RoleId) | PK (Composite) |
| `LoginHistories` | (TenantId, UserId, LoginAt) | Non-unique |

**OnDelete behaviors:**
- `CASCADE`: Lines → Header (xóa header tự xóa lines)
- `RESTRICT`: mọi FK tham chiếu master data (không xóa được khi còn dùng)
- `SET NULL`: `Payments.InvoiceId` (hóa đơn xóa không xóa payment)

---

## 12. Sơ đồ quan hệ chi tiết

```
Users
  ──1:N──► UserBranches.UserId (CASCADE) — chi nhánh được phép truy cập
  ──1:N──► UserRoles.UserId  (CASCADE) — vai trò được gán
  ──1:N──► LoginHistories.UserId (CASCADE) — lịch sử đăng nhập

Branches ──self──► Branches.ParentBranchId (RESTRICT) — cây phân cấp
         ──1:N──► Warehouses.BranchId (SET NULL)
         ──1:N──► UserBranches.BranchId (CASCADE)

UserBranches   PK (UserId, BranchId) — bảng nối User ↔ Branch
UserRoles      PK (UserId, RoleId)   — bảng nối User ↔ Role
RolePermissions PK (RoleId, PermissionId) — bảng nối Role ↔ Permission

Roles (scoped per tenant)
  ──1:N──► RolePermissions.RoleId (CASCADE)
  ──1:N──► UserRoles.RoleId (CASCADE)

Permissions (global — không có TenantId)
  ──1:N──► RolePermissions.PermissionId (CASCADE)

LoginHistories (append-only audit log)
  └── UserId → Users (CASCADE)

Categories ──self──► Categories.ParentCategoryId (RESTRICT)
           ──1:N──► Products.CategoryId

Units (3 FK từ Products)
  └── Products.BaseUnitId      (RESTRICT)
  └── Products.PurchaseUnitId  (RESTRICT)
  └── Products.SalesUnitId     (RESTRICT)
  └── ProductUnitConversions.FromUnitId / ToUnitId (RESTRICT)
  └── *Lines.UnitId (RESTRICT) — tất cả 8 bảng Lines

Products
  ──1:N──► ProductUnitConversions (CASCADE on delete product)
  ──1:N──► InventoryBalances (RESTRICT)
  ──1:N──► InventoryTransactions (RESTRICT)
  ──1:N──► *Lines.ProductId (RESTRICT) — tất cả 8 bảng Lines

Warehouses
  ──1:N──► InventoryBalances (RESTRICT)
  ──1:N──► InventoryTransactions (RESTRICT)
  ──1:N──► GoodsReceipts (RESTRICT)
  ──1:N──► DeliveryOrders (RESTRICT)
  ──1:N──► StockTransfers.FromWarehouseId (RESTRICT)
  ──1:N──► StockTransfers.ToWarehouseId (RESTRICT)

Customers
  ──1:N──► SalesOrders (RESTRICT)
  ──1:N──► DebtLedgers.CustomerId (RESTRICT, nullable)
  ──1:N──► SalesReturns (RESTRICT)

Suppliers
  ──1:N──► PurchaseOrders (RESTRICT)
  ──1:N──► DebtLedgers.SupplierId (RESTRICT, nullable)
  ──1:N──► PurchaseReturns (RESTRICT)

PurchaseOrders
  ──1:N──► PurchaseOrderLines (CASCADE)
  ──1:N──► GoodsReceipts (RESTRICT)

GoodsReceipts
  ──1:N──► GoodsReceiptLines (CASCADE)
  ──1:N──► PurchaseReturns (RESTRICT)

PurchaseReturns
  ──1:N──► PurchaseReturnLines (CASCADE)

SalesOrders
  ──1:N──► SalesOrderLines (CASCADE)
  ──1:1──► Invoices.SalesOrderId (RESTRICT)
  ──1:N──► DeliveryOrders (RESTRICT)

Invoices
  ──1:N──► InvoiceLines (CASCADE)
  ──1:N──► Payments.InvoiceId (SET NULL)
  ──1:N──► SalesReturns (RESTRICT)

SalesReturns
  ──1:N──► SalesReturnLines (CASCADE)

StockTransfers
  ──1:N──► StockTransferLines (CASCADE)

Accounts ──self──► Accounts.ParentAccountId (RESTRICT)
         ──1:N──► JournalEntryLines.AccountId (RESTRICT)

JournalEntries
  ──1:N──► JournalEntryLines (CASCADE)
```

---

*Tài liệu được tổng hợp từ source code (`src/POS.Core/Entities/` + `src/POS.Data/Configurations/`).  
Phản ánh chính xác schema DB theo EF migrations hiện tại.*
