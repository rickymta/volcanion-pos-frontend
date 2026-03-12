import { Navigate } from 'react-router-dom'
import { usePermission, useAnyPermission, useAllPermissions } from '@pos/auth'

interface RequirePermissionProps {
  /** A single required permission */
  permission?: string
  /** Any of these permissions satisfies access */
  anyOf?: string[]
  /** All of these permissions are required */
  allOf?: string[]
  /** Where to redirect on denied (defaults to /403) */
  redirectTo?: string
  children: React.ReactNode
  /** Render nothing (instead of redirect) on access denied */
  fallback?: React.ReactNode
}

/**
 * RequirePermission — wraps content that should only be visible to users
 * who hold a specific permission or set of permissions.
 *
 * Usage (route guard):
 *  <RequirePermission permission="sales.confirm" redirectTo="/403">
 *    <SensitivePage />
 *  </RequirePermission>
 *
 * Usage (button/UI hiding):
 *  <RequirePermission anyOf={['admin', 'sales.manage']} fallback={null}>
 *    <Button>Xác nhận</Button>
 *  </RequirePermission>
 */
export function RequirePermission({
  permission = '',
  anyOf = [],
  allOf = [],
  redirectTo = '/403',
  fallback,
  children,
}: RequirePermissionProps) {
  // Always call all hooks unconditionally (rules of hooks)
  const hasSingle = usePermission(permission)
  const hasAny = useAnyPermission(...anyOf)
  const hasAll = useAllPermissions(...allOf)

  let allowed: boolean

  if (permission) {
    allowed = hasSingle
  } else if (anyOf.length > 0) {
    allowed = hasAny
  } else if (allOf.length > 0) {
    allowed = hasAll
  } else {
    allowed = true
  }

  if (!allowed) {
    if (fallback !== undefined) return <>{fallback}</>
    return <Navigate to={redirectTo} replace />
  }

  return <>{children}</>
}

