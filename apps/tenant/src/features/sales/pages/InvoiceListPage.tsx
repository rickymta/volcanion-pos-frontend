import { useState } from 'react'
import { Stack, Group, Select, Badge, TextInput } from '@mantine/core'
import { useQuery } from '@tanstack/react-query'
import { IconSearch } from '@tabler/icons-react'
import { useNavigate } from 'react-router-dom'
import { PageHeader, DataTable } from '@pos/ui'
import type { DataTableColumn } from '@pos/ui'
import { invoicesApi } from '@pos/api-client'
import type { InvoiceDto, InvoiceListParams } from '@pos/api-client'
import { formatVND, formatDate } from '@pos/utils'

type Row = InvoiceDto & Record<string, unknown>

const PAGE_SIZE = 20

export default function InvoiceListPage() {
  const navigate = useNavigate()
  const [status, setStatus] = useState<string | null>(null)
  const [page, setPage] = useState(1)

  const params: InvoiceListParams = {
    page,
    pageSize: PAGE_SIZE,
    status: status as InvoiceListParams['status'] ?? undefined,
  }

  const { data, isLoading } = useQuery({
    queryKey: ['invoices', params],
    queryFn: () => invoicesApi.list(params),
  })

  const columns: DataTableColumn<Row>[] = [
    { key: 'code', header: 'Mã hóa đơn', width: 130 },
    {
      key: 'invoiceDate',
      header: 'Ngày',
      width: 110,
      render: (row) => formatDate(row.invoiceDate as string),
    },
    { key: 'customerName', header: 'Khách hàng' },
    {
      key: 'grandTotal',
      header: 'Tổng tiền',
      align: 'right',
      render: (row) => formatVND(row.grandTotal as number),
    },
    {
      key: 'paidAmount',
      header: 'Đã thanh toán',
      align: 'right',
      render: (row) => formatVND(row.paidAmount as number),
    },
    {
      key: 'remainingAmount',
      header: 'Còn nợ',
      align: 'right',
      render: (row) => (
        <span style={{ color: (row.remainingAmount as number) > 0 ? 'var(--mantine-color-red-6)' : 'inherit' }}>
          {formatVND(row.remainingAmount as number)}
        </span>
      ),
    },
    {
      key: 'remainingAmount',
      header: 'TT thanh toán',
      render: (row) => (
        <Badge color={(row.remainingAmount as number) === 0 ? 'green' : 'orange'} variant="light">
          {(row.remainingAmount as number) === 0 ? 'Đã thanh toán' : 'Còn nợ'}
        </Badge>
      ),
    },
  ]

  return (
    <Stack gap="lg">
      <PageHeader title="Hóa đơn" subtitle="Danh sách hóa đơn xuất bán" />

      <Group>
        <TextInput
          placeholder="Tìm mã hóa đơn, khách hàng..."
          leftSection={<IconSearch size={16} />}
          w={280}
        />
        <Select
          placeholder="Tất cả trạng thái"
          data={[
            { value: 'Draft', label: 'Nháp' },
            { value: 'Confirmed', label: 'Xác nhận' },
            { value: 'Cancelled', label: 'Đã hủy' },
          ]}
          value={status}
          onChange={(v) => { setStatus(v); setPage(1) }}
          clearable
          w={180}
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
        onRowClick={(row) => navigate(`/sales/invoices/${row.id as string}`)}
      />
    </Stack>
  )
}
