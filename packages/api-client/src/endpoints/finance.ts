import { apiClient } from '../client'
import type { PagedResult } from '../types/common'
import type {
  PaymentDto,
  PaymentListParams,
  CreatePaymentRequest,
  DebtLedgerDto,
  DebtBalanceDto,
  DebtParams,
  AccountDto,
  JournalEntryDto,
  JournalEntryParams,
  ProfitLossReportDto,
  AccountBalanceDto,
  OperatingExpenseDto,
  OperatingExpenseListParams,
  CreateOperatingExpenseRequest,
  AllocateExpenseRequest,
  CostAllocationDto,
} from '../types/finance'

export const paymentsApi = {
  list: (params?: PaymentListParams) =>
    apiClient.get<PagedResult<PaymentDto>>('/payments', { params }),
  getById: (id: string) =>
    apiClient.get<PaymentDto>(`/payments/${id}`),
  create: (body: CreatePaymentRequest) =>
    apiClient.post<PaymentDto>('/payments', body),
}

export const debtApi = {
  // Customer debt (AR) — partnerType=0
  getCustomerBalance: (customerId: string) =>
    apiClient.get<DebtBalanceDto>(`/debt/${customerId}/balance`, { params: { partnerType: 0 } }),
  listCustomerLedger: (customerId: string, params?: DebtParams) =>
    apiClient.get<PagedResult<DebtLedgerDto>>(`/debt/${customerId}/ledger`, { params: { ...params, partnerType: 0 } }),

  // Supplier debt (AP) — partnerType=1
  getSupplierBalance: (supplierId: string) =>
    apiClient.get<DebtBalanceDto>(`/debt/${supplierId}/balance`, { params: { partnerType: 1 } }),
  listSupplierLedger: (supplierId: string, params?: DebtParams) =>
    apiClient.get<PagedResult<DebtLedgerDto>>(`/debt/${supplierId}/ledger`, { params: { ...params, partnerType: 1 } }),
}

export const accountsApi = {
  list: (params?: { page?: number; pageSize?: number }) =>
    apiClient.get<PagedResult<AccountDto>>('/accounting/accounts', { params }),
  /** Backend uses code (e.g. '111'), not UUID id */
  getByCode: (code: string) =>
    apiClient.get<AccountDto>(`/accounting/accounts/${code}`),
  // NOTE: create() and update() do NOT exist — accounts are seeded by backend
}

export const journalApi = {
  list: (params?: JournalEntryParams) =>
    apiClient.get<PagedResult<JournalEntryDto>>('/accounting/journal-entries', { params }),
  // NOTE: getById() and create() do NOT exist — journal entries are auto-created by backend
}

export const reportsApi = {
  profitLoss: (params: { fromDate: string; toDate: string }) =>
    apiClient.get<ProfitLossReportDto>('/reports/profit-loss', { params }),
  /** Backend param is 'asOf' (single date), returns plain AccountBalanceDto[] */
  accountBalances: (params: { asOf: string }) =>
    apiClient.get<AccountBalanceDto[]>('/reports/account-balances', { params }),
}

export const operatingExpensesApi = {
  list: (params?: OperatingExpenseListParams) =>
    apiClient.get<PagedResult<OperatingExpenseDto>>('/operating-expenses', { params }),
  getById: (id: string) =>
    apiClient.get<OperatingExpenseDto>(`/operating-expenses/${id}`),
  create: (body: CreateOperatingExpenseRequest) =>
    apiClient.post<OperatingExpenseDto>('/operating-expenses', body),
  confirm: (id: string) =>
    apiClient.post<OperatingExpenseDto>(`/operating-expenses/${id}/confirm`),
  allocate: (body: AllocateExpenseRequest) =>
    apiClient.post<CostAllocationDto>('/operating-expenses/allocate', body),
}
