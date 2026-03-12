import { useState } from 'react'
import { Stack, Group, Select, Badge, Button } from '@mantine/core'
import { DateInput } from '@mantine/dates'
import { notifications } from '@mantine/notifications'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { PageHeader, DataTable, openConfirm } from '@pos/ui'
import type { DataTableColumn } from '@pos/ui'
import { inventoryApi, warehousesApi } from '@pos/api-client'
import type { StockTransferDto, StockTransferListParams } from '@pos/api-client'
import { DocumentStatusLabel, formatDate } from '@pos/utils'

type Row = StockTransferDto & Record<string, unknown>

const PAGE_SIZE = 20
const STATUS_OPTIONS = [
  { value: 'Draft', label: 'Nháp' },
  { value: 'Confirmed', label: 'Đã xác nhận' },
  { value: 'Cancelled', label: 'Đã hủy' },
]

export default function StockTransferListPage() {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [status, setStatus] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [fromWarehouseId, setFromWarehouseId] = useState<string | null>(null)
  const [toWarehouseId, setToWarehouseId] = useState<string | null>(null)
  const [fromDate, setFromDate] = useState<Date | null>(null)
  const [toDate, setToDate] = useState<Date | null>(null)

  const params: StockTransferListParams = {
    page,
    pageSize: PAGE_SIZE,
    status: status as StockTransferListParams['status'] ?? undefined,
    fromWarehouseId: fromWarehouseId ?? undefined,
    toWarehouseId: toWarehouseId ?? undefined,
    fromDate: fromDate ? fromDate.toISOString().slice(0, 10) : undefined,
    toDate: toDate ? toDate.toISOString().slice(0, 10) : undefined,
  }

  const { data: warehousesData } = useQuery({
    queryKey: ['warehouses'],
    queryFn: () => warehousesApi.list(),
  })
  const warehouseOptions = (warehousesData ?? []).map((w) => ({ value: w.id, label: w.name }))

  const { data, isLoading } = useQuery({
    queryKey: ['stock-transfers', params],
    queryFn: () => inventoryApi.listTransfers(params),
  })

  const confirmMutation = useMutation({
    mutationFn: (id: string) => inventoryApi.confirmTransfer(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['stock-transfers'] })
      notifications.show({ color: 'green', message: 'Xác nhận thành công' })
    },
    onError: () => notifications.show({ color: 'red', message: 'Thao tác thất bại' }),
  })

  const columns: DataTableColumn<Row>[] = [
    { key: 'code', header: 'Mã phiếu', width: 130 },
    {
      key: 'transferDate',
      header: 'Ngày chuyển',
      width: 110,
      render: (row) => formatDate(row.transferDate as string),
    },
    { key: 'fromWarehouseName', header: 'Kho nguồn' },
    { key: 'toWarehouseName', header: 'Kho đích' },
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
      key: 'actions',
      header: '',
      align: 'right',
      width: 180,
      render: (row) => {
        const s = row.status as string
        if (s !== 'Draft') return null
        return (
          <Group gap={6} wrap="nowrap" justify="flex-end">
            <Button
              size="xs"
              variant="light"
              color="blue"
              onClick={(e) => {
                e.stopPropagation()
                openConfirm({
                  message: 'Xác nhận phiếu chuyển kho này?',
                  confirmColor: 'blue',
                  onConfirm: () => confirmMutation.mutate(row.id as string),
                })
              }}
            >
              Xác nhận
            </Button>
          </Group>
        )
      },
    },
  ]

  return (
    <Stack gap="lg">
      <PageHeader
        title="Chuyển kho"
        subtitle="Danh sách phiếu chuyển kho"
        actions={
          <Button onClick={() => navigate('/inventory/transfers/new')}>Tạo phiếu chuyển</Button>
        }
      />

      <Group wrap="wrap">
        <Select
          placeholder="Tất cả trạng thái"
          data={STATUS_OPTIONS}
          value={status}
          onChange={(v) => { setStatus(v); setPage(1) }}
          clearable
          w={180}
        />
        <Select
          placeholder="Kho nguồn"
          data={warehouseOptions}
          value={fromWarehouseId}
          onChange={(v) => { setFromWarehouseId(v); setPage(1) }}
          clearable
          searchable
          w={180}
        />
        <Select
          placeholder="Kho đích"
          data={warehouseOptions}
          value={toWarehouseId}
          onChange={(v) => { setToWarehouseId(v); setPage(1) }}
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
        data={(data?.items ?? []) as Row[]}
        columns={columns}
        isLoading={isLoading}
        total={data?.totalCount}
        page={page}
        pageSize={PAGE_SIZE}
        onPageChange={setPage}
        rowKey="id"
        onRowClick={(row) => navigate(`/inventory/transfers/${row.id as string}`)}
      />
    </Stack>
  )
}
