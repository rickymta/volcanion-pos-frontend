import { apiClient } from '../client'
import type { PagedResult } from '../types/common'
import type {
  SalesOrderDto,
  SalesOrderListParams,
  CreateSalesOrderRequest,
  UpdateSalesOrderRequest,
  ConfirmSalesOrderRequest,
  CancelSalesOrderRequest,
  InvoiceDto,
  InvoiceListParams,
  SalesReturnDto,
  SalesReturnListParams,
  CreateSalesReturnRequest,
} from '../types/sales'

export const salesOrdersApi = {
  list: (params?: SalesOrderListParams) =>
    apiClient.get<PagedResult<SalesOrderDto>>('/sales-orders', { params }),
  getById: (id: string) =>
    apiClient.get<SalesOrderDto>(`/sales-orders/${id}`),
  create: (body: CreateSalesOrderRequest) =>
    apiClient.post<SalesOrderDto>('/sales-orders', body),
  update: (id: string, body: UpdateSalesOrderRequest) =>
    apiClient.put<SalesOrderDto>(`/sales-orders/${id}`, body),
  confirm: (id: string, body?: ConfirmSalesOrderRequest) =>
    apiClient.post<SalesOrderDto>(`/sales-orders/${id}/confirm`, body),
  cancel: (id: string, body?: CancelSalesOrderRequest) =>
    apiClient.post<SalesOrderDto>(`/sales-orders/${id}/cancel`, body),
}

export const invoicesApi = {
  list: (params?: InvoiceListParams) =>
    apiClient.get<PagedResult<InvoiceDto>>('/invoices', { params }),
  getById: (id: string) =>
    apiClient.get<InvoiceDto>(`/invoices/${id}`),
}

export const salesReturnsApi = {
  list: (params?: SalesReturnListParams) =>
    apiClient.get<PagedResult<SalesReturnDto>>('/sales-returns', { params }),
  getById: (id: string) =>
    apiClient.get<SalesReturnDto>(`/sales-returns/${id}`),
  create: (body: CreateSalesReturnRequest, idempotencyKey?: string) =>
    apiClient.post<SalesReturnDto>('/sales-returns', body,
      idempotencyKey ? { headers: { 'Idempotency-Key': idempotencyKey } } : undefined
    ),
  confirm: (id: string) =>
    apiClient.post<SalesReturnDto>(`/sales-returns/${id}/confirm`),
}
