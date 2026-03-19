import type { DocumentStatus, InvoiceType, PaginationParams, DateRangeParams } from './common'

// ─── Sales Order ──────────────────────────────────────────────────────────────

export interface SalesOrderLineDto {
  id: string
  productId: string
  productName: string
  unitId: string
  unitName: string
  quantity: number
  unitPrice: number
  /** Backend field name is 'discountAmount' (currency amount, not percent) */
  discountAmount: number
  vatRate: number
  lineTotal: number
  convertedQuantity?: number
}

export interface SalesOrderDto {
  id: string
  code: string
  orderDate: string
  customerId: string
  customerName: string
  branchId?: string
  status: DocumentStatus
  /** Backend field name is 'totalAmount' */
  totalAmount: number
  /** Backend field name is 'discountAmount' */
  discountAmount: number
  /** Backend field name is 'vatAmount' */
  vatAmount: number
  grandTotal: number
  note?: string
  lines: SalesOrderLineDto[]
}

export interface SalesOrderListParams extends PaginationParams, DateRangeParams {
  search?: string
  customerId?: string
  status?: DocumentStatus
  branchId?: string
}

export interface CreateSalesOrderLineRequest {
  productId: string
  unitId: string
  quantity: number
  unitPrice: number
  /** Backend field name is 'discountAmount' (currency amount) */
  discountAmount?: number
  vatRate?: number
}

export interface CreateSalesOrderRequest {
  customerId: string
  orderDate: string
  note?: string
  branchId?: string
  lines: CreateSalesOrderLineRequest[]
}

export type UpdateSalesOrderRequest = Partial<CreateSalesOrderRequest>

export interface ConfirmSalesOrderRequest {
  warehouseId?: string
}

export interface CancelSalesOrderRequest {
  reason?: string
}

// ─── Invoice ──────────────────────────────────────────────────────────────────

export interface InvoiceLineDto {
  id: string
  productId: string
  productName: string
  unitId: string
  unitName: string
  quantity: number
  unitPrice: number
  discountAmount: number
  vatRate: number
  lineTotal: number
}

export interface InvoiceDto {
  id: string
  code: string
  salesOrderId: string
  customerId: string
  customerName: string
  invoiceDate: string
  invoiceType: InvoiceType
  status: DocumentStatus
  totalAmount: number
  discountAmount: number
  vatAmount: number
  grandTotal: number
  paidAmount: number
  remainingAmount: number
  paymentMethod?: string
  note?: string
  lines: InvoiceLineDto[]
}

export interface InvoiceListParams extends PaginationParams, DateRangeParams {
  customerId?: string
  status?: DocumentStatus
  branchId?: string
}

// ─── Sales Return ─────────────────────────────────────────────────────────────

export interface SalesReturnLineDto {
  id: string
  productId: string
  productName: string
  unitId: string
  unitName: string
  quantity: number
  unitPrice: number
  /** Backend field name is 'refundAmount' */
  refundAmount: number
  convertedQuantity?: number
}

export interface SalesReturnDto {
  id: string
  code: string
  returnDate: string
  invoiceId: string
  invoiceCode: string
  customerId: string
  customerName: string
  branchId?: string
  status: DocumentStatus
  /** Backend field name is 'totalRefundAmount' */
  totalRefundAmount: number
  isRefunded: boolean
  reason?: string
  lines: SalesReturnLineDto[]
}

export interface SalesReturnListParams extends PaginationParams, DateRangeParams {
  customerId?: string
  invoiceId?: string
  status?: DocumentStatus
  branchId?: string
}

export interface CreateSalesReturnRequest {
  invoiceId: string
  customerId?: string
  returnDate: string
  reason?: string
  isRefunded: boolean
  branchId?: string
  lines: Array<{
    productId: string
    unitId: string
    quantity: number
    unitPrice: number
  }>
}
