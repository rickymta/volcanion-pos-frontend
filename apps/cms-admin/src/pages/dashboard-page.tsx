import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import apiClient from '@/lib/api-client'
import type { DashboardDto, PostSummaryDto } from '@/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { FileText, BookOpen, Mail, BarChart3 } from 'lucide-react'
import { formatDate } from '@/lib/utils'

const STATUS_BADGE: Record<PostSummaryDto['status'], { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  Published: { label: 'Đã đăng', variant: 'success' as never },
  Draft: { label: 'Nháp', variant: 'secondary' },
  Archived: { label: 'Lưu trữ', variant: 'outline' },
}

export function DashboardPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => apiClient.get<DashboardDto>('/dashboard').then((r) => r.data),
  })

  const stats = [
    { label: 'Tổng bài viết', value: data?.totalPosts ?? '-', icon: BarChart3, color: 'text-blue-500' },
    { label: 'Đã xuất bản', value: data?.publishedPosts ?? '-', icon: FileText, color: 'text-green-500' },
    { label: 'Bản nháp', value: data?.draftPosts ?? '-', icon: BookOpen, color: 'text-yellow-500' },
    { label: 'Liên hệ mới', value: data?.newContactRequests ?? '-', icon: Mail, color: 'text-red-500' },
  ]

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Dashboard</h1>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{stat.label}</CardTitle>
              <stat.icon className={`h-5 w-5 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">
                {isLoading ? <span className="animate-pulse">–</span> : stat.value}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recent posts */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Bài viết gần đây</CardTitle>
          <Link to="/posts" className="text-sm text-primary hover:underline">
            Xem tất cả
          </Link>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-muted-foreground text-center py-4">Đang tải...</p>
          ) : !data?.recentPosts?.length ? (
            <p className="text-sm text-muted-foreground text-center py-4">Chưa có bài viết.</p>
          ) : (
            <div className="divide-y">
              {data.recentPosts.map((post) => (
                <div key={post.id} className="flex items-center justify-between py-3 gap-4">
                  <div className="min-w-0">
                    <Link
                      to={`/posts/${post.id}/edit`}
                      className="text-sm font-medium hover:text-primary truncate block"
                    >
                      {post.title}
                    </Link>
                    <p className="text-xs text-muted-foreground">
                      {post.publishedAt ? formatDate(post.publishedAt) : 'Chưa xuất bản'}
                    </p>
                  </div>
                  <Badge variant={STATUS_BADGE[post.status].variant as never}>
                    {STATUS_BADGE[post.status].label}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
