import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import apiClient from '@/lib/api-client'
import type { ContactRequestDto, PaginatedResult } from '@/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Eye, Loader2 } from 'lucide-react'
import { formatDate } from '@/lib/utils'

const STATUS_OPTIONS = [
  { value: '', label: 'Tất cả' },
  { value: 'New', label: 'Mới' },
  { value: 'InProgress', label: 'Đang xử lý' },
  { value: 'Resolved', label: 'Đã giải quyết' },
  { value: 'Closed', label: 'Đã đóng' },
]

const STATUS_VARIANT: Record<string, 'default' | 'secondary' | 'success' | 'destructive'> = {
  New: 'default',
  InProgress: 'secondary',
  Resolved: 'success',
  Closed: 'destructive',
}

export function ContactsListPage() {
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['contacts', page, search, status],
    queryFn: () => apiClient.get<PaginatedResult<ContactRequestDto>>('/contacts', {
      params: { page, limit: 20, search: search || undefined, status: status || undefined },
    }).then((r) => r.data),
  })

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Liên hệ</h1>

      <div className="flex flex-wrap gap-3">
        <Input
          placeholder="Tìm theo tên, email..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1) }}
          className="max-w-xs"
        />
        <div className="flex gap-1 flex-wrap">
          {STATUS_OPTIONS.map((opt) => (
            <Button
              key={opt.value}
              variant={status === opt.value ? 'default' : 'outline'}
              size="sm"
              onClick={() => { setStatus(opt.value); setPage(1) }}
            >
              {opt.label}
            </Button>
          ))}
        </div>
      </div>

      <div className="rounded-lg border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="text-left px-4 py-3 font-medium">Họ tên</th>
              <th className="text-left px-4 py-3 font-medium">Email</th>
              <th className="text-left px-4 py-3 font-medium hidden md:table-cell">Loại</th>
              <th className="text-left px-4 py-3 font-medium">Trạng thái</th>
              <th className="text-left px-4 py-3 font-medium hidden lg:table-cell">Ngày gửi</th>
              <th className="w-16 px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y">
            {isLoading ? (
              <tr><td colSpan={6} className="text-center py-8"><Loader2 className="h-5 w-5 animate-spin mx-auto text-muted-foreground" /></td></tr>
            ) : !data?.items?.length ? (
              <tr><td colSpan={6} className="text-center py-8 text-muted-foreground">Không có dữ liệu.</td></tr>
            ) : (
              data.items.map((item) => (
                <tr key={item.id} className="hover:bg-muted/30">
                  <td className="px-4 py-3 font-medium">{item.fullName}</td>
                  <td className="px-4 py-3 text-muted-foreground">{item.email}</td>
                  <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">{item.type}</td>
                  <td className="px-4 py-3">
                    <Badge variant={STATUS_VARIANT[item.status] ?? 'secondary'}>{item.status}</Badge>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground hidden lg:table-cell">{formatDate(item.createdAt)}</td>
                  <td className="px-4 py-3">
                    <Button variant="ghost" size="icon" asChild>
                      <Link to={`/contacts/${item.id}`}><Eye className="h-4 w-4" /></Link>
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {data && data.totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>Trang {page} / {data.totalPages} ({data.total} kết quả)</span>
          <div className="flex gap-1">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Trước</Button>
            <Button variant="outline" size="sm" disabled={page >= data.totalPages} onClick={() => setPage((p) => p + 1)}>Sau</Button>
          </div>
        </div>
      )}
    </div>
  )
}
