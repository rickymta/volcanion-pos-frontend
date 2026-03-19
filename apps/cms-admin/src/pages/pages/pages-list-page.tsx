import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import apiClient from '@/lib/api-client'
import type { StaticPageDto } from '@/types'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import { formatDate } from '@/lib/utils'

export function PagesListPage() {
  const qc = useQueryClient()

  const { data: pages, isLoading } = useQuery({
    queryKey: ['pages'],
    queryFn: () => apiClient.get<StaticPageDto[]>('/pages').then((r) => r.data),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiClient.delete(`/pages/${id}`),
    onSuccess: () => { toast.success('Đã xóa trang.'); qc.invalidateQueries({ queryKey: ['pages'] }) },
    onError: () => toast.error('Không thể xóa.'),
  })

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Trang tĩnh</h1>
        <Button asChild><Link to="/pages/new"><Plus className="h-4 w-4 mr-1" />Tạo trang</Link></Button>
      </div>

      <div className="rounded-lg border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="text-left px-4 py-3 font-medium">Tiêu đề</th>
              <th className="text-left px-4 py-3 font-medium">Slug</th>
              <th className="text-left px-4 py-3 font-medium">Trạng thái</th>
              <th className="text-left px-4 py-3 font-medium hidden lg:table-cell">Cập nhật</th>
              <th className="w-24 px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y">
            {isLoading ? (
              <tr><td colSpan={5} className="text-center py-8 text-muted-foreground">Đang tải...</td></tr>
            ) : !pages?.length ? (
              <tr><td colSpan={5} className="text-center py-8 text-muted-foreground">Chưa có trang nào.</td></tr>
            ) : (
              pages.map((page) => (
                <tr key={page.id} className="hover:bg-muted/30">
                  <td className="px-4 py-3 font-medium">{page.title}</td>
                  <td className="px-4 py-3 text-muted-foreground">{page.slug}</td>
                  <td className="px-4 py-3">
                    <Badge variant={page.status === 'Published' ? 'success' : 'secondary'}>{page.status}</Badge>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground hidden lg:table-cell">{formatDate(page.updatedAt)}</td>
                  <td className="px-4 py-3 flex gap-1">
                    <Button variant="ghost" size="icon" asChild>
                      <Link to={`/pages/${page.id}/edit`}><Pencil className="h-3.5 w-3.5" /></Link>
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => { if (confirm('Xóa trang này?')) deleteMutation.mutate(page.id) }}>
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
