import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import apiClient from '@/lib/api-client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { RichEditor } from '@/components/editor/rich-editor'
import { Loader2, ArrowLeft } from 'lucide-react'
import { slugify } from '@/lib/utils'

const schema = z.object({
  title: z.string().min(1),
  slug: z.string().min(1),
  content: z.string(),
  metaTitle: z.string().optional(),
  metaDescription: z.string().optional(),
  status: z.enum(['draft', 'published']),
})
type FormValues = z.infer<typeof schema>

export function PageCreatePage() {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const { register, handleSubmit, control, setValue } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { status: 'draft', content: '' },
  })

  const mutation = useMutation({
    mutationFn: (d: FormValues) => apiClient.post('/pages', d).then((r) => r.data),
    onSuccess: () => {
      toast.success('Tạo trang thành công!')
      qc.invalidateQueries({ queryKey: ['pages'] })
      navigate('/pages')
    },
    onError: () => toast.error('Có lỗi xảy ra.'),
  })

  return (
    <div className="space-y-4 max-w-3xl">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate('/pages')}><ArrowLeft className="h-4 w-4" /></Button>
        <h1 className="text-2xl font-bold">Tạo trang mới</h1>
      </div>

      <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Tiêu đề *</Label>
            <Input
              {...register('title')}
              onChange={(e) => { setValue('title', e.target.value); setValue('slug', slugify(e.target.value)) }}
            />
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

        <div className="flex items-center gap-4">
          <div className="space-y-1.5 flex-1">
            <Label>Trạng thái</Label>
            <select className="w-full border rounded-md px-3 py-2 text-sm bg-background" {...register('status')}>
              <option value="draft">Draft</option>
              <option value="published">Published</option>
            </select>
          </div>
        </div>

        <div className="flex gap-2">
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Tạo trang
          </Button>
          <Button type="button" variant="outline" onClick={() => navigate('/pages')}>Hủy</Button>
        </div>
      </form>
    </div>
  )
}
