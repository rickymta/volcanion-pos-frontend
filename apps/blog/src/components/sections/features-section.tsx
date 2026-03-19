import {
  BarChart3,
  Package,
  Users,
  CreditCard,
  ShieldCheck,
  Zap,
} from 'lucide-react'
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'

const FEATURES = [
  {
    icon: BarChart3,
    title: 'Báo cáo thời gian thực',
    description: 'Theo dõi doanh thu, lợi nhuận và hiệu suất kinh doanh ngay lập tức.',
  },
  {
    icon: Package,
    title: 'Quản lý kho hàng',
    description: 'Kiểm soát tồn kho, cảnh báo hàng sắp hết và tự động đặt hàng lại.',
  },
  {
    icon: Users,
    title: 'Quản lý khách hàng',
    description: 'Xây dựng cơ sở dữ liệu khách hàng, chương trình khách hàng thân thiết.',
  },
  {
    icon: CreditCard,
    title: 'Đa kênh thanh toán',
    description: 'Hỗ trợ tiền mặt, thẻ, ví điện tử, QR code và thanh toán trả góp.',
  },
  {
    icon: ShieldCheck,
    title: 'Bảo mật dữ liệu',
    description: 'Mã hóa dữ liệu theo chuẩn AES-256 và sao lưu tự động lên đám mây.',
  },
  {
    icon: Zap,
    title: 'Tích hợp nhanh',
    description: 'Kết nối với máy in, máy quét mã vạch và phần cứng POS phổ biến.',
  },
]

export function FeaturesSection() {
  return (
    <section id="features" className="py-20 md:py-28">
      <div className="container">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Tính năng toàn diện
          </h2>
          <p className="mt-3 text-muted-foreground text-lg max-w-2xl mx-auto">
            Mọi công cụ bạn cần để vận hành doanh nghiệp hiệu quả, trong một nền tảng.
          </p>
        </div>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((feature) => (
            <Card key={feature.title} className="group hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                  <feature.icon className="h-5 w-5" />
                </div>
                <CardTitle className="text-lg">{feature.title}</CardTitle>
                <CardDescription>{feature.description}</CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
      </div>
    </section>
  )
}
