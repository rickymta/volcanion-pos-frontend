import type { DocumentStatus, PaginationParams, DateRangeParams } from './common'

// ─── Purchase Order ───────────────────────────────────────────────────────────

export interface PurchaseOrderLineDto {
  id: string
  productId: string
  productName: string
  unitId: string
  unitName: string
  quantity: number
  unitPrice: number
  vatRate: number
  lineTotal: number
  convertedQuantity?: number
}

export interface PurchaseOrderDto {
  id: string
  code: string
  orderDate: string
  supplierId: string
  supplierName: string
  status: DocumentStatus
  /** Backend field name is 'totalAmount' */
  totalAmount: number
  /** Backend field name is 'vatAmount' */
  vatAmount: number
  grandTotal: number
  note?: string
  lines: PurchaseOrderLineDto[]
}

export interface PurchaseOrderListParams extends PaginationParams, DateRangeParams {
  search?: string
  supplierId?: string
  status?: DocumentStatus
}

export interface CreatePurchaseOrderRequest {
  supplierId: string
  orderDate: string
  note?: string
  lines: Array<{
    productId: string
    unitId: string
    quantity: number
    unitPrice: number
    vatRate?: number
  }>
}

export type UpdatePurchaseOrderRequest = Partial<CreatePurchaseOrderRequest>

// ─── Goods Receipt ────────────────────────────────────────────────────────────

export interface GoodsReceiptLineDto {
  id: string
  productId: string
  productName: string
  unitId: string
  unitName: string
  quantity: number
  /** Backend field name is 'unitCost' */
  unitCost: number
  batchNumber?: string
  expiryDate?: string
  convertedQuantity?: number
}

export interface GoodsReceiptDto {
  id: string
  code: string
  receiptDate: string
  purchaseOrderId?: string
  purchaseOrderCode?: string
  warehouseId: string
  warehouseName: string
  status: DocumentStatus
  note?: string
  lines: GoodsReceiptLineDto[]
}

export interface GoodsReceiptListParams extends PaginationParams, DateRangeParams {
  supplierId?: string
  warehouseId?: string
  status?: DocumentStatus
}

export interface CreateGoodsReceiptRequest {
  purchaseOrderId?: string
  warehouseId: string
  receiptDate: string
  note?: string
  lines: Array<{
    productId: string
    unitId: string
    quantity: number
    /** Backend field name is 'unitCost' */
    unitCost: number
    batchNumber?: string
    expiryDate?: string
  }>
}

// ─── Purchase Return ──────────────────────────────────────────────────────────

export interface PurchaseReturnDto {
  id: string
  code: string
  returnDate: string
  /** Backend: goodsReceiptId is the required source for purchase returns */
  goodsReceiptId: string
  goodsReceiptCode: string
  supplierId: string
  supplierName: string
  status: DocumentStatus
  /** Backend field name is 'totalReturnAmount' */
  totalReturnAmount: number
  isRefunded: boolean
  reason?: string
  lines: Array<{
    productId: string
    productName: string
    unitId: string
    unitName: string
    quantity: number
    /** Backend field name is 'unitCost' */
    unitCost: number
    /** Backend field name is 'returnAmount' */
    returnAmount: number
    convertedQuantity?: number
  }>
}

export interface PurchaseReturnListParams extends PaginationParams, DateRangeParams {
  supplierId?: string
  goodsReceiptId?: string
  status?: DocumentStatus
}

export interface CreatePurchaseReturnRequest {
  /** Required: source goods receipt */
  goodsReceiptId: string
  returnDate: string
  reason?: string
  isRefunded: boolean
  lines: Array<{
    productId: string
    unitId: string
    quantity: number
    /** Backend field name is 'unitCost' */
    unitCost: number
  }>
}
