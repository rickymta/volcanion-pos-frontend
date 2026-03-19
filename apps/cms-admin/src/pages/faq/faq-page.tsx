import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import apiClient from '@/lib/api-client'
import type { FaqDto } from '@/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Plus, Pencil, Trash2, Loader2, ChevronDown, ChevronRight } from 'lucide-react'

const schema = z.object({
  question: z.string().min(1),
  answer: z.string().min(1),
  category: z.string().optional(),
  sortOrder: z.coerce.number().int().min(0),
  isActive: z.boolean(),
})
type FormValues = z.infer<typeof schema>

function FaqFormModal({ item, onClose }: { item?: FaqDto; onClose: () => void }) {
  const qc = useQueryClient()
  const { register, handleSubmit, control } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: item
      ? { ...item, category: item.category ?? '' }
      : { sortOrder: 0, isActive: true },
  })

  const mutation = useMutation({
    mutationFn: (d: FormValues) => item
      ? apiClient.put(`/faqs/${item.id}`, d).then((r) => r.data)
      : apiClient.post('/faqs', d).then((r) => r.data),
    onSuccess: () => {
      toast.success(item ? 'Cập nhật thành công!' : 'Tạo thành công!')
      qc.invalidateQueries({ queryKey: ['faqs'] })
      onClose()
    },
    onError: () => toast.error('Có lỗi xảy ra.'),
  })

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="bg-background rounded-xl shadow-xl w-full max-w-lg p-6 space-y-4">
        <h3 className="font-semibold text-lg">{item ? 'Chỉnh sửa FAQ' : 'Thêm câu hỏi mới'}</h3>
        <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="space-y-3">
          <div className="space-y-1.5">
            <Label>Câu hỏi *</Label>
            <Input {...register('question')} />
          </div>
          <div className="space-y-1.5">
            <Label>Câu trả lời *</Label>
            <Textarea rows={5} {...register('answer')} />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Danh mục</Label>
              <Input {...register('category')} placeholder="Chung, Kỹ thuật, ..." />
            </div>
            <div className="space-y-1.5">
              <Label>Thứ tự</Label>
              <Input type="number" {...register('sortOrder')} />
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <Controller name="isActive" control={control} render={({ field }) => (
              <input type="checkbox" className="h-4 w-4" checked={field.value} onChange={(e) => field.onChange(e.target.checked)} />
            )} /> Kích hoạt
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

export function FaqPage() {
  const qc = useQueryClient()
  const [modal, setModal] = useState<{ open: boolean; item?: FaqDto }>({ open: false })
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  const { data: faqs, isLoading } = useQuery({
    queryKey: ['faqs'],
    queryFn: () => apiClient.get<FaqDto[]>('/faqs').then((r) => r.data),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiClient.delete(`/faqs/${id}`),
    onSuccess: () => { toast.success('Đã xóa.'); qc.invalidateQueries({ queryKey: ['faqs'] }) },
    onError: () => toast.error('Không thể xóa.'),
  })

  function toggleExpand(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }

  // Group by category
  const groups = faqs?.reduce<Record<string, FaqDto[]>>((acc, faq) => {
    const key = faq.category ?? 'Chung'
    if (!acc[key]) acc[key] = []
    acc[key].push(faq)
    return acc
  }, {}) ?? {}

  return (
    <div className="space-y-4 max-w-3xl">
      {modal.open && <FaqFormModal item={modal.item} onClose={() => setModal({ open: false })} />}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">FAQ</h1>
        <Button onClick={() => setModal({ open: true })}><Plus className="h-4 w-4 mr-1" />Thêm câu hỏi</Button>
      </div>

      {isLoading ? (
        <div className="py-12 text-center text-muted-foreground">Đang tải...</div>
      ) : !faqs?.length ? (
        <div className="py-12 text-center text-muted-foreground">Chưa có câu hỏi nào.</div>
      ) : (
        Object.entries(groups).map(([category, items]) => (
          <div key={category} className="space-y-1">
            <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide px-1">{category}</h3>
            <div className="border rounded-lg overflow-hidden divide-y">
              {items.map((faq) => (
                <div key={faq.id}>
                  <div
                    className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-muted/20"
                    onClick={() => toggleExpand(faq.id)}
                  >
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      {expanded.has(faq.id) ? <ChevronDown className="h-4 w-4 shrink-0" /> : <ChevronRight className="h-4 w-4 shrink-0" />}
                      <span className="font-medium truncate">{faq.question}</span>
                      {!faq.isActive && <span className="text-xs text-muted-foreground">(Inactive)</span>}
                    </div>
                    <div className="flex gap-1 ml-2" onClick={(e) => e.stopPropagation()}>
                      <Button variant="ghost" size="icon" onClick={() => setModal({ open: true, item: faq })}><Pencil className="h-3.5 w-3.5" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => { if (confirm('Xóa?')) deleteMutation.mutate(faq.id) }}>
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </Button>
                    </div>
                  </div>
                  {expanded.has(faq.id) && (
                    <div className="px-10 py-3 bg-muted/10 text-sm text-muted-foreground whitespace-pre-wrap">{faq.answer}</div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  )
}
