import { Navigate, useLocation } from 'react-router-dom'
import { sysadminAuth } from '@pos/sysadmin-client'

interface Props {
  children: React.ReactNode
}

export function RequireAuth({ children }: Props) {
  const location = useLocation()
  const token = sysadminAuth.getToken()

  if (!token) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  return <>{children}</>
}
