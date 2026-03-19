import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import apiClient from '@/lib/api-client'
import type { TagDto } from '@/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Pencil, Trash2, Loader2, Check, X } from 'lucide-react'
import { slugify } from '@/lib/utils'

const schema = z.object({ name: z.string().min(1), slug: z.string().min(1) })
type FormValues = z.infer<typeof schema>

export function TagsPage() {
  const qc = useQueryClient()
  const [editId, setEditId] = useState<string | null>(null)

  const { data: items, isLoading } = useQuery({
    queryKey: ['tags'],
    queryFn: () => apiClient.get<TagDto[]>('/tags').then((r) => r.data),
  })

  const createForm = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: { name: '', slug: '' } })
  const editForm = useForm<FormValues>({ resolver: zodResolver(schema) })

  function startEdit(item: TagDto) {
    editForm.reset({ name: item.name, slug: item.slug })
    setEditId(item.id)
  }

  const createMutation = useMutation({
    mutationFn: (d: FormValues) => apiClient.post('/tags', d).then((r) => r.data),
    onSuccess: () => {
      toast.success('Tạo tag thành công!')
      qc.invalidateQueries({ queryKey: ['tags'] })
      createForm.reset()
    },
    onError: () => toast.error('Có lỗi xảy ra.'),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: FormValues }) => apiClient.put(`/tags/${id}`, data).then((r) => r.data),
    onSuccess: () => {
      toast.success('Cập nhật thành công!')
      qc.invalidateQueries({ queryKey: ['tags'] })
      setEditId(null)
    },
    onError: () => toast.error('Có lỗi xảy ra.'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiClient.delete(`/tags/${id}`),
    onSuccess: () => { toast.success('Đã xóa.'); qc.invalidateQueries({ queryKey: ['tags'] }) },
    onError: () => toast.error('Không thể xóa.'),
  })

  return (
    <div className="space-y-4 max-w-2xl">
      <h1 className="text-2xl font-bold">Tags</h1>

      {/* Quick create */}
      <form onSubmit={createForm.handleSubmit((d) => createMutation.mutate(d))} className="flex gap-2 items-end border rounded-lg p-4 bg-muted/10">
        <div className="flex-1 space-y-1.5">
          <Label>Tên tag *</Label>
          <Input
            {...createForm.register('name')}
            onChange={(e) => {
              createForm.setValue('name', e.target.value)
              createForm.setValue('slug', slugify(e.target.value))
            }}
            placeholder="Nhập tên tag..."
          />
        </div>
        <div className="flex-1 space-y-1.5">
          <Label>Slug *</Label>
          <Input {...createForm.register('slug')} placeholder="auto-slug" />
        </div>
        <Button type="submit" disabled={createMutation.isPending}>
          {createMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Thêm'}
        </Button>
      </form>

      <div className="rounded-lg border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="text-left px-4 py-3 font-medium">Tên</th>
              <th className="text-left px-4 py-3 font-medium">Slug</th>
              <th className="w-24 px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y">
            {isLoading ? (
              <tr><td colSpan={3} className="text-center py-8 text-muted-foreground">Đang tải...</td></tr>
            ) : !items?.length ? (
              <tr><td colSpan={3} className="text-center py-8 text-muted-foreground">Chưa có tag.</td></tr>
            ) : (
              items.map((item) => (
                <tr key={item.id} className="hover:bg-muted/30">
                  {editId === item.id ? (
                    <>
                      <td className="px-4 py-2">
                        <Input
                          {...editForm.register('name')}
                          className="h-8"
                          onChange={(e) => {
                            editForm.setValue('name', e.target.value)
                            editForm.setValue('slug', slugify(e.target.value))
                          }}
                        />
                      </td>
                      <td className="px-4 py-2">
                        <Input {...editForm.register('slug')} className="h-8" />
                      </td>
                      <td className="px-4 py-2 flex gap-1">
                        <Button size="icon" variant="ghost" onClick={editForm.handleSubmit((d) => updateMutation.mutate({ id: item.id, data: d }))}>
                          <Check className="h-3.5 w-3.5 text-green-600" />
                        </Button>
                        <Button size="icon" variant="ghost" onClick={() => setEditId(null)}><X className="h-3.5 w-3.5" /></Button>
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="px-4 py-3 font-medium">{item.name}</td>
                      <td className="px-4 py-3 text-muted-foreground">{item.slug}</td>
                      <td className="px-4 py-3 flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => startEdit(item)}><Pencil className="h-3.5 w-3.5" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => { if (confirm('Xóa?')) deleteMutation.mutate(item.id) }}>
                          <Trash2 className="h-3.5 w-3.5 text-destructive" />
                        </Button>
                      </td>
                    </>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
