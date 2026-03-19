# Phương án triển khai module Nhập hàng & Nhập kho — Frontend

> **Ngày tạo:** 2026-03-18 · **Cập nhật:** 2026-03-18 (đối chiếu API spec `purchase.md`)  
> **Phạm vi:** `apps/tenant` — module Purchase (Đơn mua hàng, Phiếu nhập kho, Trả hàng NCC)  
> **Tham chiếu:** [api-description/purchase.md](api-description/purchase.md) · [purchase-and-receiving-implementation.md](purchase-and-receiving-implementation.md) · [purchase-client-implementation.md](purchase-client-implementation.md)

---

## 1. Hiện trạng đã có

### 1.1 Package `@pos/api-client` — CẦN SỬA TYPE ⚠️

TypeScript types và API client functions đã có khung cơ bản, nhưng **có nhiều thiếu sót so với API spec**:

| File | Nội dung | Status |
|------|----------|--------|
| `packages/api-client/src/types/purchase.ts` | Interfaces cho PO, GR, PR — **thiếu một số fields** (xem Section 5) | ⚠️ |
| `packages/api-client/src/types/common.ts` | `DocumentStatus` type — **thiếu `'Completed'`** | ❌ |
| `packages/api-client/src/endpoints/purchase.ts` | 3 API objects: `purchaseOrdersApi`, `goodsReceiptsApi`, `purchaseReturnsApi` | ✅ |
| `packages/api-client/src/index.ts` | Đã export tất cả types + endpoints | ✅ |

**Lưu ý về `X-Tenant-Id` header:**  
Header này đã được tự động gắn bởi request interceptor trong `client.ts` (lấy từ `useAuthStore.getState().user?.tenantId`). Không cần xử lý thủ công ở tầng UI.

### 1.2 UI Pages — ĐÃ CÓ KHUNG CƠ BẢN ✅ (cần cải thiện)

Đã có 8 page components trong `apps/tenant/src/features/purchase/pages/`:

| Page | File | Tình trạng |
|------|------|------------|
| Danh sách PO | `PurchaseOrderListPage.tsx` | ✅ Hoạt động cơ bản |
| Form tạo/sửa PO | `PurchaseOrderFormPage.tsx` | ⚠️ Thiếu input `discountAmount` |
| Chi tiết PO | `PurchaseOrderDetailPage.tsx` | ⚠️ Cần bổ sung nút tạo GR/sửa PO |
| Danh sách GR | `GoodsReceiptListPage.tsx` | ✅ Hoạt động cơ bản |
| Form tạo GR | `GoodsReceiptFormPage.tsx` | ⚠️ Dropdown PO chưa load data + thiếu validate PO bắt buộc |
| Chi tiết GR | `GoodsReceiptDetailPage.tsx` | ⚠️ Cần bổ sung nút tạo trả hàng |
| Danh sách PR | `PurchaseReturnListPage.tsx` | ✅ Hoạt động cơ bản |
| Form tạo PR | `PurchaseReturnFormPage.tsx` | ⚠️ Chưa tự động điền lines từ GR |

### 1.3 Routes — ĐÃ CÓ ✅

Tất cả routes đã được khai báo trong `apps/tenant/src/routes/index.tsx`:

```
/purchase/orders          → PurchaseOrderListPage
/purchase/orders/new      → PurchaseOrderFormPage
/purchase/orders/:id      → PurchaseOrderDetailPage
/purchase/orders/:id/edit → PurchaseOrderFormPage
/purchase/receipts        → GoodsReceiptListPage
/purchase/receipts/new    → GoodsReceiptFormPage
/purchase/receipts/:id    → GoodsReceiptDetailPage
/purchase/returns         → PurchaseReturnListPage
/purchase/returns/new     → PurchaseReturnFormPage
```

---

## 2. Các vấn đề cần sửa & tính năng cần bổ sung

### 2.1 PurchaseOrderDetailPage — Thiếu hành động nghiệp vụ

**Hiện tại:** Chỉ có nút Xác nhận (Confirm) và Hủy (Cancel) khi Draft.

**Cần bổ sung:**

| Trạng thái PO | Hành động cần thêm | Mô tả |
|----------------|---------------------|--------|
| Draft | **Sửa đơn** | Nút navigate đến `/purchase/orders/:id/edit` |
| Confirmed | **Tạo phiếu nhập kho** | Nút navigate đến `/purchase/receipts/new?poId={id}` |
| Confirmed | **Hủy đơn** | Vẫn cho phép hủy (nếu chưa có GR Completed) |
| Confirmed / Completed | **Danh sách GR liên kết** | Hiển thị bảng danh sách GoodsReceipt đã tạo từ PO này |

**Chi tiết triển khai:**

```tsx
// Thêm query lấy danh sách GR liên kết PO
const { data: linkedReceipts } = useQuery({
  queryKey: ['goods-receipts', { purchaseOrderId: id }],
  queryFn: () => goodsReceiptsApi.list({ purchaseOrderId: id }),
  enabled: order?.status !== 'Draft',
})

// Thêm nút hành động
{order.status === 'Draft' && (
  <Button onClick={() => navigate(`/purchase/orders/${id}/edit`)}>
    Sửa đơn
  </Button>
)}
{order.status === 'Confirmed' && (
  <Button onClick={() => navigate(`/purchase/receipts/new?poId=${id}`)}>
    Tạo phiếu nhập kho
  </Button>
)}

// Thêm section "Phiếu nhập kho liên kết" ở dưới bảng lines
```

---

### 2.2 GoodsReceiptFormPage — Cải thiện luồng tạo từ PO

**Vấn đề hiện tại:**
1. Dropdown "Đơn mua hàng liên kết" có `data={[]}` — không load danh sách PO Confirmed.
2. Khi chọn PO, lines đã auto-fill đúng, nhưng cần cải thiện UX.

**Cần sửa:**

```tsx
// 1. Load danh sách PO Confirmed cho dropdown
const { data: confirmedPOs } = useQuery({
  queryKey: ['purchase-orders', { status: 'Confirmed' }],
  queryFn: () => purchaseOrdersApi.list({ status: 'Confirmed', pageSize: 200 }),
})

const poOptions = (confirmedPOs?.items ?? []).map((po) => ({
  value: po.id,
  label: `${po.code} — ${po.supplierName}`,
}))

// 2. Truyền poOptions vào Select thay vì data={[]}
<Select
  label="Đơn mua hàng liên kết"
  data={poOptions}  // ← sửa từ data={[]}
  ...
/>
```

**Luồng UX mong muốn:**

```
Cách 1: Từ PO Detail → nhấn "Tạo phiếu nhập" → GR Form mở với poId đã có sẵn
         → Auto-fill: warehouse (nếu PO có), lines (productId, unitId, qty, unitCost)
         → User chỉ cần check số lượng thực nhận, thêm batch/expiry nếu cần

Cách 2: Từ GR List → nhấn "Tạo phiếu nhập" → GR Form mở trống
         → User chọn PO từ dropdown → auto-fill lines
         → Hoặc user nhập lines thủ công (không liên kết PO)
```

---

### 2.3 GoodsReceiptDetailPage — Thiếu hành động trả hàng

**Hiện tại:** Chỉ có nút Xác nhận và Hủy khi Draft.

**Cần bổ sung:**

| Trạng thái GR | Hành động cần thêm |
|----------------|---------------------|
| Confirmed (Completed) | **Tạo phiếu trả hàng** → navigate `/purchase/returns/new?grId={id}` |
| Confirmed (Completed) | **Danh sách trả hàng liên kết** — hiển thị bảng PurchaseReturn từ GR này |

**Chi tiết:**

```tsx
// Thêm query lấy danh sách PR liên kết
const { data: linkedReturns } = useQuery({
  queryKey: ['purchase-returns', { goodsReceiptId: id }],
  queryFn: () => purchaseReturnsApi.list({ goodsReceiptId: id }),
  enabled: receipt?.status === 'Confirmed',
})

// Nút tạo trả hàng (khi GR đã Confirmed)
{receipt.status === 'Confirmed' && (
  <Button color="orange" onClick={() => navigate(`/purchase/returns/new?grId=${id}`)}>
    Trả hàng NCC
  </Button>
)}
```

---

### 2.4 PurchaseReturnFormPage — Auto-fill từ GoodsReceipt

**Vấn đề hiện tại:**
1. Khi chọn GR (goodsReceiptId), không auto-fill lines từ GR.
2. API request thiếu `supplierId` — backend bắt buộc field này.
3. Không hỗ trợ nhận `grId` từ query param.

**Cần sửa:**

```tsx
// 1. Đọc grId từ URL query
const [searchParams] = useSearchParams()
const grIdFromQuery = searchParams.get('grId')
const [goodsReceiptId, setGoodsReceiptId] = useState<string | null>(grIdFromQuery)

// 2. Load chi tiết GR khi chọn → auto-fill lines + supplierId
const { data: selectedGR } = useQuery({
  queryKey: ['goods-receipt', goodsReceiptId],
  queryFn: () => goodsReceiptsApi.getById(goodsReceiptId!),
  enabled: !!goodsReceiptId,
})

useEffect(() => {
  if (selectedGR) {
    // Auto-fill lines từ GR lines
    setLines(selectedGR.lines.map((l) => ({
      key: ++lineKey,
      productId: l.productId,
      unitId: l.unitId,
      unitName: l.unitName,
      quantity: l.quantity,     // Mặc định = số lượng đã nhập
      unitCost: l.unitCost,
    })))
  }
}, [selectedGR])

// 3. Tự động lấy supplierId từ PO liên kết GR
//    GR → PO → Supplier
//    Cần load PO detail để lấy supplierId
const { data: linkedPO } = useQuery({
  queryKey: ['purchase-order', selectedGR?.purchaseOrderId],
  queryFn: () => purchaseOrdersApi.getById(selectedGR!.purchaseOrderId!),
  enabled: !!selectedGR?.purchaseOrderId,
})

// 4. Gửi supplierId khi submit
return purchaseReturnsApi.create({
  goodsReceiptId,
  supplierId: linkedPO?.supplierId ?? '',  // ← bổ sung
  returnDate: ...,
  reason: ...,
  isRefunded,
  lines: ...,
})
```

**Lưu ý quan trọng:** API `POST /purchase-returns` yêu cầu `supplierId` bắt buộc. Tuy nhiên, GoodsReceiptDto không chứa `supplierId` trực tiếp — cần lấy từ PO gốc.

**Đề xuất:** Thêm `supplierId` và `supplierName` vào `GoodsReceiptDto` ở backend để tránh phải query thêm PO. Hoặc ở frontend, chain query: GR → PO → get supplierId.

---

### 2.5 GoodsReceiptFormPage — `purchaseOrderId` BẮT BUỘC

**Theo API spec (purchase.md):** `purchaseOrderId` là **bắt buộc** khi tạo GR. Mô hình dữ liệu ghi rõ: `PurchaseOrderId: UUID -- FK → PurchaseOrders (bắt buộc)`. Validation table cũng ghi: `purchaseOrderId | Bắt buộc`.

**Hiện tại type `CreateGoodsReceiptRequest` ghi `purchaseOrderId?: string` (optional) — SAI**, cần sửa thành required.

**UI cần:**
- Đổi label từ "Đơn mua hàng liên kết (tùy chọn)" → "Đơn mua hàng" (required)
- Thêm validation: throw error nếu không chọn PO
- Chỉ hiển thị PO có status = `Confirmed` trong dropdown

---

### 2.6 PurchaseOrderListPage — Cải thiện filter

**Hiện tại:** Chỉ có search text + filter status.

**Cần bổ sung:**
- Filter theo nhà cung cấp (dropdown `supplierId`)
- Filter theo khoảng ngày (fromDate, toDate) — đã có trong `PurchaseOrderListParams`

```tsx
// Thêm 2 filter
<Select
  placeholder="Nhà cung cấp"
  data={supplierOptions}
  value={supplierId}
  onChange={setSupplierId}
  clearable searchable w={200}
/>
<DateInput placeholder="Từ ngày" value={fromDate} onChange={setFromDate} clearable />
<DateInput placeholder="Đến ngày" value={toDate} onChange={setToDate} clearable />
```

---

### 2.7 GoodsReceiptListPage — Bổ sung filter & hiển thị PO code

**Hiện tại:** Filter chỉ có status, search chỉ filter client-side theo code.

**Cần bổ sung:**
- Hiển thị cột `purchaseOrderCode` trong bảng
- Filter theo `warehouseId` (đã có trong params type)
- Filter theo khoảng ngày

---

## 3. Phương án triển khai — Thứ tự ưu tiên

### Phase 1: Sửa lỗi & hoàn thiện luồng cốt lõi

> Mục tiêu: Luồng PO → GR → PR hoạt động end-to-end hoàn chỉnh.

| # | Task | File cần sửa | Mức độ |
|---|------|-------------|--------|
| 1.1 | **GR Form: Load danh sách PO Confirmed cho dropdown** | `GoodsReceiptFormPage.tsx` | Sửa nhỏ |
| 1.2 | **PO Detail: Thêm nút "Sửa đơn" (Draft) + "Tạo phiếu nhập" (Confirmed)** | `PurchaseOrderDetailPage.tsx` | Sửa nhỏ |
| 1.3 | **PO Detail: Thêm nút "Hủy" khi Confirmed (nếu chưa có GR Completed)** | `PurchaseOrderDetailPage.tsx` | Sửa nhỏ |
| 1.4 | **PR Form: Đọc `grId` từ query param + auto-fill lines từ GR** | `PurchaseReturnFormPage.tsx` | Sửa vừa |
| 1.5 | **PR Form: Bổ sung `supplierId` khi submit (chain query GR→PO→supplier)** | `PurchaseReturnFormPage.tsx` | Sửa vừa |
| 1.6 | **GR Detail: Thêm nút "Trả hàng NCC" khi Confirmed** | `GoodsReceiptDetailPage.tsx` | Sửa nhỏ |
| 1.7 | **PO Form: Thêm input `discountAmount`** | `PurchaseOrderFormPage.tsx` | Sửa nhỏ |
| 1.8 | **Type fixes: Sửa `DocumentStatus` + 5 purchase interfaces** | `types/common.ts`, `types/purchase.ts` | Sửa nhỏ |

### Phase 2: Cải thiện UX & bổ sung thông tin liên kết

| # | Task | File | Mức độ |
|---|------|------|--------|
| 2.1 | **PO Detail: Hiển thị bảng "Phiếu nhập kho liên kết"** | `PurchaseOrderDetailPage.tsx` | Sửa vừa |
| 2.2 | **GR Detail: Hiển thị bảng "Phiếu trả hàng liên kết"** | `GoodsReceiptDetailPage.tsx` | Sửa vừa |
| 2.3 | **PO List: Thêm filter NCC + khoảng ngày** | `PurchaseOrderListPage.tsx` | Sửa nhỏ |
| 2.4 | **GR List: Thêm cột PO code + filter kho + khoảng ngày** | `GoodsReceiptListPage.tsx` | Sửa nhỏ |
| 2.5 | **PR List: Hiện tại OK, có thể thêm filter NCC** | `PurchaseReturnListPage.tsx` | Sửa nhỏ |

### Phase 3: Nâng cao (tùy chọn)

| # | Task | Mô tả |
|---|------|-------|
| 3.1 | **So sánh số lượng đã nhập vs PO** | Trên GR Form, hiển thị cột "Đã nhập trước đó" / "Còn lại" so với PO lines |
| 3.2 | **So sánh số lượng đã trả vs GR** | Trên PR Form, hiển thị cột "Đã trả trước đó" / "Còn lại" so với GR lines |
| 3.3 | **Print/Export** | In phiếu PO, GR, PR ra PDF |
| 3.4 | **Idempotency-Key** | Gửi `Idempotency-Key` header để tránh duplicate submit |

---

## 4. Chi tiết kỹ thuật từng task

### 4.1 Task 1.1 — GR Form: Load PO Confirmed cho dropdown

**File:** `apps/tenant/src/features/purchase/pages/GoodsReceiptFormPage.tsx`

**Thay đổi:**

```tsx
// THÊM: Query danh sách PO đã Confirmed
const { data: confirmedPOs } = useQuery({
  queryKey: ['purchase-orders', { status: 'Confirmed' }],
  queryFn: () => purchaseOrdersApi.list({ status: 'Confirmed', pageSize: 200 }),
})

const poOptions = (confirmedPOs?.items ?? []).map((po) => ({
  value: po.id,
  label: `${po.code} — ${po.supplierName} (${formatDate(po.orderDate)})`,
}))

// SỬA: Truyền poOptions vào Select (thay vì data={[]})
<Select
  label="Đơn mua hàng liên kết"
  placeholder="Chọn đơn mua hàng để điền tự động..."
  searchable clearable
  data={poOptions}
  value={purchaseOrderId}
  onChange={setPurchaseOrderId}
  description={selectedPO ? `Liên kết: ${selectedPO.code} — ${selectedPO.supplierName}` : undefined}
/>
```

---

### 4.2 Task 1.2 + 1.3 — PO Detail: Thêm nút hành động

**File:** `apps/tenant/src/features/purchase/pages/PurchaseOrderDetailPage.tsx`

**Thay đổi trong phần actions:**

```tsx
// Import thêm
import { IconEdit, IconTruckDelivery } from '@tabler/icons-react'
import { goodsReceiptsApi } from '@pos/api-client'

// Thêm query GR liên kết (cho Confirmed/Completed)
const { data: linkedReceipts } = useQuery({
  queryKey: ['goods-receipts', { purchaseOrderId: id }],
  queryFn: () => goodsReceiptsApi.list({ purchaseOrderId: id }),
  enabled: !!order && order.status !== 'Draft',
})

// Bổ sung nút hành động:

// Khi Draft — thêm nút Sửa
{isDraft && (
  <Button variant="light" leftSection={<IconEdit size={16} />}
    onClick={() => navigate(`/purchase/orders/${id}/edit`)}>
    Sửa đơn
  </Button>
)}

// Khi Confirmed — thêm nút Tạo GR + vẫn cho Hủy
{order.status === 'Confirmed' && (
  <>
    <Button color="teal" leftSection={<IconTruckDelivery size={16} />}
      onClick={() => navigate(`/purchase/receipts/new?poId=${id}`)}>
      Tạo phiếu nhập kho
    </Button>
    <Button color="red" variant="light" leftSection={<IconX size={16} />}
      loading={cancelMutation.isPending}
      onClick={() => openConfirm({
        title: 'Hủy đơn mua hàng',
        message: 'Bạn có chắc muốn hủy?',
        confirmLabel: 'Hủy đơn',
        confirmColor: 'red',
        onConfirm: () => cancelMutation.mutate(),
      })}>
      Hủy
    </Button>
  </>
)}
```

---

### 4.3 Task 1.4 + 1.5 — PR Form: Auto-fill từ GR + supplierId

**File:** `apps/tenant/src/features/purchase/pages/PurchaseReturnFormPage.tsx`

**Thay đổi chính:**

```tsx
// 1. Import thêm
import { useSearchParams } from 'react-router-dom'

// 2. Đọc grId từ query param
const [searchParams] = useSearchParams()
const grIdFromQuery = searchParams.get('grId')
const [goodsReceiptId, setGoodsReceiptId] = useState<string | null>(grIdFromQuery)

// 3. Load GR chi tiết khi chọn → auto-fill lines
const { data: selectedGR } = useQuery({
  queryKey: ['goods-receipt', goodsReceiptId],
  queryFn: () => goodsReceiptsApi.getById(goodsReceiptId!),
  enabled: !!goodsReceiptId,
})

useEffect(() => {
  if (selectedGR) {
    setLines(selectedGR.lines.map((l) => ({
      key: ++lineKey,
      productId: l.productId,
      unitId: l.unitId,
      unitName: l.unitName,
      quantity: l.quantity,
      unitCost: l.unitCost,
    })))
  }
}, [selectedGR])

// 4. Load PO gốc để lấy supplierId
const { data: linkedPO } = useQuery({
  queryKey: ['purchase-order', selectedGR?.purchaseOrderId],
  queryFn: () => purchaseOrdersApi.getById(selectedGR!.purchaseOrderId!),
  enabled: !!selectedGR?.purchaseOrderId,
})

// 5. Sửa mutation để gửi supplierId
mutationFn: async () => {
  if (!goodsReceiptId) throw new Error('Vui lòng chọn phiếu nhập hàng liên kết')
  const supplierId = linkedPO?.supplierId
  if (!supplierId) throw new Error('Không xác định được nhà cung cấp từ phiếu nhập')
  // ...
  return purchaseReturnsApi.create({
    goodsReceiptId,
    returnDate: ...,
    reason: ...,
    isRefunded,
    lines: ...,
  })
}
```

**Lưu ý:** `CreatePurchaseReturnRequest` hiện tại trong types KHÔNG có field `supplierId`. Cần kiểm tra lại:
- Nếu backend thực sự yêu cầu `supplierId` trong body → cần bổ sung field vào type.
- Nếu backend tự lấy `supplierId` từ GR → PO → Supplier thì không cần gửi.

→ **Kiểm tra API doc:** Nhìn lại `POST /api/v1/purchase-returns`, request body có `supplierId: "sup-uuid-1"` — **CÓ yêu cầu**. Cần bổ sung vào type.

**Sửa type `CreatePurchaseReturnRequest`:**

```typescript
// packages/api-client/src/types/purchase.ts
export interface CreatePurchaseReturnRequest {
  goodsReceiptId: string
  supplierId: string       // ← BỔ SUNG — bắt buộc theo API spec
  returnDate: string
  reason?: string
  isRefunded: boolean
  lines: Array<{
    productId: string
    unitId: string
    quantity: number
    unitCost: number
  }>
}
```

---

### 4.4 Task 1.6 — GR Detail: Nút "Trả hàng NCC"

**File:** `apps/tenant/src/features/purchase/pages/GoodsReceiptDetailPage.tsx`

```tsx
import { IconArrowBack } from '@tabler/icons-react'

// Thêm nút khi GR đã Confirmed
{receipt.status === 'Confirmed' && (
  <Button color="orange" variant="light"
    leftSection={<IconArrowBack size={16} />}
    onClick={() => navigate(`/purchase/returns/new?grId=${id}`)}>
    Trả hàng NCC
  </Button>
)}
```

---

### 4.5 Task 2.1 — PO Detail: Bảng phiếu nhập kho liên kết

**File:** `apps/tenant/src/features/purchase/pages/PurchaseOrderDetailPage.tsx`

```tsx
// Thêm section sau bảng lines PO
{order.status !== 'Draft' && linkedReceipts && linkedReceipts.items.length > 0 && (
  <Paper withBorder>
    <Text fw={600} p="md" pb={0}>Phiếu nhập kho liên kết</Text>
    <Table striped>
      <Table.Thead>
        <Table.Tr>
          <Table.Th>Mã phiếu</Table.Th>
          <Table.Th>Ngày nhập</Table.Th>
          <Table.Th>Kho nhập</Table.Th>
          <Table.Th>Trạng thái</Table.Th>
        </Table.Tr>
      </Table.Thead>
      <Table.Tbody>
        {linkedReceipts.items.map((gr) => (
          <Table.Tr key={gr.id} style={{ cursor: 'pointer' }}
            onClick={() => navigate(`/purchase/receipts/${gr.id}`)}>
            <Table.Td>{gr.code}</Table.Td>
            <Table.Td>{formatDate(gr.receiptDate)}</Table.Td>
            <Table.Td>{gr.warehouseName}</Table.Td>
            <Table.Td><Badge ...>{status}</Badge></Table.Td>
          </Table.Tr>
        ))}
      </Table.Tbody>
    </Table>
  </Paper>
)}
```

---

### 4.6 Task 2.2 — GR Detail: Bảng trả hàng liên kết

Tương tự Task 2.1, hiển thị danh sách `PurchaseReturn` liên kết GR:

```tsx
{receipt.status === 'Confirmed' && linkedReturns && linkedReturns.items.length > 0 && (
  <Paper withBorder>
    <Text fw={600} p="md" pb={0}>Phiếu trả hàng liên kết</Text>
    <Table striped>
      ...columns: Mã phiếu, Ngày trả, NCC, Tổng tiền, Trạng thái
    </Table>
  </Paper>
)}
```

---

### 4.7 Task 2.3 + 2.4 — Bổ sung filter cho List pages

**PO List — thêm:**
- `<Select>` chọn NCC (load từ `suppliersApi.list()`)
- `<DateInput>` fromDate/toDate  
- Truyền vào `params` để server-side filter

**GR List — thêm:**
- Cột `purchaseOrderCode` trong columns
- `<Select>` chọn warehouse (load từ `warehousesApi.list()`)
- `<DateInput>` fromDate/toDate

---

## 5. Sửa types ở `@pos/api-client` — ĐỐI CHIẾU VỚI API SPEC

Sau khi đối chiếu `purchase.md`, phát hiện **6 thiếu sót** trong types hiện tại:

| # | File | Thay đổi | Lý do |
|---|------|----------|-------|
| 1 | **`types/common.ts`** | `DocumentStatus` thêm `'Completed'` | API spec định nghĩa 4 status: Draft(0), Confirmed(1), Completed(2), Cancelled(3). Type hiện tại thiếu `Completed`. PO có thể chuyển sang Completed khi nhận đủ hàng. |
| 2 | **`types/purchase.ts`** | `PurchaseOrderDto` thêm `discountAmount: number` | API response trả field này, UI cũng cần hiển thị. Hiện tại type thiếu. |
| 3 | **`types/purchase.ts`** | `CreatePurchaseOrderRequest` thêm `discountAmount?: number` | API request body có field này. |
| 4 | **`types/purchase.ts`** | `CreateGoodsReceiptRequest.purchaseOrderId` đổi từ optional thành **required** | API spec ghi rõ: `purchaseOrderId | Bắt buộc`. Mô hình: `PurchaseOrderId: UUID -- FK → PurchaseOrders (bắt buộc)`. |
| 5 | **`types/purchase.ts`** | `CreatePurchaseReturnRequest` thêm `supplierId: string` | API spec ghi rõ: `supplierId | Bắt buộc`. |
| 6 | **`types/purchase.ts`** | `GoodsReceiptListParams` thêm `purchaseOrderId?: string` | API spec GET /goods-receipts hỗ trợ filter `purchaseOrderId`. |

**Chi tiết thay đổi:**

```typescript
// ═══════════════════════════════════════════════════════════════
// types/common.ts — SỬA DocumentStatus
// ═══════════════════════════════════════════════════════════════

/** Backend: 0=Draft, 1=Confirmed, 2=Completed, 3=Cancelled */
export type DocumentStatus = 'Draft' | 'Confirmed' | 'Completed' | 'Cancelled'
//                                                  ^^^^^^^^^^^^ THÊM


// ═══════════════════════════════════════════════════════════════
// types/purchase.ts — SỬA PurchaseOrderDto
// ═══════════════════════════════════════════════════════════════

export interface PurchaseOrderDto {
  id: string
  code: string
  orderDate: string
  supplierId: string
  supplierName: string
  status: DocumentStatus
  totalAmount: number
  discountAmount: number   // ← THÊM — backend luôn trả field này
  vatAmount: number
  grandTotal: number
  note?: string
  lines: PurchaseOrderLineDto[]
}


// ═══════════════════════════════════════════════════════════════
// types/purchase.ts — SỬA CreatePurchaseOrderRequest
// ═══════════════════════════════════════════════════════════════

export interface CreatePurchaseOrderRequest {
  supplierId: string
  orderDate: string
  note?: string
  discountAmount?: number   // ← THÊM — default 0 nếu không gửi
  lines: Array<{
    productId: string
    unitId: string
    quantity: number
    unitPrice: number
    vatRate?: number
  }>
}


// ═══════════════════════════════════════════════════════════════
// types/purchase.ts — SỬA CreateGoodsReceiptRequest
// ═══════════════════════════════════════════════════════════════

export interface CreateGoodsReceiptRequest {
  purchaseOrderId: string   // ← ĐỔI từ optional (?) thành required
  warehouseId: string
  receiptDate: string
  note?: string
  lines: Array<{ ... }>
}


// ═══════════════════════════════════════════════════════════════
// types/purchase.ts — SỬA GoodsReceiptListParams
// ═══════════════════════════════════════════════════════════════

export interface GoodsReceiptListParams extends PaginationParams, DateRangeParams {
  purchaseOrderId?: string  // ← THÊM — filter GR theo PO
  supplierId?: string
  warehouseId?: string
  status?: DocumentStatus
}


// ═══════════════════════════════════════════════════════════════
// types/purchase.ts — SỬA CreatePurchaseReturnRequest
// ═══════════════════════════════════════════════════════════════

export interface CreatePurchaseReturnRequest {
  goodsReceiptId: string
  supplierId: string         // ← THÊM — bắt buộc theo API spec
  returnDate: string
  reason?: string
  isRefunded: boolean
  lines: Array<{
    productId: string
    unitId: string
    quantity: number
    unitCost: number
  }>
}
```

---

## 6. Tóm tắt các file cần thay đổi

| # | File | Loại thay đổi |
|---|------|---------------|
| 1 | **`packages/api-client/src/types/common.ts`** | Thêm `'Completed'` vào `DocumentStatus` |
| 2 | **`packages/api-client/src/types/purchase.ts`** | Sửa 5 interfaces (thêm fields, đổi optional→required) |
| 3 | `apps/tenant/src/.../PurchaseOrderDetailPage.tsx` | Bổ sung nút Sửa, nút Tạo GR, nút Hủy (Confirmed), bảng GR liên kết |
| 4 | `apps/tenant/src/.../PurchaseOrderFormPage.tsx` | Thêm input `discountAmount` |
| 5 | `apps/tenant/src/.../PurchaseOrderListPage.tsx` | Bổ sung filter NCC + khoảng ngày |
| 6 | `apps/tenant/src/.../GoodsReceiptFormPage.tsx` | Load dropdown PO (Confirmed), validate PO bắt buộc |
| 7 | `apps/tenant/src/.../GoodsReceiptDetailPage.tsx` | Bổ sung nút Trả hàng, bảng PR liên kết |
| 8 | `apps/tenant/src/.../GoodsReceiptListPage.tsx` | Thêm cột PO code, filter warehouse + ngày |
| 9 | `apps/tenant/src/.../PurchaseReturnFormPage.tsx` | Auto-fill từ GR, bổ sung supplierId, đọc grId từ URL |
| 10 | `apps/tenant/src/.../PurchaseReturnListPage.tsx` | (Optional) Thêm filter NCC |

**Tổng:** 10 files — 2 files type + 8 files UI page.

---

## 7. Câu hỏi — Đã giải quyết sau khi đối chiếu API spec

| # | Câu hỏi | Kết luận | Hành động |
|---|---------|---------|----------|
| 1 | **`CreatePurchaseReturnRequest` có cần `supplierId`?** | ✅ **CÓ** — API spec mục 4.3 POST ghi rõ: `supplierId \| Bắt buộc`. Request body mẫu có `"supplierId": "sup-uuid-1"`. | Thêm `supplierId: string` vào type + UI truyền giá trị |
| 2 | **`GoodsReceiptListParams` có hỗ trợ `purchaseOrderId`?** | ✅ **CÓ** — API spec mục 4.2 GET ghi: `purchaseOrderId \| guid \| Không \| Lọc theo PO`. | Thêm `purchaseOrderId?: string` vào type |
| 3 | **PO hủy khi Confirmed — UI warning?** | Giữ nguyên. Backend trả error message rõ ràng: *"Cannot cancel a purchase order that has confirmed goods receipts. Raise a purchase return instead."* — UI catch & hiển thị message từ backend. | Không cần xử lý thêm |
| 4 | **GR có bắt buộc `purchaseOrderId`?** | ✅ **BẮT BUỘC** — Mô hình dữ liệu: `PurchaseOrderId: UUID -- FK → PurchaseOrders (bắt buộc)`. Validation: `purchaseOrderId \| Bắt buộc`. Business rule: "PO phải ở Confirmed". | Đổi type từ optional → required + validate UI |
| 5 | **`discountAmount` trên PO Form?** | ✅ **NÊN THÊM** — API spec request body có `discountAmount`, công thức: `grandTotal = totalAmount + vatAmount − discountAmount`. Dto response cũng trả field này. | Chuyển lên Phase 1, thêm input + hiển thị trên Detail |

---

## 8. Lưu ý kỹ thuật bổ sung (từ API spec)

### 8.1 `DocumentStatus` — 4 giá trị, không phải 3

API spec định nghĩa:

| Giá trị | Tên | Mô tả |
|---|---|---|
| `0` | `Draft` | Bản nháp |
| `1` | `Confirmed` | Đã xác nhận |
| `2` | `Completed` | Hoàn thành — PO đã nhận đủ hàng |
| `3` | `Cancelled` | Đã hủy |

Type hiện tại **thiếu `Completed`**:
```typescript
// HIỆN TẠI (SAI)
export type DocumentStatus = 'Draft' | 'Confirmed' | 'Cancelled'

// CẦN SỬA
export type DocumentStatus = 'Draft' | 'Confirmed' | 'Completed' | 'Cancelled'
```

Điều này ảnh hưởng đến:
- `PurchaseOrderListPage` đã có option `Completed` trong STATUS_OPTIONS nhưng type không chấp nhận
- Logic hiển thị nút hành động trên Detail pages (Completed ≠ Confirmed)
- `DocumentStatusLabel` trong `@pos/utils` đã có label cho `Completed` — chỉ thiếu ở type

### 8.2 `PurchaseOrderDto.discountAmount` — thiếu trong type

Backend response luôn trả `discountAmount`. Công thức:
```
grandTotal = totalAmount + vatAmount − discountAmount
```

Type hiện tại thiếu → UI không hiển thị được discount. Cần thêm:
- Vào `PurchaseOrderDto` để hiển thị trên Detail page
- Vào `CreatePurchaseOrderRequest` để cho phép nhập trên Form page
- Vào `PurchaseOrderFormPage` thêm `<NumberInput>` cho discount
- Vào `PurchaseOrderDetailPage` hiển thị trong phần tổng tiền

### 8.3 GR tạo từ PO — không hỗ trợ nhập kho trực tiếp

API spec mô hình GR:
> `PurchaseOrderId: UUID -- FK → PurchaseOrders (bắt buộc)`

Điều này có nghĩa **không thể tạo GR mà không liên kết PO**. Frontend cần:
- Bỏ text "(tùy chọn)" trong label dropdown PO
- Thêm validation required cho `purchaseOrderId`
- Cân nhắc: thay vì dropdown trống, mặc định hiện danh sách PO Confirmed để user chọn

### 8.4 Idempotency-Key header

API spec hỗ trợ `Idempotency-Key` header (UUID, cache Redis 24h). Có thể bổ sung sau để tránh duplicate khi user double-click nút Lưu. Hiện tại không blocking.
