import { createBrowserRouter } from 'react-router-dom'
import { lazy, Suspense } from 'react'
import { AppLayout } from '@/layouts/AppLayout'
import { AuthLayout } from '@/layouts/AuthLayout'
import { RequireAuth } from '@/features/auth/components/RequireAuth'
import { LoadingOverlay } from '@mantine/core'

const LoginPage = lazy(() => import('@/features/auth/pages/LoginPage'))
const DashboardPage = lazy(() => import('@/features/dashboard/pages/DashboardPage'))

// Master
const ProductListPage = lazy(() => import('@/features/master/pages/ProductListPage'))
const ProductFormPage = lazy(() => import('@/features/master/pages/ProductFormPage'))
const CustomerListPage = lazy(() => import('@/features/master/pages/CustomerListPage'))
const SupplierListPage = lazy(() => import('@/features/master/pages/SupplierListPage'))
const WarehouseListPage = lazy(() => import('@/features/master/pages/WarehouseListPage'))
const CategoryListPage = lazy(() => import('@/features/master/pages/CategoryListPage'))
const UnitListPage = lazy(() => import('@/features/master/pages/UnitListPage'))
const BranchListPage = lazy(() => import('@/features/master/pages/BranchListPage'))

// Sales
const SalesOrderListPage = lazy(() => import('@/features/sales/pages/SalesOrderListPage'))
const SalesOrderDetailPage = lazy(() => import('@/features/sales/pages/SalesOrderDetailPage'))
const SalesOrderFormPage = lazy(() => import('@/features/sales/pages/SalesOrderFormPage'))
const InvoiceListPage = lazy(() => import('@/features/sales/pages/InvoiceListPage'))
const InvoiceDetailPage = lazy(() => import('@/features/sales/pages/InvoiceDetailPage'))
const SalesReturnListPage = lazy(() => import('@/features/sales/pages/SalesReturnListPage'))
const SalesReturnDetailPage = lazy(() => import('@/features/sales/pages/SalesReturnDetailPage'))
const SalesReturnFormPage = lazy(() => import('@/features/sales/pages/SalesReturnFormPage'))

// Purchase
const PurchaseOrderListPage = lazy(() => import('@/features/purchase/pages/PurchaseOrderListPage'))
const PurchaseOrderDetailPage = lazy(() => import('@/features/purchase/pages/PurchaseOrderDetailPage'))
const PurchaseOrderFormPage = lazy(() => import('@/features/purchase/pages/PurchaseOrderFormPage'))
const GoodsReceiptListPage = lazy(() => import('@/features/purchase/pages/GoodsReceiptListPage'))
const GoodsReceiptDetailPage = lazy(() => import('@/features/purchase/pages/GoodsReceiptDetailPage'))
const GoodsReceiptFormPage = lazy(() => import('@/features/purchase/pages/GoodsReceiptFormPage'))
const PurchaseReturnListPage = lazy(() => import('@/features/purchase/pages/PurchaseReturnListPage'))
const PurchaseReturnDetailPage = lazy(() => import('@/features/purchase/pages/PurchaseReturnDetailPage'))
const PurchaseReturnFormPage = lazy(() => import('@/features/purchase/pages/PurchaseReturnFormPage'))

// Inventory
const InventoryBalancePage = lazy(() => import('@/features/inventory/pages/InventoryBalancePage'))
const InventoryTransactionsPage = lazy(() => import('@/features/inventory/pages/InventoryTransactionsPage'))
const StockTransferListPage = lazy(() => import('@/features/inventory/pages/StockTransferListPage'))
const StockTransferFormPage = lazy(() => import('@/features/inventory/pages/StockTransferFormPage'))
const StockTransferDetailPage = lazy(() => import('@/features/inventory/pages/StockTransferDetailPage'))
const InventoryAdjustPage = lazy(() => import('@/features/inventory/pages/InventoryAdjustPage'))
const OpeningBalancePage = lazy(() => import('@/features/inventory/pages/OpeningBalancePage'))

// Finance
const PaymentListPage = lazy(() => import('@/features/finance/pages/PaymentListPage'))
const PaymentFormPage = lazy(() => import('@/features/finance/pages/PaymentFormPage'))
const DebtPage = lazy(() => import('@/features/finance/pages/DebtPage'))
const AccountListPage = lazy(() => import('@/features/finance/pages/AccountListPage'))
const JournalEntryListPage = lazy(() => import('@/features/finance/pages/JournalEntryListPage'))
const OperatingExpenseListPage = lazy(() => import('@/features/finance/pages/OperatingExpenseListPage'))
const OperatingExpenseFormPage = lazy(() => import('@/features/finance/pages/OperatingExpenseFormPage'))
const OperatingExpenseDetailPage = lazy(() => import('@/features/finance/pages/OperatingExpenseDetailPage'))

// Reports
const ProfitLossPage = lazy(() => import('@/features/reports/pages/ProfitLossPage'))
const AccountBalancesPage = lazy(() => import('@/features/reports/pages/AccountBalancesPage'))

// Delivery
const DeliveryListPage = lazy(() => import('@/features/delivery/pages/DeliveryListPage'))
const DeliveryDetailPage = lazy(() => import('@/features/delivery/pages/DeliveryDetailPage'))

// Settings
const UserListPage = lazy(() => import('@/features/settings/pages/UserListPage'))
const ProfilePage = lazy(() => import('@/features/settings/pages/ProfilePage'))
const ChangePasswordPage = lazy(() => import('@/features/settings/pages/ChangePasswordPage'))
const RolesPermissionsPage = lazy(() => import('@/features/settings/pages/RolesPermissionsPage'))

// Error pages
const NotFoundPage = lazy(() => import('@/features/error/pages/NotFoundPage'))
const ForbiddenPage = lazy(() => import('@/features/error/pages/ForbiddenPage'))
const InternalErrorPage = lazy(() => import('@/features/error/pages/InternalErrorPage'))

const SuspenseWrap = ({ children }: { children: React.ReactNode }) => (
  <Suspense fallback={<LoadingOverlay visible />}>{children}</Suspense>
)

export const router = createBrowserRouter([
  {
    path: '/auth',
    element: <AuthLayout />,
    children: [
      {
        path: 'login',
        element: (
          <SuspenseWrap>
            <LoginPage />
          </SuspenseWrap>
        ),
      },
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
      {
        index: true,
        element: (
          <SuspenseWrap>
            <DashboardPage />
          </SuspenseWrap>
        ),
      },
      // Master
      { path: 'master/products', element: <SuspenseWrap><ProductListPage /></SuspenseWrap> },
      { path: 'master/products/new', element: <SuspenseWrap><ProductFormPage /></SuspenseWrap> },
      { path: 'master/products/:id', element: <SuspenseWrap><ProductFormPage /></SuspenseWrap> },
      { path: 'master/products/:id/edit', element: <SuspenseWrap><ProductFormPage /></SuspenseWrap> },
      { path: 'master/customers', element: <SuspenseWrap><CustomerListPage /></SuspenseWrap> },
      { path: 'master/suppliers', element: <SuspenseWrap><SupplierListPage /></SuspenseWrap> },
      { path: 'master/warehouses', element: <SuspenseWrap><WarehouseListPage /></SuspenseWrap> },
      { path: 'master/categories', element: <SuspenseWrap><CategoryListPage /></SuspenseWrap> },
      { path: 'master/units', element: <SuspenseWrap><UnitListPage /></SuspenseWrap> },
      { path: 'master/branches', element: <SuspenseWrap><BranchListPage /></SuspenseWrap> },
      // Sales
      { path: 'sales/orders', element: <SuspenseWrap><SalesOrderListPage /></SuspenseWrap> },
      { path: 'sales/orders/new', element: <SuspenseWrap><SalesOrderFormPage /></SuspenseWrap> },
      { path: 'sales/orders/:id', element: <SuspenseWrap><SalesOrderDetailPage /></SuspenseWrap> },
      { path: 'sales/orders/:id/edit', element: <SuspenseWrap><SalesOrderFormPage /></SuspenseWrap> },
      { path: 'sales/invoices', element: <SuspenseWrap><InvoiceListPage /></SuspenseWrap> },
      { path: 'sales/invoices/:id', element: <SuspenseWrap><InvoiceDetailPage /></SuspenseWrap> },
      { path: 'sales/returns', element: <SuspenseWrap><SalesReturnListPage /></SuspenseWrap> },
      { path: 'sales/returns/new', element: <SuspenseWrap><SalesReturnFormPage /></SuspenseWrap> },
      { path: 'sales/returns/:id', element: <SuspenseWrap><SalesReturnDetailPage /></SuspenseWrap> },
      // Purchase
      { path: 'purchase/orders', element: <SuspenseWrap><PurchaseOrderListPage /></SuspenseWrap> },
      { path: 'purchase/orders/new', element: <SuspenseWrap><PurchaseOrderFormPage /></SuspenseWrap> },
      { path: 'purchase/orders/:id', element: <SuspenseWrap><PurchaseOrderDetailPage /></SuspenseWrap> },
      { path: 'purchase/orders/:id/edit', element: <SuspenseWrap><PurchaseOrderFormPage /></SuspenseWrap> },
      { path: 'purchase/receipts', element: <SuspenseWrap><GoodsReceiptListPage /></SuspenseWrap> },
      { path: 'purchase/receipts/new', element: <SuspenseWrap><GoodsReceiptFormPage /></SuspenseWrap> },
      { path: 'purchase/receipts/:id', element: <SuspenseWrap><GoodsReceiptDetailPage /></SuspenseWrap> },
      { path: 'purchase/returns', element: <SuspenseWrap><PurchaseReturnListPage /></SuspenseWrap> },
      { path: 'purchase/returns/new', element: <SuspenseWrap><PurchaseReturnFormPage /></SuspenseWrap> },
      { path: 'purchase/returns/:id', element: <SuspenseWrap><PurchaseReturnDetailPage /></SuspenseWrap> },
      // Inventory
      { path: 'inventory/balances', element: <SuspenseWrap><InventoryBalancePage /></SuspenseWrap> },
      { path: 'inventory/transfers', element: <SuspenseWrap><StockTransferListPage /></SuspenseWrap> },
      { path: 'inventory/transfers/new', element: <SuspenseWrap><StockTransferFormPage /></SuspenseWrap> },
      { path: 'inventory/transfers/:id', element: <SuspenseWrap><StockTransferDetailPage /></SuspenseWrap> },
      { path: 'inventory/adjust', element: <SuspenseWrap><InventoryAdjustPage /></SuspenseWrap> },
      { path: 'inventory/transactions', element: <SuspenseWrap><InventoryTransactionsPage /></SuspenseWrap> },
      { path: 'inventory/opening-balance', element: <SuspenseWrap><OpeningBalancePage /></SuspenseWrap> },
      // Finance
      { path: 'finance/payments', element: <SuspenseWrap><PaymentListPage /></SuspenseWrap> },
      { path: 'finance/payments/new', element: <SuspenseWrap><PaymentFormPage /></SuspenseWrap> },
      { path: 'finance/debt', element: <SuspenseWrap><DebtPage /></SuspenseWrap> },
      { path: 'finance/accounts', element: <SuspenseWrap><AccountListPage /></SuspenseWrap> },
      { path: 'finance/journal', element: <SuspenseWrap><JournalEntryListPage /></SuspenseWrap> },
      { path: 'finance/operating-expenses', element: <SuspenseWrap><OperatingExpenseListPage /></SuspenseWrap> },
      { path: 'finance/operating-expenses/new', element: <SuspenseWrap><OperatingExpenseFormPage /></SuspenseWrap> },
      { path: 'finance/operating-expenses/:id', element: <SuspenseWrap><OperatingExpenseDetailPage /></SuspenseWrap> },
      // Reports
      { path: 'reports/profit-loss', element: <SuspenseWrap><ProfitLossPage /></SuspenseWrap> },
      { path: 'reports/account-balances', element: <SuspenseWrap><AccountBalancesPage /></SuspenseWrap> },
      // Delivery
      { path: 'delivery', element: <SuspenseWrap><DeliveryListPage /></SuspenseWrap> },
      { path: 'delivery/:id', element: <SuspenseWrap><DeliveryDetailPage /></SuspenseWrap> },
      // Settings
      { path: 'settings/users', element: <SuspenseWrap><UserListPage /></SuspenseWrap> },
      { path: 'settings/profile', element: <SuspenseWrap><ProfilePage /></SuspenseWrap> },
      { path: 'settings/change-password', element: <SuspenseWrap><ChangePasswordPage /></SuspenseWrap> },
      { path: 'settings/roles', element: <SuspenseWrap><RolesPermissionsPage /></SuspenseWrap> },
      // Error pages (inside app layout)
      { path: '403', element: <SuspenseWrap><ForbiddenPage /></SuspenseWrap> },
      { path: '500', element: <SuspenseWrap><InternalErrorPage /></SuspenseWrap> },
    ],
  },
  {
    path: '*',
    element: (
      <SuspenseWrap>
        <NotFoundPage />
      </SuspenseWrap>
    ),
  },
])
