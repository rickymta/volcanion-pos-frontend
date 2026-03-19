import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import apiClient from '@/lib/api-client'
import type { TestimonialDto } from '@/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Plus, Pencil, Trash2, Loader2, Star } from 'lucide-react'

const schema = z.object({
  customerName: z.string().min(1),
  position: z.string().optional(),
  company: z.string().optional(),
  content: z.string().min(1),
  avatarUrl: z.string().optional(),
  rating: z.coerce.number().int().min(1).max(5),
  sortOrder: z.coerce.number().int().min(0),
  isVisible: z.boolean(),
})
type FormValues = z.infer<typeof schema>

function TestimonialFormModal({ item, onClose }: { item?: TestimonialDto; onClose: () => void }) {
  const qc = useQueryClient()
  const { register, handleSubmit, control } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: item
      ? { ...item, position: item.position ?? '', company: item.company ?? '', avatarUrl: item.avatarUrl ?? '' }
      : { rating: 5, sortOrder: 0, isVisible: true },
  })

  const mutation = useMutation({
    mutationFn: (d: FormValues) => item
      ? apiClient.put(`/testimonials/${item.id}`, d).then((r) => r.data)
      : apiClient.post('/testimonials', d).then((r) => r.data),
    onSuccess: () => {
      toast.success(item ? 'Cập nhật thành công!' : 'Tạo thành công!')
      qc.invalidateQueries({ queryKey: ['testimonials'] })
      onClose()
    },
    onError: () => toast.error('Có lỗi xảy ra.'),
  })

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="bg-background rounded-xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto p-6 space-y-4">
        <h3 className="font-semibold text-lg">{item ? 'Chỉnh sửa' : 'Thêm đánh giá mới'}</h3>
        <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Tên khách hàng *</Label>
              <Input {...register('customerName')} />
            </div>
            <div className="space-y-1.5">
              <Label>Chức vụ</Label>
              <Input {...register('position')} />
            </div>
            <div className="space-y-1.5">
              <Label>Công ty</Label>
              <Input {...register('company')} />
            </div>
            <div className="space-y-1.5">
              <Label>Avatar URL</Label>
              <Input {...register('avatarUrl')} placeholder="https://..." />
            </div>
            <div className="space-y-1.5">
              <Label>Số sao (1-5)</Label>
              <Input type="number" min={1} max={5} {...register('rating')} />
            </div>
            <div className="space-y-1.5">
              <Label>Thứ tự</Label>
              <Input type="number" {...register('sortOrder')} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Nội dung đánh giá *</Label>
            <Textarea rows={4} {...register('content')} />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <Controller name="isVisible" control={control} render={({ field }) => (
              <input type="checkbox" className="h-4 w-4" checked={field.value} onChange={(e) => field.onChange(e.target.checked)} />
            )} /> Hiển thị
          </label>
          <div className="flex gap-2 pt-1">
            <Button type="submit" disabled={mutation.isPending}>{mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Lưu</Button>
            <Button type="button" variant="outline" onClick={onClose}>Hủy</Button>
          </div>
        </form>
      </div>
    </div>
  )
}

export function TestimonialsPage() {
  const qc = useQueryClient()
  const [modal, setModal] = useState<{ open: boolean; item?: TestimonialDto }>({ open: false })

  const { data: items, isLoading } = useQuery({
    queryKey: ['testimonials'],
    queryFn: () => apiClient.get<TestimonialDto[]>('/testimonials').then((r) => r.data),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiClient.delete(`/testimonials/${id}`),
    onSuccess: () => { toast.success('Đã xóa.'); qc.invalidateQueries({ queryKey: ['testimonials'] }) },
    onError: () => toast.error('Không thể xóa.'),
  })

  return (
    <div className="space-y-4">
      {modal.open && <TestimonialFormModal item={modal.item} onClose={() => setModal({ open: false })} />}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Đánh giá khách hàng</h1>
        <Button onClick={() => setModal({ open: true })}><Plus className="h-4 w-4 mr-1" />Thêm mới</Button>
      </div>

      <div className="rounded-lg border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="text-left px-4 py-3 font-medium">Khách hàng</th>
              <th className="text-left px-4 py-3 font-medium hidden md:table-cell">Công ty</th>
              <th className="text-left px-4 py-3 font-medium">Sao</th>
              <th className="text-left px-4 py-3 font-medium">Hiển thị</th>
              <th className="w-24 px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y">
            {isLoading ? (
              <tr><td colSpan={5} className="text-center py-8 text-muted-foreground">Đang tải...</td></tr>
            ) : !items?.length ? (
              <tr><td colSpan={5} className="text-center py-8 text-muted-foreground">Chưa có đánh giá.</td></tr>
            ) : (
              items.map((item) => (
                <tr key={item.id} className="hover:bg-muted/30">
                  <td className="px-4 py-3">
                    <div className="font-medium">{item.customerName}</div>
                    <div className="text-xs text-muted-foreground">{item.position}</div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">{item.company}</td>
                  <td className="px-4 py-3">
                    <div className="flex">{Array.from({ length: item.rating }, (_, i) => <Star key={i} className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />)}</div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-medium ${item.isVisible ? 'text-green-600' : 'text-muted-foreground'}`}>
                      {item.isVisible ? 'Hiển thị' : 'Ẩn'}
                    </span>
                  </td>
                  <td className="px-4 py-3 flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => setModal({ open: true, item })}><Pencil className="h-3.5 w-3.5" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => { if (confirm('Xóa?')) deleteMutation.mutate(item.id) }}>
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
