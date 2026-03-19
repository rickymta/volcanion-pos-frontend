import type { Metadata } from 'next'
import { getFaqs } from '@/lib/api'
import { FaqList } from '@/components/faq/faq-list'

export const revalidate = 300

export const metadata: Metadata = {
  title: 'Câu hỏi thường gặp',
  description: 'Giải đáp các thắc mắc phổ biến về POS Pro',
}

export default async function FaqPage() {
  const faqs = await getFaqs().catch(() => [])

  return (
    <section className="container max-w-3xl py-16">
      <div className="mb-12 text-center">
        <h1 className="text-4xl font-bold tracking-tight">Câu hỏi thường gặp</h1>
        <p className="mt-4 text-lg text-muted-foreground">
          Tìm câu trả lời cho những thắc mắc phổ biến nhất
        </p>
      </div>
      <FaqList faqs={faqs} />
    </section>
  )
}
