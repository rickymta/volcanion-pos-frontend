import type { PaginationParams, DateRangeParams, PaymentMethod, PaymentType, PartnerType, AccountType } from './common'

// ─── Payment ──────────────────────────────────────────────────────────────────

export interface PaymentDto {
  id: string
  paymentDate: string
  /** Backend field name is 'paymentType' */
  paymentType: PaymentType
  /** Backend field name is 'paymentMethod' */
  paymentMethod: PaymentMethod
  amount: number
  partnerType: PartnerType
  partnerId: string
  partnerName: string
  referenceType?: string
  referenceId?: string
  invoiceId?: string
  note?: string
}

export interface PaymentListParams extends PaginationParams, DateRangeParams {
  partnerType?: PartnerType
  partnerId?: string
  paymentType?: PaymentType
  paymentMethod?: PaymentMethod
}

export interface CreatePaymentRequest {
  paymentDate: string
  /** Backend field name is 'paymentType' */
  paymentType: PaymentType
  /** Backend field name is 'paymentMethod' */
  paymentMethod: PaymentMethod
  amount: number
  partnerType: PartnerType
  partnerId: string
  /** Required by backend */
  referenceType: string
  referenceId?: string
  invoiceId?: string
  note?: string
}

// ─── Debt Ledger ──────────────────────────────────────────────────────────────

export interface DebtLedgerDto {
  id: string
  transactionDate: string
  partnerType: PartnerType
  partnerId: string
  debitAmount: number
  creditAmount: number
  /** Backend field name is 'balanceAfter' */
  balanceAfter: number
  referenceType?: string
  referenceId?: string
  /** Backend field name is 'description' */
  description?: string
}

/**
 * Backend GET /debt/{id}/balance returns a single decimal number.
 */
export type DebtBalanceDto = number

export interface DebtParams extends PaginationParams, DateRangeParams {
  partnerId?: string
}

// ─── Account ──────────────────────────────────────────────────────────────────

export interface AccountDto {
  id: string
  code: string
  name: string
  /** Backend field name is 'accountType' */
  accountType: AccountType
  /** Backend field name is 'parentAccountId' */
  parentAccountId?: string
  /** Backend field name is 'parentAccountCode' */
  parentAccountCode?: string
  normalBalance?: string
  description?: string
}

// ─── Journal Entry ────────────────────────────────────────────────────────────

export interface JournalEntryLineDto {
  id: string
  accountId: string
  accountCode: string
  accountName: string
  debitAmount: number
  creditAmount: number
  description?: string
}

export interface JournalEntryDto {
  id: string
  code: string
  entryDate: string
  description: string
  referenceType?: string
  referenceId?: string
  lines: JournalEntryLineDto[]
  createdAt: string
}

export interface JournalEntryParams extends PaginationParams, DateRangeParams {
  referenceType?: string
  referenceId?: string
}

// ─── Reports ──────────────────────────────────────────────────────────────────

export interface ProfitLossReportDto {
  fromDate: string
  toDate: string
  /** Backend field name is 'totalRevenue' */
  totalRevenue: number
  /** Backend field name is 'totalCogs' */
  totalCogs: number
  grossProfit: number
  /** Backend field name is 'totalOperatingExpenses' */
  totalOperatingExpenses: number
  netProfit: number
  /** Backend field name is 'rows' */
  rows: Array<{
    accountType: string
    totalDebit: number
    totalCredit: number
  }>
}

/** Backend GET /reports/account-balances?asOf={date} returns plain array */
export interface AccountBalanceDto {
  accountCode: string
  accountName: string
  accountType: string
  balance: number
}

// ─── Operating Expenses ───────────────────────────────────────────────────────

export type OperatingExpenseType = 'SalesExpense' | 'AdminExpense'
export type OperatingExpenseStatus = 'Draft' | 'Confirmed'

export interface CostAllocationDto {
  id: string
  operatingExpenseId: string
  allocatedAmount: number
  allocationDate: string
  note?: string
}

export interface OperatingExpenseDto {
  id: string
  code: string
  expenseType: OperatingExpenseType
  description: string
  amount: number
  expenseDate: string
  expenseAccountCode: string
  paymentAccountCode: string
  status: OperatingExpenseStatus
  allocations: CostAllocationDto[]
  createdAt: string
}

export interface OperatingExpenseListParams extends PaginationParams, DateRangeParams {
  expenseType?: OperatingExpenseType
  status?: OperatingExpenseStatus
}

export interface CreateOperatingExpenseRequest {
  expenseType: OperatingExpenseType
  description: string
  amount: number
  expenseDate: string
  expenseAccountCode: string
  paymentAccountCode: string
}

export interface AllocateExpenseRequest {
  operatingExpenseId: string
  allocatedAmount: number
  allocationDate: string
  note?: string
}
