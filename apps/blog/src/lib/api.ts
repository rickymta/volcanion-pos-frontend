import type {
  CategoryDto,
  ContactFormData,
  ContactRequestDto,
  FaqDto,
  PagedResult,
  PostDetailDto,
  PostSummaryDto,
  PricingAddonDto,
  PricingPageResponseDto,
  PricingPlanDto,
  SiteSettingDto,
  StaticPageDto,
  TagDto,
  TestimonialDto,
} from '@/types'

const BASE_URL = process.env.BLOG_API_URL ?? 'http://localhost:5003/api/v1'

type FetchOptions = {
  revalidate?: number | false
  tags?: string[]
}

async function apiFetch<T>(
  path: string,
  { revalidate, tags }: FetchOptions = {},
): Promise<T> {
  const url = `${BASE_URL}${path}`
  let res: Response
  try {
    res = await fetch(url, {
      next: {
        ...(revalidate !== undefined ? { revalidate } : {}),
        ...(tags ? { tags } : {}),
      },
    })
  } catch (err) {
    throw new Error(
      `Blog API unreachable at ${url}: ${
        err instanceof Error ? err.message : String(err)
      }`,
    )
  }

  if (!res.ok) {
    throw new Error(`Blog API error ${res.status} for ${path}`)
  }

  return res.json() as Promise<T>
}

// ─── Posts ───────────────────────────────────────────────────────────────────

export async function getFeaturedPosts(
  limit = 6,
): Promise<PostSummaryDto[]> {
  return apiFetch<PostSummaryDto[]>(`/posts/featured?limit=${limit}`, {
    revalidate: 120,
    tags: ['posts', 'featured-posts'],
  })
}

export interface GetPostsParams {
  page?: number
  pageSize?: number
  search?: string
  categoryId?: string
  tagSlug?: string
  status?: 'Published'
}

export async function getPosts(
  params: GetPostsParams = {},
): Promise<PagedResult<PostSummaryDto>> {
  const qs = new URLSearchParams()
  if (params.page) qs.set('page', String(params.page))
  if (params.pageSize) qs.set('pageSize', String(params.pageSize))
  if (params.search) qs.set('search', params.search)
  if (params.categoryId) qs.set('categoryId', params.categoryId)
  if (params.tagSlug) qs.set('tagSlug', params.tagSlug)
  if (params.status) qs.set('status', params.status)

  const query = qs.toString()
  return apiFetch<PagedResult<PostSummaryDto>>(
    `/posts${query ? `?${query}` : ''}`,
    { revalidate: 60, tags: ['posts'] },
  )
}

export async function getPostBySlug(
  slug: string,
): Promise<PostDetailDto | null> {
  try {
    return await apiFetch<PostDetailDto>(`/posts/${encodeURIComponent(slug)}`, {
      revalidate: 60,
      tags: ['posts', `post-${slug}`],
    })
  } catch {
    return null
  }
}

// ─── Taxonomy ────────────────────────────────────────────────────────────────

export async function getCategories(): Promise<CategoryDto[]> {
  return apiFetch<CategoryDto[]>('/categories', {
    revalidate: 300,
    tags: ['categories'],
  })
}

export async function getTags(): Promise<TagDto[]> {
  return apiFetch<TagDto[]>('/tags', {
    revalidate: 300,
    tags: ['tags'],
  })
}

// ─── Pricing ─────────────────────────────────────────────────────────────────

export async function getPricingPage(): Promise<PricingPageResponseDto> {
  const raw = await apiFetch<PricingPageResponseDto | PricingPlanDto[]>('/pricing', {
    revalidate: 300,
    tags: ['pricing'],
  })
  // Handle both wrapped { plans, addons } and legacy plain array
  if (Array.isArray(raw)) {
    return { plans: raw, addons: [] }
  }
  return {
    plans: Array.isArray(raw.plans) ? raw.plans : [],
    addons: Array.isArray(raw.addons) ? raw.addons : [],
    comparisonGroups: raw.comparisonGroups,
  }
}

/** @deprecated Use getPricingPage() instead */
export async function getPricing(): Promise<PricingPlanDto[]> {
  return getPricingPage().then((r) => r.plans)
}

export async function getAddons(): Promise<PricingAddonDto[]> {
  return getPricingPage().then((r) => r.addons)
}

// ─── Testimonials ─────────────────────────────────────────────────────────────

export async function getTestimonials(): Promise<TestimonialDto[]> {
  return apiFetch<TestimonialDto[]>('/testimonials', {
    revalidate: 300,
    tags: ['testimonials'],
  })
}

// ─── FAQs ─────────────────────────────────────────────────────────────────────

export async function getFaqs(): Promise<FaqDto[]> {
  return apiFetch<FaqDto[]>('/faqs', {
    revalidate: 300,
    tags: ['faqs'],
  })
}

// ─── Static Pages ─────────────────────────────────────────────────────────────

export async function getStaticPage(
  slug: string,
): Promise<StaticPageDto | null> {
  try {
    return await apiFetch<StaticPageDto>(
      `/pages/${encodeURIComponent(slug)}`,
      { revalidate: 120, tags: ['pages', `page-${slug}`] },
    )
  } catch {
    return null
  }
}

// ─── Site Settings ────────────────────────────────────────────────────────────

export async function getSiteSettings(): Promise<SiteSettingDto[]> {
  return apiFetch<SiteSettingDto[]>('/settings', {
    revalidate: 600,
    tags: ['settings'],
  })
}

// ─── Contact ──────────────────────────────────────────────────────────────────

/**
 * Submit a contact request.
 * Called from a Server Action or Route Handler — NOT from a cached fetch.
 */
export async function submitContact(
  data: ContactFormData,
): Promise<ContactRequestDto> {
  const res = await fetch(`${BASE_URL}/contact`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
    cache: 'no-store',
  })

  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Contact submission failed (${res.status}): ${body}`)
  }

  return res.json() as Promise<ContactRequestDto>
}
