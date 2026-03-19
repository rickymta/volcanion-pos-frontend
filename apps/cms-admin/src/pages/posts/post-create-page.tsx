import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import apiClient from '@/lib/api-client'
import type { CreatePostDto } from '@/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { RichEditor } from '@/components/editor/rich-editor'
import { ArrowLeft, Loader2 } from 'lucide-react'
import { slugify } from '@/lib/utils'

const postSchema = z.object({
  title: z.string().min(1, 'Tiêu đề không được để trống'),
  slug: z.string().min(1, 'Slug không được để trống'),
  excerpt: z.string().optional(),
  content: z.string().min(1, 'Nội dung không được để trống'),
  coverImageUrl: z.string().url('URL không hợp lệ').optional().or(z.literal('')),
  status: z.enum(['Draft', 'Published', 'Archived']),
  isFeatured: z.boolean(),
  categoryIds: z.array(z.string()),
  tagIds: z.array(z.string()),
  metaTitle: z.string().optional(),
  metaDescription: z.string().optional(),
  ogImageUrl: z.string().url().optional().or(z.literal('')),
})

type PostFormValues = z.infer<typeof postSchema>

export function PostCreatePage() {
  const navigate = useNavigate()
  const qc = useQueryClient()

  const { register, handleSubmit, control, setValue, formState: { errors } } = useForm<PostFormValues>({
    resolver: zodResolver(postSchema),
    defaultValues: {
      status: 'Draft',
      isFeatured: false,
      categoryIds: [],
      tagIds: [],
      content: '',
    },
  })

  const createMutation = useMutation({
    mutationFn: (data: CreatePostDto) => apiClient.post('/posts', data).then((r) => r.data),
    onSuccess: () => {
      toast.success('Tạo bài viết thành công!')
      qc.invalidateQueries({ queryKey: ['posts'] })
      navigate('/posts')
    },
    onError: () => toast.error('Có lỗi xảy ra khi tạo bài viết.'),
  })

  function onSubmit(data: PostFormValues) {
    createMutation.mutate({
      ...data,
      coverImageUrl: data.coverImageUrl || undefined,
      ogImageUrl: data.ogImageUrl || undefined,
    } as CreatePostDto)
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-2xl font-bold">Tạo bài viết mới</h1>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        {/* Title */}
        <div className="space-y-1.5">
          <Label htmlFor="title">Tiêu đề *</Label>
          <Input
            id="title"
            {...register('title')}
            onChange={(e) => {
              setValue('title', e.target.value)
              setValue('slug', slugify(e.target.value))
            }}
          />
          {errors.title && <p className="text-xs text-destructive">{errors.title.message}</p>}
        </div>

        {/* Slug */}
        <div className="space-y-1.5">
          <Label htmlFor="slug">Slug *</Label>
          <Input id="slug" {...register('slug')} />
          {errors.slug && <p className="text-xs text-destructive">{errors.slug.message}</p>}
        </div>

        {/* Content / Editor */}
        <div className="space-y-1.5">
          <Label>Nội dung *</Label>
          <Controller
            name="content"
            control={control}
            render={({ field }) => (
              <RichEditor value={field.value} onChange={field.onChange} />
            )}
          />
          {errors.content && <p className="text-xs text-destructive">{errors.content.message}</p>}
        </div>

        {/* Excerpt */}
        <div className="space-y-1.5">
          <Label htmlFor="excerpt">Tóm tắt</Label>
          <Textarea id="excerpt" rows={3} {...register('excerpt')} />
        </div>

        {/* Cover image */}
        <div className="space-y-1.5">
          <Label htmlFor="coverImageUrl">Ảnh bìa (URL)</Label>
          <Input id="coverImageUrl" type="url" placeholder="https://..." {...register('coverImageUrl')} />
        </div>

        {/* Status & Featured */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Trạng thái</Label>
            <Controller
              name="status"
              control={control}
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Draft">Nháp</SelectItem>
                    <SelectItem value="Published">Xuất bản</SelectItem>
                    <SelectItem value="Archived">Lưu trữ</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Nổi bật</Label>
            <div className="flex items-center gap-2 h-9">
              <Controller
                name="isFeatured"
                control={control}
                render={({ field }) => (
                  <input
                    type="checkbox"
                    id="isFeatured"
                    className="h-4 w-4 rounded border-input"
                    checked={field.value}
                    onChange={(e) => field.onChange(e.target.checked)}
                  />
                )}
              />
              <label htmlFor="isFeatured" className="text-sm">Đánh dấu nổi bật</label>
            </div>
          </div>
        </div>

        {/* Meta */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="metaTitle">Meta Title</Label>
            <Input id="metaTitle" {...register('metaTitle')} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ogImageUrl">OG Image URL</Label>
            <Input id="ogImageUrl" type="url" {...register('ogImageUrl')} />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="metaDescription">Meta Description</Label>
          <Textarea id="metaDescription" rows={2} {...register('metaDescription')} />
        </div>

        <div className="flex gap-3 pt-2">
          <Button type="submit" disabled={createMutation.isPending}>
            {createMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Tạo bài viết
          </Button>
          <Button type="button" variant="outline" onClick={() => navigate(-1)}>
            Hủy
          </Button>
        </div>
      </form>
    </div>
  )
}
