import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useCallback, useState } from 'react'
import { useDropzone } from 'react-dropzone'
import { toast } from 'sonner'
import apiClient from '@/lib/api-client'
import type { MediaFileDto } from '@/types'
import { Button } from '@/components/ui/button'
import { Trash2, Upload, Copy, Loader2 } from 'lucide-react'

export function MediaPage() {
  const qc = useQueryClient()
  const [uploading, setUploading] = useState(false)

  const { data: items, isLoading } = useQuery({
    queryKey: ['media'],
    queryFn: () => apiClient.get<MediaFileDto[]>('/media').then((r) => r.data),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiClient.delete(`/media/${id}`),
    onSuccess: () => { toast.success('Đã xóa.'); qc.invalidateQueries({ queryKey: ['media'] }) },
    onError: () => toast.error('Không thể xóa.'),
  })

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (!acceptedFiles.length) return
    setUploading(true)
    try {
      for (const file of acceptedFiles) {
        const fd = new FormData()
        fd.append('file', file)
        await apiClient.post('/media', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
      }
      toast.success('Upload thành công!')
      qc.invalidateQueries({ queryKey: ['media'] })
    } catch {
      toast.error('Upload thất bại.')
    } finally {
      setUploading(false)
    }
  }, [qc])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': [], 'application/pdf': [], 'video/*': [] },
    multiple: true,
  })

  function copyUrl(url: string) {
    navigator.clipboard.writeText(url)
    toast.success('Đã copy URL!')
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Thư viện Media</h1>

      {/* Dropzone */}
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
          isDragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/30 hover:border-primary/50'
        }`}
      >
        <input {...getInputProps()} />
        {uploading ? (
          <div className="flex items-center justify-center gap-2 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" /> Đang tải lên...
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 text-muted-foreground">
            <Upload className="h-8 w-8" />
            <p className="text-sm">{isDragActive ? 'Thả file tại đây...' : 'Kéo & thả file vào đây, hoặc click để chọn'}</p>
            <p className="text-xs">Hỗ trợ: Hình ảnh, PDF, Video</p>
          </div>
        )}
      </div>

      {/* Media grid */}
      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">Đang tải...</div>
      ) : !items?.length ? (
        <div className="text-center py-12 text-muted-foreground">Chưa có file nào.</div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {items.map((item) => (
            <div key={item.id} className="group relative border rounded-lg overflow-hidden bg-muted/20 aspect-square">
              {item.mimeType.startsWith('image/') ? (
                <img src={item.url} alt={item.fileName} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs text-center p-2">
                  <span>{item.fileName}</span>
                </div>
              )}
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
                <Button
                  size="icon"
                  variant="secondary"
                  className="h-7 w-7"
                  onClick={() => copyUrl(item.url)}
                  title="Copy URL"
                >
                  <Copy className="h-3 w-3" />
                </Button>
                <Button
                  size="icon"
                  variant="destructive"
                  className="h-7 w-7"
                  onClick={() => { if (confirm('Xóa file này?')) deleteMutation.mutate(item.id) }}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
              <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-[10px] px-1.5 py-0.5 truncate">
                {item.fileName}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
