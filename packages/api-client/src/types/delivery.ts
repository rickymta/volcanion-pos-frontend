import type { DeliveryStatus, PaginationParams, DateRangeParams } from './common'

export interface DeliveryOrderLineDto {
  productId: string
  productName: string
  quantity: number
  unitId: string
  unitName: string
}

export interface DeliveryOrderDto {
  id: string
  code: string
  deliveryDate: string
  salesOrderId: string
  salesOrderCode: string
  customerId: string
  customerName: string
  deliveryAddress?: string
  receiverName?: string
  proofImageUrl?: string
  status: DeliveryStatus
  note?: string
  failReason?: string
  lines: DeliveryOrderLineDto[]
  createdAt: string
  updatedAt: string
}

export interface DeliveryOrderListParams extends PaginationParams, DateRangeParams {
  customerId?: string
  status?: DeliveryStatus
}

export interface StartDeliveryRequest {
  shipperName?: string
}

export interface CompleteDeliveryRequest {
  receiverName: string
  proofImageUrl?: string
  isCodCollected?: boolean
}

export interface FailDeliveryRequest {
  reason: string
}
