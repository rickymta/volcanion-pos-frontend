import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getStaticPage } from '@/lib/api'
import { PostContent } from '@/components/blog/post-content'

export const revalidate = 120

interface StaticPageProps {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: StaticPageProps): Promise<Metadata> {
  const { slug } = await params
  const page = await getStaticPage(slug)
  if (!page) return {}
  return {
    title: page.metaTitle ?? page.title,
    description: page.metaDescription ?? undefined,
  }
}

export default async function StaticPage({ params }: StaticPageProps) {
  const { slug } = await params
  const page = await getStaticPage(slug)

  if (!page) notFound()

  return (
    <article className="container max-w-4xl py-12">
      <h1 className="mb-8 text-4xl font-bold tracking-tight">{page.title}</h1>
      <PostContent content={page.content} />
    </article>
  )
}
