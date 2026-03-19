import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import apiClient from '@/lib/api-client'
import type { CategoryDto, CreateCategoryDto } from '@/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Plus, Pencil, Trash2, Loader2 } from 'lucide-react'
import { slugify } from '@/lib/utils'

const schema = z.object({
  name: z.string().min(1),
  slug: z.string().min(1),
  description: z.string().optional(),
  parentId: z.string().optional(),
  sortOrder: z.coerce.number().int().min(0),
  isActive: z.boolean(),
})
type FormValues = z.infer<typeof schema>

export function CategoriesPage() {
  const qc = useQueryClient()
  const [editItem, setEditItem] = useState<CategoryDto | null>(null)
  const [showForm, setShowForm] = useState(false)

  const { data: items, isLoading } = useQuery({
    queryKey: ['categories'],
    queryFn: () => apiClient.get<CategoryDto[]>('/categories').then((r) => r.data),
  })

  const { register, handleSubmit, control, reset, setValue } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { sortOrder: 0, isActive: true },
  })

  function openCreate() {
    reset({ sortOrder: 0, isActive: true, name: '', slug: '' })
    setEditItem(null)
    setShowForm(true)
  }

  function openEdit(item: CategoryDto) {
    reset({ name: item.name, slug: item.slug, description: item.description ?? '', parentId: item.parentId ?? '', sortOrder: item.sortOrder, isActive: item.isActive })
    setEditItem(item)
    setShowForm(true)
  }

  const saveMutation = useMutation({
    mutationFn: (data: CreateCategoryDto) => editItem
      ? apiClient.put(`/categories/${editItem.id}`, data).then((r) => r.data)
      : apiClient.post('/categories', data).then((r) => r.data),
    onSuccess: () => {
      toast.success(editItem ? 'Cập nhật thành công!' : 'Tạo thành công!')
      qc.invalidateQueries({ queryKey: ['categories'] })
      setShowForm(false)
    },
    onError: () => toast.error('Có lỗi xảy ra.'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiClient.delete(`/categories/${id}`),
    onSuccess: () => {
      toast.success('Đã xóa.')
      qc.invalidateQueries({ queryKey: ['categories'] })
    },
    onError: () => toast.error('Không thể xóa.'),
  })

  return (
    <div className="space-y-4 max-w-3xl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Danh mục</h1>
        <Button onClick={openCreate}><Plus className="h-4 w-4 mr-1" /> Tạo mới</Button>
      </div>

      {showForm && (
        <div className="border rounded-lg p-5 bg-muted/10 space-y-4">
          <h3 className="font-semibold">{editItem ? 'Chỉnh sửa danh mục' : 'Tạo danh mục mới'}</h3>
          <form onSubmit={handleSubmit((d) => saveMutation.mutate(d))} className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Tên *</Label>
                <Input {...register('name')} onChange={(e) => { setValue('name', e.target.value); setValue('slug', slugify(e.target.value)) }} />
              </div>
              <div className="space-y-1.5">
                <Label>Slug *</Label>
                <Input {...register('slug')} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Mô tả</Label>
              <Textarea rows={2} {...register('description')} />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Thứ tự</Label>
                <Input type="number" {...register('sortOrder')} />
              </div>
              <div className="flex items-center gap-2 pt-6">
                <Controller name="isActive" control={control} render={({ field }) => (
                  <input type="checkbox" className="h-4 w-4" checked={field.value} onChange={(e) => field.onChange(e.target.checked)} />
                )} />
                <label className="text-sm">Kích hoạt</label>
              </div>
            </div>
            <div className="flex gap-2 pt-1">
              <Button type="submit" disabled={saveMutation.isPending}>
                {saveMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Lưu
              </Button>
              <Button type="button" variant="outline" onClick={() => setShowForm(false)}>Hủy</Button>
            </div>
          </form>
        </div>
      )}

      <div className="rounded-lg border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="text-left px-4 py-3 font-medium">Tên</th>
              <th className="text-left px-4 py-3 font-medium">Slug</th>
              <th className="text-left px-4 py-3 font-medium">Thứ tự</th>
              <th className="text-left px-4 py-3 font-medium">Trạng thái</th>
              <th className="w-24 px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y">
            {isLoading ? (
              <tr><td colSpan={5} className="text-center py-8 text-muted-foreground">Đang tải...</td></tr>
            ) : !items?.length ? (
              <tr><td colSpan={5} className="text-center py-8 text-muted-foreground">Chưa có danh mục.</td></tr>
            ) : (
              items.map((item) => (
                <tr key={item.id} className="hover:bg-muted/30">
                  <td className="px-4 py-3 font-medium">{item.name}</td>
                  <td className="px-4 py-3 text-muted-foreground">{item.slug}</td>
                  <td className="px-4 py-3 text-muted-foreground">{item.sortOrder}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-medium ${item.isActive ? 'text-green-600' : 'text-muted-foreground'}`}>
                      {item.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-3 flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(item)}><Pencil className="h-3.5 w-3.5" /></Button>
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
