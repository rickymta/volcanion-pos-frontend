// ─── Shared ────────────────────────────────────────────────────────────────

export interface PagedResult<T> {
  items: T[]
  totalCount: number
  page: number
  pageSize: number
  totalPages: number
  hasNextPage: boolean
  hasPreviousPage: boolean
}

// ─── Enums ──────────────────────────────────────────────────────────────────

export type PostStatus = 'Draft' | 'Published' | 'Archived'
export type ContactType = 'General' | 'Sales' | 'Support' | 'Partnership'
export type ContactPriority = 'Normal' | 'High' | 'Urgent'
export type ContactStatus = 'New' | 'InProgress' | 'Resolved' | 'Closed'
export type UserRole = 'Admin' | 'Editor' | 'Support'
export type UserStatus = 'Active' | 'Inactive'
export type PageStatus = 'Draft' | 'Published'

// ─── Auth ────────────────────────────────────────────────────────────────────

export interface LoginDto {
  email: string
  password: string
}

export interface CmsUserDto {
  id: string
  email: string
  fullName: string
  role: UserRole
  status: UserStatus
  roles: string[]
  permissions: string[]
}

export interface TokensDto {
  accessToken: string
  refreshToken: string
  expiresIn: number
  expiresAt?: string
  user: CmsUserDto
}

// ─── Roles & Permissions ──────────────────────────────────────────────────────

export interface RoleDto {
  id: string
  name: string
  description?: string
  isSystem: boolean
  permissions: string[]
}

export interface PermissionDto {
  id: string
  code: string
  name: string
  group: string
}

export interface AssignRolesDto {
  roleIds: string[]
}

// ─── Content DTOs ─────────────────────────────────────────────────────────────

export interface CategoryDto {
  id: string
  name: string
  slug: string
  description?: string
  parentId?: string
  sortOrder: number
  isActive: boolean
}

export interface TagDto {
  id: string
  name: string
  slug: string
}

export interface PostSummaryDto {
  id: string
  title: string
  slug: string
  excerpt?: string
  coverImageUrl?: string
  authorName: string
  status: PostStatus
  isFeatured: boolean
  publishedAt?: string
  viewCount: number
  categorySlugs: string[]
  tagSlugs: string[]
}

export interface PostDetailDto {
  id: string
  title: string
  slug: string
  excerpt?: string
  coverImageUrl?: string
  content: string
  author: CmsUserDto
  status: PostStatus
  isFeatured: boolean
  publishedAt?: string
  viewCount: number
  categories: CategoryDto[]
  tags: TagDto[]
  metaTitle?: string
  metaDescription?: string
  ogImageUrl?: string
  createdAt: string
  updatedAt: string
}

export interface CreatePostDto {
  title: string
  slug: string
  content: string
  excerpt?: string
  coverImageUrl?: string
  status: PostStatus
  isFeatured: boolean
  categoryIds: string[]
  tagIds: string[]
  metaTitle?: string
  metaDescription?: string
  ogImageUrl?: string
}

export type UpdatePostDto = CreatePostDto

export interface CreateCategoryDto {
  name: string
  slug: string
  description?: string
  parentId?: string
  sortOrder: number
  isActive: boolean
}

export type UpdateCategoryDto = CreateCategoryDto

export interface CreateTagDto {
  name: string
  slug: string
}

export type UpdateTagDto = CreateTagDto

// ─── Pricing ─────────────────────────────────────────────────────────────────

export interface PricingFeatureItem {
  text: string
  included: boolean
}

// valueType: 0 = Boolean, 1 = Number, 2 = Text
export interface PricingPlanPropertyValueDto {
  propertyId: string
  key: string
  displayName: string
  displayNameEn: string | null
  valueType: 0 | 1 | 2
  unit: string | null
  unitEn: string | null
  group: string | null
  groupEn: string | null
  boolValue: boolean | null
  numberValue: number | null
  textValue: string | null
  textValueEn: string | null
}

export interface PricingPropertyDefinitionDto {
  id: string
  key: string
  displayName: string
  displayNameEn: string | null
  valueType: 0 | 1 | 2
  unit: string | null
  unitEn: string | null
  group: string | null
  groupEn: string | null
  description: string | null
  descriptionEn: string | null
  sortOrder: number
  isActive: boolean
}

export interface PricingPlanDto {
  id: string
  name: string
  nameEn?: string | null
  monthlyPrice?: number | null
  yearlyPrice?: number | null
  currency: string
  description?: string | null
  descriptionEn?: string | null
  features: PricingFeatureItem[]
  featuresEn?: PricingFeatureItem[] | null
  badge?: string | null
  badgeEn?: string | null
  ctaText: string
  ctaTextEn?: string | null
  ctaUrl?: string | null
  sortOrder: number
  isActive: boolean
  properties: PricingPlanPropertyValueDto[]
}

export interface CreatePricingPlanDto {
  name: string
  nameEn?: string | null
  monthlyPrice?: number | null
  yearlyPrice?: number | null
  currency: string
  description?: string | null
  descriptionEn?: string | null
  features: PricingFeatureItem[]
  featuresEn?: PricingFeatureItem[] | null
  badge?: string | null
  badgeEn?: string | null
  ctaText: string
  ctaTextEn?: string | null
  ctaUrl?: string | null
  sortOrder: number
}

export interface UpdatePricingPlanDto extends CreatePricingPlanDto {
  isActive: boolean
}

export interface SetPlanPropertyValuesRequest {
  values: {
    propertyId: string
    boolValue: boolean | null
    numberValue: number | null
    textValue: string | null
    textValueEn: string | null
  }[]
}

export interface CreatePropertyDefinitionDto {
  key: string
  displayName: string
  displayNameEn?: string | null
  valueType: 0 | 1 | 2
  unit?: string | null
  unitEn?: string | null
  group?: string | null
  groupEn?: string | null
  description?: string | null
  descriptionEn?: string | null
  sortOrder: number
}

export interface UpdatePropertyDefinitionDto extends CreatePropertyDefinitionDto {
  isActive: boolean
}

// ─── Pricing Add-ons ──────────────────────────────────────────────────────────

export interface PricingAddonDto {
  id: string
  key: string
  name: string
  nameEn?: string | null
  category?: string | null
  categoryEn?: string | null
  description?: string | null
  descriptionEn?: string | null
  iconUrl?: string | null
  monthlyPrice?: number | null
  yearlyPrice?: number | null
  currency: string
  features: PricingFeatureItem[]
  featuresEn?: PricingFeatureItem[] | null
  badge?: string | null
  badgeEn?: string | null
  ctaText: string
  ctaTextEn?: string | null
  ctaUrl?: string | null
  sortOrder: number
  isActive: boolean
}

export interface CreatePricingAddonDto {
  key: string
  name: string
  nameEn?: string | null
  category?: string | null
  categoryEn?: string | null
  description?: string | null
  descriptionEn?: string | null
  iconUrl?: string | null
  monthlyPrice?: number | null
  yearlyPrice?: number | null
  currency: string
  features: PricingFeatureItem[]
  featuresEn?: PricingFeatureItem[] | null
  badge?: string | null
  badgeEn?: string | null
  ctaText: string
  ctaTextEn?: string | null
  ctaUrl?: string | null
  sortOrder: number
}

export interface UpdatePricingAddonDto extends CreatePricingAddonDto {
  isActive: boolean
}

// ─── Testimonials ─────────────────────────────────────────────────────────────

export interface TestimonialDto {
  id: string
  customerName: string
  position?: string
  company?: string
  content: string
  avatarUrl?: string
  rating: number
  sortOrder: number
  isVisible: boolean
}

export interface CreateTestimonialDto {
  customerName: string
  position?: string
  company?: string
  content: string
  avatarUrl?: string
  rating: number
  sortOrder: number
  isVisible: boolean
}

export type UpdateTestimonialDto = CreateTestimonialDto

// ─── FAQ ─────────────────────────────────────────────────────────────────────

export interface FaqDto {
  id: string
  question: string
  answer: string
  category?: string
  sortOrder: number
  isActive: boolean
}

export interface CreateFaqDto {
  question: string
  answer: string
  category?: string
  sortOrder: number
  isActive: boolean
}

export type UpdateFaqDto = CreateFaqDto

// ─── Static Pages ─────────────────────────────────────────────────────────────

export interface StaticPageDto {
  id: string
  title: string
  slug: string
  content: string
  metaTitle?: string
  metaDescription?: string
  status: PageStatus
  createdAt: string
  updatedAt: string
}

export interface CreateStaticPageDto {
  title: string
  slug: string
  content: string
  metaTitle?: string
  metaDescription?: string
  status: PageStatus
}

export type UpdateStaticPageDto = CreateStaticPageDto

// ─── Settings ────────────────────────────────────────────────────────────────

export interface SiteSettingDto {
  key: string
  group: string
  valueJson: string
}

export interface UpdateSettingDto {
  key: string
  valueJson: string
}

// ─── Media ────────────────────────────────────────────────────────────────────

export interface MediaFileDto {
  id: string
  fileName: string
  originalFileName: string
  url: string
  mimeType: string
  size: number
  createdAt: string
}

// ─── Contact ─────────────────────────────────────────────────────────────────

export interface ContactRequestDto {
  id: string
  fullName: string
  email: string
  phone?: string
  type: ContactType
  subject?: string
  message: string
  priority: ContactPriority
  status: ContactStatus
  createdAt: string
  updatedAt: string
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

export interface DashboardDto {
  totalPosts: number
  publishedPosts: number
  draftPosts: number
  newContactRequests: number
  recentPosts: PostSummaryDto[]
}

// ─── Users ────────────────────────────────────────────────────────────────────

export interface AdminUserDto {
  id: string
  email: string
  fullName: string
  role: UserRole
  status: UserStatus
  roles: string[]
  permissions: string[]
  createdAt: string
  lastLoginAt?: string
}

export interface CreateAdminUserDto {
  email: string
  fullName: string
  password: string
  role: UserRole
}

export interface UpdateAdminUserDto {
  fullName: string
  role: UserRole
  status: UserStatus
}

// ─── Pagination ───────────────────────────────────────────────────────────────

export interface PaginatedResult<T> {
  items: T[]
  total: number
  page: number
  limit: number
  totalPages: number
}

// ─── API Errors ───────────────────────────────────────────────────────────────

export interface ValidationError {
  title: string
  status: number
  errors: Record<string, string[]>
}
