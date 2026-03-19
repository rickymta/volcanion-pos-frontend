import { HeroSection } from '@/components/sections/hero-section'
import { FeaturesSection } from '@/components/sections/features-section'
import { TestimonialsSection } from '@/components/sections/testimonials-section'
import { CtaSection } from '@/components/sections/cta-section'
import { getFeaturedPosts, getTestimonials, getSiteSettings } from '@/lib/api'

export const revalidate = 120 // 120s — testimonials + featured posts cache 120s

export default async function HomePage() {
  const [featuredPosts, testimonials, settings] = await Promise.all([
    getFeaturedPosts(6).catch(() => []),
    getTestimonials().catch(() => []),
    getSiteSettings().catch(() => []),
  ])

  return (
    <>
      <HeroSection settings={settings} featuredPosts={featuredPosts} />
      <FeaturesSection />
      <TestimonialsSection testimonials={testimonials} />
      <CtaSection />
    </>
  )
}
