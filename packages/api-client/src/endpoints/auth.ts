import { apiClient } from '../client'
import type { PagedResult } from '../types/common'
import type {
  LoginRequest,
  LoginResponse,
  ResolveTenantDto,
  UserDto,
  ChangePasswordRequest,
  CreateUserRequest,
  UpdateUserRequest,
  UserListParams,
  RoleDto,
  PermissionDto,
  AssignPermissionsRequest,
  LoginHistoryDto,
} from '../types/auth'

export const authApi = {
  // ─── Public ────────────────────────────────────────────────────────────────
  /** Resolve slug → tenantId for subdomain-based tenant detection. No auth required. */
  resolveBySlug: (slug: string) =>
    apiClient.get<ResolveTenantDto>(`/public/tenants/by-slug/${slug}`),

  // ─── Auth ──────────────────────────────────────────────────────────────────
  login: ({ tenantId, ...body }: LoginRequest) =>
    apiClient.post<LoginResponse>('/auth/login', body,
      tenantId ? { headers: { 'X-Tenant-Id': tenantId } } : undefined
    ),

  logout: () =>
    apiClient.post('/auth/logout'),

  me: (tenantId?: string) =>
    apiClient.get<UserDto>('/auth/me',
      tenantId ? { headers: { 'X-Tenant-Id': tenantId } } : undefined
    ),

  changePassword: (body: ChangePasswordRequest) =>
    apiClient.post('/auth/change-password', body),

  loginHistory: (params?: { page?: number; pageSize?: number }) =>
    apiClient.get<PagedResult<LoginHistoryDto>>('/auth/login-history', { params }),

  // ─── Users ─────────────────────────────────────────────────────────────────
  /** Backend returns plain array, not paged */
  listUsers: (params?: UserListParams) =>
    apiClient.get<UserDto[]>('/auth/users', { params }),

  getUser: (id: string) =>
    apiClient.get<UserDto>(`/auth/users/${id}`),

  /** Use POST /auth/register to create users */
  createUser: (body: CreateUserRequest) =>
    apiClient.post<UserDto>('/auth/register', body),

  updateUser: (id: string, body: UpdateUserRequest) =>
    apiClient.put<UserDto>(`/auth/users/${id}`, body),

  /** Backend uses POST, not PUT */
  assignBranches: (userId: string, branchIds: string[]) =>
    apiClient.post(`/auth/users/${userId}/branches`, { branchIds }),

  // ─── Roles (prefix: /roles, NOT /auth/roles) ────────────────────────────────
  listRoles: () =>
    apiClient.get<RoleDto[]>('/roles'),

  getRole: (id: string) =>
    apiClient.get<RoleDto>(`/roles/${id}`),

  createRole: (body: { name: string; description?: string }) =>
    apiClient.post<RoleDto>('/roles', body),

  updateRole: (id: string, body: { name?: string; description?: string }) =>
    apiClient.put<RoleDto>(`/roles/${id}`, body),

  deleteRole: (id: string) =>
    apiClient.delete(`/roles/${id}`),

  // ─── Permissions ───────────────────────────────────────────────────────────
  listPermissions: () =>
    apiClient.get<PermissionDto[]>('/roles/permissions'),

  assignPermissions: (roleId: string, body: AssignPermissionsRequest) =>
    apiClient.put(`/roles/${roleId}/permissions`, body),
}
