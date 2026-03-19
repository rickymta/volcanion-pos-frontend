# Triển khai nghiệp vụ Nhập hàng & Nhập kho — Phía Client

> **Phiên bản:** Dựa trên backend API thực tế tại thời điểm 2026-03-18  
> **Liên quan:** [purchase-and-receiving-implementation.md](purchase-and-receiving-implementation.md) · [purchase-flow.md](purchase-flow.md)  
> **Backend base URL:** `/api/v1`

---

## 1. Tổng quan kiến trúc Client

### 1.1 Các module cần triển khai

```
src/
├── api/                          # API client layer
│   ├── httpClient.ts             # Axios/fetch wrapper (auth, tenant, error handling)
│   ├── purchaseOrderApi.ts       # Purchase Order endpoints
│   ├── goodsReceiptApi.ts        # Goods Receipt endpoints
│   ├── purchaseReturnApi.ts      # Purchase Return endpoints
│   └── inventoryApi.ts           # Inventory endpoints
├── types/                        # TypeScript interfaces (mirror backend DTOs)
│   ├── purchase.ts
│   ├── inventory.ts
│   ├── enums.ts
│   └── common.ts
├── stores/                       # State management (Zustand / Pinia / Redux)
│   ├── purchaseOrderStore.ts
│   ├── goodsReceiptStore.ts
│   ├── purchaseReturnStore.ts
│   └── inventoryStore.ts
├── hooks/                        # React hooks (hoặc composables cho Vue)
│   ├── usePurchaseOrders.ts
│   ├── useGoodsReceipts.ts
│   ├── usePurchaseReturns.ts
│   └── useInventory.ts
├── pages/                        # Trang chính
│   ├── purchase-orders/
│   │   ├── PurchaseOrderListPage.tsx
│   │   ├── PurchaseOrderDetailPage.tsx
│   │   └── PurchaseOrderFormPage.tsx
│   ├── goods-receipts/
│   │   ├── GoodsReceiptListPage.tsx
│   │   ├── GoodsReceiptDetailPage.tsx
│   │   └── GoodsReceiptFormPage.tsx
│   ├── purchase-returns/
│   │   ├── PurchaseReturnListPage.tsx
│   │   ├── PurchaseReturnDetailPage.tsx
│   │   └── PurchaseReturnFormPage.tsx
│   └── inventory/
│       ├── InventoryBalancePage.tsx
│       ├── InventoryTransactionPage.tsx
│       └── InventoryAdjustPage.tsx
└── components/                   # Shared components
    ├── ProductLineEditor.tsx     # Bảng thêm/sửa dòng sản phẩm
    ├── StatusBadge.tsx           # Hiển thị trạng thái chứng từ
    ├── SupplierSelect.tsx        # Dropdown chọn NCC
    ├── WarehouseSelect.tsx       # Dropdown chọn kho
    ├── ProductSearch.tsx         # Tìm kiếm sản phẩm
    └── UnitSelect.tsx            # Dropdown chọn đơn vị (theo product)
```

### 1.2 Headers bắt buộc cho mọi request

| Header | Giá trị | Ghi chú |
|--------|---------|---------|
| `Authorization` | `Bearer {jwt_token}` | Bắt buộc (trừ login/register) |
| `X-Tenant-Id` | `{tenant_guid}` | Bắt buộc — thiếu sẽ bị 400 |
| `Content-Type` | `application/json` | Cho POST/PUT/PATCH |
| `Idempotency-Key` | `{guid}` | Khuyến nghị cho POST/PUT — tránh duplicate |

### 1.3 Response format chuẩn từ backend

```typescript
// Tất cả response đều theo format này
interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  errors: string[];
  traceId: string;
}

// Response có phân trang
interface PagedResult<T> {
  items: T[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}
```

---

## 2. TypeScript Interfaces (Mirror Backend DTOs)

### 2.1 Enums

```typescript
// enums.ts

export enum DocumentStatus {
  Draft = "Draft",         // 0 — Bản nháp, cho phép chỉnh sửa
  Confirmed = "Confirmed", // 1 — Đã xác nhận
  Completed = "Completed", // 2 — Hoàn thành
  Cancelled = "Cancelled", // 3 — Đã hủy
}

export enum InventoryTransactionType {
  In = "In",                       // 0 — Nhập kho
  Out = "Out",                     // 1 — Xuất kho
  Adjust = "Adjust",               // 2 — Điều chỉnh
  Return = "Return",               // 3 — Trả hàng
  Transfer = "Transfer",           // 4 — Chuyển kho
  OpeningBalance = "OpeningBalance" // 5 — Tồn đầu kỳ
}

export enum InventoryReferenceType {
  Purchase = "Purchase",     // 0
  Sale = "Sale",             // 1
  Return = "Return",         // 2
  Transfer = "Transfer",     // 3
  Adjustment = "Adjustment", // 4
  Promotion = "Promotion",   // 5
  Disposal = "Disposal",     // 6
}

export enum EntityStatus {
  Inactive = "Inactive", // 0
  Active = "Active",     // 1
}
```

> **Lưu ý:** Backend cấu hình `JsonStringEnumConverter` — enum trả về dạng **string** (không phải number). Client phải so sánh bằng string.

### 2.2 Purchase Order Types

```typescript
// types/purchase.ts

// ─── Response ───

export interface PurchaseOrderDto {
  id: string;                    // GUID
  code: string;                  // "PO-20260317-A1B2"
  supplierId: string;
  supplierName: string;
  orderDate: string;             // ISO 8601
  status: DocumentStatus;
  note: string | null;
  totalAmount: number;           // Σ (qty × unitPrice)
  discountAmount: number;
  vatAmount: number;             // Σ (qty × unitPrice × vatRate/100)
  grandTotal: number;            // total - discount + vat
  lines: PurchaseOrderLineDto[];
}

export interface PurchaseOrderLineDto {
  id: string;
  productId: string;
  productName: string;
  unitId: string;
  unitName: string;
  quantity: number;
  unitPrice: number;
  vatRate: number;               // 0–100 (%)
  convertedQuantity: number;     // Số lượng quy đổi về base unit
  lineTotal: number;             // qty × unitPrice × (1 + vatRate/100)
}

// ─── Request ───

export interface CreatePurchaseOrderRequest {
  supplierId: string;            // Required — GUID NCC
  orderDate: string;             // Required — ISO 8601, ≤ today + 30 ngày
  note?: string;                 // Optional — max 500 ký tự
  discountAmount?: number;       // Default: 0
  lines: CreatePurchaseOrderLineRequest[];  // Required — ≥ 1 dòng
}

export interface CreatePurchaseOrderLineRequest {
  productId: string;             // Required — GUID sản phẩm
  unitId: string;                // Required — GUID đơn vị mua
  quantity: number;              // Required — > 0
  unitPrice: number;             // Required — ≥ 0
  vatRate: number;               // Required — 0 ≤ x ≤ 100
}

export interface UpdatePurchaseOrderRequest {
  supplierId: string;
  orderDate: string;
  note?: string;
  discountAmount?: number;
  lines: CreatePurchaseOrderLineRequest[];  // Thay thế toàn bộ lines cũ
}

// ─── Filter ───

export interface PurchaseOrderFilterRequest {
  supplierId?: string;
  status?: DocumentStatus;
  fromDate?: string;             // ISO 8601
  toDate?: string;               // ISO 8601
  page?: number;                 // Default: 1
  pageSize?: number;             // Default: 20
}
```

### 2.3 Goods Receipt Types

```typescript
// ─── Response ───

export interface GoodsReceiptDto {
  id: string;
  code: string;                  // "GR-20260318-C3D4"
  purchaseOrderId: string;
  purchaseOrderCode: string;
  warehouseId: string;
  warehouseName: string;
  receiptDate: string;
  status: DocumentStatus;
  note: string | null;
  lines: GoodsReceiptLineDto[];
}

export interface GoodsReceiptLineDto {
  id: string;
  productId: string;
  productName: string;
  unitId: string;
  unitName: string;
  quantity: number;
  convertedQuantity: number;
  unitCost: number;              // Giá nhập thực tế/đơn vị
  batchNumber: string | null;
  expiryDate: string | null;     // ISO 8601
}

// ─── Request ───

export interface CreateGoodsReceiptRequest {
  purchaseOrderId: string;       // Required — PO phải ở trạng thái Confirmed
  warehouseId: string;           // Required — kho nhập
  receiptDate: string;           // Required — ISO 8601
  note?: string;                 // Optional — max 500 ký tự
  lines: CreateGoodsReceiptLineRequest[];  // Required — ≥ 1 dòng
}

export interface CreateGoodsReceiptLineRequest {
  productId: string;             // Required
  unitId: string;                // Required
  quantity: number;              // Required — > 0
  unitCost: number;              // Required — ≥ 0
  batchNumber?: string;          // Optional — max 50 ký tự (bắt buộc nếu product.isBatchManaged)
  expiryDate?: string;           // Optional — ISO 8601, phải > now (bắt buộc nếu product.isExpiryManaged)
}

// ─── Filter ───

export interface GoodsReceiptFilterRequest {
  purchaseOrderId?: string;
  warehouseId?: string;
  status?: DocumentStatus;
  fromDate?: string;
  toDate?: string;
  page?: number;                 // Default: 1
  pageSize?: number;             // Default: 20
}
```

### 2.4 Purchase Return Types

```typescript
// ─── Response ───

export interface PurchaseReturnDto {
  id: string;
  code: string;                  // "PR-20260320-E5F6"
  goodsReceiptId: string;
  goodsReceiptCode: string;
  supplierId: string;
  supplierName: string;
  returnDate: string;
  reason: string | null;
  status: DocumentStatus;
  totalReturnAmount: number;
  isRefunded: boolean;
  lines: PurchaseReturnLineDto[];
}

export interface PurchaseReturnLineDto {
  id: string;
  productId: string;
  productName: string;
  unitId: string;
  unitName: string;
  quantity: number;
  convertedQuantity: number;
  unitCost: number;
  returnAmount: number;          // quantity × unitCost
}

// ─── Request ───

export interface CreatePurchaseReturnRequest {
  goodsReceiptId: string;        // Required — GR phải ở trạng thái Completed
  supplierId: string;            // Required
  returnDate: string;            // Required — ≤ today + 1 ngày
  reason?: string;               // Optional — max 500 ký tự
  isRefunded: boolean;           // Đã hoàn tiền hay chưa
  lines: CreatePurchaseReturnLineRequest[];  // Required — ≥ 1 dòng
}

export interface CreatePurchaseReturnLineRequest {
  productId: string;             // Required — phải thuộc GR gốc
  unitId: string;                // Required
  quantity: number;              // Required — > 0, ≤ (đã nhập − đã trả trước đó)
  unitCost: number;              // Required — ≥ 0
}

// ─── Filter ───

export interface PurchaseReturnFilterRequest {
  supplierId?: string;
  goodsReceiptId?: string;
  status?: DocumentStatus;
  fromDate?: string;
  toDate?: string;
  page?: number;
  pageSize?: number;
}
```

### 2.5 Inventory Types

```typescript
// types/inventory.ts

// ─── Response ───

export interface InventoryBalanceDto {
  productId: string;
  productCode: string;
  productName: string;
  warehouseId: string;
  warehouseName: string;
  quantityOnHand: number;        // Tồn kho vật lý (base unit)
  quantityReserved: number;      // Đã đặt trước cho Sales Order
  quantityAvailable: number;     // = onHand - reserved
  lastUpdated: string;           // ISO 8601
}

export interface InventoryTransactionDto {
  id: string;
  productId: string;
  productName: string;
  warehouseId: string;
  warehouseName: string;
  transactionType: InventoryTransactionType;
  referenceType: InventoryReferenceType;
  referenceId: string | null;
  quantity: number;              // Dương = nhập, Âm = xuất
  unitCost: number;
  batchNumber: string | null;
  expiryDate: string | null;
  note: string | null;
  createdAt: string;
}

// ─── Filter ───

export interface InventoryBalanceFilterRequest {
  productId?: string;
  warehouseId?: string;
  onlyPositive?: boolean;        // Default: false
  page?: number;                 // Default: 1
  pageSize?: number;             // Default: 50
}

export interface InventoryTransactionFilterRequest {
  productId?: string;
  warehouseId?: string;
  transactionType?: InventoryTransactionType;
  fromDate?: string;
  toDate?: string;
  page?: number;
  pageSize?: number;
}

// ─── Request ───

export interface AdjustInventoryRequest {
  productId: string;             // Required
  warehouseId: string;           // Required
  targetQuantity: number;        // Required — ≥ 0 (delta tính tự động)
  unitCost: number;              // Required — ≥ 0
  note?: string;                 // Optional — max 500 ký tự
}

export interface SetOpeningBalanceRequest {
  productId: string;             // Required
  warehouseId: string;           // Required
  quantity: number;              // Required — ≥ 0 (ghi đè, không cộng dồn)
  unitCost: number;              // Required — ≥ 0
  note?: string;                 // Optional — max 500 ký tự
}
```

### 2.6 Common Types

```typescript
// types/common.ts

export interface CancelRequest {
  reason?: string;
}

export interface SelectOption {
  id: string;
  code: string;
  name: string;
}

// Master data types dùng trong dropdowns
export interface SupplierDto {
  id: string;
  code: string;
  name: string;
  paymentTermDays: number;
  creditLimit: number;
}

export interface WarehouseDto {
  id: string;
  code: string;
  name: string;
  address: string | null;
}

export interface ProductDto {
  id: string;
  code: string;
  name: string;
  baseUnitId: string;
  baseUnitName: string;
  purchaseUnitId: string | null;
  purchaseUnitName: string | null;
  costPrice: number;
  vatRate: number;
  costingMethod: string;
  isBatchManaged: boolean;
  isExpiryManaged: boolean;
  status: EntityStatus;
  unitConversions: ProductUnitConversionDto[];
}

export interface ProductUnitConversionDto {
  fromUnitId: string;
  fromUnitName: string;
  toUnitId: string;
  toUnitName: string;
  conversionRate: number;
}
```

---

## 3. HTTP Client Setup

### 3.1 Base HTTP Client

```typescript
// api/httpClient.ts

import axios, { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from "axios";
import { v4 as uuidv4 } from "uuid";
import { ApiResponse } from "@/types/common";

const BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

const httpClient: AxiosInstance = axios.create({
  baseURL: `${BASE_URL}/api/v1`,
  timeout: 30_000,
  headers: { "Content-Type": "application/json" },
});

// ─── Request Interceptor ───
httpClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  // JWT Token
  const token = localStorage.getItem("accessToken");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  // Tenant ID (bắt buộc)
  const tenantId = localStorage.getItem("tenantId");
  if (tenantId) {
    config.headers["X-Tenant-Id"] = tenantId;
  }

  // Idempotency Key cho POST/PUT (tránh gửi trùng)
  if (config.method === "post" || config.method === "put") {
    if (!config.headers["Idempotency-Key"]) {
      config.headers["Idempotency-Key"] = uuidv4();
    }
  }

  return config;
});

// ─── Response Interceptor ───
httpClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<ApiResponse<null>>) => {
    const status = error.response?.status;
    const data = error.response?.data;

    switch (status) {
      case 400:
        // Lỗi business rule (AppException) hoặc thiếu X-Tenant-Id
        throw new AppError(data?.message || "Bad Request", data?.errors ?? []);
      case 401:
        // Token hết hạn → refresh hoặc redirect login
        // TODO: Implement token refresh logic
        window.location.href = "/login";
        break;
      case 403:
        throw new AppError("Bạn không có quyền thực hiện chức năng này", []);
      case 404:
        throw new AppError(data?.message || "Không tìm thấy dữ liệu", []);
      case 409:
        // Concurrency conflict (InventoryBalance.Xmin mismatch)
        throw new AppError(
          "Dữ liệu đã bị thay đổi bởi người khác. Vui lòng tải lại trang.",
          []
        );
      case 422:
        // Validation errors (FluentValidation)
        throw new ValidationError(data?.errors ?? []);
      case 429:
        throw new AppError("Quá nhiều yêu cầu. Vui lòng thử lại sau.", []);
      default:
        throw new AppError(
          data?.message || "Lỗi hệ thống. Vui lòng thử lại sau.",
          [],
          data?.traceId
        );
    }

    return Promise.reject(error);
  }
);

export class AppError extends Error {
  constructor(
    message: string,
    public errors: string[],
    public traceId?: string
  ) {
    super(message);
  }
}

export class ValidationError extends AppError {
  constructor(public errors: string[]) {
    super("Dữ liệu không hợp lệ", errors);
  }
}

export default httpClient;
```

### 3.2 Rate Limiting từ backend

| Policy | Giới hạn | Áp dụng cho |
|--------|----------|-------------|
| `general` | 200 request / 1 phút | Tất cả endpoint |
| `auth` | 10 request / 1 phút | Login, register, refresh |
| `public` | 30 request / 1 phút | Health, public APIs |

Client nên implement **retry with exponential backoff** khi gặp `429 Too Many Requests`.

---

## 4. API Client Functions

### 4.1 Purchase Order API

```typescript
// api/purchaseOrderApi.ts

import httpClient from "./httpClient";
import type {
  ApiResponse, PagedResult,
  PurchaseOrderDto, PurchaseOrderFilterRequest,
  CreatePurchaseOrderRequest, UpdatePurchaseOrderRequest,
  CancelRequest,
} from "@/types";

const BASE = "/purchase-orders";

export const purchaseOrderApi = {
  /** Danh sách đơn mua hàng (filter, phân trang) */
  getList: (filter: PurchaseOrderFilterRequest) =>
    httpClient.get<ApiResponse<PagedResult<PurchaseOrderDto>>>(BASE, {
      params: filter,
    }),

  /** Chi tiết đơn mua hàng (bao gồm lines + supplier + product info) */
  getById: (id: string) =>
    httpClient.get<ApiResponse<PurchaseOrderDto>>(`${BASE}/${id}`),

  /** Tạo đơn mua hàng mới (trạng thái Draft) */
  create: (request: CreatePurchaseOrderRequest) =>
    httpClient.post<ApiResponse<PurchaseOrderDto>>(BASE, request),

  /** Cập nhật đơn mua hàng (chỉ khi Draft — thay thế toàn bộ lines) */
  update: (id: string, request: UpdatePurchaseOrderRequest) =>
    httpClient.put<ApiResponse<PurchaseOrderDto>>(`${BASE}/${id}`, request),

  /**
   * Xác nhận đơn mua hàng: Draft → Confirmed
   * Yêu cầu role: Admin hoặc Manager
   */
  confirm: (id: string) =>
    httpClient.post<ApiResponse<PurchaseOrderDto>>(`${BASE}/${id}/confirm`),

  /**
   * Hủy đơn mua hàng
   * Yêu cầu role: Admin hoặc Manager
   * Không hủy được nếu đã có GoodsReceipt Completed
   */
  cancel: (id: string, request?: CancelRequest) =>
    httpClient.post<ApiResponse<void>>(`${BASE}/${id}/cancel`, request ?? {}),
};
```

### 4.2 Goods Receipt API

```typescript
// api/goodsReceiptApi.ts

const BASE = "/goods-receipts";

export const goodsReceiptApi = {
  /** Danh sách phiếu nhập kho — Yêu cầu role Manager */
  getList: (filter: GoodsReceiptFilterRequest) =>
    httpClient.get<ApiResponse<PagedResult<GoodsReceiptDto>>>(BASE, {
      params: filter,
    }),

  /** Chi tiết phiếu nhập kho */
  getById: (id: string) =>
    httpClient.get<ApiResponse<GoodsReceiptDto>>(`${BASE}/${id}`),

  /**
   * Tạo phiếu nhập kho (Draft)
   * PO gốc phải ở trạng thái Confirmed
   * Một PO có thể có nhiều GR (nhập nhiều lần — partial delivery)
   */
  create: (request: CreateGoodsReceiptRequest) =>
    httpClient.post<ApiResponse<GoodsReceiptDto>>(BASE, request),

  /**
   * Xác nhận nhập kho — BƯỚC QUAN TRỌNG NHẤT
   * Side-effects (trong 1 transaction):
   *   1. Cộng tồn kho (InventoryBalance.QuantityOnHand +=)
   *   2. Ghi log InventoryTransaction (type = In)
   *   3. Tạo công nợ AP (DebtLedger — tăng nợ NCC)
   *   4. Tạo bút toán kế toán (Nợ 156 / Có 331)
   *   5. Tự động chuyển PO → Completed nếu đã nhận đủ tất cả lines
   */
  confirm: (id: string) =>
    httpClient.post<ApiResponse<GoodsReceiptDto>>(`${BASE}/${id}/confirm`),

  /** Hủy phiếu nhập kho (chỉ khi Draft — Completed phải tạo PurchaseReturn) */
  cancel: (id: string) =>
    httpClient.post<ApiResponse<void>>(`${BASE}/${id}/cancel`),
};
```

### 4.3 Purchase Return API

```typescript
// api/purchaseReturnApi.ts

const BASE = "/purchase-returns";

export const purchaseReturnApi = {
  /** Danh sách phiếu trả hàng */
  getList: (filter: PurchaseReturnFilterRequest) =>
    httpClient.get<ApiResponse<PagedResult<PurchaseReturnDto>>>(BASE, {
      params: filter,
    }),

  /** Chi tiết phiếu trả hàng */
  getById: (id: string) =>
    httpClient.get<ApiResponse<PurchaseReturnDto>>(`${BASE}/${id}`),

  /**
   * Tạo phiếu trả hàng (Draft)
   * GR gốc phải ở trạng thái Completed
   * Số lượng trả ≤ (số lượng đã nhập − số lượng đã trả trước đó)
   */
  create: (request: CreatePurchaseReturnRequest) =>
    httpClient.post<ApiResponse<PurchaseReturnDto>>(BASE, request),

  /**
   * Xác nhận trả hàng — Yêu cầu role Manager
   * Side-effects (trong 1 transaction):
   *   1. Giảm tồn kho (InventoryBalance.QuantityOnHand -=)
   *   2. Ghi log InventoryTransaction (type = Return)
   *   3. Giảm công nợ AP (DebtLedger — giảm nợ NCC)
   *   4. Tạo bút toán đảo (Nợ 331 / Có 156)
   */
  confirm: (id: string) =>
    httpClient.post<ApiResponse<PurchaseReturnDto>>(`${BASE}/${id}/confirm`),
};
```

### 4.4 Inventory API

```typescript
// api/inventoryApi.ts

const BASE = "/inventory";

export const inventoryApi = {
  /** Tra cứu tồn kho hiện tại (filter theo product, warehouse) */
  getBalances: (filter: InventoryBalanceFilterRequest) =>
    httpClient.get<ApiResponse<PagedResult<InventoryBalanceDto>>>(
      `${BASE}/balances`, { params: filter }
    ),

  /** Lịch sử biến động kho (filter theo product, warehouse, type, date) */
  getTransactions: (filter: InventoryTransactionFilterRequest) =>
    httpClient.get<ApiResponse<PagedResult<InventoryTransactionDto>>>(
      `${BASE}/transactions`, { params: filter }
    ),

  /**
   * Điều chỉnh tồn kho (set target quantity — delta tính tự động)
   * Yêu cầu role: Admin
   */
  adjust: (request: AdjustInventoryRequest) =>
    httpClient.post<ApiResponse<InventoryTransactionDto>>(
      `${BASE}/adjust`, request
    ),

  /**
   * Nhập tồn đầu kỳ (ghi đè — không cộng dồn)
   * Yêu cầu role: Admin
   */
  setOpeningBalance: (request: SetOpeningBalanceRequest) =>
    httpClient.post<ApiResponse<InventoryTransactionDto>>(
      `${BASE}/opening-balance`, request
    ),
};
```

---

## 5. Client-side Validation

Client nên validate trước khi gửi request để giảm round-trip. Các rules phải **đồng bộ** với FluentValidation ở backend.

### 5.1 Purchase Order Validation

```typescript
// validation/purchaseOrderSchema.ts
// Ví dụ dùng zod (hoặc yup, valibot)

import { z } from "zod";

export const purchaseOrderLineSchema = z.object({
  productId: z.string().uuid("Vui lòng chọn sản phẩm"),
  unitId: z.string().uuid("Vui lòng chọn đơn vị"),
  quantity: z.number().positive("Số lượng phải > 0"),
  unitPrice: z.number().min(0, "Đơn giá phải ≥ 0"),
  vatRate: z.number().min(0).max(100, "Thuế suất 0–100%"),
});

export const createPurchaseOrderSchema = z.object({
  supplierId: z.string().uuid("Vui lòng chọn nhà cung cấp"),
  orderDate: z.string().datetime("Ngày đặt hàng không hợp lệ"),
  note: z.string().max(500, "Ghi chú tối đa 500 ký tự").optional(),
  discountAmount: z.number().min(0).default(0),
  lines: z.array(purchaseOrderLineSchema).min(1, "Cần ít nhất 1 dòng sản phẩm"),
});

export const updatePurchaseOrderSchema = createPurchaseOrderSchema;
```

### 5.2 Goods Receipt Validation

```typescript
export const goodsReceiptLineSchema = z.object({
  productId: z.string().uuid("Vui lòng chọn sản phẩm"),
  unitId: z.string().uuid("Vui lòng chọn đơn vị"),
  quantity: z.number().positive("Số lượng phải > 0"),
  unitCost: z.number().min(0, "Giá nhập phải ≥ 0"),
  batchNumber: z.string().max(50).optional(),
  expiryDate: z.string().datetime().optional(),
  // Lưu ý: Backend validate expiryDate > now, client nên validate tương tự
});

export const createGoodsReceiptSchema = z.object({
  purchaseOrderId: z.string().uuid("Vui lòng chọn đơn mua hàng"),
  warehouseId: z.string().uuid("Vui lòng chọn kho nhập"),
  receiptDate: z.string().datetime("Ngày nhập kho không hợp lệ"),
  note: z.string().max(500).optional(),
  lines: z.array(goodsReceiptLineSchema).min(1, "Cần ít nhất 1 dòng sản phẩm"),
});
```

### 5.3 Purchase Return Validation

```typescript
export const purchaseReturnLineSchema = z.object({
  productId: z.string().uuid("Vui lòng chọn sản phẩm"),
  unitId: z.string().uuid("Vui lòng chọn đơn vị"),
  quantity: z.number().positive("Số lượng trả phải > 0"),
  unitCost: z.number().min(0, "Giá trả phải ≥ 0"),
});

export const createPurchaseReturnSchema = z.object({
  goodsReceiptId: z.string().uuid("Vui lòng chọn phiếu nhập kho"),
  supplierId: z.string().uuid("Vui lòng chọn nhà cung cấp"),
  returnDate: z.string().datetime("Ngày trả hàng không hợp lệ"),
  reason: z.string().max(500).optional(),
  isRefunded: z.boolean(),
  lines: z.array(purchaseReturnLineSchema).min(1, "Cần ít nhất 1 dòng sản phẩm"),
});
```

### 5.4 Inventory Validation

```typescript
export const adjustInventorySchema = z.object({
  productId: z.string().uuid(),
  warehouseId: z.string().uuid(),
  targetQuantity: z.number().min(0, "Số lượng đích phải ≥ 0"),
  unitCost: z.number().min(0, "Giá vốn phải ≥ 0"),
  note: z.string().max(500).optional(),
});

export const openingBalanceSchema = z.object({
  productId: z.string().uuid(),
  warehouseId: z.string().uuid(),
  quantity: z.number().min(0, "Số lượng phải ≥ 0"),
  unitCost: z.number().min(0, "Giá vốn phải ≥ 0"),
  note: z.string().max(500).optional(),
});
```

---

## 6. Triển khai UI theo từng màn hình

### 6.1 Đơn mua hàng — Danh sách

**Route:** `/purchase-orders`  
**API:** `GET /api/v1/purchase-orders?supplierId=&status=&fromDate=&toDate=&page=1&pageSize=20`

```
┌─────────────────────────────────────────────────────────────────┐
│ ĐƠN MUA HÀNG                                    [+ Tạo mới]   │
├─────────────────────────────────────────────────────────────────┤
│ Bộ lọc:                                                        │
│ [NCC ▾]  [Trạng thái ▾]  [Từ ngày] [Đến ngày]  [Tìm kiếm]   │
├────┬──────────┬─────────────┬────────────┬──────────┬──────────┤
│ #  │ Mã đơn   │ NCC         │ Ngày đặt   │ Tổng tiền│Trạng thái│
├────┼──────────┼─────────────┼────────────┼──────────┼──────────┤
│ 1  │ PO-..A1B2│ Lavie VN    │ 17/03/2026 │8,800,000 │ Draft    │
│ 2  │ PO-..C3D4│ Pepsi VN    │ 16/03/2026 │12,500,000│Confirmed │
│ 3  │ PO-..E5F6│ Coca Cola   │ 15/03/2026 │5,200,000 │Completed │
├────┴──────────┴─────────────┴────────────┴──────────┴──────────┤
│ Trang 1/5   [< Trước] [1] [2] [3] [Sau >]                     │
└─────────────────────────────────────────────────────────────────┘
```

**Hành vi:**
- Click vào dòng → Đến trang chi tiết `/purchase-orders/{id}`
- Status badge: `Draft` = xám, `Confirmed` = xanh dương, `Completed` = xanh lá, `Cancelled` = đỏ
- Nút "Tạo mới" → `/purchase-orders/new`
- Polling/refetch mỗi 30s hoặc dùng SWR/React Query stale-while-revalidate

### 6.2 Đơn mua hàng — Tạo / Chỉnh sửa

**Route:** `/purchase-orders/new` hoặc `/purchase-orders/{id}/edit`  
**API:** `POST /api/v1/purchase-orders` hoặc `PUT /api/v1/purchase-orders/{id}`

```
┌─────────────────────────────────────────────────────────────────┐
│ TẠO ĐƠN MUA HÀNG                          [Lưu nháp] [Hủy]   │
├─────────────────────────────────────────────────────────────────┤
│ Nhà cung cấp: [Tìm kiếm NCC ▾]  *                             │
│ Ngày đặt hàng: [📅 17/03/2026]   *                             │
│ Ghi chú:       [________________________]                       │
│ Chiết khấu:    [0          ] đ                                  │
├─────────────────────────────────────────────────────────────────┤
│ CHI TIẾT ĐƠN HÀNG                              [+ Thêm dòng]  │
├────┬──────────────┬────────┬────────┬──────────┬───────┬───────┤
│ #  │ Sản phẩm     │ Đơn vị │ SL     │ Đơn giá  │ VAT % │ Thành│
│    │              │        │        │          │       │ tiền │
├────┼──────────────┼────────┼────────┼──────────┼───────┼───────┤
│ 1  │ [SP-001 ▾]   │[Thùng▾]│ 100    │ 80,000   │ 10    │8.8M  │
│ 2  │ [SP-002 ▾]   │[Hộp ▾] │ 50     │ 45,000   │ 10    │2.475M│
│    │              │        │        │          │       │  [🗑] │
├────┴──────────────┴────────┴────────┴──────────┴───────┴───────┤
│                    Tổng tiền hàng:           10,250,000 đ       │
│                    Chiết khấu:                        0 đ       │
│                    VAT:                       1,025,000 đ       │
│                    TỔNG CỘNG:                11,275,000 đ       │
└─────────────────────────────────────────────────────────────────┘
```

**Logic chính:**

1. **Chọn sản phẩm:** Khi user chọn product → tự động điền:
   - `unitId` = `product.purchaseUnitId` (đơn vị nhập hàng mặc định)
   - `vatRate` = `product.vatRate`
   - `unitPrice` = `product.costPrice` × tỷ lệ quy đổi (nếu unit khác baseUnit)

2. **Dropdown đơn vị:** Chỉ hiển thị các đơn vị có trong `product.unitConversions` + `product.baseUnit`

3. **Tính tiền tự động (client-side):**
   ```typescript
   const lineTotal = quantity * unitPrice * (1 + vatRate / 100);
   const totalAmount = lines.reduce((sum, l) => sum + l.quantity * l.unitPrice, 0);
   const vatAmount = lines.reduce((sum, l) => sum + l.quantity * l.unitPrice * l.vatRate / 100, 0);
   const grandTotal = totalAmount - discountAmount + vatAmount;
   ```
   > Backend cũng tính lại — client-side chỉ để preview, kết quả chính xác lấy từ response.

4. **Chỉ cho phép sửa khi `status === Draft`**. Hiển thị form readonly nếu Confirmed/Completed.

### 6.3 Đơn mua hàng — Chi tiết

**Route:** `/purchase-orders/{id}`  
**API:** `GET /api/v1/purchase-orders/{id}`

```
┌─────────────────────────────────────────────────────────────────┐
│ PO-20260317-A1B2                  Trạng thái: [■ Draft]        │
├─────────────────────────────────────────────────────────────────┤
│ NCC: Công ty TNHH Lavie Việt Nam      Ngày đặt: 17/03/2026    │
│ Ghi chú: Đặt hàng tháng 3                                      │
├─────────────────────────────────────────────────────────────────┤
│ SẢN PHẨM                                                       │
├────┬──────────────┬────────┬───────┬──────────┬───────┬────────┤
│ #  │ Sản phẩm     │ Đơn vị │ SL    │ Đơn giá  │VAT(%)|Th.tiền │
├────┼──────────────┼────────┼───────┼──────────┼───────┼────────┤
│ 1  │SP-001 Lavie  │ Thùng  │ 100   │ 80,000   │ 10   │8.8M    │
│    │ (=2400 chai) │        │       │          │       │        │
├────┴──────────────┴────────┴───────┴──────────┴───────┴────────┤
│ Tổng tiền: 8,000,000 | VAT: 800,000 | Tổng cộng: 8,800,000   │
├─────────────────────────────────────────────────────────────────┤
│ HÀNH ĐỘNG:                                                      │
│ [✏️ Sửa]  [✅ Xác nhận]  [❌ Hủy]  [📦 Tạo phiếu nhập kho]    │
└─────────────────────────────────────────────────────────────────┘
```

**Luật hiển thị nút hành động theo trạng thái:**

| Trạng thái | Sửa | Xác nhận | Hủy | Tạo GR |
|------------|-----|----------|-----|--------|
| Draft | ✅ | ✅ (Manager) | ✅ (Manager) | ❌ |
| Confirmed | ❌ | ❌ | ✅ (Manager, nếu chưa có GR Completed) | ✅ (Manager) |
| Completed | ❌ | ❌ | ❌ | ❌ |
| Cancelled | ❌ | ❌ | ❌ | ❌ |

**Component logic cho nút:**

```typescript
const canEdit = po.status === DocumentStatus.Draft;
const canConfirm = po.status === DocumentStatus.Draft && hasRole("Manager", "Admin");
const canCancel = po.status !== DocumentStatus.Completed
                  && po.status !== DocumentStatus.Cancelled
                  && hasRole("Manager", "Admin");
const canCreateGR = po.status === DocumentStatus.Confirmed && hasRole("Manager", "Admin");
```

### 6.4 Phiếu nhập kho — Tạo mới (từ PO)

**Route:** `/goods-receipts/new?purchaseOrderId={poId}`  
**API:** `POST /api/v1/goods-receipts`

**Flow:**
1. Nhận `purchaseOrderId` từ query param (hoặc dropdown chọn PO Confirmed)
2. Load PO detail → pre-fill lines từ PO:
   - `productId`, `unitId` lấy từ PO line
   - `quantity` = số lượng còn chưa nhập (PO quantity − Σ GR quantities đã nhập)
   - `unitCost` = PO `unitPrice` (giá mua)
3. User chọn `warehouseId` — kho nhập
4. User có thể sửa `quantity` (nhập 1 phần — partial delivery)
5. Nếu product `isBatchManaged` → hiện trường `batchNumber` (bắt buộc)
6. Nếu product `isExpiryManaged` → hiện trường `expiryDate` (bắt buộc, > today)

```
┌─────────────────────────────────────────────────────────────────┐
│ TẠO PHIẾU NHẬP KHO                        [Lưu nháp] [Hủy]   │
├─────────────────────────────────────────────────────────────────┤
│ Đơn mua hàng: [PO-20260317-A1B2] (Confirmed) *                │
│ Kho nhập:     [Kho Trung tâm HN ▾]  *                         │
│ Ngày nhập:    [📅 18/03/2026]  *                               │
│ Ghi chú:      [________________________]                       │
├─────────────────────────────────────────────────────────────────┤
│ CHI TIẾT NHẬP KHO                                              │
├────┬──────────────┬────────┬───────┬──────────┬───────┬────────┤
│ #  │ Sản phẩm     │ Đơn vị │SL nhập│Giá nhập  │Số lô  │Hạn SD │
├────┼──────────────┼────────┼───────┼──────────┼───────┼────────┤
│ 1  │SP-001 Lavie  │ Thùng  │ 60    │ 80,000   │  —    │  —    │
│    │ (PO: 100)    │        │       │          │       │        │
├────┴──────────────┴────────┴───────┴──────────┴───────┴────────┤
│ ⓘ Nhập 1 phần: 60/100 thùng. Tạo phiếu nhập kho khác cho     │
│   số lượng còn lại.                                             │
└─────────────────────────────────────────────────────────────────┘
```

### 6.5 Phiếu nhập kho — Chi tiết & Xác nhận

**Route:** `/goods-receipts/{id}`

**Cảnh báo quan trọng trước khi confirm:**

```
┌─────────────────────────────────────────────────────┐
│ ⚠️ XÁC NHẬN NHẬP KHO                               │
│                                                     │
│ Thao tác này sẽ:                                    │
│ • Cộng tồn kho cho tất cả sản phẩm                 │
│ • Ghi nhận công nợ phải trả NCC                     │
│ • Tạo bút toán kế toán                             │
│ • Không thể hoàn tác (phải tạo phiếu trả hàng)    │
│                                                     │
│               [Hủy]    [Xác nhận nhập kho]          │
└─────────────────────────────────────────────────────┘
```

**Luật nút hành động:**

| Trạng thái | Xác nhận | Hủy | Tạo phiếu trả hàng |
|------------|----------|-----|---------------------|
| Draft | ✅ (Manager) | ✅ (Manager) | ❌ |
| Completed | ❌ | ❌ (phải tạo Return) | ✅ |
| Cancelled | ❌ | ❌ | ❌ |

### 6.6 Phiếu trả hàng — Tạo mới (từ GR)

**Route:** `/purchase-returns/new?goodsReceiptId={grId}`

**Flow:**
1. Load GR detail → pre-fill lines
2. Với mỗi line, hiển thị:
   - Số lượng đã nhập
   - Số lượng đã trả trước đó (từ các PurchaseReturn khác)
   - Số lượng tối đa có thể trả = đã nhập − đã trả
3. User nhập `quantity` ≤ max returnable
4. User nhập `reason` (lý do trả hàng)

```
┌─────────────────────────────────────────────────────────────────┐
│ TẠO PHIẾU TRẢ HÀNG                        [Lưu nháp] [Hủy]   │
├─────────────────────────────────────────────────────────────────┤
│ Phiếu nhập kho: [GR-20260318-C3D4] (Completed)                │
│ NCC:            Công ty TNHH Lavie Việt Nam                     │
│ Ngày trả:       [📅 20/03/2026]  *                             │
│ Lý do:          [Hàng bị méo vỏ, không đạt chất lượng]        │
│ Đã hoàn tiền:   [☐]                                            │
├─────────────────────────────────────────────────────────────────┤
│ CHI TIẾT TRẢ HÀNG                                              │
├────┬──────────────┬────────┬───────┬──────────┬────────────────┤
│ #  │ Sản phẩm     │ Đơn vị │SL trả │Giá trả   │ Có thể trả   │
├────┼──────────────┼────────┼───────┼──────────┼────────────────┤
│ 1  │SP-001 Lavie  │ Thùng  │ 5     │ 80,000   │ Tối đa: 60   │
│    │              │        │       │          │ (Đã trả: 0)   │
├────┴──────────────┴────────┴───────┴──────────┴────────────────┤
│ Tổng tiền trả hàng: 400,000 đ                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 6.7 Tồn kho — Tra cứu

**Route:** `/inventory/balances`  
**API:** `GET /api/v1/inventory/balances?productId=&warehouseId=&onlyPositive=true&page=1&pageSize=50`

```
┌─────────────────────────────────────────────────────────────────┐
│ TỒN KHO                                                        │
├─────────────────────────────────────────────────────────────────┤
│ [Sản phẩm ▾]  [Kho ▾]  [☐ Chỉ hiện > 0]  [Tìm kiếm]         │
├────┬──────────────┬─────────────┬──────────┬──────────┬────────┤
│ #  │ Sản phẩm     │ Kho         │ Tồn kho  │ Đặt trước│ Khả dụng│
├────┼──────────────┼─────────────┼──────────┼──────────┼────────┤
│ 1  │SP-001 Lavie  │ KHo TT HN  │ 2,280    │ 0        │ 2,280  │
│ 2  │SP-002 Pepsi  │ Kho TT HN  │ 500      │ 100      │ 400    │
├────┴──────────────┴─────────────┴──────────┴──────────┴────────┤
│ Hành động: [📊 Xem lịch sử] [⚙️ Điều chỉnh] [📋 Tồn đầu kỳ] │
└─────────────────────────────────────────────────────────────────┘
```

### 6.8 Tồn kho — Lịch sử biến động

**Route:** `/inventory/transactions`  
**API:** `GET /api/v1/inventory/transactions?productId=&warehouseId=&transactionType=&fromDate=&toDate=`

```
┌─────────────────────────────────────────────────────────────────────┐
│ LỊCH SỬ BIẾN ĐỘNG KHO                                              │
├─────────────────────────────────────────────────────────────────────┤
│ [Sản phẩm ▾] [Kho ▾] [Loại ▾] [Từ ngày] [Đến ngày] [Tìm kiếm]   │
├────┬──────────┬────────┬────────┬──────────┬──────────┬────────────┤
│ #  │ Ngày     │Sản phẩm│ Kho    │ Loại     │ Số lượng │ Ghi chú    │
├────┼──────────┼────────┼────────┼──────────┼──────────┼────────────┤
│ 1  │18/03 10h │SP-001  │KHo TT HN│ Nhập kho│ +1,440  │GR-..C3D4   │
│ 2  │19/03 14h │SP-001  │Kho TT HN│ Nhập kho│ +960    │GR-..G7H8   │
│ 3  │20/03 09h │SP-001  │Kho TT HN│ Trả hàng│ -120    │PR-..I9J0   │
└────┴──────────┴────────┴────────┴──────────┴──────────┴────────────┘
```

---

## 7. State Management

### 7.1 Purchase Order Store (Zustand example)

```typescript
// stores/purchaseOrderStore.ts

import { create } from "zustand";
import { purchaseOrderApi } from "@/api/purchaseOrderApi";

interface PurchaseOrderState {
  // State
  list: PurchaseOrderDto[];
  current: PurchaseOrderDto | null;
  filter: PurchaseOrderFilterRequest;
  pagination: { totalCount: number; totalPages: number };
  loading: boolean;
  error: string | null;

  // Actions
  fetchList: (filter?: Partial<PurchaseOrderFilterRequest>) => Promise<void>;
  fetchById: (id: string) => Promise<void>;
  create: (request: CreatePurchaseOrderRequest) => Promise<PurchaseOrderDto>;
  update: (id: string, request: UpdatePurchaseOrderRequest) => Promise<PurchaseOrderDto>;
  confirm: (id: string) => Promise<void>;
  cancel: (id: string, reason?: string) => Promise<void>;
  setFilter: (filter: Partial<PurchaseOrderFilterRequest>) => void;
}

export const usePurchaseOrderStore = create<PurchaseOrderState>((set, get) => ({
  list: [],
  current: null,
  filter: { page: 1, pageSize: 20 },
  pagination: { totalCount: 0, totalPages: 0 },
  loading: false,
  error: null,

  fetchList: async (filter) => {
    const mergedFilter = { ...get().filter, ...filter };
    set({ loading: true, error: null, filter: mergedFilter });
    try {
      const { data } = await purchaseOrderApi.getList(mergedFilter);
      const paged = data.data;
      set({
        list: paged.items,
        pagination: { totalCount: paged.totalCount, totalPages: paged.totalPages },
      });
    } catch (e: any) {
      set({ error: e.message });
    } finally {
      set({ loading: false });
    }
  },

  fetchById: async (id) => {
    set({ loading: true, error: null });
    try {
      const { data } = await purchaseOrderApi.getById(id);
      set({ current: data.data });
    } catch (e: any) {
      set({ error: e.message });
    } finally {
      set({ loading: false });
    }
  },

  create: async (request) => {
    const { data } = await purchaseOrderApi.create(request);
    get().fetchList(); // refresh list
    return data.data;
  },

  update: async (id, request) => {
    const { data } = await purchaseOrderApi.update(id, request);
    set({ current: data.data });
    return data.data;
  },

  confirm: async (id) => {
    const { data } = await purchaseOrderApi.confirm(id);
    set({ current: data.data });
    get().fetchList();
  },

  cancel: async (id, reason) => {
    await purchaseOrderApi.cancel(id, reason ? { reason } : undefined);
    get().fetchById(id); // refresh detail
    get().fetchList();
  },

  setFilter: (filter) => {
    set((state) => ({ filter: { ...state.filter, ...filter, page: 1 } }));
    get().fetchList();
  },
}));
```

---

## 8. Xử lý lỗi từ Backend

### 8.1 Mapping HTTP Status → Hành động Client

| Status | Exception gốc | Ý nghĩa | Xử lý ở client |
|--------|---------------|----------|-----------------|
| **400** | `AppException` | Vi phạm business rule | Hiển thị `message` dưới dạng toast/alert |
| **401** | Unauthorized | Token hết hạn | Redirect `/login` hoặc refresh token |
| **403** | `ForbiddenException` | Không đủ quyền | Toast "Bạn không có quyền thực hiện chức năng này" |
| **404** | `NotFoundException` | Entity không tồn tại | Redirect về danh sách + toast |
| **409** | `DbUpdateConcurrencyException` | Xung đột đồng thời | Alert "Dữ liệu đã thay đổi" → Auto reload |
| **422** | FluentValidation | Validation errors | Hiển thị field-level errors dưới mỗi input |
| **429** | Rate Limiter | Quá nhiều request | Retry after delay + toast thông báo |
| **500** | Unhandled | Lỗi hệ thống | Toast "Lỗi hệ thống" + ghi log `traceId` |

### 8.2 Ví dụ xử lý Business Rule Error

```typescript
// Khi cancel PO mà đã có GR Completed:
try {
  await purchaseOrderStore.cancel(poId, "Không cần nữa");
} catch (error) {
  if (error instanceof AppError) {
    // message: "Cannot cancel a purchase order that has confirmed goods receipts.
    //           Raise a purchase return instead."
    toast.error(error.message);

    // Gợi ý: Navigate đến tạo Purchase Return
    if (error.message.includes("purchase return")) {
      showPromptDialog({
        message: "Bạn có muốn tạo phiếu trả hàng thay thế?",
        onConfirm: () => navigate(`/purchase-returns/new?purchaseOrderId=${poId}`),
      });
    }
  }
}
```

### 8.3 Xử lý Validation Error (422)

```typescript
// Backend trả về errors dạng:
// { "errors": ["'Quantity' must be greater than '0'.", "'SupplierId' must not be empty."] }

// Map các field-level validation:
function mapValidationErrors(errors: string[]): Record<string, string> {
  const fieldMap: Record<string, string> = {};
  for (const error of errors) {
    // FluentValidation format: "'FieldName' must be ..."
    const match = error.match(/^'(\w+(?:\[\d+\]\.\w+)?)'/);
    if (match) {
      fieldMap[match[1]] = error;
    }
  }
  return fieldMap;
}
```

### 8.4 Xử lý Concurrency Error (409)

```typescript
// Khi 2 user cùng confirm 1 GR tại cùng thời điểm:
try {
  await goodsReceiptStore.confirm(grId);
} catch (error) {
  if (error instanceof AppError && error.message.includes("đã bị thay đổi")) {
    // Tự động tải lại dữ liệu mới nhất
    await goodsReceiptStore.fetchById(grId);
    toast.warning("Dữ liệu đã bị thay đổi bởi người khác. Đã tải lại phiên bản mới nhất.");
  }
}
```

---

## 9. Luồng nghiệp vụ E2E — Client Flow

### 9.1 Luồng hoàn chỉnh: Mua hàng → Nhập kho → Trả hàng

```
Giao diện                          API Call                      Backend Side-effect
─────────                          ────────                      ───────────────────

[1] Tạo đơn mua hàng
User chọn NCC, thêm SP          POST /purchase-orders           Ghi PO (Draft)
────────────────────────────────────────────────────────────────────────────────────

[2] Duyệt đơn mua hàng
Manager click "Xác nhận"        POST /purchase-orders/{id}      PO: Draft → Confirmed
                                     /confirm
────────────────────────────────────────────────────────────────────────────────────

[3] Tạo phiếu nhập kho
User chọn PO + kho nhập         POST /goods-receipts            Ghi GR (Draft)
Lines pre-fill từ PO
────────────────────────────────────────────────────────────────────────────────────

[4] Xác nhận nhập kho ⭐
Manager click "Xác nhận"        POST /goods-receipts/{id}       GR: Draft → Completed
  ┌ Confirm dialog ┐                 /confirm                   + Tồn kho += qty
  │ Cảnh báo:      │                                            + Ghi InventoryTx
  │ Không hoàn tác │                                            + Tạo DebtLedger
  └────────────────┘                                            + Tạo JournalEntry
                                                                + PO → Completed (nếu đủ)
────────────────────────────────────────────────────────────────────────────────────

[5] Xem tồn kho (kiểm tra)
User mở trang Tồn kho          GET /inventory/balances          Query InventoryBalance
  → Thấy số lượng tăng             ?productId={}&warehouseId={}
────────────────────────────────────────────────────────────────────────────────────

[6] Tạo phiếu trả hàng
User chọn GR + nhập             POST /purchase-returns           Ghi PR (Draft)
sản phẩm trả + lý do
────────────────────────────────────────────────────────────────────────────────────

[7] Xác nhận trả hàng
Manager click "Xác nhận"        POST /purchase-returns/{id}     PR: Draft → Completed
                                     /confirm                   + Tồn kho -= qty
                                                                + Giảm DebtLedger
                                                                + Bút toán đảo
────────────────────────────────────────────────────────────────────────────────────

[8] Xem lại tồn kho + công nợ
User kiểm tra kết quả          GET /inventory/balances          Tồn kho = nhập − trả
                               GET /inventory/transactions      Lịch sử đầy đủ
```

### 9.2 Partial Delivery (Nhập nhiều lần)

```
PO (100 thùng Lavie, Confirmed)
    │
    ├── GR#1: Nhập 60 thùng → Confirm → Tồn kho +60, PO vẫn Confirmed
    │
    └── GR#2: Nhập 40 thùng → Confirm → Tồn kho +40, PO → Completed (đã nhận đủ)
```

**Client cần:**
- Sau khi tạo GR#1, hiển thị thông báo: "Đã nhập 60/100 thùng. Còn lại 40 thùng."
- Trên trang detail PO, hiển thị danh sách GR đã tạo (query `GET /goods-receipts?purchaseOrderId={poId}`)
- Khi tạo GR#2, pre-fill `quantity` = 40 (= PO quantity − Σ GR quantities)

---

## 10. Phân quyền trên UI

### 10.1 Role-based Access Control

Backend sử dụng 3 roles chính và hệ thống permissions.

| Chức năng | Staff | Manager | Admin |
|-----------|-------|---------|-------|
| Xem danh sách PO | ✅ | ✅ | ✅ |
| Tạo PO (Draft) | ✅ | ✅ | ✅ |
| Sửa PO (Draft) | ✅ | ✅ | ✅ |
| Xác nhận / Hủy PO | ❌ | ✅ | ✅ |
| Tạo / Xem GR | ❌ | ✅ | ✅ |
| Xác nhận / Hủy GR | ❌ | ✅ | ✅ |
| Tạo phiếu trả hàng | ✅ | ✅ | ✅ |
| Xác nhận trả hàng | ❌ | ✅ | ✅ |
| Xem tồn kho / lịch sử kho | ✅ | ✅ | ✅ |
| Điều chỉnh tồn kho | ❌ | ❌ | ✅ |
| Nhập tồn đầu kỳ | ❌ | ❌ | ✅ |

### 10.2 Implementation Pattern

```typescript
// hooks/useAuth.ts
export function useAuth() {
  const user = useAuthStore((s) => s.user);

  return {
    user,
    isAdmin: user?.role === "Admin",
    isManager: user?.role === "Admin" || user?.role === "Manager",
    isStaff: ["Admin", "Manager", "Staff"].includes(user?.role ?? ""),

    // Permission-based (nếu backend trả permissions trong JWT)
    hasPermission: (permission: string) =>
      user?.permissions?.includes(permission) ?? false,
  };
}

// Sử dụng trong component:
const { isManager, isAdmin } = useAuth();

{isManager && po.status === DocumentStatus.Draft && (
  <Button onClick={() => handleConfirm(po.id)}>Xác nhận</Button>
)}

{isAdmin && (
  <Button onClick={() => navigate("/inventory/adjust")}>Điều chỉnh tồn kho</Button>
)}
```

### 10.3 Route Guard

```typescript
// Bảo vệ route chỉ cho Manager trở lên
<Route
  path="/goods-receipts/*"
  element={
    <RequireRole roles={["Admin", "Manager"]}>
      <GoodsReceiptRoutes />
    </RequireRole>
  }
/>

// Bảo vệ route chỉ cho Admin
<Route
  path="/inventory/adjust"
  element={
    <RequireRole roles={["Admin"]}>
      <InventoryAdjustPage />
    </RequireRole>
  }
/>
```

---

## 11. Sidebar Navigation

```typescript
const purchaseMenuItems = [
  {
    label: "Nhập hàng",
    icon: "ShoppingCart",
    children: [
      {
        label: "Đơn mua hàng",
        path: "/purchase-orders",
        permission: "purchasing.view",
      },
      {
        label: "Phiếu nhập kho",
        path: "/goods-receipts",
        roles: ["Admin", "Manager"],
      },
      {
        label: "Trả hàng NCC",
        path: "/purchase-returns",
        permission: "purchasing.return",
      },
    ],
  },
  {
    label: "Kho hàng",
    icon: "Warehouse",
    children: [
      {
        label: "Tồn kho",
        path: "/inventory/balances",
        permission: "inventory.view",
      },
      {
        label: "Lịch sử kho",
        path: "/inventory/transactions",
        permission: "inventory.view",
      },
      {
        label: "Điều chỉnh",
        path: "/inventory/adjust",
        roles: ["Admin"],
      },
      {
        label: "Tồn đầu kỳ",
        path: "/inventory/opening-balance",
        roles: ["Admin"],
      },
    ],
  },
];
```

---

## 12. Idempotency & Optimistic Updates

### 12.1 Idempotency Key

Backend hỗ trợ `Idempotency-Key` header (GUID, cache 24h trong Redis). Client nên:

```typescript
// Khi user click "Lưu" nhiều lần liên tiếp:
// 1. Disable nút ngay sau click đầu tiên
// 2. Gửi cùng Idempotency-Key → backend trả cached response

const handleCreate = async () => {
  setSubmitting(true);
  const idempotencyKey = uuidv4(); // Tạo 1 lần cho action này
  try {
    const { data } = await httpClient.post("/purchase-orders", request, {
      headers: { "Idempotency-Key": idempotencyKey },
    });
    navigate(`/purchase-orders/${data.data.id}`);
  } catch (e) {
    // Nếu retry, dùng cùng idempotencyKey
    toast.error(e.message);
  } finally {
    setSubmitting(false);
  }
};
```

### 12.2 Optimistic Update Pattern

```typescript
// Khi confirm PO, update UI trước rồi gọi API:
const handleConfirm = async (id: string) => {
  // Optimistic: cập nhật UI trước
  set((state) => ({
    current: state.current
      ? { ...state.current, status: DocumentStatus.Confirmed }
      : null,
  }));

  try {
    const { data } = await purchaseOrderApi.confirm(id);
    set({ current: data.data }); // Sync với server response
  } catch (e) {
    // Rollback: tải lại dữ liệu gốc
    await get().fetchById(id);
    throw e;
  }
};
```

---

## 13. Tóm tắt: Checklist triển khai Client

### Phase 1: Foundation
- [ ] Setup HTTP client với interceptors (auth, tenant, idempotency, error handling)
- [ ] Define TypeScript interfaces (mirror tất cả backend DTOs)
- [ ] Define enum values (DocumentStatus, TransactionType, ReferenceType)
- [ ] Setup client-side validation schemas (zod/yup)

### Phase 2: API Client Layer
- [ ] `purchaseOrderApi.ts` — 6 endpoints
- [ ] `goodsReceiptApi.ts` — 5 endpoints
- [ ] `purchaseReturnApi.ts` — 4 endpoints
- [ ] `inventoryApi.ts` — 4 endpoints

### Phase 3: State Management
- [ ] `purchaseOrderStore` (list, detail, CRUD, confirm, cancel)
- [ ] `goodsReceiptStore` (list, detail, create, confirm, cancel)
- [ ] `purchaseReturnStore` (list, detail, create, confirm)
- [ ] `inventoryStore` (balances, transactions, adjust, opening balance)

### Phase 4: Shared Components
- [ ] `StatusBadge` — badge màu theo DocumentStatus
- [ ] `ProductLineEditor` — bảng thêm/sửa dòng sản phẩm (dùng chung PO, GR, PR)
- [ ] `SupplierSelect` / `WarehouseSelect` / `ProductSearch` / `UnitSelect`
- [ ] `ConfirmDialog` — dialog xác nhận hành động quan trọng
- [ ] `MoneyFormat` — format số tiền (VND)

### Phase 5: Purchase Order Pages
- [ ] PurchaseOrderListPage (filter, phân trang, status badge)
- [ ] PurchaseOrderFormPage (tạo/sửa, tính tiền tự động, validation)
- [ ] PurchaseOrderDetailPage (chi tiết, nút hành động theo status + role)

### Phase 6: Goods Receipt Pages
- [ ] GoodsReceiptListPage (filter theo PO, warehouse, status)
- [ ] GoodsReceiptFormPage (pre-fill từ PO, partial delivery, batch/expiry)
- [ ] GoodsReceiptDetailPage (chi tiết, confirm dialog, link to return)

### Phase 7: Purchase Return Pages
- [ ] PurchaseReturnListPage (filter theo supplier, GR, status)
- [ ] PurchaseReturnFormPage (pre-fill từ GR, validate max returnable qty)
- [ ] PurchaseReturnDetailPage (chi tiết, confirm)

### Phase 8: Inventory Pages
- [ ] InventoryBalancePage (tra cứu tồn kho, filter, export)
- [ ] InventoryTransactionPage (lịch sử biến động, filter)
- [ ] InventoryAdjustPage (form điều chỉnh — Admin only)
- [ ] OpeningBalancePage (form tồn đầu kỳ — Admin only)

### Phase 9: Integration & Polish
- [ ] Route guards (role-based)
- [ ] Sidebar navigation với phân quyền
- [ ] Breadcrumbs + page titles
- [ ] Loading states + empty states + error states
- [ ] Toasts cho success/error
- [ ] Responsive layout
- [ ] E2E testing
