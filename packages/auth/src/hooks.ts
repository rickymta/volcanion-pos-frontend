import {
  useAuthStore,
  selectUser,
  selectTokens,
  selectIsAuthenticated,
  selectPermissions,
  selectRoles,
  selectTenantId,
  selectBranchId,
} from './store'

/** Returns current user profile */
export function useAuth() {
  const user = useAuthStore(selectUser)
  const tokens = useAuthStore(selectTokens)
  const isAuthenticated = useAuthStore(selectIsAuthenticated)
  const clearAuth = useAuthStore((s) => s.clearAuth)
  const setAuth = useAuthStore((s) => s.setAuth)
  return { user, tokens, isAuthenticated, clearAuth, setAuth }
}

/** Check if user has a specific permission */
export function usePermission(permission: string): boolean {
  const permissions = useAuthStore(selectPermissions)
  return permissions.includes(permission)
}

/** Check if user has any of the given permissions */
export function useAnyPermission(...perms: string[]): boolean {
  const permissions = useAuthStore(selectPermissions)
  return perms.some((p) => permissions.includes(p))
}

/** Check if user has all of the given permissions */
export function useAllPermissions(...perms: string[]): boolean {
  const permissions = useAuthStore(selectPermissions)
  return perms.every((p) => permissions.includes(p))
}

/** Check if user has a specific role */
export function useRole(role: string): boolean {
  const roles = useAuthStore(selectRoles)
  return roles.includes(role)
}

/** Returns current tenant ID */
export function useTenantId(): string | undefined {
  return useAuthStore(selectTenantId)
}

/** Returns current branch ID */
export function useBranchId(): string | undefined {
  return useAuthStore(selectBranchId)
}
