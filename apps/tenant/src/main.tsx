/**
 * @app     POS Manager (apps/tenant)
 * @port    3000  — http://localhost:3000
 * @theme   Light (defaultColorScheme="light")
 * @color   Blue (posBlue)
 * @badge   STORE
 * @desc    Ứng dụng quản lý cửa hàng: bán hàng, mua hàng, kho, tài chính, giao hàng
 * @users   Nhân viên cửa hàng, quản lý chi nhánh (tenant user)
 */
import '@mantine/core/styles.css'
import { QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router-dom'
import { AppProvider } from '@pos/ui'
import { initI18n } from '@pos/i18n'
import { router } from './routes'
import { queryClient } from './lib/queryClient'
import { TenantBoundary } from './features/auth/components/TenantBoundary'

initI18n('vi')

const root = document.getElementById('root')
if (!root) throw new Error('Root element not found')

createRoot(root).render(
  <StrictMode>
    <AppProvider defaultColorScheme="light">
      <QueryClientProvider client={queryClient}>
        <TenantBoundary>
          <RouterProvider router={router} />
        </TenantBoundary>
        <ReactQueryDevtools initialIsOpen={false} />
      </QueryClientProvider>
    </AppProvider>
  </StrictMode>
)
