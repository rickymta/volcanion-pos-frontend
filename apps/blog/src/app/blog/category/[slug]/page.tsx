import type { Metadata } from 'next'
import { getPosts, getCategories } from '@/lib/api'
import { PostList } from '@/components/blog/post-list'
import { notFound } from 'next/navigation'

export const revalidate = 60

interface CategoryPageProps {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ page?: string }>
}

export async function generateMetadata({ params }: CategoryPageProps): Promise<Metadata> {
  const { slug } = await params
  const categories = await getCategories().catch(() => [])
  const category = categories.find((c) => c.slug === slug)
  if (!category) return {}
  return {
    title: `Danh mục: ${category.name}`,
    description: category.description ?? undefined,
  }
}

export default async function CategoryPage({ params, searchParams }: CategoryPageProps) {
  const { slug } = await params
  const sp = await searchParams
  const page = Number(sp.page ?? '1')

  const categories = await getCategories().catch((err) => {
    console.warn('[Blog] Failed to load categories:', err)
    return []
  })
  const category = categories.find((c) => c.slug === slug)
  if (!category) notFound()

  const result = await getPosts({ page, pageSize: 12, categoryId: category.id }).catch((err) => {
    console.warn('[Blog] Failed to load posts for category:', err)
    return { items: [], totalCount: 0, page, pageSize: 12, totalPages: 0, hasNextPage: false, hasPreviousPage: false }
  })

  return (
    <section className="container py-12">
      <div className="mb-8">
        <p className="text-sm text-muted-foreground">Danh mục</p>
        <h1 className="text-4xl font-bold tracking-tight">{category.name}</h1>
        {category.description && (
          <p className="mt-2 text-muted-foreground">{category.description}</p>
        )}
      </div>
      <PostList result={result} />
    </section>
  )
}
