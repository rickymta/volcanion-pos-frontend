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

// ─── Role helpers (raw) ───────────────────────────────────────────────────────

/** Check if user has a specific role (raw name match) */
export function useRole(role: string): boolean {
  const roles = useAuthStore(selectRoles)
  return roles.includes(role)
}

// ─── Policy hooks — mirror backend's [Authorize(Policy = "...")] ──────────────
//
//  Backend defines 3 policies in Program.cs:
//    RequireAdmin   → role == "Admin"
//    RequireManager → role == "Admin" | "Manager"
//    RequireStaff   → role == "Admin" | "Manager" | "Staff"
//
//  These hooks match those policies exactly so the frontend
//  cannot show UI for actions the backend will reject.

/** RequireAdmin — only the Admin role */
export function useIsAdmin(): boolean {
  const roles = useAuthStore(selectRoles)
  return roles.includes('Admin')
}

/** RequireManager — Admin or Manager */
export function useIsManager(): boolean {
  const roles = useAuthStore(selectRoles)
  return roles.includes('Admin') || roles.includes('Manager')
}

/** RequireStaff — Admin, Manager or Staff */
export function useIsStaff(): boolean {
  const roles = useAuthStore(selectRoles)
  return roles.includes('Admin') || roles.includes('Manager') || roles.includes('Staff')
}

/** Evaluate a named backend policy */
export function usePolicy(policy: 'Admin' | 'Manager' | 'Staff'): boolean {
  const roles = useAuthStore(selectRoles)
  if (policy === 'Admin') return roles.includes('Admin')
  if (policy === 'Manager') return roles.includes('Admin') || roles.includes('Manager')
  // Staff
  return roles.includes('Admin') || roles.includes('Manager') || roles.includes('Staff')
}

// ─── Fine-grained permission hooks (future use) ───────────────────────────────
//
//  Backend has a [RequirePermission("...")] attribute but it is NOT attached
//  to any controller endpoint yet. These hooks read the `permissions` array
//  that is embedded in the JWT, providing a client-side fast-path.
//  Until the backend starts using [RequirePermission], the functions below
//  will return `true` for all users (empty JWT permissions array → every
//  check falls back to the role-based path above).

/** Check if user has a specific fine-grained permission claim in the JWT */
export function usePermission(permission: string): boolean {
  const permissions = useAuthStore(selectPermissions)
  return permissions.includes(permission)
}

/** Check if user has any of the given fine-grained permission claims */
export function useAnyPermission(...perms: string[]): boolean {
  const permissions = useAuthStore(selectPermissions)
  return perms.some((p) => permissions.includes(p))
}

/** Check if user has all of the given fine-grained permission claims */
export function useAllPermissions(...perms: string[]): boolean {
  const permissions = useAuthStore(selectPermissions)
  return perms.every((p) => permissions.includes(p))
}

// ─── Selectors ────────────────────────────────────────────────────────────────

/** Returns current tenant ID */
export function useTenantId(): string | undefined {
  return useAuthStore(selectTenantId)
}

/** Returns current branch ID */
export function useBranchId(): string | undefined {
  return useAuthStore(selectBranchId)
}
