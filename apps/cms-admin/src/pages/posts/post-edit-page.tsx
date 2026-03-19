import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate, useParams } from 'react-router-dom'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { useEffect } from 'react'
import apiClient from '@/lib/api-client'
import type { PostDetailDto, UpdatePostDto } from '@/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { RichEditor } from '@/components/editor/rich-editor'
import { ArrowLeft, Loader2, Trash2 } from 'lucide-react'
import { slugify } from '@/lib/utils'

const postSchema = z.object({
  title: z.string().min(1),
  slug: z.string().min(1),
  excerpt: z.string().optional(),
  content: z.string().min(1),
  coverImageUrl: z.string().url().optional().or(z.literal('')),
  status: z.enum(['Draft', 'Published', 'Archived']),
  isFeatured: z.boolean(),
  categoryIds: z.array(z.string()),
  tagIds: z.array(z.string()),
  metaTitle: z.string().optional(),
  metaDescription: z.string().optional(),
  ogImageUrl: z.string().url().optional().or(z.literal('')),
})

type PostFormValues = z.infer<typeof postSchema>

export function PostEditPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const qc = useQueryClient()

  const { data: post, isLoading } = useQuery({
    queryKey: ['post', id],
    queryFn: () => apiClient.get<PostDetailDto>(`/posts/${id}`).then((r) => r.data),
    enabled: !!id,
  })

  const { register, handleSubmit, control, reset, setValue, formState: { errors } } = useForm<PostFormValues>({
    resolver: zodResolver(postSchema),
    defaultValues: { status: 'Draft', isFeatured: false, categoryIds: [], tagIds: [], content: '' },
  })

  useEffect(() => {
    if (post) {
      reset({
        title: post.title,
        slug: post.slug,
        excerpt: post.excerpt ?? '',
        content: post.content,
        coverImageUrl: post.coverImageUrl ?? '',
        status: post.status,
        isFeatured: post.isFeatured,
        categoryIds: post.categories.map((c) => c.id),
        tagIds: post.tags.map((t) => t.id),
        metaTitle: post.metaTitle ?? '',
        metaDescription: post.metaDescription ?? '',
        ogImageUrl: post.ogImageUrl ?? '',
      })
    }
  }, [post, reset])

  const updateMutation = useMutation({
    mutationFn: (data: UpdatePostDto) => apiClient.put(`/posts/${id}`, data).then((r) => r.data),
    onSuccess: () => {
      toast.success('Cập nhật thành công!')
      qc.invalidateQueries({ queryKey: ['posts'] })
      qc.invalidateQueries({ queryKey: ['post', id] })
    },
    onError: () => toast.error('Có lỗi xảy ra.'),
  })

  const deleteMutation = useMutation({
    mutationFn: () => apiClient.delete(`/posts/${id}`),
    onSuccess: () => {
      toast.success('Đã xóa bài viết.')
      qc.invalidateQueries({ queryKey: ['posts'] })
      navigate('/posts')
    },
    onError: () => toast.error('Không thể xóa bài viết.'),
  })

  function onSubmit(data: PostFormValues) {
    updateMutation.mutate({
      ...data,
      coverImageUrl: data.coverImageUrl || undefined,
      ogImageUrl: data.ogImageUrl || undefined,
    } as UpdatePostDto)
  }

  if (isLoading) return <p className="text-muted-foreground">Đang tải...</p>

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-2xl font-bold">Chỉnh sửa bài viết</h1>
        </div>
        <Button
          variant="destructive"
          size="sm"
          onClick={() => { if (confirm('Xóa bài viết này?')) deleteMutation.mutate() }}
          disabled={deleteMutation.isPending}
        >
          <Trash2 className="h-4 w-4 mr-1" />
          Xóa
        </Button>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <div className="space-y-1.5">
          <Label>Tiêu đề *</Label>
          <Input
            {...register('title')}
            onChange={(e) => {
              setValue('title', e.target.value)
              setValue('slug', slugify(e.target.value))
            }}
          />
          {errors.title && <p className="text-xs text-destructive">{errors.title.message}</p>}
        </div>

        <div className="space-y-1.5">
          <Label>Slug *</Label>
          <Input {...register('slug')} />
        </div>

        <div className="space-y-1.5">
          <Label>Nội dung *</Label>
          <Controller
            name="content"
            control={control}
            render={({ field }) => <RichEditor value={field.value} onChange={field.onChange} />}
          />
        </div>

        <div className="space-y-1.5">
          <Label>Tóm tắt</Label>
          <Textarea rows={3} {...register('excerpt')} />
        </div>

        <div className="space-y-1.5">
          <Label>Ảnh bìa (URL)</Label>
          <Input type="url" {...register('coverImageUrl')} />
        </div>

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
                    className="h-4 w-4 rounded"
                    checked={field.value}
                    onChange={(e) => field.onChange(e.target.checked)}
                  />
                )}
              />
              <label className="text-sm">Đánh dấu nổi bật</label>
            </div>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Meta Title</Label>
            <Input {...register('metaTitle')} />
          </div>
          <div className="space-y-1.5">
            <Label>OG Image URL</Label>
            <Input type="url" {...register('ogImageUrl')} />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label>Meta Description</Label>
          <Textarea rows={2} {...register('metaDescription')} />
        </div>

        <div className="flex gap-3 pt-2">
          <Button type="submit" disabled={updateMutation.isPending}>
            {updateMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Lưu thay đổi
          </Button>
          <Button type="button" variant="outline" onClick={() => navigate(-1)}>Hủy</Button>
        </div>
      </form>
    </div>
  )
}
