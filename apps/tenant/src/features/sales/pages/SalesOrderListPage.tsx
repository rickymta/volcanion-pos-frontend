import { useState } from 'react'
import { Stack, Group, Button, TextInput, Select, Badge } from '@mantine/core'
import { useQuery } from '@tanstack/react-query'
import { IconPlus, IconSearch } from '@tabler/icons-react'
import { useNavigate } from 'react-router-dom'
import { PageHeader, DataTable } from '@pos/ui'
import type { DataTableColumn } from '@pos/ui'
import { salesOrdersApi } from '@pos/api-client'
import type { SalesOrderDto, SalesOrderListParams } from '@pos/api-client'
import { DocumentStatusLabel, formatVND, formatDate } from '@pos/utils'
import { useBranchStore } from '@/lib/useBranchStore'

type Row = SalesOrderDto & Record<string, unknown>

const PAGE_SIZE = 20
const STATUS_OPTIONS = [
  { value: 'Draft', label: 'Nháp' },
  { value: 'Confirmed', label: 'Đã xác nhận' },
  { value: 'PartiallyDelivered', label: 'Giao một phần' },
  { value: 'FullyDelivered', label: 'Đã giao đủ' },
  { value: 'Cancelled', label: 'Đã hủy' },
] as const

export default function SalesOrderListPage() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<string | null>(null)
  const [page, setPage] = useState(1)

  const { activeBranchId } = useBranchStore()

  const params: SalesOrderListParams = {
    page,
    pageSize: PAGE_SIZE,
    search: search || undefined,
    status: status as SalesOrderListParams['status'] ?? undefined,
    branchId: activeBranchId ?? undefined,
  }

  const { data, isLoading } = useQuery({
    queryKey: ['sales-orders', params],
    queryFn: () => salesOrdersApi.list(params),
  })

  const columns: DataTableColumn<Row>[] = [
    { key: 'code', header: 'Mã đơn', width: 130 },
    {
      key: 'orderDate',
      header: 'Ngày',
      width: 110,
      render: (row) => formatDate(row.orderDate as string),
    },
    { key: 'customerName', header: 'Khách hàng' },
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
      key: 'warehouseName',
      header: 'Kho',
      render: (row) => (row.warehouseName as string | undefined) ?? '—',
    },
  ]

  return (
    <Stack gap="lg">
      <PageHeader
        title="Đơn bán hàng"
        subtitle="Danh sách đơn bán hàng"
        actions={
          <Button leftSection={<IconPlus size={16} />} onClick={() => navigate('/sales/orders/new')}>
            Tạo đơn bán
          </Button>
        }
      />

      <Group>
        <TextInput
          placeholder="Tìm theo mã đơn, khách hàng..."
          leftSection={<IconSearch size={16} />}
          value={search}
          onChange={(e) => { setSearch(e.currentTarget.value); setPage(1) }}
          w={280}
        />
        <Select
          placeholder="Tất cả trạng thái"
          data={STATUS_OPTIONS as unknown as { value: string; label: string }[]}
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
        onRowClick={(row) => navigate(`/sales/orders/${row.id as string}`)}
      />
    </Stack>
  )
}
