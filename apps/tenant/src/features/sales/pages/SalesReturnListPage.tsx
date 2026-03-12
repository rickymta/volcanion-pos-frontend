import { useState } from 'react'
import { Stack, Group, Button, TextInput, Select, Badge } from '@mantine/core'
import { DateInput } from '@mantine/dates'
import { useQuery } from '@tanstack/react-query'
import { IconSearch, IconPlus } from '@tabler/icons-react'
import { useNavigate } from 'react-router-dom'
import { PageHeader, DataTable } from '@pos/ui'
import type { DataTableColumn } from '@pos/ui'
import { salesReturnsApi } from '@pos/api-client'
import type { SalesReturnDto, SalesReturnListParams } from '@pos/api-client'
import { DocumentStatusLabel, formatDate, formatVND } from '@pos/utils'

type Row = SalesReturnDto & Record<string, unknown>

const PAGE_SIZE = 20
const STATUS_OPTIONS = [
  { value: 'Draft', label: 'Nháp' },
  { value: 'Confirmed', label: 'Đã xác nhận' },
  { value: 'Cancelled', label: 'Đã hủy' },
]

export default function SalesReturnListPage() {
  const navigate = useNavigate()
  const [status, setStatus] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [fromDate, setFromDate] = useState<Date | null>(null)
  const [toDate, setToDate] = useState<Date | null>(null)

  const params: SalesReturnListParams = {
    page,
    pageSize: PAGE_SIZE,
    status: (status ?? undefined) as SalesReturnListParams['status'],
    fromDate: fromDate ? fromDate.toISOString().slice(0, 10) : undefined,
    toDate: toDate ? toDate.toISOString().slice(0, 10) : undefined,
  }

  const { data, isLoading } = useQuery({
    queryKey: ['sales-returns', params],
    queryFn: () => salesReturnsApi.list(params),
  })

  const filtered = (data?.items ?? []).filter(
    (r) =>
      !search ||
      r.code.toLowerCase().includes(search.toLowerCase()) ||
      r.customerName.toLowerCase().includes(search.toLowerCase()),
  )

  const columns: DataTableColumn<Row>[] = [
    { key: 'code', header: 'Mã phiếu', width: 130 },
    { key: 'returnDate', header: 'Ngày trả', width: 110, render: (row) => formatDate(row.returnDate as string) },
    { key: 'invoiceCode', header: 'Hóa đơn', width: 130 },
    { key: 'customerName', header: 'Khách hàng' },
    {
      key: 'totalRefundAmount',
      header: 'Tổng tiền',
      align: 'right',
      render: (row) => formatVND(row.totalRefundAmount as number),
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
        title="Trả hàng bán"
        subtitle="Danh sách phiếu trả hàng bán"
        actions={
          <Button leftSection={<IconPlus size={16} />} onClick={() => navigate('/sales/returns/new')}>
            Tạo phiếu trả
          </Button>
        }
      />

      <Group>
        <TextInput
          placeholder="Tìm mã phiếu, khách hàng..."
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
        onRowClick={(row) => navigate(`/sales/returns/${row.id as string}`)}
      />
    </Stack>
  )
}
