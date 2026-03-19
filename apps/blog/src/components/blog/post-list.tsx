import Link from 'next/link'
import type { PagedResult, PostSummaryDto } from '@/types'
import { PostCard } from './post-card'
import { Button } from '@/components/ui/button'
import { ChevronLeft, ChevronRight } from 'lucide-react'

interface PostListProps {
  result: PagedResult<PostSummaryDto>
  currentPage: number
  basePath?: string
  searchParams?: Record<string, string>
}

export function PostList({ result, currentPage, basePath = '/blog', searchParams = {} }: PostListProps) {
  const { items, totalPages, hasNextPage, hasPreviousPage } = result

  if (items.length === 0) {
    return (
      <div className="py-20 text-center text-muted-foreground">
        <p className="text-lg">Không có bài viết nào.</p>
      </div>
    )
  }

  function buildPageUrl(page: number) {
    const params = new URLSearchParams(searchParams)
    params.set('page', String(page))
    return `${basePath}?${params.toString()}`
  }

  return (
    <div className="space-y-8">
      {/* Grid */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((post) => (
          <PostCard key={post.id} post={post} />
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button variant="outline" size="sm" disabled={!hasPreviousPage} asChild={hasPreviousPage}>
            {hasPreviousPage ? (
              <Link href={buildPageUrl(currentPage - 1)}>
                <ChevronLeft className="h-4 w-4" />
                Trước
              </Link>
            ) : (
              <span className="flex items-center gap-1">
                <ChevronLeft className="h-4 w-4" /> Trước
              </span>
            )}
          </Button>

          <span className="text-sm text-muted-foreground px-2">
            Trang {currentPage} / {totalPages}
          </span>

          <Button variant="outline" size="sm" disabled={!hasNextPage} asChild={hasNextPage}>
            {hasNextPage ? (
              <Link href={buildPageUrl(currentPage + 1)}>
                Tiếp
                <ChevronRight className="h-4 w-4" />
              </Link>
            ) : (
              <span className="flex items-center gap-1">
                Tiếp <ChevronRight className="h-4 w-4" />
              </span>
            )}
          </Button>
        </div>
      )}
    </div>
  )
}
