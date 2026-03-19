import { apiClient } from '../client'
import type { PagedResult } from '../types/common'
import type {
  PurchaseOrderDto,
  PurchaseOrderListParams,
  CreatePurchaseOrderRequest,
  UpdatePurchaseOrderRequest,
  GoodsReceiptDto,
  GoodsReceiptListParams,
  CreateGoodsReceiptRequest,
  PurchaseReturnDto,
  PurchaseReturnListParams,
  CreatePurchaseReturnRequest,
} from '../types/purchase'

export const purchaseOrdersApi = {
  list: (params?: PurchaseOrderListParams) =>
    apiClient.get<PagedResult<PurchaseOrderDto>>('/purchase-orders', { params }),
  getById: (id: string) =>
    apiClient.get<PurchaseOrderDto>(`/purchase-orders/${id}`),
  create: (body: CreatePurchaseOrderRequest, idempotencyKey?: string) =>
    apiClient.post<PurchaseOrderDto>('/purchase-orders', body,
      idempotencyKey ? { headers: { 'Idempotency-Key': idempotencyKey } } : undefined
    ),
  update: (id: string, body: UpdatePurchaseOrderRequest) =>
    apiClient.put<PurchaseOrderDto>(`/purchase-orders/${id}`, body),
  confirm: (id: string) =>
    apiClient.post<PurchaseOrderDto>(`/purchase-orders/${id}/confirm`),
  cancel: (id: string, body?: { reason?: string }) =>
    apiClient.post<PurchaseOrderDto>(`/purchase-orders/${id}/cancel`, body),
}

export const goodsReceiptsApi = {
  list: (params?: GoodsReceiptListParams) =>
    apiClient.get<PagedResult<GoodsReceiptDto>>('/goods-receipts', { params }),
  getById: (id: string) =>
    apiClient.get<GoodsReceiptDto>(`/goods-receipts/${id}`),
  create: (body: CreateGoodsReceiptRequest, idempotencyKey?: string) =>
    apiClient.post<GoodsReceiptDto>('/goods-receipts', body,
      idempotencyKey ? { headers: { 'Idempotency-Key': idempotencyKey } } : undefined
    ),
  confirm: (id: string) =>
    apiClient.post<GoodsReceiptDto>(`/goods-receipts/${id}/confirm`),
  cancel: (id: string) =>
    apiClient.post<GoodsReceiptDto>(`/goods-receipts/${id}/cancel`),
}

export const purchaseReturnsApi = {
  list: (params?: PurchaseReturnListParams) =>
    apiClient.get<PagedResult<PurchaseReturnDto>>('/purchase-returns', { params }),
  getById: (id: string) =>
    apiClient.get<PurchaseReturnDto>(`/purchase-returns/${id}`),
  create: (body: CreatePurchaseReturnRequest, idempotencyKey?: string) =>
    apiClient.post<PurchaseReturnDto>('/purchase-returns', body,
      idempotencyKey ? { headers: { 'Idempotency-Key': idempotencyKey } } : undefined
    ),
  confirm: (id: string) =>
    apiClient.post<PurchaseReturnDto>(`/purchase-returns/${id}/confirm`),
}
