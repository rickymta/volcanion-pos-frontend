// ─── Auth Types ───────────────────────────────────────────────────────────────

export interface TokenPayload {
  sub: string
  email: string
  tenantId: string
  branchId?: string
  roles: string[]
  permissions: string[]
  exp: number
  iat: number
}

export interface UserProfile {
  id: string
  email: string
  fullName: string
  tenantId: string
  /** True when JWT has all_branches = true (Admin always included) */
  isAllBranches?: boolean
  /** List of branch IDs the user is explicitly assigned to */
  branchIds?: string[]
  /** @deprecated Use branchIds[0] instead */
  branchId?: string
  branchName?: string
  roles: string[]
  permissions: string[]
  isActive: boolean
  lastLoginAt?: string
}

export interface AuthTokens {
  accessToken: string
  refreshToken: string
  expiresIn: number
}

export interface AuthState {
  // State
  user: UserProfile | null
  tokens: AuthTokens | null
  isAuthenticated: boolean
  isLoading: boolean

  // Actions
  setAuth: (user: UserProfile, tokens: AuthTokens) => void
  setUser: (user: UserProfile) => void
  setTokens: (tokens: AuthTokens) => void
  clearAuth: () => void
  setLoading: (loading: boolean) => void
}
