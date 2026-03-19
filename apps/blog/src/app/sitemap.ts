import type { MetadataRoute } from 'next'
import { getCategories, getPosts, getTags } from '@/lib/api'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3003'

export const revalidate = 3600

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [postsResult, categories, tags] = await Promise.all([
    getPosts({ pageSize: 1000, status: 'Published' }),
    getCategories(),
    getTags(),
  ])

  const postUrls: MetadataRoute.Sitemap = postsResult.items.map((post) => ({
    url: `${SITE_URL}/blog/${post.slug}`,
    lastModified: post.publishedAt ? new Date(post.publishedAt) : new Date(),
    changeFrequency: 'weekly',
    priority: post.isFeatured ? 0.9 : 0.7,
  }))

  const categoryUrls: MetadataRoute.Sitemap = categories
    .filter((c) => c.isActive)
    .map((c) => ({
      url: `${SITE_URL}/blog/category/${c.slug}`,
      changeFrequency: 'weekly',
      priority: 0.6,
    }))

  const tagUrls: MetadataRoute.Sitemap = tags.map((t) => ({
    url: `${SITE_URL}/blog/tag/${t.slug}`,
    changeFrequency: 'weekly',
    priority: 0.5,
  }))

  return [
    { url: SITE_URL, changeFrequency: 'daily', priority: 1.0 },
    { url: `${SITE_URL}/blog`, changeFrequency: 'daily', priority: 0.9 },
    { url: `${SITE_URL}/pricing`, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${SITE_URL}/faq`, changeFrequency: 'weekly', priority: 0.7 },
    { url: `${SITE_URL}/contact`, changeFrequency: 'monthly', priority: 0.6 },
    ...postUrls,
    ...categoryUrls,
    ...tagUrls,
  ]
}
