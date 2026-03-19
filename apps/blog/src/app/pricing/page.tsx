import type { Metadata } from 'next'
import { getPricingPage } from '@/lib/api'
import { PricingCards } from '@/components/pricing/pricing-cards'

export const revalidate = 300

export const metadata: Metadata = {
  title: 'Bảng giá',
  description: 'Các gói dịch vụ POS Pro phù hợp với mọi quy mô cửa hàng',
}

export default async function PricingPage() {
  const { plans, addons } = await getPricingPage().catch(() => ({ plans: [], addons: [] }))

  return (
    <section className="container py-16 lg:py-24">
      <div className="mx-auto mb-12 max-w-2xl text-center">
        <h1 className="text-4xl font-bold tracking-tight">Bảng giá</h1>
        <p className="mt-4 text-lg text-muted-foreground">
          Chọn gói phù hợp với quy mô và nhu cầu của bạn. Dùng thử miễn phí 14 ngày.
        </p>
      </div>
      <PricingCards plans={plans} addons={addons} />
    </section>
  )
}
