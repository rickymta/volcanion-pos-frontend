import { useState } from 'react'
import { Stack, Group, Button, TextInput, Select, Badge } from '@mantine/core'
import { useQuery } from '@tanstack/react-query'
import { IconPlus, IconSearch } from '@tabler/icons-react'
import { useNavigate } from 'react-router-dom'
import { PageHeader, DataTable } from '@pos/ui'
import type { DataTableColumn } from '@pos/ui'
import { purchaseOrdersApi } from '@pos/api-client'
import type { PurchaseOrderDto, PurchaseOrderListParams } from '@pos/api-client'
import { DocumentStatusLabel, formatVND, formatDate } from '@pos/utils'

type Row = PurchaseOrderDto & Record<string, unknown>

const PAGE_SIZE = 20
const STATUS_OPTIONS = [
  { value: 'Draft', label: 'Nháp' },
  { value: 'Confirmed', label: 'Đã xác nhận' },
  { value: 'Completed', label: 'Hoàn thành' },
  { value: 'Cancelled', label: 'Đã hủy' },
]

export default function PurchaseOrderListPage() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<string | null>(null)
  const [page, setPage] = useState(1)

  const params: PurchaseOrderListParams = {
    page,
    pageSize: PAGE_SIZE,
    search: search || undefined,
    status: status as PurchaseOrderListParams['status'] ?? undefined,
  }

  const { data, isLoading } = useQuery({
    queryKey: ['purchase-orders', params],
    queryFn: () => purchaseOrdersApi.list(params),
  })

  const columns: DataTableColumn<Row>[] = [
    { key: 'code', header: 'Mã đơn', width: 130 },
    {
      key: 'orderDate',
      header: 'Ngày đặt',
      width: 110,
      render: (row) => formatDate(row.orderDate as string),
    },
    { key: 'supplierName', header: 'Nhà cung cấp' },
    {
      key: 'grandTotal',
      header: 'Tổng tiền',
      align: 'right',
      render: (row) => formatVND(row.grandTotal as number),
    },
    {
      key: 'status',
      header: 'Trạng thái',
      render: (row) => {
        const s = row.status as string
        const info = DocumentStatusLabel[s as keyof typeof DocumentStatusLabel]
        return info ? (
          <Badge color={info.color} variant="light">{info.label}</Badge>
        ) : <Badge variant="light">{s}</Badge>
      },
    },
    {
      key: 'expectedDate',
      header: 'Ngày giao dự kiến',
      render: (row) => row.expectedDate ? formatDate(row.expectedDate as string) : '—',
    },
  ]

  return (
    <Stack gap="lg">
      <PageHeader
        title="Đơn mua hàng"
        subtitle="Danh sách đơn mua hàng"
        actions={
          <Button leftSection={<IconPlus size={16} />} onClick={() => navigate('/purchase/orders/new')}>
            Tạo đơn mua
          </Button>
        }
      />

      <Group>
        <TextInput
          placeholder="Tìm theo mã đơn, nhà cung cấp..."
          leftSection={<IconSearch size={16} />}
          value={search}
          onChange={(e) => { setSearch(e.currentTarget.value); setPage(1) }}
          w={280}
        />
        <Select
          placeholder="Tất cả trạng thái"
          data={STATUS_OPTIONS}
          value={status}
          onChange={(v) => { setStatus(v); setPage(1) }}
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
        rowKey="id"
        onRowClick={(row) => navigate(`/purchase/orders/${row.id as string}`)}
      />
    </Stack>
  )
}
