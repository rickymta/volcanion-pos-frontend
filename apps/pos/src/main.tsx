/**
 * @app     POS Terminal (apps/pos)
 * @port    3002  — http://localhost:3002
 * @theme   Dark (defaultColorScheme="dark")
 * @color   Teal
 * @badge   CASHIER
 * @desc    Giao diện thu ngân tại quầy: bán hàng nhanh, lịch sử đơn, cuối ca
 * @users   Thu ngân / nhân viên bán hàng tại quầy
 */
import '@mantine/core/styles.css'
import '@mantine/notifications/styles.css'
import { QueryClientProvider } from '@tanstack/react-query'
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
    <AppProvider defaultColorScheme="dark">
      <QueryClientProvider client={queryClient}>
        <TenantBoundary>
          <RouterProvider router={router} />
        </TenantBoundary>
      </QueryClientProvider>
    </AppProvider>
  </StrictMode>
)
