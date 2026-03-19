import type { Metadata } from 'next'
import { ContactForm } from '@/components/contact/contact-form'

export const metadata: Metadata = {
  title: 'Liên hệ & Hỗ trợ',
  description: 'Liên hệ với đội ngũ POS Pro để được tư vấn và hỗ trợ kỹ thuật',
}

export default function ContactPage() {
  return (
    <section className="container py-16">
      <div className="mx-auto max-w-5xl">
        <div className="mb-12 text-center">
          <h1 className="text-4xl font-bold tracking-tight">Liên hệ & Hỗ trợ</h1>
          <p className="mt-4 text-lg text-muted-foreground">
            Chúng tôi sẵn sàng hỗ trợ bạn. Hãy gửi tin nhắn và chúng tôi sẽ phản hồi sớm nhất.
          </p>
        </div>
        <div className="grid gap-12 lg:grid-cols-2">
          <div>
            <h2 className="mb-6 text-2xl font-semibold">Thông tin liên hệ</h2>
            <div className="space-y-4 text-muted-foreground">
              <p>📍 Hà Nội, Việt Nam</p>
              <p>📞 1900 xxxx</p>
              <p>📧 support@pospro.vn</p>
              <p>🕐 Thứ 2 – Thứ 6: 8:00 – 17:30</p>
            </div>
          </div>
          <ContactForm />
        </div>
      </div>
    </section>
  )
}
