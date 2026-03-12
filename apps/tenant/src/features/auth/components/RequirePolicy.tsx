import { Navigate } from 'react-router-dom'
import { usePolicy } from '@pos/auth'

/**
 * Backend-defined role-based policies (Program.cs):
 *   Admin   → [Authorize(Policy = "RequireAdmin")]   role: Admin
 *   Manager → [Authorize(Policy = "RequireManager")] role: Admin | Manager
 *   Staff   → [Authorize(Policy = "RequireStaff")]   role: Admin | Manager | Staff
 */
export type PolicyLevel = 'Admin' | 'Manager' | 'Staff'

interface RequirePolicyProps {
  /**
   * The minimum policy level required.
   *
   * @example
   * // Matches backend: [Authorize(Policy = "RequireManager")]
   * <RequirePolicy policy="Manager">
   *   <CreateButton />
   * </RequirePolicy>
   */
  policy: PolicyLevel
  /** Where to redirect when access is denied in route-guard mode. Default: /403 */
  redirectTo?: string
  children: React.ReactNode
  /**
   * If provided, renders this node instead of redirecting when access is denied.
   * Pass `null` to silently hide the content.
   *
   * @example
   * // Hide button for users below Manager level
   * <RequirePolicy policy="Manager" fallback={null}>
   *   <Button>Thêm mới</Button>
   * </RequirePolicy>
   */
  fallback?: React.ReactNode
}

/**
 * RequirePolicy — aligns frontend visibility with backend's role-based policies.
 *
 * Use this component instead of <RequirePermission> for all access control
 * until the backend starts using fine-grained [RequirePermission] attributes.
 *
 * Route guard example (redirect to /403):
 * ```tsx
 * <RequirePolicy policy="Admin" redirectTo="/403">
 *   <AdminOnlyPage />
 * </RequirePolicy>
 * ```
 *
 * UI element guard (hide silently):
 * ```tsx
 * <RequirePolicy policy="Manager" fallback={null}>
 *   <Button leftSection={<IconPlus />}>Thêm mới</Button>
 * </RequirePolicy>
 * ```
 */
export function RequirePolicy({ policy, redirectTo = '/403', fallback, children }: RequirePolicyProps) {
  const allowed = usePolicy(policy)

  if (!allowed) {
    if (fallback !== undefined) return <>{fallback}</>
    return <Navigate to={redirectTo} replace />
  }

  return <>{children}</>
}
