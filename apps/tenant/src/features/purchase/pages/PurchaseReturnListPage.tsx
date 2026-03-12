import { useState } from 'react'
import { Stack, Group, TextInput, Select, Badge, Button } from '@mantine/core'
import { DateInput } from '@mantine/dates'
import { useQuery } from '@tanstack/react-query'
import { IconSearch } from '@tabler/icons-react'
import { useNavigate } from 'react-router-dom'
import { PageHeader, DataTable } from '@pos/ui'
import type { DataTableColumn } from '@pos/ui'
import { purchaseReturnsApi } from '@pos/api-client'
import type { PurchaseReturnDto, PurchaseReturnListParams } from '@pos/api-client'
import { DocumentStatusLabel, formatDate, formatVND } from '@pos/utils'

type Row = PurchaseReturnDto & Record<string, unknown>

const PAGE_SIZE = 20
const STATUS_OPTIONS = [
  { value: 'Draft', label: 'Nháp' },
  { value: 'Confirmed', label: 'Đã xác nhận' },
  { value: 'Cancelled', label: 'Đã hủy' },
]

export default function PurchaseReturnListPage() {
  const navigate = useNavigate()
  const [status, setStatus] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [fromDate, setFromDate] = useState<Date | null>(null)
  const [toDate, setToDate] = useState<Date | null>(null)

  const params: PurchaseReturnListParams = {
    page,
    pageSize: PAGE_SIZE,
    status: status as PurchaseReturnListParams['status'] ?? undefined,
    supplierId: undefined,
    fromDate: fromDate ? fromDate.toISOString().slice(0, 10) : undefined,
    toDate: toDate ? toDate.toISOString().slice(0, 10) : undefined,
  }

  const { data, isLoading } = useQuery({
    queryKey: ['purchase-returns', params],
    queryFn: () => purchaseReturnsApi.list(params),
  })

  const filtered = (data?.items ?? []).filter((r) => {
    const matchSearch =
      !search ||
      r.code.toLowerCase().includes(search.toLowerCase()) ||
      r.supplierName.toLowerCase().includes(search.toLowerCase())
    return matchSearch
  })

  const columns: DataTableColumn<Row>[] = [
    { key: 'code', header: 'Mã phiếu', width: 130 },
    { key: 'returnDate', header: 'Ngày trả', width: 110, render: (row) => formatDate(row.returnDate as string) },
    { key: 'supplierName', header: 'Nhà cung cấp' },
    {
      key: 'totalReturnAmount',
      header: 'Tổng tiền',
      align: 'right',
      render: (row) => formatVND(row.totalReturnAmount as number),
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
  ]

  return (
    <Stack gap="lg">
      <PageHeader
        title="Trả hàng mua"
        subtitle="Danh sách phiếu trả hàng mua"
        actions={
          <Button onClick={() => navigate('/purchase/returns/new')}>Tạo phiếu trả</Button>
        }
      />

      <Group>
        <TextInput
          placeholder="Tìm mã phiếu, nhà cung cấp..."
          leftSection={<IconSearch size={16} />}
          value={search}
          onChange={(e) => setSearch(e.currentTarget.value)}
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
        <DateInput
          placeholder="Từ ngày"
          value={fromDate}
          onChange={(d) => { setFromDate(d); setPage(1) }}
          clearable
          valueFormat="DD/MM/YYYY"
          w={140}
        />
        <DateInput
          placeholder="Đến ngày"
          value={toDate}
          onChange={(d) => { setToDate(d); setPage(1) }}
          clearable
          valueFormat="DD/MM/YYYY"
          w={140}
        />
      </Group>

      <DataTable
        data={(filtered as Row[])}
        columns={columns}
        isLoading={isLoading}
        total={data?.totalCount}
        page={page}
        pageSize={PAGE_SIZE}
        onPageChange={setPage}
        rowKey="id"
        onRowClick={(row) => navigate(`/purchase/returns/${row.id as string}`)}
      />
    </Stack>
  )
}
