import { useState } from 'react'
import { Stack, Group, TextInput, Select, Text } from '@mantine/core'
import { useQuery } from '@tanstack/react-query'
import { IconSearch } from '@tabler/icons-react'
import { PageHeader, DataTable } from '@pos/ui'
import type { DataTableColumn } from '@pos/ui'
import { inventoryApi, warehousesApi } from '@pos/api-client'
import type { InventoryBalanceDto } from '@pos/api-client'
import { formatNumber } from '@pos/utils'

type Row = InventoryBalanceDto & Record<string, unknown>

const PAGE_SIZE = 30

export default function InventoryBalancePage() {
  const [search, setSearch] = useState('')
  const [warehouseId, setWarehouseId] = useState<string | null>(null)
  const [page, setPage] = useState(1)

  const { data: warehouses = [] } = useQuery({
    queryKey: ['warehouses'],
    queryFn: () => warehousesApi.list().then((r) => r.items),
  })

  const params = {
    page,
    pageSize: PAGE_SIZE,
    search: search || undefined,
    warehouseId: warehouseId ?? undefined,
  }

  const { data, isLoading } = useQuery({
    queryKey: ['inventory-balances', params],
    queryFn: () => inventoryApi.listBalances(params),
  })

  const warehouseOptions = warehouses.map((w) => ({ value: w.id, label: w.name }))

  const columns: DataTableColumn<Row>[] = [
    { key: 'productCode', header: 'Mã SP', width: 110 },
    { key: 'productName', header: 'Tên sản phẩm' },
    { key: 'unitName', header: 'ĐVT', width: 80 },
    { key: 'warehouseName', header: 'Kho' },
    {
      key: 'onHandQuantity',
      header: 'Tồn thực',
      align: 'right',
      render: (row) => (
        <Text size="sm" fw={500}>
          {formatNumber(row.onHandQuantity as number)}
        </Text>
      ),
    },
    {
      key: 'reservedQuantity',
      header: 'Đã đặt',
      align: 'right',
      render: (row) => formatNumber(row.reservedQuantity as number),
    },
    {
      key: 'availableQuantity',
      header: 'Khả dụng',
      align: 'right',
      render: (row) => {
        const qty = row.availableQuantity as number
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

      <Group>
        <TextInput
          placeholder="Tìm theo tên, mã sản phẩm..."
          leftSection={<IconSearch size={16} />}
          value={search}
          onChange={(e) => { setSearch(e.currentTarget.value); setPage(1) }}
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
