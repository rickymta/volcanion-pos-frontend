import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { toast } from 'sonner'
import apiClient from '@/lib/api-client'
import type { ContactRequestDto } from '@/types'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, Loader2 } from 'lucide-react'
import { formatDate } from '@/lib/utils'

const STATUS_OPTIONS = ['New', 'InProgress', 'Resolved', 'Closed'] as const
type ContactStatus = (typeof STATUS_OPTIONS)[number]

const STATUS_VARIANT: Record<string, 'default' | 'secondary' | 'success' | 'destructive'> = {
  New: 'default',
  InProgress: 'secondary',
  Resolved: 'success',
  Closed: 'destructive',
}

function DetailRow({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null
  return (
    <div className="grid grid-cols-3 gap-2 py-2.5 border-b last:border-0 text-sm">
      <dt className="text-muted-foreground font-medium">{label}</dt>
      <dd className="col-span-2">{value}</dd>
    </div>
  )
}

export function ContactDetailPage() {
  const { id } = useParams<{ id: string }>()
  const qc = useQueryClient()
  const [newStatus, setNewStatus] = useState<ContactStatus | ''>('')

  const { data: contact, isLoading } = useQuery({
    queryKey: ['contact', id],
    queryFn: () => apiClient.get<ContactRequestDto>(`/contacts/${id}`).then((r) => r.data),
    enabled: !!id,
  })

  useEffect(() => {
    if (contact) setNewStatus(contact.status as ContactStatus)
  }, [contact])

  const updateMutation = useMutation({
    mutationFn: (status: string) => apiClient.patch(`/contacts/${id}/status`, { status }).then((r) => r.data),
    onSuccess: () => {
      toast.success('Cập nhật trạng thái thành công!')
      qc.invalidateQueries({ queryKey: ['contact', id] })
      qc.invalidateQueries({ queryKey: ['contacts'] })
    },
    onError: () => toast.error('Có lỗi xảy ra.'),
  })

  if (isLoading) return <div className="py-12 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
  if (!contact) return <div className="py-12 text-center text-muted-foreground">Không tìm thấy.</div>

  return (
    <div className="space-y-4 max-w-2xl">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild><Link to="/contacts"><ArrowLeft className="h-4 w-4" /></Link></Button>
        <h1 className="text-2xl font-bold">Chi tiết liên hệ</h1>
      </div>

      <div className="border rounded-lg overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3 bg-muted/20 border-b">
          <div className="flex items-center gap-3">
            <span className="font-semibold">{contact.fullName}</span>
            <Badge variant={STATUS_VARIANT[contact.status] ?? 'secondary'}>{contact.status}</Badge>
          </div>
          <div className="flex items-center gap-2">
            <select
              className="border rounded-md px-2 py-1 text-sm bg-background"
              value={newStatus}
              onChange={(e) => setNewStatus(e.target.value as ContactStatus)}
            >
              {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            <Button
              size="sm"
              disabled={updateMutation.isPending || newStatus === contact.status}
              onClick={() => newStatus && updateMutation.mutate(newStatus)}
            >
              {updateMutation.isPending && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />}
              Cập nhật
            </Button>
          </div>
        </div>
        <dl className="px-5">
          <DetailRow label="Email" value={contact.email} />
          <DetailRow label="Điện thoại" value={contact.phone} />
          <DetailRow label="Loại" value={contact.type} />
          <DetailRow label="Độ ưu tiên" value={contact.priority} />
          <DetailRow label="Ngày gửi" value={formatDate(contact.createdAt)} />
          <DetailRow label="Cập nhật" value={formatDate(contact.updatedAt)} />
        </dl>
      </div>

      {contact.subject && (
        <div className="border rounded-lg p-5 space-y-1">
          <h3 className="text-sm font-medium text-muted-foreground">Chủ đề</h3>
          <p className="text-sm">{contact.subject}</p>
        </div>
      )}

      <div className="border rounded-lg p-5 space-y-1">
        <h3 className="text-sm font-medium text-muted-foreground">Nội dung</h3>
        <p className="text-sm whitespace-pre-wrap">{contact.message}</p>
      </div>
    </div>
  )
}
