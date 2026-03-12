import { Select, Group, Stack, Text } from '@mantine/core'
import type { SelectProps, ComboboxItem } from '@mantine/core'
import { formatVND } from '@pos/utils'

export interface ProductSearchOption {
  /** Product id */
  value: string
  /** Product name (shown as primary label) */
  label: string
  /** Product code shown as secondary dim text */
  code?: string
  /** Unit price shown on the right */
  price?: number
  /** Unit name shown alongside price */
  unitName?: string
}

export interface ProductSearchProps
  extends Omit<SelectProps, 'data' | 'onChange' | 'renderOption' | 'onSelect'> {
  /** Options to display in the dropdown */
  options: ProductSearchOption[]
  /** Called when the user types in the search box; parent should debounce + fetch */
  onSearchChange?: (query: string) => void
  /** Called when the user selects a product */
  onProductSelect?: (value: string, option: ProductSearchOption) => void
  /** Show a loading placeholder instead of "nothing found" */
  loading?: boolean
}

/**
 * Reusable product search component.
 *
 * The parent is responsible for fetching / debouncing.
 * Pass product list as `options`; handle `onSearchChange` to update the list.
 *
 * @example
 * <ProductSearch
 *   options={products.map(p => ({ value: p.id, label: p.name, code: p.code, price: p.salesPrice }))}
 *   onSearchChange={setQuery}
 *   onSelect={(id, opt) => addToCart(opt)}
 *   placeholder="Tìm sản phẩm..."
 * />
 */
export function ProductSearch({
  options,
  onSearchChange,
  onProductSelect,
  loading = false,
  placeholder = 'Tìm sản phẩm (tên, mã, barcode)...',
  ...selectProps
}: ProductSearchProps) {
  function handleChange(value: string | null, _item: ComboboxItem) {
    if (value && onProductSelect) {
      const opt = options.find((o) => o.value === value)
      if (opt) onProductSelect(value, opt)
    }
  }

  return (
    <Select
      searchable
      clearable
      data={options as ComboboxItem[]}
      placeholder={placeholder}
      nothingFoundMessage={loading ? 'Đang tìm kiếm...' : 'Không tìm thấy sản phẩm'}
      onSearchChange={onSearchChange}
      onChange={handleChange}
      renderOption={({ option }) => {
        const item = options.find((o) => o.value === option.value) ?? option
        const productSearchItem = item as ProductSearchOption & ComboboxItem
        return (
          <Group gap="xs" wrap="nowrap" py={2}>
            <Stack gap={0} flex={1} style={{ minWidth: 0 }}>
              <Text size="sm" fw={500} truncate>
                {productSearchItem.label}
              </Text>
              {productSearchItem.code && (
                <Text size="xs" c="dimmed">
                  {productSearchItem.code}
                </Text>
              )}
            </Stack>
            {productSearchItem.price != null && (
              <Text size="sm" c="green" fw={500} style={{ whiteSpace: 'nowrap' }}>
                {formatVND(productSearchItem.price)}
                {productSearchItem.unitName ? ` / ${productSearchItem.unitName}` : ''}
              </Text>
            )}
          </Group>
        )
      }}
      {...selectProps}
    />
  )
}
