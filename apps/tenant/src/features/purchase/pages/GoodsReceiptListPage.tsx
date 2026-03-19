import { useState } from 'react'
import { Stack, Group, Button, TextInput, Select, Badge } from '@mantine/core'
import { DateInput } from '@mantine/dates'
import { useQuery } from '@tanstack/react-query'
import { IconPlus, IconSearch } from '@tabler/icons-react'
import { useNavigate } from 'react-router-dom'
import { PageHeader, DataTable } from '@pos/ui'
import type { DataTableColumn } from '@pos/ui'
import { goodsReceiptsApi, warehousesApi } from '@pos/api-client'
import type { GoodsReceiptDto, GoodsReceiptListParams } from '@pos/api-client'
import { DocumentStatusLabel, formatDate } from '@pos/utils'
import { useBranchStore } from '@/lib/useBranchStore'

type Row = GoodsReceiptDto & Record<string, unknown>

const PAGE_SIZE = 20
const STATUS_OPTIONS = [
  { value: 'Draft', label: 'Nháp' },
  { value: 'Confirmed', label: 'Đã xác nhận' },
  { value: 'Completed', label: 'Hoàn thành' },
  { value: 'Cancelled', label: 'Đã hủy' },
]

export default function GoodsReceiptListPage() {
  const navigate = useNavigate()
  const [status, setStatus] = useState<string | null>(null)
  const [warehouseId, setWarehouseId] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [fromDate, setFromDate] = useState<Date | null>(null)
  const [toDate, setToDate] = useState<Date | null>(null)
  const [page, setPage] = useState(1)

  const { activeBranchId } = useBranchStore()

  const params: GoodsReceiptListParams = {
    page,
    pageSize: PAGE_SIZE,
    status: status as GoodsReceiptListParams['status'] ?? undefined,
    warehouseId: warehouseId ?? undefined,
    fromDate: fromDate ? fromDate.toISOString().slice(0, 10) : undefined,
    toDate: toDate ? toDate.toISOString().slice(0, 10) : undefined,
    branchId: activeBranchId ?? undefined,
  }

  const { data, isLoading } = useQuery({
    queryKey: ['goods-receipts', params],
    queryFn: () => goodsReceiptsApi.list(params),
  })

  const { data: warehousesData } = useQuery({
    queryKey: ['warehouses-all'],
    queryFn: () => warehousesApi.list(),
  })
  const warehouseOptions = (warehousesData?.items ?? []).map((w) => ({ value: w.id, label: w.name }))

  const filtered = (data?.items ?? []).filter(
    (r) => !search || r.code.toLowerCase().includes(search.toLowerCase()),
  )

  const columns: DataTableColumn<Row>[] = [
    { key: 'code', header: 'Mã phiếu', width: 130 },
    {
      key: 'receiptDate',
      header: 'Ngày nhập',
      width: 110,
      render: (row) => formatDate(row.receiptDate as string),
    },
    { key: 'purchaseOrderCode', header: 'Đơn mua hàng', width: 130, render: (row) => (row.purchaseOrderCode as string) ?? '—' },
    { key: 'warehouseName', header: 'Kho nhập' },
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
        title="Phiếu nhập kho"
        subtitle="Danh sách phiếu nhập kho"
        actions={
          <Button leftSection={<IconPlus size={16} />} onClick={() => navigate('/purchase/receipts/new')}>
            Tạo phiếu nhập
          </Button>
        }
      />

      <Group wrap="wrap">
        <TextInput
          placeholder="Tìm mã phiếu..."
          leftSection={<IconSearch size={16} />}
          value={search}
          onChange={(e) => setSearch(e.currentTarget.value)}
          w={240}
        />
        <Select
          placeholder="Tất cả trạng thái"
          data={STATUS_OPTIONS}
          value={status}
          onChange={(v) => { setStatus(v); setPage(1) }}
          clearable
          w={180}
        />
        <Select
          placeholder="Tất cả kho"
          data={warehouseOptions}
          value={warehouseId}
          onChange={(v) => { setWarehouseId(v); setPage(1) }}
          clearable
          searchable
          w={180}
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
        onRowClick={(row) => navigate(`/purchase/receipts/${row.id as string}`)}
      />
    </Stack>
  )
}
