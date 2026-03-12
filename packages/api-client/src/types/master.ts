// ─── Master Data Types ────────────────────────────────────────────────────────

export interface UnitDto {
  id: string
  code: string
  name: string
  description?: string
  status: 'Active' | 'Inactive'
}

export interface CategoryDto {
  id: string
  code: string
  name: string
  description?: string
  parentCategoryId?: string
  children?: CategoryDto[]
  status: 'Active' | 'Inactive'
}

export interface WarehouseDto {
  id: string
  code: string
  name: string
  address?: string
  branchId?: string
  branchName?: string
  status: 'Active' | 'Inactive'
}

export interface BranchDto {
  id: string
  code: string
  name: string
  address?: string
  phone?: string
  parentBranchId?: string
  parentBranchCode?: string
  children?: BranchDto[]
  status: 'Active' | 'Inactive'
}

// ─── Product ──────────────────────────────────────────────────────────────────

export interface ProductDto {
  id: string
  code: string
  name: string
  description?: string
  categoryId?: string
  categoryName?: string
  baseUnitId: string
  baseUnitName: string
  purchaseUnitId?: string
  purchaseUnitName?: string
  salesUnitId?: string
  salesUnitName?: string
  /** Backend field name is 'costPrice' */
  costPrice: number
  /** Backend field name is 'sellingPrice' */
  sellingPrice: number
  vatRate: number
  barcode?: string
  costingMethod?: 'Average' | 'FIFO'
  status: 'Active' | 'Inactive'
  unitConversions: UnitConversionDto[]
}

export interface UnitConversionDto {
  id: string
  productId: string
  fromUnitId: string
  fromUnitName: string
  toUnitId: string
  toUnitName: string
  conversionRate: number
}

export interface ProductListParams {
  page?: number
  pageSize?: number
  search?: string
  categoryId?: string
  status?: 'Active' | 'Inactive'
  warehouseId?: string
}

export interface CreateProductRequest {
  code: string
  name: string
  description?: string
  categoryId?: string
  baseUnitId: string
  purchaseUnitId?: string
  salesUnitId?: string
  costPrice: number
  sellingPrice: number
  vatRate: number
  barcode?: string
  costingMethod?: 'Average' | 'FIFO'
}

export type UpdateProductRequest = Partial<CreateProductRequest>

// ─── Customer ─────────────────────────────────────────────────────────────────

export interface CustomerDto {
  id: string
  code: string
  name: string
  phone?: string
  email?: string
  address?: string
  taxCode?: string
  creditLimit: number
  paymentTermDays: number
  openingBalance: number
  status: 'Active' | 'Inactive'
}

export interface CreateCustomerRequest {
  code: string
  name: string
  phone?: string
  email?: string
  address?: string
  taxCode?: string
  creditLimit?: number
  paymentTermDays?: number
  openingBalance?: number
}

export type UpdateCustomerRequest = Partial<CreateCustomerRequest>

export interface CustomerListParams {
  page?: number
  pageSize?: number
  search?: string
  status?: 'Active' | 'Inactive'
}

// ─── Supplier ─────────────────────────────────────────────────────────────────

export type SupplierDto = CustomerDto // Same shape as CustomerDto
export type CreateSupplierRequest = CreateCustomerRequest
export type UpdateSupplierRequest = UpdateCustomerRequest
export type SupplierListParams = CustomerListParams

