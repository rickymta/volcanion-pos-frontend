import { useState, useMemo } from 'react'
import { Stack, Group, Button, TextInput, Select, Badge } from '@mantine/core'
import { DateInput } from '@mantine/dates'
import { useDebouncedValue } from '@mantine/hooks'
import { useQuery } from '@tanstack/react-query'
import { IconPlus, IconSearch } from '@tabler/icons-react'
import { useNavigate } from 'react-router-dom'
import { PageHeader, DataTable } from '@pos/ui'
import type { DataTableColumn } from '@pos/ui'
import { purchaseOrdersApi, suppliersApi } from '@pos/api-client'
import type { PurchaseOrderDto, PurchaseOrderListParams } from '@pos/api-client'
import { DocumentStatusLabel, formatVND, formatDate } from '@pos/utils'
import { useBranchStore } from '@/lib/useBranchStore'

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
  const [supplierId, setSupplierId] = useState<string | null>(null)
  const [fromDate, setFromDate] = useState<Date | null>(null)
  const [toDate, setToDate] = useState<Date | null>(null)
  const [page, setPage] = useState(1)

  const { activeBranchId } = useBranchStore()

  const params: PurchaseOrderListParams = {
    page,
    pageSize: PAGE_SIZE,
    search: search || undefined,
    status: status as PurchaseOrderListParams['status'] ?? undefined,
    supplierId: supplierId ?? undefined,
    fromDate: fromDate ? fromDate.toISOString().slice(0, 10) : undefined,
    toDate: toDate ? toDate.toISOString().slice(0, 10) : undefined,
    branchId: activeBranchId ?? undefined,
  }

  const { data, isLoading } = useQuery({
    queryKey: ['purchase-orders', params],
    queryFn: () => purchaseOrdersApi.list(params),
  })

  const [supplierSearch, setSupplierSearch] = useState('')
  const [debouncedSupplierSearch] = useDebouncedValue(supplierSearch, 300)

  const { data: suppliersData } = useQuery({
    queryKey: ['suppliers', debouncedSupplierSearch],
    queryFn: () => suppliersApi.list({ search: debouncedSupplierSearch || undefined, pageSize: 20 }),
  })
  const { data: selectedSupplier } = useQuery({
    queryKey: ['supplier', supplierId],
    queryFn: () => suppliersApi.getById(supplierId!),
    enabled: !!supplierId,
    staleTime: Infinity,
  })
  const supplierOptions = useMemo(() => {
    const list = (suppliersData?.items ?? []).map((s) => ({ value: s.id, label: s.name }))
    if (supplierId && selectedSupplier && !list.find((o) => o.value === supplierId)) {
      list.unshift({ value: selectedSupplier.id, label: selectedSupplier.name })
    }
    return list
  }, [suppliersData, supplierId, selectedSupplier])

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

      <Group wrap="wrap">
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
          w={180}
        />
        <Select
          placeholder="Tất cả NCC"
          data={supplierOptions}
          value={supplierId}
          onChange={(v) => { setSupplierId(v); setSupplierSearch(''); setPage(1) }}
          searchValue={supplierSearch}
          onSearchChange={setSupplierSearch}
          filter={({ options }) => options}
          clearable
          searchable
          nothingFoundMessage="Không tìm thấy"
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
