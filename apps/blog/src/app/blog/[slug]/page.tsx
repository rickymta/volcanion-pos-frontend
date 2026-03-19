import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Image from 'next/image'
import { getPostBySlug } from '@/lib/api'
import { PostContent } from '@/components/blog/post-content'
import { formatDate } from '@/lib/utils'

export const revalidate = 60

interface PostPageProps {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: PostPageProps): Promise<Metadata> {
  const { slug } = await params
  const post = await getPostBySlug(slug)
  if (!post) return {}

  return {
    title: post.metaTitle ?? post.title,
    description: post.metaDescription ?? post.excerpt ?? undefined,
    openGraph: {
      title: post.metaTitle ?? post.title,
      description: post.metaDescription ?? post.excerpt ?? undefined,
      images: post.ogImageUrl ? [post.ogImageUrl] : post.coverImageUrl ? [post.coverImageUrl] : [],
      type: 'article',
      publishedTime: post.publishedAt ?? undefined,
      authors: [post.author.fullName],
    },
  }
}

export default async function PostPage({ params }: PostPageProps) {
  const { slug } = await params
  const post = await getPostBySlug(slug)

  if (!post) notFound()

  return (
    <article className="container max-w-4xl py-12">
      {post.coverImageUrl && (
        <div className="relative mb-8 aspect-video w-full overflow-hidden rounded-xl">
          <Image
            src={post.coverImageUrl}
            alt={post.title}
            fill
            className="object-cover"
            priority
          />
        </div>
      )}

      <header className="mb-8">
        <div className="mb-4 flex flex-wrap gap-2">
          {post.categories.map((cat) => (
            <a
              key={cat.id}
              href={`/blog/category/${cat.slug}`}
              className="rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary hover:bg-primary/20"
            >
              {cat.name}
            </a>
          ))}
        </div>
        <h1 className="text-4xl font-bold leading-tight tracking-tight">{post.title}</h1>
        {post.excerpt && (
          <p className="mt-4 text-xl text-muted-foreground">{post.excerpt}</p>
        )}
        <div className="mt-6 flex items-center gap-4 text-sm text-muted-foreground">
          <span>{post.author.fullName}</span>
          {post.publishedAt && (
            <>
              <span>·</span>
              <time dateTime={post.publishedAt}>{formatDate(post.publishedAt)}</time>
            </>
          )}
          <span>·</span>
          <span>{post.viewCount.toLocaleString('vi-VN')} lượt xem</span>
        </div>
      </header>

      <PostContent content={post.content} />

      {post.tags.length > 0 && (
        <footer className="mt-12 flex flex-wrap gap-2 border-t pt-6">
          {post.tags.map((tag) => (
            <a
              key={tag.id}
              href={`/blog/tag/${tag.slug}`}
              className="rounded-md border px-3 py-1 text-sm hover:bg-muted"
            >
              #{tag.name}
            </a>
          ))}
        </footer>
      )}
    </article>
  )
}
