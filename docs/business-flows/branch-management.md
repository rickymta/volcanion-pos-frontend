# Quản lý Chi nhánh (Branch Management)

> **Liên quan:** [_system-overview.md](_system-overview.md) · [auth-and-rbac.md](auth-and-rbac.md) · [inventory-flow.md](inventory-flow.md)  
> **Database:** [../database/master-data/Branches.md](../database/master-data/Branches.md) · [../database/master-data/Users.md](../database/master-data/Users.md)  
> **Ngày cập nhật:** 2026-03-18

---

## 1. Tổng quan

Hệ thống POS hỗ trợ **đa chi nhánh theo dạng phân cấp (hierarchical)**. Mỗi tenant có thể có nhiều chi nhánh, các chi nhánh có thể có quan hệ cha-con (cây phân cấp). Phân quyền nhân viên theo chi nhánh đảm bảo mỗi nhân viên **chỉ được phép thao tác trên chi nhánh mình trực thuộc hoặc chi nhánh con** của chi nhánh đó.

### Nguyên tắc cốt lõi

| Nguyên tắc | Mô tả |
|---|---|
| **Phân cấp cha-con** | Chi nhánh gốc (`ParentBranchId = NULL`) → chi nhánh con → chi nhánh cháu… không giới hạn cấp |
| **Gán nhân viên theo chi nhánh** | Mỗi nhân viên có danh sách chi nhánh được phép truy cập (`UserBranch`) hoặc cờ `IsAllBranches` |
| **Phạm vi thao tác = chi nhánh gốc + con** | Nhân viên chỉ nhìn thấy & thao tác dữ liệu thuộc chi nhánh mình được gán hoặc các chi nhánh con kế thừa |
| **Token mang branch claims** | JWT chứa danh sách `branch_id` → mọi request đều biết user được phép truy cập chi nhánh nào |
| **Tenant isolation** | Toàn bộ chi nhánh nằm trong phạm vi tenant, không truy cập chéo tenant |

---

## 2. Cấu trúc phân cấp chi nhánh

### 2.1 Entity `Branch`

```csharp
public class Branch : TenantEntity
{
    public string Code { get; set; }        // Mã chi nhánh (UNIQUE trong tenant)
    public string Name { get; set; }        // Tên chi nhánh
    public string? Address { get; set; }
    public string? Phone { get; set; }

    public Guid? ParentBranchId { get; set; }  // NULL = chi nhánh gốc
    public Branch? ParentBranch { get; set; }

    public ICollection<Branch> SubBranches { get; set; }
    public ICollection<Warehouse> Warehouses { get; set; }

    public EntityStatus Status { get; set; }   // Active / Inactive
}
```

### 2.2 Ví dụ cây phân cấp

```
Hội sở (HQ)                     ← ParentBranchId = NULL
├── Chi nhánh Quận 1             ← ParentBranchId = HQ
│   ├── Cửa hàng Nguyễn Huệ     ← ParentBranchId = CN Q1
│   └── Cửa hàng Lê Lợi         ← ParentBranchId = CN Q1
├── Chi nhánh Quận 7             ← ParentBranchId = HQ
│   └── Cửa hàng Phú Mỹ Hưng    ← ParentBranchId = CN Q7
└── Chi nhánh Đà Nẵng            ← ParentBranchId = HQ
    ├── Cửa hàng Hải Châu        ← ParentBranchId = CN ĐN
    └── Cửa hàng Sơn Trà         ← ParentBranchId = CN ĐN
```

### 2.3 Ràng buộc

| Ràng buộc | Hành vi |
|---|---|
| Unique `(TenantId, Code)` | Mã chi nhánh không trùng trong cùng tenant |
| `ParentBranchId` FK → RESTRICT ON DELETE | Không thể xóa chi nhánh cha khi còn chi nhánh con |
| Có `Warehouse` liên kết → chặn xóa | Phải gỡ kho khỏi chi nhánh trước khi xóa |
| Xóa mềm (soft-delete) | `IsDeleted = true`, không xóa vật lý |

---

## 3. Quản lý nhân viên theo chi nhánh

### 3.1 Mô hình gán chi nhánh cho nhân viên

Mỗi nhân viên (`User`) liên kết với chi nhánh qua bảng trung gian `UserBranch` (many-to-many):

```
┌──────────┐       ┌──────────────┐       ┌──────────┐
│   User   │ 1───* │  UserBranch  │ *───1 │  Branch  │
│          │       │              │       │          │
│ IsAll    │       │ UserId       │       │ Id       │
│ Branches │       │ BranchId     │       │ Code     │
└──────────┘       │ CreatedAt    │       │ Name     │
                   │ CreatedBy    │       │ ParentId │
                   └──────────────┘       └──────────┘
```

### 3.2 Hai chế độ truy cập

| Chế độ | Điều kiện | Ý nghĩa |
|---|---|---|
| **Tất cả chi nhánh** | `User.IsAllBranches = true` | Nhân viên có quyền truy cập toàn bộ chi nhánh trong tenant. Thường dành cho Admin hoặc quản lý cấp cao. Bảng `UserBranch` bị bỏ qua. |
| **Chi nhánh cụ thể** | `User.IsAllBranches = false` | Nhân viên chỉ truy cập các chi nhánh được liệt kê trong `UserBranch`. |

### 3.3 Luồng gán chi nhánh

```
Admin                            API
  │                               │
  ├─► POST /admin/users/{id}/    ─┤
  │   branches                    │  1. Validate user tồn tại trong tenant
  │   Body:                       │  2. Validate tất cả branchIds thuộc tenant
  │   { branchIds: [...],         │  3. Xóa toàn bộ UserBranch cũ
  │     isAllBranches: false }    │  4. Insert UserBranch mới (REPLACE strategy)
  │                               │  5. Set User.IsAllBranches
  │                               │  6. Revoke RefreshToken → buộc đăng nhập lại
  │ ◄──────────────────────────── │     để nhận token mới với branch claims
  │   200 OK { userDto }          │
```

> **Quan trọng:** Khi thay đổi chi nhánh của nhân viên, RefreshToken bị revoke. Lần đăng nhập tiếp theo, JWT mới sẽ chứa danh sách `branch_id` cập nhật.

### 3.4 Branch claims trong JWT

Khi đăng nhập, hệ thống nhúng thông tin chi nhánh vào AccessToken:

```
JWT Claims:
  sub         = "user-id"
  tenant_id   = "tenant-id"
  all_branches = "false"
  branch_id   = "branch-1-id"     ← (một claim per chi nhánh)
  branch_id   = "branch-2-id"
  role        = "Manager"
```

Nếu `all_branches = "true"` thì không có claim `branch_id` nào — user được truy cập toàn bộ.

---

## 4. Phân quyền nhân viên & chi nhánh — Rà soát hiện trạng

### 4.1 Hệ thống phân quyền RBAC

Hệ thống sử dụng **2 tầng phân quyền** song song:

```
┌──────────────────────────────────────────────────────────┐
│ Tầng 1: RBAC — Phân quyền theo chức năng                 │
│                                                          │
│   User ─── UserRoleAssignment ─── Role                   │
│                                    │                     │
│                              RolePermission              │
│                                    │                     │
│                               Permission                 │
│                        (e.g. "sales.create")             │
│                                                          │
│   → Kiểm soát: user có QUYỀN thao tác gì?                │
└──────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────┐
│ Tầng 2: Branch Scope — Phân quyền theo phạm vi           │
│                                                          │
│   User ─── UserBranch ─── Branch                         │
│         (hoặc IsAllBranches = true)                      │
│                                                          │
│   → Kiểm soát: user có QUYỀN truy cập chi nhánh nào?     │
└──────────────────────────────────────────────────────────┘
```

**Nguyên tắc kết hợp:** Nhân viên phải thỏa **CẢ HAI** tầng để thao tác:

```
Cho phép thao tác = CÓ permission chức năng  AND  CÓ quyền truy cập chi nhánh
```

### 4.2 Ma trận quyền theo vai trò (Role) — Hiện trạng

| Permission Code | Mô tả | Admin | Manager | Staff | Viewer |
|---|---|---|---|---|---|
| `branches.view` | Xem danh sách chi nhánh | ✅ | ✅ | ✅ | ✅ |
| `branches.manage` | Thêm/sửa/xóa chi nhánh | ✅ | ❌ | ❌ | ❌ |
| `users.view` | Xem danh sách nhân viên | ✅ | ✅ | ❌ | ❌ |
| `users.manage` | Tạo/sửa/xóa nhân viên, gán chi nhánh | ✅ | ❌ | ❌ | ❌ |
| `sales.view` | Xem đơn bán hàng | ✅ | ✅ | ✅ | ✅ |
| `sales.create` | Tạo đơn bán hàng | ✅ | ✅ | ✅ | ❌ |
| `sales.confirm` | Xác nhận đơn bán | ✅ | ✅ | ❌ | ❌ |
| `purchasing.view` | Xem đơn nhập hàng | ✅ | ✅ | ✅ | ✅ |
| `purchasing.create` | Tạo đơn nhập hàng | ✅ | ✅ | ✅ | ❌ |
| `purchasing.confirm` | Xác nhận đơn nhập | ✅ | ✅ | ❌ | ❌ |
| `inventory.view` | Xem tồn kho | ✅ | ✅ | ✅ | ✅ |
| `inventory.transfer` | Chuyển kho | ✅ | ✅ | ✅ | ❌ |
| `inventory.adjust` | Điều chỉnh tồn kho | ✅ | ❌ | ❌ | ❌ |

### 4.3 Cơ chế kiểm tra quyền truy cập chi nhánh — `ICurrentUserContext`

```csharp
public interface ICurrentUserContext
{
    Guid UserId { get; }
    Guid TenantId { get; }
    UserRole Role { get; }
    IReadOnlyList<Guid> BranchIds { get; }  // Chi nhánh được phép
    bool IsAllBranches { get; }              // Truy cập toàn bộ?
    bool HasBranchAccess(Guid branchId);     // Kiểm tra 1 chi nhánh cụ thể
}
```

Triển khai (`CurrentUserContext`):

```csharp
public bool IsAllBranches
    => Principal?.FindFirstValue("all_branches") == "true" || Role == UserRole.Admin;

public bool HasBranchAccess(Guid branchId)
    => IsAllBranches || BranchIds.Contains(branchId);
```

> **Lưu ý:** Với vai trò `Admin`, `IsAllBranches` luôn trả về `true` bất kể cấu hình `UserBranch`.

### 4.4 Rà soát — Các vấn đề cần cải thiện

#### ⚠️ Vấn đề 1: Branch filtering chưa tự động tại tầng Service

Hiện tại `ICurrentUserContext` cung cấp khả năng kiểm tra chi nhánh, nhưng **các service chưa tự động lọc dữ liệu theo chi nhánh** của user. Điều này dẫn đến:

| Service | Branch Filter | Hiện trạng |
|---|---|---|
| `PurchaseOrderService.GetListAsync()` | ❌ Không lọc theo chi nhánh user | User có thể thấy PO của chi nhánh khác |
| `SalesOrderService.GetListAsync()` | ❌ Không lọc theo chi nhánh user | User có thể thấy SO của chi nhánh khác |
| `GoodsReceiptService.GetListAsync()` | ❌ Không lọc theo chi nhánh user | User có thể thấy GR của chi nhánh khác |
| `StockTransferService.GetListAsync()` | ❌ Không lọc theo chi nhánh user | User có thể thấy ST của chi nhánh khác |
| `InventoryService.GetBalancesAsync()` | ❌ Không lọc theo chi nhánh user | User có thể thấy tồn kho kho khác chi nhánh |
| `WarehouseService.GetListAsync()` | ⚠️ Lọc theo `filter.BranchId` nếu client gửi | Phụ thuộc client, không bắt buộc |

#### ⚠️ Vấn đề 2: Chưa có cơ chế kế thừa chi nhánh con

`HasBranchAccess()` hiện chỉ kiểm tra **exact match** với danh sách `BranchIds` trong JWT. Nếu nhân viên được gán vào chi nhánh cha (ví dụ: "Chi nhánh Quận 1"), nhân viên **không tự động** có quyền truy cập chi nhánh con ("Cửa hàng Nguyễn Huệ").

**Hành vi mong muốn:**
```
Nhân viên gán vào "Chi nhánh Quận 1"
  → Được truy cập: Chi nhánh Quận 1, Cửa hàng Nguyễn Huệ, Cửa hàng Lê Lợi
```

**Hành vi thực tế:**
```
Nhân viên gán vào "Chi nhánh Quận 1"
  → Chỉ truy cập: Chi nhánh Quận 1
  → KHÔNG truy cập: Cửa hàng Nguyễn Huệ, Cửa hàng Lê Lợi (trừ khi gán thêm)
```

#### ⚠️ Vấn đề 3: Create không validate BranchId thuộc phạm vi user

Khi tạo PO, SO, StockTransfer… với `BranchId`, hệ thống **chưa validate** xem BranchId đó có nằm trong phạm vi cho phép của user không.

### 4.5 Đề xuất khắc phục

#### Giải pháp 1: Thêm auto-filter tại service layer

Inject `ICurrentUserContext` vào các service, tự động lọc dữ liệu:

```csharp
// Trong service query
if (!currentUser.IsAllBranches)
{
    var accessibleBranchIds = await GetAccessibleBranchIds(currentUser.BranchIds);
    query = query.Where(x => x.BranchId == null || accessibleBranchIds.Contains(x.BranchId.Value));
}
```

#### Giải pháp 2: Thêm helper lấy chi nhánh con (descendant)

```csharp
// BranchService hoặc extension method
public async Task<IReadOnlyList<Guid>> GetDescendantBranchIdsAsync(
    IEnumerable<Guid> parentBranchIds, CancellationToken ct)
{
    var allBranches = await db.Branches.AsNoTracking().ToListAsync(ct);
    var result = new HashSet<Guid>(parentBranchIds);

    void CollectDescendants(Guid parentId)
    {
        foreach (var child in allBranches.Where(b => b.ParentBranchId == parentId))
        {
            if (result.Add(child.Id))
                CollectDescendants(child.Id);
        }
    }

    foreach (var id in parentBranchIds)
        CollectDescendants(id);

    return result.ToList();
}
```

#### Giải pháp 3: Validate BranchId khi tạo chứng từ

```csharp
// Trong CreateAsync của các service
if (request.BranchId.HasValue && !currentUser.HasBranchAccess(request.BranchId.Value))
    throw new ForbiddenException("Bạn không có quyền thao tác trên chi nhánh này.");
```

---

## 5. Quản lý nghiệp vụ theo chi nhánh

### 5.1 Nguyên tắc chung

Tất cả chứng từ nghiệp vụ (đơn mua, phiếu nhập kho, đơn bán, phiếu chuyển kho…) đều gắn `BranchId` để xác định chi nhánh tạo chứng từ. Nhân viên **chỉ có thể thao tác** với:

1. Chi nhánh hiện tại (chi nhánh mà nhân viên đang trực thuộc)
2. Chi nhánh con trực tiếp và gián tiếp (descendant) của chi nhánh đó

```
                    ┌──────────────────────────────────────┐
                    │       Phạm vi thao tác nhân viên     │
                    │                                      │
  Nhân viên ──────► │  Chi nhánh A (được gán)              │
                    │    ├── Chi nhánh A1 (con) [v]        │
                    │    │    └── Chi nhánh A1a (cháu) [v] │
                    │    └── Chi nhánh A2 (con) [v]        │
                    │                                      │
                    │  Chi nhánh B (KHÔNG được gán) [x]    │
                    │    └── Chi nhánh B1 [x]              │
                    └──────────────────────────────────────┘
```

### 5.2 Nhập hàng (Purchase Orders) theo chi nhánh

#### Luồng nghiệp vụ

```
Nhân viên (CN Quận 1)
     │
     ▼
POST /purchase-orders
  Body: { supplierId, branchId: "CN Quận 1", lines: [...] }
     │
     │  Validate:
     │    ✅ branchId ∈ phạm vi chi nhánh nhân viên
     │    ✅ nhân viên có permission "purchasing.create"
     │
     ▼
  PurchaseOrder created (Draft, BranchId = CN Quận 1)
     │
     ▼
POST /purchase-orders/{id}/confirm   [Manager+]
     │
     │  Validate:
     │    ✅ PO.BranchId ∈ phạm vi chi nhánh manager
     │
     ▼
  PurchaseOrder confirmed
```

#### Quy tắc lọc dữ liệu

| Thao tác | Quy tắc |
|---|---|
| **Xem danh sách PO** | Chỉ hiển thị PO có `BranchId` thuộc phạm vi chi nhánh nhân viên (bao gồm chi nhánh con) |
| **Tạo PO** | `BranchId` phải thuộc phạm vi chi nhánh nhân viên |
| **Sửa PO (Draft)** | Chỉ sửa được PO thuộc chi nhánh trong phạm vi |
| **Xác nhận/Hủy PO** | Yêu cầu Manager+ và PO thuộc chi nhánh trong phạm vi |

### 5.3 Nhập kho (Goods Receipts) theo chi nhánh

```
PurchaseOrder (Confirmed, BranchId = CN Quận 1)
     │
     ▼
POST /goods-receipts
  Body: { purchaseOrderId, warehouseId: "Kho CN Q1", lines: [...] }
     │
     │  Validate:
     │    ✅ PO.BranchId ∈ phạm vi chi nhánh nhân viên
     │    ✅ Warehouse.BranchId ∈ phạm vi chi nhánh nhân viên
     │    ✅ nhân viên có permission "purchasing.create"
     │
     ▼
  GoodsReceipt created → Confirm → Nhập kho (OnHand++)
```

#### Quy tắc

| Thao tác | Quy tắc |
|---|---|
| **Tạo phiếu nhập kho** | PO phải thuộc chi nhánh trong phạm vi, kho đích phải thuộc chi nhánh trong phạm vi |
| **Xem phiếu nhập kho** | Chỉ hiển thị phiếu nếu kho hoặc PO thuộc chi nhánh trong phạm vi |
| **Xác nhận nhập kho** | Yêu cầu Manager+ và phiếu thuộc chi nhánh trong phạm vi |

### 5.4 Bán hàng (Sales Orders) theo chi nhánh

```
Nhân viên (Cửa hàng Nguyễn Huệ)
     │
     ▼
POST /sales-orders
  Body: { customerId, branchId: "CH Nguyễn Huệ", lines: [...] }
     │
     │  Validate:
     │    ✅ branchId ∈ phạm vi chi nhánh nhân viên
     │    ✅ nhân viên có permission "sales.create"
     │
     ▼
  SalesOrder created (Draft, BranchId = CH Nguyễn Huệ)
     │
     ▼
POST /sales-orders/{id}/confirm   [Manager+]
     │  Auto-tạo: Invoice + DeliveryOrder
     │
     ▼
  DeliveryOrder.Start → Xuất kho từ kho thuộc chi nhánh
```

#### Quy tắc lọc dữ liệu

| Thao tác | Quy tắc |
|---|---|
| **Xem danh sách SO** | Chỉ hiển thị SO có `BranchId` thuộc phạm vi nhân viên |
| **Tạo SO** | `BranchId` phải thuộc phạm vi nhân viên |
| **Xác nhận/Hủy SO** | Yêu cầu Manager+ và SO thuộc chi nhánh trong phạm vi |
| **DeliveryOrder** | Kế thừa BranchId từ SO, kho xuất phải thuộc chi nhánh |

### 5.5 Chuyển kho (Stock Transfers) theo chi nhánh

```
Nhân viên (CN Quận 1)
     │
     ▼
POST /stock-transfers
  Body: {
    branchId: "CN Quận 1",
    fromWarehouseId: "Kho A (CN Q1)",
    toWarehouseId: "Kho B (CH Nguyễn Huệ)",
    lines: [...]
  }
     │
     │  Validate:
     │    ✅ branchId ∈ phạm vi chi nhánh nhân viên
     │    ✅ fromWarehouse.BranchId ∈ phạm vi nhân viên
     │    ✅ toWarehouse.BranchId ∈ phạm vi nhân viên
     │       (chỉ chuyển giữa kho thuộc phạm vi)
     │
     ▼
  StockTransfer created (Draft)
     │
     ▼
POST /stock-transfers/{id}/confirm   [Manager+]
     │  FromWarehouse.OnHand-- / ToWarehouse.OnHand++
```

### 5.6 Tồn kho (Inventory) theo chi nhánh

Tồn kho (`InventoryBalance`) liên kết với `Warehouse`, và `Warehouse` thuộc `Branch`. Do đó branch filtering cho tồn kho đi qua quan hệ:

```
InventoryBalance ─── Warehouse ─── Branch
                     (BranchId)
```

| Thao tác | Quy tắc |
|---|---|
| **Xem tồn kho** | Chỉ hiển thị tồn kho của kho thuộc chi nhánh trong phạm vi |
| **Điều chỉnh tồn** | Chỉ Admin, kho đích phải thuộc chi nhánh trong phạm vi |
| **Nhập tồn đầu kỳ** | Chỉ Admin, kho đích phải thuộc chi nhánh trong phạm vi |
| **Xem lịch sử giao dịch** | Lọc theo kho thuộc chi nhánh cho phép |

---

## 6. Luồng kiểm tra quyền chi nhánh (Branch Access Flow)

### 6.1 Luồng đầy đủ khi nhân viên thao tác

```
Nhân viên gửi request
     │
     ▼
[JWT Middleware]  ── Extract claims: sub, tenant_id, branch_id[], all_branches
     │
     ▼
[Tenant Middleware]  ── Validate X-Tenant-Id header, set DbContext connection
     │
     ▼
[Authorization]  ── Check Policy (RequireAdmin/Manager/Staff)
                    & Check Permission ([RequirePermission])
     │
     ▼
[Controller]  ── Nhận request
     │
     ▼
[Service Layer]
     │
     ├── (1) Lọc danh sách: WHERE BranchId ∈ accessibleBranches
     │
     ├── (2) Tạo mới: Validate request.BranchId ∈ accessibleBranches
     │
     └── (3) Sửa/Xác nhận: Validate entity.BranchId ∈ accessibleBranches
              │
              ├── ✅ Pass → Thao tác bình thường
              └── ❌ Fail → 403 Forbidden
```

### 6.2 Xác định phạm vi chi nhánh có thể truy cập

```
Input: User.BranchIds (từ JWT claims)

FUNCTION GetAccessibleBranches(userBranchIds):
    IF user.IsAllBranches:
        RETURN tất cả chi nhánh trong tenant

    result = SET(userBranchIds)

    FOR EACH branchId IN userBranchIds:
        descendants = GetAllDescendants(branchId)    // BFS/DFS trên cây
        result = result ∪ descendants

    RETURN result
```

---

## 7. Quan hệ giữa Kho (Warehouse) và Chi nhánh

```
Branch (Chi nhánh Quận 1)
  │
  ├── Warehouse: "Kho chính CN Q1"     ← BranchId = CN Q1
  ├── Warehouse: "Kho phụ CN Q1"       ← BranchId = CN Q1
  │
  └── SubBranch (Cửa hàng Nguyễn Huệ)
        │
        └── Warehouse: "Kho CH Nguyễn Huệ"  ← BranchId = CH NHuệ

Warehouse (Kho trung tâm phân phối)     ← BranchId = NULL (kho dùng chung)
```

| Loại kho | `BranchId` | Ai truy cập |
|---|---|---|
| Kho thuộc chi nhánh | `= branchId` | Nhân viên có quyền chi nhánh đó (hoặc chi nhánh cha) |
| Kho dùng chung | `NULL` | Tất cả nhân viên trong tenant |

---

## 8. API Reference

### 8.1 Quản lý chi nhánh (Master Data)

| Method | Endpoint | Quyền | Mô tả |
|---|---|---|---|
| GET | `/api/v1/branches` | `branches.view` | Danh sách chi nhánh (phẳng, có phân trang) |
| GET | `/api/v1/branches/tree` | `branches.view` | Cây chi nhánh phân cấp |
| GET | `/api/v1/branches/{id}` | `branches.view` | Chi tiết 1 chi nhánh |
| POST | `/api/v1/branches` | `branches.manage` | Tạo chi nhánh mới |
| PUT | `/api/v1/branches/{id}` | `branches.manage` | Cập nhật chi nhánh |
| DELETE | `/api/v1/branches/{id}` | `branches.manage` | Xóa chi nhánh (soft-delete) |

### 8.2 Gán chi nhánh cho nhân viên

| Method | Endpoint | Quyền | Mô tả |
|---|---|---|---|
| POST | `/api/v1/admin/users/{id}/branches` | `users.manage` (Admin) | Gán danh sách chi nhánh cho user |

**Request Body:**
```json
{
  "branchIds": ["branch-1-id", "branch-2-id"],
  "isAllBranches": false
}
```

**Lưu ý:**
- Strategy: **REPLACE** — xóa hết gán cũ, thêm gán mới
- Revoke RefreshToken → buộc user nhận token mới
- Nếu `isAllBranches = true` thì `branchIds` bị bỏ qua

---

## 9. Tổng hợp checklist phân quyền chi nhánh

| # | Hạng mục | Trạng thái | Ghi chú |
|---|---|---|---|
| 1 | Entity `Branch` có `ParentBranchId` phân cấp | ✅ Hoàn thành | Hỗ trợ cây đa cấp |
| 2 | `UserBranch` many-to-many liên kết user & branch | ✅ Hoàn thành | |
| 3 | `IsAllBranches` flag cho admin/quản lý cấp cao | ✅ Hoàn thành | Admin luôn `true` |
| 4 | JWT chứa `branch_id` claims | ✅ Hoàn thành | |
| 5 | `ICurrentUserContext.HasBranchAccess()` | ✅ Hoàn thành | Kiểm tra exact match |
| 6 | Revoke token khi thay đổi chi nhánh user | ✅ Hoàn thành | |
| 7 | Auto-filter query theo branch scope tại service | ⚠️ Chưa triển khai | Service trả tất cả data, chưa lọc theo branch user |
| 8 | Kế thừa chi nhánh con (descendant branches) | ⚠️ Chưa triển khai | `HasBranchAccess` chỉ check exact match |
| 9 | Validate BranchId khi tạo chứng từ | ⚠️ Chưa triển khai | Chưa kiểm tra BranchId có thuộc phạm vi user |
| 10 | Helper `GetDescendantBranchIds()` | ⚠️ Chưa triển khai | Cần thêm method traverse cây |
| 11 | PurchaseOrder filter by branch | ⚠️ Chưa triển khai | |
| 12 | SalesOrder filter by branch | ⚠️ Chưa triển khai | |
| 13 | GoodsReceipt filter by branch | ⚠️ Chưa triển khai | |
| 14 | StockTransfer filter by branch | ⚠️ Chưa triển khai | |
| 15 | Inventory filter by branch (via warehouse) | ⚠️ Chưa triển khai | |

---

## 10. Sơ đồ tổng quan

```
┌─────────────────────────────────────────────────────────────────────┐
│                        TENANT                                       │
│                                                                     │
│  ┌──────────┐    gán     ┌──────────────┐    thuộc   ┌──────────┐  │
│  │   User   │ ────────── │  UserBranch  │ ────────── │  Branch  │  │
│  │          │            └──────────────┘            │          │  │
│  │ IsAll    │                                        │ Parent   │  │
│  │ Branches │         ┌──────────────────┐           │ BranchId │  │
│  │          │         │     Warehouse    │ ──────────│          │  │
│  └──────────┘         │   (BranchId)     │           │ SubBranch│  │
│       │               └──────────────────┘           └──────────┘  │
│       │                       │                           │        │
│  ┌────┴─────┐          ┌─────┴──────┐              ┌─────┴─────┐  │
│  │UserRoles │          │ Inventory  │              │ PO / SO / │  │
│  │          │          │ Balance    │              │ GR / ST   │  │
│  │ Role ──► │          └────────────┘              │(BranchId) │  │
│  │Permission│                                      └───────────┘  │
│  └──────────┘                                                      │
│                                                                     │
│  Flow: JWT claims (branch_id[]) → ICurrentUserContext               │
│        → Service auto-filter → Chỉ thấy/thao tác dữ liệu          │
│          thuộc chi nhánh cho phép                                   │
└─────────────────────────────────────────────────────────────────────┘
```
