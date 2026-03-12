/**
 * Enum label definitions mirroring backend enums.
 * Each entry has a display label and a Mantine color for badges.
 */

export type LabelColor = {
  label: string
  color: string
}

// ─── Document Status ──────────────────────────────────────────────────────────

export type DocumentStatus =
  | 'Draft'
  | 'Confirmed'
  | 'Cancelled'
  | 'Completed'
  | 'PartiallyDelivered'
  | 'FullyDelivered'

export const DocumentStatusLabel: Record<DocumentStatus, LabelColor> = {
  Draft: { label: 'Nháp', color: 'gray' },
  Confirmed: { label: 'Đã xác nhận', color: 'blue' },
  Cancelled: { label: 'Đã hủy', color: 'red' },
  Completed: { label: 'Hoàn thành', color: 'green' },
  PartiallyDelivered: { label: 'Giao một phần', color: 'orange' },
  FullyDelivered: { label: 'Đã giao đủ', color: 'teal' },
}

// ─── Delivery Order Status ────────────────────────────────────────────────────

export type DeliveryStatus = 'Pending' | 'InProgress' | 'Completed' | 'Failed' | 'Cancelled'

export const DeliveryStatusLabel: Record<DeliveryStatus, LabelColor> = {
  Pending: { label: 'Chờ giao', color: 'yellow' },
  InProgress: { label: 'Đang giao', color: 'blue' },
  Completed: { label: 'Đã giao', color: 'green' },
  Failed: { label: 'Thất bại', color: 'red' },
  Cancelled: { label: 'Đã hủy', color: 'gray' },
}

// ─── Payment Method ───────────────────────────────────────────────────────────

export type PaymentMethod = 'Cash' | 'BankTransfer' | 'Card' | 'VNPay' | 'MoMo' | 'Other'

export const PaymentMethodLabel: Record<PaymentMethod, string> = {
  Cash: 'Tiền mặt',
  BankTransfer: 'Chuyển khoản',
  Card: 'Thẻ ngân hàng',
  VNPay: 'VNPay',
  MoMo: 'MoMo',
  Other: 'Khác',
}

// ─── Payment Type ─────────────────────────────────────────────────────────────

export type PaymentType = 'Receivable' | 'Payable'

export const PaymentTypeLabel: Record<PaymentType, string> = {
  Receivable: 'Thu tiền',
  Payable: 'Chi tiền',
}

// ─── Partner Type ─────────────────────────────────────────────────────────────

export type PartnerType = 'Customer' | 'Supplier'

export const PartnerTypeLabel: Record<PartnerType, string> = {
  Customer: 'Khách hàng',
  Supplier: 'Nhà cung cấp',
}

// ─── Inventory Transaction Type ───────────────────────────────────────────────

export type TransactionType =
  | 'PurchaseReceipt'
  | 'SalesShipment'
  | 'Transfer'
  | 'Adjustment'
  | 'Return'
  | 'OpeningBalance'

export const TransactionTypeLabel: Record<TransactionType, string> = {
  PurchaseReceipt: 'Nhập mua',
  SalesShipment: 'Xuất bán',
  Transfer: 'Chuyển kho',
  Adjustment: 'Điều chỉnh',
  Return: 'Hàng trả',
  OpeningBalance: 'Số dư đầu kỳ',
}

// ─── User Status ──────────────────────────────────────────────────────────────

export type UserStatus = 'Active' | 'Inactive' | 'Locked'

export const UserStatusLabel: Record<UserStatus, LabelColor> = {
  Active: { label: 'Hoạt động', color: 'green' },
  Inactive: { label: 'Không hoạt động', color: 'gray' },
  Locked: { label: 'Bị khóa', color: 'red' },
}

// ─── Tenant Status ────────────────────────────────────────────────────────────

export type TenantStatus = 'Active' | 'Inactive' | 'Suspended'

export const TenantStatusLabel: Record<TenantStatus, LabelColor> = {
  Active: { label: 'Hoạt động', color: 'green' },
  Inactive: { label: 'Không hoạt động', color: 'gray' },
  Suspended: { label: 'Tạm dừng', color: 'orange' },
}

// ─── Operating Expense Type ───────────────────────────────────────────────────

export type OperatingExpenseType = 'SalesExpense' | 'AdminExpense'

export const OperatingExpenseTypeLabel: Record<OperatingExpenseType, string> = {
  SalesExpense: 'Chi phí bán hàng',
  AdminExpense: 'Chi phí quản lý',
}

// ─── Operating Expense Status ─────────────────────────────────────────────────

export type OperatingExpenseStatus = 'Draft' | 'Confirmed'

export const OperatingExpenseStatusLabel: Record<OperatingExpenseStatus, LabelColor> = {
  Draft: { label: 'Nháp', color: 'gray' },
  Confirmed: { label: 'Đã xác nhận', color: 'green' },
}
