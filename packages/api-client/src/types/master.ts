// ─── Master Data Types ────────────────────────────────────────────────────────

export interface UnitDto {
  id: string
  name: string
  symbol: string
  isBaseUnit: boolean
  status: 'Active' | 'Inactive'
}

export interface UnitListParams {
  keyword?: string
  isBaseUnit?: boolean
  status?: 'Active' | 'Inactive'
  page?: number
  pageSize?: number
}

export interface CreateUnitRequest {
  name: string
  symbol: string
  isBaseUnit: boolean
}

export interface UpdateUnitRequest {
  name: string
  symbol: string
  isBaseUnit: boolean
  status?: 'Active' | 'Inactive'
}

export interface CategoryDto {
  id: string
  code: string
  name: string
  description?: string | null
  parentCategoryId?: string | null
  status: 'Active' | 'Inactive'
  children: CategoryDto[]
}

export interface CreateCategoryRequest {
  code: string
  name: string
  description?: string | null
  parentCategoryId?: string | null
}

export interface UpdateCategoryRequest {
  code: string
  name: string
  description?: string | null
  parentCategoryId?: string | null
  status?: 'Active' | 'Inactive'
}

export interface WarehouseStockItem {
  productId: string
  productCode: string
  productName: string
  quantityOnHand: number
  quantityReserved: number
  quantityAvailable: number
}

export interface WarehouseDto {
  id: string
  code: string
  name: string
  address?: string | null
  status: 'Active' | 'Inactive'
  branchId?: string | null
  branchName?: string | null
  stockItems?: WarehouseStockItem[]
}

export interface CreateWarehouseRequest {
  code: string
  name: string
  address?: string | null
  branchId?: string | null
}

export interface UpdateWarehouseRequest {
  name: string
  address?: string | null
  status: 'Active' | 'Inactive'
  branchId?: string | null
}

export interface WarehouseListParams {
  keyword?: string
  status?: 'Active' | 'Inactive'
  branchId?: string
  page?: number
  pageSize?: number
}

export interface BranchDto {
  id: string
  code: string
  name: string
  address?: string | null
  phone?: string | null
  parentBranchId?: string | null
  parentBranchCode?: string | null
  /** 1 = Active, 0 = Inactive */
  status: number
  /** Populated when using the /branches/tree endpoint */
  subBranches?: BranchDto[]
}

export interface CreateBranchRequest {
  code: string
  name: string
  address?: string | null
  phone?: string | null
  parentBranchId?: string | null
}

export interface UpdateBranchRequest {
  code: string
  name: string
  address?: string | null
  phone?: string | null
  parentBranchId?: string | null
  /** 1 = Active, 0 = Inactive */
  status: number
}

export interface BranchListParams {
  keyword?: string
  /** 1 = Active, 0 = Inactive */
  status?: number
  page?: number
  pageSize?: number
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
  costPrice: number
  salePrice: number
  vatRate: number
  barcode?: string
  isBatchManaged: boolean
  isExpiryManaged: boolean
  /** 0 = Fifo, 1 = Average */
  costingMethod?: number
  status: 'Active' | 'Inactive'
  unitConversions: UnitConversionDto[]
}

export interface UnitConversionDto {
  id: string
  productId: string
  productName?: string
  fromUnitId: string
  fromUnitName: string
  fromUnitSymbol?: string
  toUnitId: string
  toUnitName: string
  toUnitSymbol?: string
  conversionRate: number
}

export interface ProductListParams {
  page?: number
  pageSize?: number
  keyword?: string
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
  salePrice: number
  vatRate: number
  barcode?: string
  isBatchManaged?: boolean
  isExpiryManaged?: boolean
  /** 0 = Fifo, 1 = Average */
  costingMethod?: number
}

export interface UpdateProductRequest {
  name?: string
  description?: string
  categoryId?: string
  purchaseUnitId?: string
  salesUnitId?: string
  costPrice?: number
  salePrice?: number
  vatRate?: number
  barcode?: string
  isBatchManaged?: boolean
  isExpiryManaged?: boolean
  /** 0 = Fifo, 1 = Average */
  costingMethod?: number
  status?: 'Active' | 'Inactive'
}

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

