import { createBrowserRouter } from 'react-router-dom'
import { lazy, Suspense } from 'react'
import { PosLayout } from '@/layouts/PosLayout'
import { AuthLayout } from '@/layouts/AuthLayout'
import { RequireAuth } from '@/features/auth/components/RequireAuth'
import { Center, Loader } from '@mantine/core'

const LoginPage = lazy(() => import('@/features/auth/pages/LoginPage'))
const PosTerminalPage = lazy(() => import('@/features/pos/pages/PosTerminalPage'))
const OrderHistoryPage = lazy(() => import('@/features/history/pages/OrderHistoryPage'))
const EndOfShiftPage = lazy(() => import('@/features/pos/pages/EndOfShiftPage'))

const Loading = () => (
  <Center h="100vh">
    <Loader size="lg" />
  </Center>
)

export const router = createBrowserRouter([
  {
    path: '/auth',
    element: <AuthLayout />,
    children: [
      {
        path: 'login',
        element: (
          <Suspense fallback={<Loading />}>
            <LoginPage />
          </Suspense>
        ),
      },
    ],
  },
  {
    path: '/',
    element: (
      <RequireAuth>
        <PosLayout />
      </RequireAuth>
    ),
    children: [
      {
        index: true,
        element: (
          <Suspense fallback={<Loading />}>
            <PosTerminalPage />
          </Suspense>
        ),
      },
      {
        path: 'history',
        element: (
          <Suspense fallback={<Loading />}>
            <OrderHistoryPage />
          </Suspense>
        ),
      },
      {
        path: 'shift',
        element: (
          <Suspense fallback={<Loading />}>
            <EndOfShiftPage />
          </Suspense>
        ),
      },
    ],
  },
  {
    path: '*',
    element: <Center h="100vh">404 - Không tìm thấy trang</Center>,
  },
])
