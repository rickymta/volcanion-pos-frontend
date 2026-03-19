import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { useState } from 'react'
import apiClient from '@/lib/api-client'
import type { PagedResult, PostSummaryDto } from '@/types'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Plus, Search, Pencil } from 'lucide-react'
import { formatDate } from '@/lib/utils'

const STATUS_LABELS: Record<PostSummaryDto['status'], string> = {
  Published: 'Đã đăng',
  Draft: 'Nháp',
  Archived: 'Lưu trữ',
}
const STATUS_VARIANTS: Record<PostSummaryDto['status'], string> = {
  Published: 'success',
  Draft: 'secondary',
  Archived: 'outline',
}

export function PostsListPage() {
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['posts', page, search],
    queryFn: () => {
      const params = new URLSearchParams({ page: String(page), pageSize: '20' })
      if (search) params.set('search', search)
      return apiClient.get<PagedResult<PostSummaryDto>>(`/posts?${params}`).then((r) => r.data)
    },
  })

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Bài viết</h1>
        <Button asChild>
          <Link to="/posts/new">
            <Plus className="h-4 w-4 mr-1" />
            Tạo mới
          </Link>
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Tìm kiếm..."
          className="pl-8"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1) }}
        />
      </div>

      {/* Table */}
      <div className="rounded-lg border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="text-left px-4 py-3 font-medium">Tiêu đề</th>
              <th className="text-left px-4 py-3 font-medium">Tác giả</th>
              <th className="text-left px-4 py-3 font-medium">Trạng thái</th>
              <th className="text-left px-4 py-3 font-medium">Ngày đăng</th>
              <th className="text-left px-4 py-3 font-medium">Lượt xem</th>
              <th className="w-12 px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y">
            {isLoading ? (
              <tr><td colSpan={6} className="text-center py-8 text-muted-foreground">Đang tải...</td></tr>
            ) : !data?.items?.length ? (
              <tr><td colSpan={6} className="text-center py-8 text-muted-foreground">Không có bài viết.</td></tr>
            ) : (
              data.items.map((post) => (
                <tr key={post.id} className="hover:bg-muted/30">
                  <td className="px-4 py-3 max-w-xs truncate font-medium">{post.title}</td>
                  <td className="px-4 py-3 text-muted-foreground">{post.authorName}</td>
                  <td className="px-4 py-3">
                    <Badge variant={STATUS_VARIANTS[post.status] as never}>
                      {STATUS_LABELS[post.status]}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {post.publishedAt ? formatDate(post.publishedAt) : '–'}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {post.viewCount.toLocaleString('vi-VN')}
                  </td>
                  <td className="px-4 py-3">
                    <Button variant="ghost" size="icon" asChild>
                      <Link to={`/posts/${post.id}/edit`}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Link>
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {data && data.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {data.totalCount} bài viết
          </p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={!data.hasPreviousPage} onClick={() => setPage((p) => p - 1)}>
              Trước
            </Button>
            <span className="flex items-center text-sm px-2">{page} / {data.totalPages}</span>
            <Button variant="outline" size="sm" disabled={!data.hasNextPage} onClick={() => setPage((p) => p + 1)}>
              Tiếp
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
