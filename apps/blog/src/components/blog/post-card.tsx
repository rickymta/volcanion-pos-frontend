import Link from 'next/link'
import type { PostSummaryDto } from '@/types'
import { Card, CardContent, CardFooter } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatDate } from '@/lib/utils'
import { CalendarDays, Eye } from 'lucide-react'

interface PostCardProps {
  post: PostSummaryDto
}

export function PostCard({ post }: PostCardProps) {
  return (
    <Card className="group flex flex-col overflow-hidden hover:shadow-md transition-shadow h-full">
      {/* Cover image */}
      {post.coverImageUrl && (
        <Link href={`/blog/${post.slug}`} className="block overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={post.coverImageUrl}
            alt={post.title}
            className="aspect-video w-full object-cover transition-transform group-hover:scale-105"
          />
        </Link>
      )}

      <CardContent className="flex flex-col flex-1 p-5">
        {/* Category tags */}
        {post.categorySlugs.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {post.categorySlugs.slice(0, 2).map((slug) => (
              <Link key={slug} href={`/blog/category/${slug}`}>
                <Badge variant="secondary" className="text-xs hover:bg-primary hover:text-primary-foreground transition-colors cursor-pointer">
                  {slug}
                </Badge>
              </Link>
            ))}
          </div>
        )}

        {/* Title */}
        <Link href={`/blog/${post.slug}`} className="flex-1">
          <h3 className="font-semibold text-base leading-snug group-hover:text-primary transition-colors line-clamp-2 mb-2">
            {post.title}
          </h3>
        </Link>

        {/* Excerpt */}
        {post.excerpt && (
          <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
            {post.excerpt}
          </p>
        )}
      </CardContent>

      <CardFooter className="px-5 pb-5 pt-0 flex items-center justify-between text-xs text-muted-foreground">
        <div className="flex items-center gap-1">
          <CalendarDays className="h-3 w-3" />
          {post.publishedAt ? formatDate(post.publishedAt) : 'Chưa xuất bản'}
        </div>
        <div className="flex items-center gap-1">
          <Eye className="h-3 w-3" />
          {post.viewCount.toLocaleString('vi-VN')}
        </div>
      </CardFooter>
    </Card>
  )
}
