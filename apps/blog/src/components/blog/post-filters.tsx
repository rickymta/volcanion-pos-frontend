'use client'

import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { useCallback } from 'react'
import type { CategoryDto, TagDto } from '@/types'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Search, X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface PostFiltersProps {
  categories: CategoryDto[]
  tags: TagDto[]
  currentSearch?: string
  currentCategoryId?: string
  currentTagSlug?: string
}

export function PostFilters({
  categories,
  tags,
  currentSearch,
  currentCategoryId,
  currentTagSlug,
}: PostFiltersProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const updateParam = useCallback(
    (key: string, value: string | null) => {
      const params = new URLSearchParams(searchParams.toString())
      if (value) {
        params.set(key, value)
      } else {
        params.delete(key)
      }
      params.delete('page') // reset page on filter change
      router.push(`${pathname}?${params.toString()}`)
    },
    [router, pathname, searchParams],
  )

  const hasFilters = currentSearch ?? currentCategoryId ?? currentTagSlug

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Tìm kiếm bài viết..."
          defaultValue={currentSearch}
          className="pl-9 pr-9"
          onChange={(e) => {
            const v = e.target.value
            // Debounce by using a submit-on-blur pattern
            if (!v) updateParam('search', null)
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              updateParam('search', (e.target as HTMLInputElement).value || null)
            }
          }}
        />
        {currentSearch && (
          <button
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            onClick={() => updateParam('search', null)}
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Categories */}
      {categories.length > 0 && (
        <div>
          <p className="text-xs font-semibold uppercase text-muted-foreground mb-2 tracking-wider">
            Danh mục
          </p>
          <div className="flex flex-wrap gap-2">
            {categories
              .filter((c) => c.isActive)
              .map((c) => (
                <Badge
                  key={c.id}
                  variant={currentCategoryId === c.id ? 'default' : 'outline'}
                  className="cursor-pointer"
                  onClick={() =>
                    updateParam(
                      'categoryId',
                      currentCategoryId === c.id ? null : c.id,
                    )
                  }
                >
                  {c.name}
                </Badge>
              ))}
          </div>
        </div>
      )}

      {/* Tags */}
      {tags.length > 0 && (
        <div>
          <p className="text-xs font-semibold uppercase text-muted-foreground mb-2 tracking-wider">
            Tags
          </p>
          <div className="flex flex-wrap gap-2">
            {tags.slice(0, 20).map((t) => (
              <Badge
                key={t.id}
                variant={currentTagSlug === t.slug ? 'default' : 'secondary'}
                className={cn(
                  'cursor-pointer text-xs',
                  currentTagSlug === t.slug
                    ? ''
                    : 'hover:bg-secondary/80',
                )}
                onClick={() =>
                  updateParam(
                    'tagSlug',
                    currentTagSlug === t.slug ? null : t.slug,
                  )
                }
              >
                #{t.name}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Clear filters */}
      {hasFilters && (
        <Button
          variant="ghost"
          size="sm"
          className="text-muted-foreground"
          onClick={() => router.push(pathname)}
        >
          <X className="h-3 w-3 mr-1" />
          Xóa bộ lọc
        </Button>
      )}
    </div>
  )
}
