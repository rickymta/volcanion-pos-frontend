/**
 * @app     POS Sysadmin (apps/sysadmin)
 * @port    3001  — http://localhost:3001
 * @theme   Dark (defaultColorScheme="dark")
 * @color   Red
 * @badge   SYSTEM
 * @desc    Giao diện quản trị hệ thống: quản lý tenant, cấu hình, jobs, audit log
 * @users   Super admin — KHÔNG phải tenant hay cashier
 */
import '@mantine/core/styles.css'
import '@mantine/notifications/styles.css'
import '@mantine/dates/styles.css'
import { QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router-dom'
import { AppProvider } from '@pos/ui'
import { initI18n } from '@pos/i18n'
import { router } from './routes'
import { queryClient } from './lib/queryClient'

initI18n('vi')

const root = document.getElementById('root')
if (!root) throw new Error('Root element not found')

createRoot(root).render(
  <StrictMode>
    <AppProvider defaultColorScheme="dark">
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
        <ReactQueryDevtools initialIsOpen={false} />
      </QueryClientProvider>
    </AppProvider>
  </StrictMode>
)
