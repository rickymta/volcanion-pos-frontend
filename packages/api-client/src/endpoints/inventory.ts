import { apiClient } from '../client'
import type { PagedResult } from '../types/common'
import type {
  InventoryBalanceDto,
  InventoryBalanceParams,
  InventoryTransactionDto,
  InventoryTransactionParams,
  StockTransferDto,
  StockTransferListParams,
  CreateStockTransferRequest,
  AdjustInventoryRequest,
  SetOpeningBalanceRequest,
} from '../types/inventory'

export const inventoryApi = {
  // Balances
  listBalances: (params?: InventoryBalanceParams) =>
    apiClient.get<PagedResult<InventoryBalanceDto>>('/inventory/balances', { params }),

  // Transactions
  listTransactions: (params?: InventoryTransactionParams) =>
    apiClient.get<PagedResult<InventoryTransactionDto>>('/inventory/transactions', { params }),

  // Adjustments — path is /inventory/adjust (not /adjustments)
  adjust: (body: AdjustInventoryRequest) =>
    apiClient.post('/inventory/adjust', body),

  // Opening balance
  setOpeningBalance: (body: SetOpeningBalanceRequest) =>
    apiClient.post('/inventory/opening-balance', body),

  // Stock transfers — path is /stock-transfers (not /inventory/transfers)
  listTransfers: (params?: StockTransferListParams) =>
    apiClient.get<PagedResult<StockTransferDto>>('/stock-transfers', { params }),
  getTransfer: (id: string) =>
    apiClient.get<StockTransferDto>(`/stock-transfers/${id}`),
  createTransfer: (body: CreateStockTransferRequest, idempotencyKey?: string) =>
    apiClient.post<StockTransferDto>('/stock-transfers', body, idempotencyKey ? { headers: { 'Idempotency-Key': idempotencyKey } } : undefined),
  confirmTransfer: (id: string) =>
    apiClient.post<StockTransferDto>(`/stock-transfers/${id}/confirm`),
  // NOTE: cancelTransfer does NOT exist in backend — removed
}
