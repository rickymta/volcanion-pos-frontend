import { apiClient } from '../client'
import type { PagedResult } from '../types/common'
import type {
  ProductDto,
  ProductListParams,
  CreateProductRequest,
  UpdateProductRequest,
  UnitConversionDto,
  UnitDto,
  CategoryDto,
  WarehouseDto,
  BranchDto,
  CustomerDto,
  CreateCustomerRequest,
  UpdateCustomerRequest,
  CustomerListParams,
  SupplierDto,
  CreateSupplierRequest,
  UpdateSupplierRequest,
  SupplierListParams,
} from '../types/master'

// ─── Units ────────────────────────────────────────────────────────────────────
export const unitsApi = {
  list: () =>
    apiClient.get<PagedResult<UnitDto>>('/units', { params: { pageSize: 999 } }).then((r) => r.items),
  getById: (id: string) =>
    apiClient.get<UnitDto>(`/units/${id}`),
  create: (body: { code: string; name: string; description?: string }) =>
    apiClient.post<UnitDto>('/units', body),
  update: (id: string, body: { code?: string; name?: string; description?: string }) =>
    apiClient.put<UnitDto>(`/units/${id}`, body),
  delete: (id: string) =>
    apiClient.delete(`/units/${id}`),
}

// ─── Categories ───────────────────────────────────────────────────────────────
export const categoriesApi = {
  /** Backend returns nested tree array, NOT PagedResult */
  list: () =>
    apiClient.get<CategoryDto[]>('/categories'),
  getById: (id: string) =>
    apiClient.get<CategoryDto>(`/categories/${id}`),
  create: (body: { code: string; name: string; description?: string; parentCategoryId?: string }) =>
    apiClient.post<CategoryDto>('/categories', body),
  update: (id: string, body: { name?: string; description?: string; parentCategoryId?: string }) =>
    apiClient.put<CategoryDto>(`/categories/${id}`, body),
  delete: (id: string) =>
    apiClient.delete(`/categories/${id}`),
}

// ─── Warehouses ───────────────────────────────────────────────────────────────
export const warehousesApi = {
  list: () =>
    apiClient.get<PagedResult<WarehouseDto>>('/warehouses', { params: { pageSize: 999 } }).then((r) => r.items),
  getById: (id: string) =>
    apiClient.get<WarehouseDto>(`/warehouses/${id}`),
  create: (body: { code: string; name: string; address?: string; branchId?: string }) =>
    apiClient.post<WarehouseDto>('/warehouses', body),
  update: (id: string, body: { name?: string; address?: string; branchId?: string }) =>
    apiClient.put<WarehouseDto>(`/warehouses/${id}`, body),
  delete: (id: string) =>
    apiClient.delete(`/warehouses/${id}`),
}

// ─── Branches ─────────────────────────────────────────────────────────────────
export const branchesApi = {
  list: () =>
    apiClient.get<PagedResult<BranchDto>>('/branches', { params: { pageSize: 999 } }).then((r) => r.items),
  getById: (id: string) =>
    apiClient.get<BranchDto>(`/branches/${id}`),
  getTree: () =>
    apiClient.get<BranchDto[]>('/branches/tree'),
  create: (body: { code: string; name: string; address?: string; phone?: string; parentBranchId?: string }) =>
    apiClient.post<BranchDto>('/branches', body),
  update: (id: string, body: { name?: string; address?: string; phone?: string }) =>
    apiClient.put<BranchDto>(`/branches/${id}`, body),
  delete: (id: string) =>
    apiClient.delete(`/branches/${id}`),
}

// ─── Products ─────────────────────────────────────────────────────────────────
export const productsApi = {
  list: (params?: ProductListParams) =>
    apiClient.get<PagedResult<ProductDto>>('/products', { params }),
  getById: (id: string) =>
    apiClient.get<ProductDto>(`/products/${id}`),
  create: (body: CreateProductRequest) =>
    apiClient.post<ProductDto>('/products', body),
  update: (id: string, body: UpdateProductRequest) =>
    apiClient.put<ProductDto>(`/products/${id}`, body),
  delete: (id: string) =>
    apiClient.delete(`/products/${id}`),

  // Unit conversions
  listConversions: (productId: string) =>
    apiClient.get<UnitConversionDto[]>(`/products/${productId}/unit-conversions`),
  createConversion: (
    productId: string,
    body: { fromUnitId: string; toUnitId: string; conversionRate: number }
  ) => apiClient.post<UnitConversionDto>(`/products/${productId}/unit-conversions`, body),
  updateConversion: (
    productId: string,
    conversionId: string,
    body: { conversionRate: number }
  ) => apiClient.put<UnitConversionDto>(`/products/${productId}/unit-conversions/${conversionId}`, body),
  deleteConversion: (productId: string, conversionId: string) =>
    apiClient.delete(`/products/${productId}/unit-conversions/${conversionId}`),
}

// ─── Customers ────────────────────────────────────────────────────────────────
export const customersApi = {
  list: (params?: CustomerListParams) =>
    apiClient.get<PagedResult<CustomerDto>>('/customers', { params }),
  getById: (id: string) =>
    apiClient.get<CustomerDto>(`/customers/${id}`),
  create: (body: CreateCustomerRequest) =>
    apiClient.post<CustomerDto>('/customers', body),
  update: (id: string, body: UpdateCustomerRequest) =>
    apiClient.put<CustomerDto>(`/customers/${id}`, body),
  delete: (id: string) =>
    apiClient.delete(`/customers/${id}`),
}

// ─── Suppliers ────────────────────────────────────────────────────────────────
export const suppliersApi = {
  list: (params?: SupplierListParams) =>
    apiClient.get<PagedResult<SupplierDto>>('/suppliers', { params }),
  getById: (id: string) =>
    apiClient.get<SupplierDto>(`/suppliers/${id}`),
  create: (body: CreateSupplierRequest) =>
    apiClient.post<SupplierDto>('/suppliers', body),
  update: (id: string, body: UpdateSupplierRequest) =>
    apiClient.put<SupplierDto>(`/suppliers/${id}`, body),
  delete: (id: string) =>
    apiClient.delete(`/suppliers/${id}`),
}
