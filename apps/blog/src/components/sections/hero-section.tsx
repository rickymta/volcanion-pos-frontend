import Link from 'next/link'
import type { PostSummaryDto, SiteSettingDto } from '@/types'
import { parseSettings } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { PostCard } from '@/components/blog/post-card'
import { ArrowRight } from 'lucide-react'

interface HeroSectionProps {
  settings: SiteSettingDto[]
  featuredPosts: PostSummaryDto[]
}

export function HeroSection({ settings, featuredPosts }: HeroSectionProps) {
  const s = parseSettings(settings)
  const heroTitle = (s['hero_title'] as string) ?? 'Giải pháp POS thông minh cho doanh nghiệp'
  const heroSubtitle = (s['hero_subtitle'] as string) ?? 'Quản lý bán hàng, kho hàng và tài chính trên một nền tảng duy nhất'
  const heroCta = (s['hero_cta_text'] as string) ?? 'Dùng thử miễn phí'
  const heroCtaUrl = (s['hero_cta_url'] as string) ?? '/contact'
  const heroSecondaryCtaText = (s['hero_secondary_cta_text'] as string) ?? 'Xem tính năng'
  const heroSecondaryCtaUrl = (s['hero_secondary_cta_url'] as string) ?? '#features'

  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-background via-background to-primary/5 py-20 md:py-32">
      <div className="container">
        <div className="mx-auto max-w-3xl text-center">
          <Badge variant="secondary" className="mb-4">
            Mới nhất 2025
          </Badge>
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
            {heroTitle}
          </h1>
          <p className="mt-6 text-lg text-muted-foreground sm:text-xl max-w-2xl mx-auto">
            {heroSubtitle}
          </p>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button size="lg" asChild>
              <Link href={heroCtaUrl}>
                {heroCta}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button variant="outline" size="lg" asChild>
              <Link href={heroSecondaryCtaUrl}>{heroSecondaryCtaText}</Link>
            </Button>
          </div>
        </div>

        {/* Featured posts grid */}
        {(featuredPosts ?? []).length > 0 && (
          <div className="mt-20">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-semibold">Bài viết nổi bật</h2>
              <Link
                href="/blog"
                className="text-sm text-muted-foreground hover:text-primary flex items-center gap-1"
              >
                Xem tất cả <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {featuredPosts.slice(0, 3).map((post) => (
                <PostCard key={post.id} post={post} />
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  )
}
