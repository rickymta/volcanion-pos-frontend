import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default function NotFound() {
  return (
    <div className="container flex min-h-[60vh] flex-col items-center justify-center gap-6 text-center">
      <div className="space-y-2">
        <h1 className="text-8xl font-black text-muted-foreground/30">404</h1>
        <h2 className="text-2xl font-semibold tracking-tight">
          Trang không tìm thấy
        </h2>
        <p className="text-muted-foreground">
          Trang bạn đang tìm kiếm không tồn tại hoặc đã bị di chuyển.
        </p>
      </div>
      <div className="flex gap-3">
        <Button asChild>
          <Link href="/">Về trang chủ</Link>
        </Button>
        <Button variant="outline" asChild>
          <Link href="/blog">Đọc blog</Link>
        </Button>
      </div>
    </div>
  )
}
