import { useMemo, useState } from 'react'
import { Select } from '@mantine/core'
import { useDebouncedValue } from '@mantine/hooks'
import { useQuery } from '@tanstack/react-query'
import { productsApi } from '@pos/api-client'
import type { ProductDto } from '@pos/api-client'

interface ProductSelectCellProps {
  value: string | null
  onChange: (productId: string | null, product: ProductDto | null) => void
  placeholder?: string
  style?: React.CSSProperties
}

/**
 * A self-contained product select: manages its own search state, performs
 * debounced server-side search (pageSize=20), and ensures the currently
 * selected product label is always visible even when not in search results.
 *
 * Placing state inside this component avoids the "shared re-render" problem
 * where a single shared `productSearch` state caused all rows to re-render
 * and the dropdown to close when the user typed in any row.
 */
export function ProductSelectCell({
  value,
  onChange,
  placeholder = 'Chọn sản phẩm...',
  style,
}: ProductSelectCellProps) {
  const [searchValue, setSearchValue] = useState('')
  const [debouncedSearch] = useDebouncedValue(searchValue, 300)

  // Server-side search — always enabled so dropdown opens with initial results
  const { data: searchResults } = useQuery({
    queryKey: ['products-search', debouncedSearch],
    queryFn: () => productsApi.list({ keyword: debouncedSearch || undefined, pageSize: 20 }),
    staleTime: 30_000,
  })

  // Load the selected product by ID so its label stays visible even when it
  // falls outside the current search results (typical in edit mode)
  const { data: selectedProduct } = useQuery({
    queryKey: ['product', value],
    queryFn: () => productsApi.getById(value!),
    enabled: !!value,
    staleTime: Infinity,
  })

  const options = useMemo(() => {
    const results = (searchResults?.items ?? []).map((p) => ({
      value: p.id,
      label: `${p.name} (${p.code})`,
    }))
    // Always include the currently-selected product so its label is shown
    if (value && selectedProduct && !results.find((o) => o.value === value)) {
      results.unshift({
        value: selectedProduct.id,
        label: `${selectedProduct.name} (${selectedProduct.code})`,
      })
    }
    return results
  }, [searchResults?.items, selectedProduct, value])

  return (
    <Select
      searchable
      clearable
      data={options}
      value={value}
      searchValue={searchValue}
      onSearchChange={setSearchValue}
      onChange={(id) => {
        if (!id) {
          onChange(null, null)
          return
        }
        // Prefer item from search results; fall back to the cached selectedProduct
        const product =
          (searchResults?.items ?? []).find((p) => p.id === id) ??
          (selectedProduct?.id === id ? (selectedProduct as ProductDto) : null)
        onChange(id, product ?? null)
      }}
      // Disable client-side filtering — data is already filtered server-side
      filter={({ options: opts }) => opts}
      placeholder={placeholder}
      nothingFoundMessage="Không tìm thấy"
      style={style}
    />
  )
}
