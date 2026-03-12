export interface PagedResult<T> {
  items: T[]
  totalCount: number
  page: number
  pageSize: number
  totalPages: number
}

export interface ApiError {
  message: string
  statusCode?: number
}

export type TenantStatus = 'Active' | 'Inactive' | 'Suspended'

export type SubscriptionPlan = 'Free' | 'Basic' | 'Pro' | 'Enterprise'

export interface TenantDto {
  id: string
  name: string
  slug: string
  status: TenantStatus
  taxCode?: string
  phone?: string
  email?: string
  subscriptionPlan?: SubscriptionPlan
  subscriptionExpiry?: string | null
  timeZone?: string
  currency?: string
  userCount?: number
  adminEmail?: string
  createdAt: string
}

export interface TenantDetailDto extends TenantDto {
  address?: string
  orderCount: number
  productCount: number
  lastActivityAt?: string
}

export interface TenantListParams {
  page?: number
  pageSize?: number
  search?: string
  status?: TenantStatus
}

export interface CreateTenantRequest {
  name: string
  slug: string
  adminEmail: string
  adminUsername: string
  adminPassword: string
  adminFullName: string
  taxCode?: string
  address?: string
  phone?: string
  email?: string
  subscriptionPlan?: SubscriptionPlan
  subscriptionExpiry?: string | null
  timeZone?: string
  currency?: string
}

export interface UpdateTenantRequest {
  name?: string
  status?: TenantStatus
  taxCode?: string
  address?: string
  phone?: string
  email?: string
  subscriptionPlan?: SubscriptionPlan
  subscriptionExpiry?: string | null
  timeZone?: string
  currency?: string
  adminEmail?: string
  adminUsername?: string
  adminPassword?: string
}
