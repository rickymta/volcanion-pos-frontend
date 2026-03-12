import type { DocumentStatus, PaginationParams, DateRangeParams, TransactionType } from './common'

// ─── Inventory Balance ────────────────────────────────────────────────────────

export interface InventoryBalanceDto {
  productId: string
  productName: string
  productCode: string
  warehouseId: string
  warehouseName: string
  /** Backend field name is 'quantityOnHand' */
  quantityOnHand: number
  /** Backend field name is 'quantityReserved' */
  quantityReserved: number
  /** Backend field name is 'quantityAvailable' */
  quantityAvailable: number
  lastUpdated?: string
}

export interface InventoryBalanceParams extends PaginationParams {
  warehouseId?: string
  productId?: string
  onlyPositive?: boolean
}

// ─── Inventory Transaction ────────────────────────────────────────────────────

export interface InventoryTransactionDto {
  id: string
  /** Backend field name is 'createdAt' */
  createdAt: string
  /** Backend field name is 'transactionType' */
  transactionType: TransactionType
  productId: string
  productName: string
  warehouseId: string
  warehouseName: string
  /** Backend field name is 'quantity' */
  quantity: number
  referenceType?: string
  referenceId?: string
  unitCost?: number
  batchNumber?: string
  expiryDate?: string
  note?: string
}

export interface InventoryTransactionParams extends PaginationParams {
  warehouseId?: string
  productId?: string
  transactionType?: TransactionType
  fromDate?: string
  toDate?: string
}

// ─── Stock Transfer ───────────────────────────────────────────────────────────

export interface StockTransferDto {
  id: string
  code: string
  transferDate: string
  fromWarehouseId: string
  fromWarehouseName: string
  toWarehouseId: string
  toWarehouseName: string
  status: DocumentStatus
  note?: string
  lines: Array<{
    productId: string
    productName: string
    unitId: string
    unitName: string
    quantity: number
  }>
}

export interface StockTransferListParams extends PaginationParams, DateRangeParams {
  status?: DocumentStatus
  fromWarehouseId?: string
  toWarehouseId?: string
}

export interface CreateStockTransferRequest {
  fromWarehouseId: string
  toWarehouseId: string
  transferDate: string
  note?: string
  lines: Array<{
    productId: string
    unitId: string
    quantity: number
  }>
}

// ─── Inventory Adjustment ─────────────────────────────────────────────────────

export interface AdjustInventoryRequest {
  warehouseId: string
  productId: string
  targetQuantity: number
  /** Backend field name is 'note' (not reason) */
  note?: string
  /** Required by backend: unit cost for the adjustment (≥ 0) */
  unitCost: number
}

// ─── Opening Balance ──────────────────────────────────────────────────────────

/**
 * Backend accepts single item (not batched).
 * Call once per product/warehouse combination.
 */
export interface SetOpeningBalanceRequest {
  productId: string
  warehouseId: string
  quantity: number
  unitCost: number
  note?: string
}
