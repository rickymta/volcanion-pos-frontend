import { apiClient } from '../client'
import type { PagedResult } from '../types/common'
import type {
  DeliveryOrderDto,
  DeliveryOrderListParams,
  StartDeliveryRequest,
  CompleteDeliveryRequest,
  FailDeliveryRequest,
} from '../types/delivery'

export const deliveryApi = {
  list: (params?: DeliveryOrderListParams) =>
    apiClient.get<PagedResult<DeliveryOrderDto>>('/delivery-orders', { params }),
  getById: (id: string) =>
    apiClient.get<DeliveryOrderDto>(`/delivery-orders/${id}`),
  start: (id: string, body?: StartDeliveryRequest) =>
    apiClient.post<DeliveryOrderDto>(`/delivery-orders/${id}/start`, body),
  complete: (id: string, body: CompleteDeliveryRequest) =>
    apiClient.post<DeliveryOrderDto>(`/delivery-orders/${id}/complete`, body),
  fail: (id: string, body: FailDeliveryRequest) =>
    apiClient.post<DeliveryOrderDto>(`/delivery-orders/${id}/fail`, body),
  cancel: (id: string) =>
    apiClient.post<DeliveryOrderDto>(`/delivery-orders/${id}/cancel`),
}
