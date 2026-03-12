import { useState } from 'react'
import { Stack, Group, Select, Badge, Text } from '@mantine/core'
import { DateInput } from '@mantine/dates'
import { useQuery } from '@tanstack/react-query'
import { PageHeader, DataTable } from '@pos/ui'
import type { DataTableColumn } from '@pos/ui'
import { inventoryApi, warehousesApi, productsApi } from '@pos/api-client'
import type { InventoryTransactionDto } from '@pos/api-client'
import { formatDate } from '@pos/utils'

type Row = InventoryTransactionDto & Record<string, unknown>

const PAGE_SIZE = 30
const TYPE_OPTIONS = [
  { value: 'GoodsReceipt', label: 'Nhập kho' },
  { value: 'SalesOrder', label: 'Xuất bán' },
  { value: 'StockTransfer', label: 'Chuyển kho' },
  { value: 'Adjustment', label: 'Điều chỉnh' },
  { value: 'Return', label: 'Trả hàng' },
]

const TYPE_COLOR: Record<string, string> = {
  GoodsReceipt: 'green',
  SalesOrder: 'red',
  StockTransfer: 'blue',
  Adjustment: 'orange',
  Return: 'violet',
}

export default function InventoryTransactionsPage() {
  const [warehouseId, setWarehouseId] = useState<string | null>(null)
  const [productId, setProductId] = useState<string | null>(null)
  const [type, setType] = useState<string | null>(null)
  const [fromDate, setFromDate] = useState<Date | null>(null)
  const [toDate, setToDate] = useState<Date | null>(null)
  const [page, setPage] = useState(1)

  const { data: warehousesData } = useQuery({
    queryKey: ['warehouses-all'],
    queryFn: () => warehousesApi.list().then((r) => r.items),
  })

  const { data: productsData } = useQuery({
    queryKey: ['products-for-filter'],
    queryFn: () => productsApi.list({ pageSize: 200 }),
  })

  const params = {
    page,
    pageSize: PAGE_SIZE,
    warehouseId: warehouseId ?? undefined,
    productId: productId ?? undefined,
    type: type as InventoryTransactionDto['transactionType'] | undefined,
    fromDate: fromDate ? fromDate.toISOString().slice(0, 10) : undefined,
    toDate: toDate ? toDate.toISOString().slice(0, 10) : undefined,
  }

  const { data, isLoading } = useQuery({
    queryKey: ['inventory-transactions', params],
    queryFn: () => inventoryApi.listTransactions(params),
  })

  const columns: DataTableColumn<Row>[] = [
    {
      key: 'createdAt',
      header: 'Ngày',
      width: 110,
      render: (row) => formatDate(row.createdAt as string),
    },
    {
      key: 'transactionType',
      header: 'Loại',
      width: 130,
      render: (row) => {
        const t = row.transactionType as string
        const opt = TYPE_OPTIONS.find((o) => o.value === t)
        return (
          <Badge color={TYPE_COLOR[t] ?? 'gray'} variant="light" size="sm">
            {opt?.label ?? t}
          </Badge>
        )
      },
    },
    { key: 'warehouseName', header: 'Kho' },
    { key: 'productName', header: 'Sản phẩm' },
    {
      key: 'quantity',
      header: 'Thay đổi SL',
      align: 'right',
      render: (row) => {
        const qty = row.quantity as number
        return (
          <Text size="sm" fw={600} c={qty > 0 ? 'green' : 'red'}>
            {qty > 0 ? `+${qty}` : qty}
          </Text>
        )
      },
    },
    { key: 'quantityBefore', header: 'SL trước', align: 'right' },
    { key: 'quantityAfter', header: 'SL sau', align: 'right' },
    {
      key: 'referenceId',
      header: 'Chứng từ',
      render: (row) => (row.referenceId as string | undefined) ?? '—',
    },
  ]

  return (
    <Stack gap="lg">
      <PageHeader title="Lịch sử giao dịch kho" subtitle="Lịch sử nhập/xuất/chuyển/điều chỉnh tồn kho" />

      <Group wrap="wrap" gap="sm">
        <Select
          placeholder="Tất cả kho"
          data={(warehousesData ?? []).map((w) => ({ value: w.id, label: w.name }))}
          value={warehouseId}
          onChange={(v) => { setWarehouseId(v); setPage(1) }}
          clearable
          w={200}
        />
        <Select
          placeholder="Tất cả sản phẩm"
          data={(productsData?.items ?? []).map((p) => ({ value: p.id, label: p.name }))}
          value={productId}
          onChange={(v) => { setProductId(v); setPage(1) }}
          clearable
          searchable
          w={240}
        />
        <Select
          placeholder="Tất cả loại"
          data={TYPE_OPTIONS}
          value={type}
          onChange={(v) => { setType(v); setPage(1) }}
          clearable
          w={160}
        />
        <DateInput
          placeholder="Từ ngày"
          value={fromDate}
          onChange={(v) => { setFromDate(v); setPage(1) }}
          clearable
          w={160}
        />
        <DateInput
          placeholder="Đến ngày"
          value={toDate}
          onChange={(v) => { setToDate(v); setPage(1) }}
          clearable
          w={160}
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
        rowKey="id"
      />
    </Stack>
  )
}
