import type { TestimonialDto } from '@/types'
import { Card, CardContent } from '@/components/ui/card'
import { Star } from 'lucide-react'
import { getInitials } from '@/lib/utils'

interface TestimonialsSectionProps {
  testimonials: TestimonialDto[]
}

export function TestimonialsSection({ testimonials }: TestimonialsSectionProps) {
  const visible = testimonials.filter((t) => t.isVisible)
  if (visible.length === 0) return null

  return (
    <section className="bg-muted/40 py-20 md:py-28">
      <div className="container">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Khách hàng nói gì về chúng tôi
          </h2>
          <p className="mt-3 text-muted-foreground text-lg">
            Hơn 1,000+ doanh nghiệp đang tin dùng POS của chúng tôi.
          </p>
        </div>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((t) => (
            <Card key={t.id} className="flex flex-col">
              <CardContent className="flex flex-col gap-4 p-6 flex-1">
                {/* Stars */}
                <div className="flex gap-0.5">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      className={`h-4 w-4 ${i < t.rating ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground'}`}
                    />
                  ))}
                </div>

                {/* Content */}
                <p className="text-sm text-muted-foreground leading-relaxed flex-1">
                  &ldquo;{t.content}&rdquo;
                </p>

                {/* Author */}
                <div className="flex items-center gap-3">
                  {t.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={t.avatarUrl}
                      alt={t.customerName}
                      className="h-10 w-10 rounded-full object-cover"
                    />
                  ) : (
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-semibold">
                      {getInitials(t.customerName)}
                    </div>
                  )}
                  <div>
                    <p className="text-sm font-semibold">{t.customerName}</p>
                    {(t.position ?? t.company) && (
                      <p className="text-xs text-muted-foreground">
                        {[t.position, t.company].filter(Boolean).join(' tại ')}
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  )
}
