import { Navigate } from 'react-router-dom'
import { usePermission, useAnyPermission, useAllPermissions } from '@pos/auth'

interface RequirePermissionProps {
  /**
   * A single fine-grained permission code, e.g. "catalog.manage_categories".
   * Maps to backend's [RequirePermission("...")] attribute.
   *
   * NOTE: The backend has this infrastructure built but no endpoint uses it yet.
   * Until endpoints are annotated with [RequirePermission], the JWT will not
   * contain any permission claims and these checks will always pass.
   * Prefer <RequirePolicy> for the role-based policies that are currently active.
   */
  permission?: string
  /** Any of these permission codes satisfies access */
  anyOf?: string[]
  /** All of these permission codes are required */
  allOf?: string[]
  /** Where to redirect on denied (defaults to /403) */
  redirectTo?: string
  children: React.ReactNode
  /** Render nothing (instead of redirect) on access denied */
  fallback?: React.ReactNode
}

/**
 * RequirePermission — guards content behind fine-grained permission claims
 * embedded in the JWT.
 *
 * ⚠️  Backend fine-grained permissions are NOT yet applied to any endpoint.
 *     Use <RequirePolicy> for active role-based access control instead.
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

