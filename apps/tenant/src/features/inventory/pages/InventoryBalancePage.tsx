import { useState, useMemo } from 'react'
import { Stack, Group, Select, Text } from '@mantine/core'
import { useDebouncedValue } from '@mantine/hooks'
import { useQuery } from '@tanstack/react-query'
import { PageHeader, DataTable } from '@pos/ui'
import type { DataTableColumn } from '@pos/ui'
import { inventoryApi, warehousesApi, productsApi } from '@pos/api-client'
import type { InventoryBalanceDto } from '@pos/api-client'
import { formatNumber } from '@pos/utils'

type Row = InventoryBalanceDto & Record<string, unknown>

const PAGE_SIZE = 30

export default function InventoryBalancePage() {
  const [productSearch, setProductSearch] = useState('')
  const [productId, setProductId] = useState<string | null>(null)
  const [warehouseId, setWarehouseId] = useState<string | null>(null)
  const [page, setPage] = useState(1)

  const [debouncedProductSearch] = useDebouncedValue(productSearch, 300)

  const { data: warehousesData } = useQuery({
    queryKey: ['warehouses'],
    queryFn: () => warehousesApi.list({ pageSize: 50 }),
  })

  const { data: productsData } = useQuery({
    queryKey: ['products', debouncedProductSearch],
    queryFn: () => productsApi.list({ keyword: debouncedProductSearch || undefined, pageSize: 20 }),
  })
  const { data: selectedProduct } = useQuery({
    queryKey: ['product', productId],
    queryFn: () => productsApi.getById(productId!),
    enabled: !!productId,
    staleTime: Infinity,
  })
  const productOptions = useMemo(() => {
    const list = (productsData?.items ?? []).map((p) => ({ value: p.id, label: `${p.code} — ${p.name}` }))
    if (productId && selectedProduct && !list.find((o) => o.value === productId)) {
      list.unshift({ value: selectedProduct.id, label: `${selectedProduct.code} — ${selectedProduct.name}` })
    }
    return list
  }, [productsData, productId, selectedProduct])

  const params = {
    page,
    pageSize: PAGE_SIZE,
    productId: productId ?? undefined,
    warehouseId: warehouseId ?? undefined,
  }

  const { data, isLoading } = useQuery({
    queryKey: ['inventory-balances', params],
    queryFn: () => inventoryApi.listBalances(params),
  })

  const warehouseOptions = (warehousesData?.items ?? []).map((w) => ({ value: w.id, label: w.name }))

  const columns: DataTableColumn<Row>[] = [
    { key: 'productCode', header: 'Mã SP', width: 110 },
    { key: 'productName', header: 'Tên sản phẩm' },
    { key: 'warehouseName', header: 'Kho' },
    {
      key: 'quantityOnHand',
      header: 'Tồn thực',
      align: 'right',
      render: (row) => (
        <Text size="sm" fw={500}>
          {formatNumber(row.quantityOnHand as number)}
        </Text>
      ),
    },
    {
      key: 'quantityReserved',
      header: 'Đã đặt',
      align: 'right',
      render: (row) => formatNumber(row.quantityReserved as number),
    },
    {
      key: 'quantityAvailable',
      header: 'Khả dụng',
      align: 'right',
      render: (row) => {
        const qty = row.quantityAvailable as number
        return (
          <Text
            size="sm"
            fw={600}
            c={qty <= 0 ? 'red' : qty <= 5 ? 'orange' : 'green'}
          >
            {formatNumber(qty)}
          </Text>
        )
      },
    },
  ]

  return (
    <Stack gap="lg">
      <PageHeader
        title="Tồn kho"
        subtitle="Báo cáo tồn kho theo sản phẩm & kho hàng"
      />

      <Group gap="sm">
        <Select
          placeholder="Tất cả sản phẩm"
          data={productOptions}
          value={productId}
          onChange={(v) => { setProductId(v); setProductSearch(''); setPage(1) }}
          searchValue={productSearch}
          onSearchChange={setProductSearch}
          filter={({ options }) => options}
          clearable
          searchable
          nothingFoundMessage="Không tìm thấy"
          w={280}
        />
        <Select
          placeholder="Tất cả kho"
          data={warehouseOptions}
          value={warehouseId}
          onChange={(v) => { setWarehouseId(v); setPage(1) }}
          clearable
          w={200}
        />
      </Group>

      <DataTable
        data={(data?.items ?? []) as Row[]}
        columns={columns}
        isLoading={isLoading}
        total={data?.totalCount}
        page={page}
        pageSize={PAGE_SIZE}
        onPageChange={setPage}
        rowKey={(row) => `${row.productId as string}-${row.warehouseId as string}`}
      />
    </Stack>
  )
}
