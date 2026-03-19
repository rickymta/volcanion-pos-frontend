import type { Metadata } from 'next'
import { getPosts, getCategories, getTags } from '@/lib/api'
import { PostList } from '@/components/blog/post-list'
import { PostFilters } from '@/components/blog/post-filters'

export const revalidate = 60

export const metadata: Metadata = {
  title: 'Blog',
  description: 'Tin tức, hướng dẫn và cập nhật mới nhất từ POS Pro',
}

interface BlogPageProps {
  searchParams: Promise<{
    page?: string
    search?: string
    categoryId?: string
    tagSlug?: string
  }>
}

export default async function BlogPage({ searchParams }: BlogPageProps) {
  const params = await searchParams
  const page = Number(params.page ?? '1')

  const [result, categories, tags] = await Promise.all([
    getPosts({
      page,
      pageSize: 12,
      search: params.search,
      categoryId: params.categoryId,
      tagSlug: params.tagSlug,
    }).catch((err) => {
      console.warn('[Blog] Failed to load posts:', err)
      return { items: [], totalCount: 0, page, pageSize: 12, totalPages: 0, hasNextPage: false, hasPreviousPage: false }
    }),
    getCategories().catch(() => []),
    getTags().catch(() => []),
  ])

  return (
    <section className="container py-12">
      <div className="mb-8">
        <h1 className="text-4xl font-bold tracking-tight">Blog</h1>
        <p className="mt-2 text-muted-foreground">
          Tin tức, hướng dẫn và cập nhật sản phẩm
        </p>
      </div>
      <PostFilters
        categories={categories}
        tags={tags}
        currentSearch={params.search}
        currentCategoryId={params.categoryId}
        currentTagSlug={params.tagSlug}
      />
      <PostList result={result} />
    </section>
  )
}
