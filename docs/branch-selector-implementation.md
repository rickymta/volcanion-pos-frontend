# Branch Selector — Kế hoạch triển khai

> **Liên quan:** [branch-management.md](business-flows/branch-management.md)  
> **Ngày:** 2026-03-18  
> **Trạng thái:** ✅ Giai đoạn 1 hoàn thành (combobox header)

---

## 1. Bối cảnh & Mục tiêu

Backend đã thiết kế hệ thống **phân quyền theo chi nhánh** (xem `branch-management.md`). Mỗi JWT trả về:

- `isAllBranches: true/false` — người dùng có toàn quyền hay bị giới hạn chi nhánh
- `branchIds: string[]` — danh sách ID chi nhánh được phép (khi `isAllBranches = false`)

Frontend cần **hiển thị bối cảnh chi nhánh** để:

1. Người dùng biết mình đang thao tác trên chi nhánh nào
2. Làm cơ sở để lọc dữ liệu theo chi nhánh ở các màn hình nghiệp vụ
3. Truyền `branchId` mặc định khi tạo chứng từ (PO, SO, GR, ST…)

---

## 2. Những thay đổi đã thực hiện (Giai đoạn 1)

### 2.1 `packages/auth/src/types.ts`

Bổ sung 2 trường vào `UserProfile`:

```ts
isAllBranches?: boolean   // true = toàn bộ chi nhánh (Admin luôn true)
branchIds?: string[]      // danh sách chi nhánh được gán cụ thể
```

> `branchId` (singular) giữ nguyên để backward-compat với `apps/pos`.

### 2.2 `apps/tenant/src/features/auth/pages/LoginPage.tsx`
### 2.3 `apps/pos/src/features/auth/pages/LoginPage.tsx`

Cập nhật mapper `UserDto → UserProfile` để điền `isAllBranches` và `branchIds`:

```ts
const user: UserProfile = {
  // ...
  isAllBranches: dto.isAllBranches,
  branchIds: dto.branchIds ?? [],
  branchId: dto.isAllBranches ? undefined : dto.branchIds?.[0],
}
```

### 2.4 `apps/tenant/src/lib/useBranchStore.ts` _(mới)_

Zustand store đơn giản, **persisted** vào `localStorage` (key `pos-branch`):

```ts
interface BranchStoreState {
  activeBranchId: string | null   // null = "Tất cả chi nhánh"
  setActiveBranch(id: string | null): void
  clear(): void
}
```

> `clear()` được gọi khi logout để xoá lựa chọn cũ.

### 2.5 `apps/tenant/src/components/BranchSelector.tsx` _(mới)_

Component hiển thị combobox chi nhánh. Logic hiển thị:

| Điều kiện | Hiển thị |
|---|---|
| `isAllBranches = true` | `<Select>` gồm **"Tất cả chi nhánh"** + tất cả chi nhánh active |
| `isAllBranches = false`, 1 chi nhánh | `<Badge>` tĩnh (tên chi nhánh duy nhất, không cho đổi, tự động select) |
| `isAllBranches = false`, nhiều chi nhánh | `<Select>` chỉ gồm các chi nhánh được gán |
| Chưa tải xong dữ liệu | Ẩn (`null`) |

Dữ liệu lấy từ `GET /branches?pageSize=100&status=1`, filter client-side nếu `isAllBranches = false`.

### 2.6 `apps/tenant/src/layouts/AppLayout.tsx`

- Import và render `<BranchSelector />` ở đầu `<Group gap="xs">` trong header (top-right, trước nút ngôn ngữ)
- Gọi `clearBranch()` cùng với `clearAuth()` khi logout

---

## 3. Những thay đổi cần làm tiếp (Giai đoạn 2)

### 3.1 Expose `activeBranchId` cho các màn hình nghiệp vụ

Mỗi màn hình danh sách cần **tự động lọc theo chi nhánh đang chọn**. Ví dụ:

```ts
// PurchaseOrderListPage.tsx
const { activeBranchId } = useBranchStore()

const { data } = useQuery({
  queryKey: ['purchase-orders', { page, pageSize, branchId: activeBranchId }],
  queryFn: () => purchaseApi.listOrders({ page, pageSize, branchId: activeBranchId ?? undefined }),
})
```

Danh sách màn hình cần cập nhật:

| Màn hình | File | Param cần thêm |
|---|---|---|
| Danh sách đơn mua | `PurchaseOrderListPage.tsx` | `branchId` |
| Danh sách phiếu nhập kho | `GoodsReceiptListPage.tsx` | `branchId` |
| Danh sách đơn bán | `SalesOrderListPage.tsx` | `branchId` |
| Tồn kho | `InventoryBalancePage.tsx` | `branchId` (qua `warehouseId` của kho thuộc branch) |
| Giao dịch kho | `InventoryTransactionsPage.tsx` | `branchId` (qua warehouse) |
| Chuyển kho | `StockTransferListPage.tsx` | `branchId` |
| Trả hàng mua | `PurchaseReturnListPage.tsx` | `branchId` |
| Trả hàng bán | `SalesReturnListPage.tsx` | `branchId` |

### 3.2 Pre-fill `branchId` khi tạo chứng từ

Trong các form tạo mới (PO Form, SO Form, GR Form…), tự động điền `branchId` từ `activeBranchId`:

```ts
const { activeBranchId } = useBranchStore()

const form = useForm({
  initialValues: {
    branchId: activeBranchId ?? '',
    // ...
  },
})
```

### 3.3 Lọc danh sách kho theo chi nhánh đang chọn

Tất cả các combobox chọn kho (`warehouseId`) nên filter kho theo `activeBranchId`:

```ts
// Trong các form có chọn kho
const { activeBranchId } = useBranchStore()

const { data: warehousesData } = useQuery({
  queryKey: ['warehouses', activeBranchId],
  queryFn: () => warehousesApi.list({
    pageSize: 50,
    branchId: activeBranchId ?? undefined,
  }),
})
```

### 3.4 Cập nhật API params (nếu backend chưa có)

Một số endpoint có thể chưa hỗ trợ param `branchId`. Cần phối hợp backend bổ sung:

| Endpoint | Param cần thêm |
|---|---|
| `GET /purchase-orders` | `branchId?: string` |
| `GET /sales-orders` | `branchId?: string` |
| `GET /goods-receipts` | `branchId?: string` |
| `GET /stock-transfers` | `branchId?: string` |
| `GET /inventory/transactions` | `branchId?: string` (filter qua warehouse) |
| `GET /inventory/balances` | `branchId?: string` (filter qua warehouse) |

### 3.5 Cập nhật type `WarehouseListParams`

```ts
// packages/api-client/src/types/master.ts
export interface WarehouseListParams {
  keyword?: string
  branchId?: string    // ← thêm mới
  status?: 'Active' | 'Inactive'
  page?: number
  pageSize?: number
}
```

### 3.6 Thêm `useBranchSelector()` hook tiện ích (tuỳ chọn)

```ts
// apps/tenant/src/lib/useBranchSelector.ts
export function useBranchSelector() {
  const { activeBranchId } = useBranchStore()
  const { user } = useAuth()

  return {
    activeBranchId,
    /** Tất cả chi nhánh hoặc chưa có chi nhánh cụ thể */
    isAllContext: activeBranchId === null,
    /** ID để gửi lên API (undefined nếu "tất cả") */
    branchIdParam: activeBranchId ?? undefined,
  }
}
```

---

## 4. Ràng buộc kỹ thuật

| Ràng buộc | Ghi chú |
|---|---|
| `activeBranchId = null` chỉ hợp lệ khi `isAllBranches = true` | Nếu user restricted + null → cần auto-reset về branch đầu tiên |
| Khi thay đổi chi nhánh, backend revoke RefreshToken | Frontend sẽ bị logout tự động; `useBranchStore.clear()` cần gọi trước khi logout |
| Không lưu branch list vào Zustand | Dùng React Query cache; chỉ persist `activeBranchId` |
| Cache key `['branches', 'active-list']` | `staleTime = 5 phút`; nên invalidate sau khi Admin tạo/sửa chi nhánh |

---

## 5. Sơ đồ luồng dữ liệu

```
Login
  └─► authApi.me() → UserDto { isAllBranches, branchIds }
        └─► UserProfile { isAllBranches, branchIds }
              └─► useAuthStore (persisted)

BranchSelector (mount)
  └─► branchesApi.list({ pageSize:100, status:1 })
        └─► filter if !isAllBranches
              └─► render Select / Badge

User chọn chi nhánh
  └─► useBranchStore.setActiveBranch(id)
        └─► persisted to localStorage
              └─► các màn hình đọc activeBranchId từ store
                    └─► thêm branchId vào API params
```
