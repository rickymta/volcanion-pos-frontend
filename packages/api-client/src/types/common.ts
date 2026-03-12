// ─── Common Types ─────────────────────────────────────────────────────────────

export interface ApiResponse<T> {
  data: T
  message?: string
  success: boolean
}

export interface PagedResult<T> {
  items: T[]
  totalCount: number
  page: number
  pageSize: number
  totalPages: number
}

export interface ApiError {
  message: string
  errors?: Record<string, string[]>
  statusCode?: number
}

export interface PaginationParams {
  page?: number
  pageSize?: number
}

export interface DateRangeParams {
  fromDate?: string
  toDate?: string
}

// ─── Shared Enums (mirror backend) ───────────────────────────────────────────
// Backend uses JsonStringEnumConverter — enum values are PascalCase strings

/** Backend: 0=Draft, 1=Confirmed, 2=Cancelled */
export type DocumentStatus = 'Draft' | 'Confirmed' | 'Cancelled'

/** Backend: 0=Pending, 1=InProgress, 2=Completed, 3=Failed, 4=Cancelled */
export type DeliveryStatus = 'Pending' | 'InProgress' | 'Completed' | 'Failed' | 'Cancelled'

/** Backend: 0=Cash, 1=BankTransfer */
export type PaymentMethod = 'Cash' | 'BankTransfer'

/** Backend: 0=Receive, 1=Pay, 2=Refund */
export type PaymentType = 'Receive' | 'Pay' | 'Refund'

export type PartnerType = 'Customer' | 'Supplier'

/** Backend: 0=In, 1=Out, 2=Adjust, 3=OpeningBalance */
export type TransactionType = 'In' | 'Out' | 'Adjust' | 'OpeningBalance'

export type AccountType = 'Asset' | 'Liability' | 'Equity' | 'Revenue' | 'Expense'

/** Backend: 0=Active, 1=Inactive */
export type EntityStatus = 'Active' | 'Inactive'

/** Backend: 0=Retail, 1=Vat, 2=Electronic */
export type InvoiceType = 'Retail' | 'Vat' | 'Electronic'

/** Backend enum: Fifo = 0, Average = 1 */
export type CostingMethod = number
