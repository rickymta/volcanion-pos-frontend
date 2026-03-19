import type { Metadata } from 'next'
import { getPosts } from '@/lib/api'
import { PostList } from '@/components/blog/post-list'
import { notFound } from 'next/navigation'

export const revalidate = 60

interface TagPageProps {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ page?: string }>
}

export async function generateMetadata({ params }: TagPageProps): Promise<Metadata> {
  const { slug } = await params
  return {
    title: `Tag: #${slug}`,
  }
}

export default async function TagPage({ params, searchParams }: TagPageProps) {
  const { slug } = await params
  const sp = await searchParams
  const page = Number(sp.page ?? '1')

  const result = await getPosts({ page, pageSize: 12, tagSlug: slug }).catch((err) => {
    console.warn('[Blog] Failed to load posts for tag:', err)
    return { items: [], totalCount: 0, page, pageSize: 12, totalPages: 0, hasNextPage: false, hasPreviousPage: false }
  })

  return (
    <section className="container py-12">
      <div className="mb-8">
        <p className="text-sm text-muted-foreground">Tag</p>
        <h1 className="text-4xl font-bold tracking-tight">#{slug}</h1>
      </div>
      <PostList result={result} />
    </section>
  )
}
