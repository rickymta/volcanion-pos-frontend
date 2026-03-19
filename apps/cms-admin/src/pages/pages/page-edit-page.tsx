import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import apiClient from '@/lib/api-client'
import type { StaticPageDto } from '@/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { RichEditor } from '@/components/editor/rich-editor'
import { Loader2, ArrowLeft, Trash2 } from 'lucide-react'

const schema = z.object({
  title: z.string().min(1),
  slug: z.string().min(1),
  content: z.string(),
  metaTitle: z.string().optional(),
  metaDescription: z.string().optional(),
  status: z.enum(['draft', 'published']),
})
type FormValues = z.infer<typeof schema>

export function PageEditPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const qc = useQueryClient()

  const { data: page, isLoading } = useQuery({
    queryKey: ['page', id],
    queryFn: () => apiClient.get<StaticPageDto>(`/pages/${id}`).then((r) => r.data),
    enabled: !!id,
  })

  const { register, handleSubmit, control, reset } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { status: 'draft', content: '' },
  })

  useEffect(() => {
    if (page) {
      reset({
        title: page.title,
        slug: page.slug,
        content: page.content ?? '',
        metaTitle: page.metaTitle ?? '',
        metaDescription: page.metaDescription ?? '',
        status: page.status as 'draft' | 'published',
      })
    }
  }, [page, reset])

  const updateMutation = useMutation({
    mutationFn: (d: FormValues) => apiClient.put(`/pages/${id}`, d).then((r) => r.data),
    onSuccess: () => {
      toast.success('Cập nhật thành công!')
      qc.invalidateQueries({ queryKey: ['pages'] })
      qc.invalidateQueries({ queryKey: ['page', id] })
    },
    onError: () => toast.error('Có lỗi xảy ra.'),
  })

  const deleteMutation = useMutation({
    mutationFn: () => apiClient.delete(`/pages/${id}`),
    onSuccess: () => {
      toast.success('Đã xóa trang.')
      qc.invalidateQueries({ queryKey: ['pages'] })
      navigate('/pages')
    },
    onError: () => toast.error('Không thể xóa.'),
  })

  if (isLoading) return <div className="py-12 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
  if (!page) return <div className="py-12 text-center text-muted-foreground">Không tìm thấy trang.</div>

  return (
    <div className="space-y-4 max-w-3xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/pages')}><ArrowLeft className="h-4 w-4" /></Button>
          <h1 className="text-2xl font-bold">Chỉnh sửa trang</h1>
        </div>
        <Button
          variant="destructive"
          size="sm"
          disabled={deleteMutation.isPending}
          onClick={() => { if (confirm('Xóa trang này vĩnh viễn?')) deleteMutation.mutate() }}
        >
          <Trash2 className="mr-2 h-4 w-4" />Xóa
        </Button>
      </div>

      <form onSubmit={handleSubmit((d) => updateMutation.mutate(d))} className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Tiêu đề *</Label>
            <Input {...register('title')} />
          </div>
          <div className="space-y-1.5">
            <Label>Slug *</Label>
            <Input {...register('slug')} />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label>Nội dung</Label>
          <Controller
            name="content"
            control={control}
            render={({ field }) => <RichEditor value={field.value} onChange={field.onChange} />}
          />
        </div>

        <div className="border rounded-lg p-4 space-y-3 bg-muted/10">
          <h3 className="font-medium text-sm">SEO</h3>
          <div className="space-y-1.5">
            <Label>Meta Title</Label>
            <Input {...register('metaTitle')} />
          </div>
          <div className="space-y-1.5">
            <Label>Meta Description</Label>
            <Textarea rows={2} {...register('metaDescription')} />
          </div>
        </div>

        <div className="space-y-1.5 max-w-[200px]">
          <Label>Trạng thái</Label>
          <select className="w-full border rounded-md px-3 py-2 text-sm bg-background" {...register('status')}>
            <option value="draft">Draft</option>
            <option value="published">Published</option>
          </select>
        </div>

        <div className="flex gap-2">
          <Button type="submit" disabled={updateMutation.isPending}>
            {updateMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Lưu thay đổi
          </Button>
          <Button type="button" variant="outline" onClick={() => navigate('/pages')}>Hủy</Button>
        </div>
      </form>
    </div>
  )
}
