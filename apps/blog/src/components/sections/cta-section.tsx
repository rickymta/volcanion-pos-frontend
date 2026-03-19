import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ArrowRight } from 'lucide-react'

export function CtaSection() {
  return (
    <section className="py-20 md:py-28">
      <div className="container">
        <div className="rounded-2xl bg-primary px-8 py-16 text-center text-primary-foreground md:px-16">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Sẵn sàng bắt đầu?
          </h2>
          <p className="mt-4 text-primary-foreground/80 text-lg max-w-xl mx-auto">
            Dùng thử miễn phí 14 ngày. Không cần thẻ tín dụng. Hủy bất cứ lúc nào.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button size="lg" variant="secondary" asChild>
              <Link href="/contact">
                Bắt đầu miễn phí
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10"
              asChild
            >
              <Link href="/pricing">Xem bảng giá</Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  )
}
