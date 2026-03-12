// ─── Auth Types ───────────────────────────────────────────────────────────────

export interface LoginRequest {
  username: string
  password: string
  tenantId?: string
}

/** Public response from GET /public/tenants/by-slug/:slug */
export interface ResolveTenantDto {
  tenantId: string
  name: string
  status: 'Active' | 'Inactive' | 'Suspended'
}

/** Matches backend AuthTokenResponse — no user object, expiresAt is ISO date */
export interface LoginResponse {
  accessToken: string
  refreshToken: string
  expiresAt?: string
  tokenType: string
}

export interface RefreshTokenRequest {
  refreshToken: string
}

/** Matches GET /api/v1/auth/me response */
export interface UserDto {
  id: string
  username: string
  email?: string
  fullName: string
  status: 'Active' | 'Inactive'
  tenantId: string
  isAllBranches: boolean
  branchIds: string[]
  roleIds: string[]
}

export interface ChangePasswordRequest {
  currentPassword: string
  newPassword: string
}

export interface CreateUserRequest {
  username: string
  email: string
  fullName: string
  password: string
  roleId: string
}

/** Backend PUT /auth/users/{id} only accepts status + isAllBranches */
export interface UpdateUserRequest {
  status?: 'Active' | 'Inactive'
  isAllBranches?: boolean
}

/** Backend GET /auth/users does not support any filter params */
export interface UserListParams {
  page?: number
  pageSize?: number
}

export interface RoleDto {
  id: string
  name: string
  description?: string
  permissions: PermissionDto[]
}

export interface PermissionDto {
  id: string
  name: string
  resource: string
  action: string
}

export interface AssignPermissionsRequest {
  permissionIds: string[]
}

export interface LoginHistoryDto {
  id: string
  userId: string
  ipAddress?: string
  userAgent?: string
  loginAt: string
  isSuccess: boolean
}
