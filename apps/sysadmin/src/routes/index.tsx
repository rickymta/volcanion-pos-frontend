import { lazy, Suspense } from 'react'
import { createBrowserRouter } from 'react-router-dom'
import { Center, Loader } from '@mantine/core'
import { AppLayout } from '@/layouts/AppLayout'
import { AuthLayout } from '@/layouts/AuthLayout'
import { RequireAuth } from '@/features/auth/components/RequireAuth'

const LoginPage = lazy(() => import('@/features/auth/pages/LoginPage'))
const DashboardPage = lazy(() => import('@/features/dashboard/pages/DashboardPage'))
const TenantsPage = lazy(() => import('@/features/tenants/pages/TenantsPage'))
const TenantDetailPage = lazy(() => import('@/features/tenants/pages/TenantDetailPage'))
const HealthPage = lazy(() => import('@/features/system/pages/HealthPage'))
const ConfigPage = lazy(() => import('@/features/system/pages/ConfigPage'))
const JobsPage = lazy(() => import('@/features/jobs/pages/JobsPage'))
const AuditLogsPage = lazy(() => import('@/features/audit-logs/pages/AuditLogsPage'))

const Loading = () => (
  <Center h="100vh">
    <Loader size="lg" />
  </Center>
)

const wrap = (Page: React.ComponentType) => (
  <Suspense fallback={<Loading />}>
    <Page />
  </Suspense>
)

export const router = createBrowserRouter([
  {
    path: '/login',
    element: <AuthLayout />,
    children: [
      { index: true, element: wrap(LoginPage) },
    ],
  },
  {
    path: '/',
    element: (
      <RequireAuth>
        <AppLayout />
      </RequireAuth>
    ),
    children: [
      { index: true, element: wrap(DashboardPage) },
      { path: 'tenants', element: wrap(TenantsPage) },
      { path: 'tenants/:id', element: wrap(TenantDetailPage) },
      { path: 'system/health', element: wrap(HealthPage) },
      { path: 'system/config', element: wrap(ConfigPage) },
      { path: 'jobs', element: wrap(JobsPage) },
      { path: 'audit-logs', element: wrap(AuditLogsPage) },
    ],
  },
])
