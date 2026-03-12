import { sysadminClient, API_ORIGIN } from '../client'
import type { PagedResult, TenantDto, TenantDetailDto, TenantListParams, CreateTenantRequest, UpdateTenantRequest } from '../types/tenant'

export const tenantsApi = {
  list: (params?: TenantListParams) =>
    sysadminClient.get<PagedResult<TenantDto>>('/tenants', { params }),

  getById: (id: string) =>
    sysadminClient.get<TenantDetailDto>(`/tenants/${id}`),

  create: (body: CreateTenantRequest) =>
    sysadminClient.post<TenantDto>('/tenants', body),

  update: (id: string, body: UpdateTenantRequest) =>
    sysadminClient.put<TenantDto>(`/tenants/${id}`, body),

  /** Soft-delete: sets IsDeleted=true, tenant can no longer log in or be resolved */
  delete: (id: string) =>
    sysadminClient.delete<TenantDto>(`/tenants/${id}`),

  /** Seed sample data into a tenant (uses special X-Tenant-Id header) */
  seed: (tenantId: string) =>
    sysadminClient.post(
      `${API_ORIGIN}/v1/admin/seed`,
      {},
      { headers: { 'X-Tenant-Id': tenantId } }
    ),
}
