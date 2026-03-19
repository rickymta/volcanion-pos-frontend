import { useState } from 'react'
import { Stack, Group, TextInput, Select, Badge, Button } from '@mantine/core'
import { notifications } from '@mantine/notifications'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { IconSearch, IconTruckDelivery } from '@tabler/icons-react'
import { useNavigate } from 'react-router-dom'
import { PageHeader, DataTable, openConfirm } from '@pos/ui'
import type { DataTableColumn } from '@pos/ui'
import { deliveryApi } from '@pos/api-client'
import type { DeliveryOrderDto } from '@pos/api-client'
import { DeliveryStatusLabel, formatDate } from '@pos/utils'
import { useBranchStore } from '@/lib/useBranchStore'

type Row = DeliveryOrderDto & Record<string, unknown>

const PAGE_SIZE = 20
const STATUS_OPTIONS = [
  { value: 'Pending', label: 'Chờ giao' },
  { value: 'InProgress', label: 'Đang giao' },
  { value: 'Completed', label: 'Đã giao' },
  { value: 'Failed', label: 'Thất bại' },
  { value: 'Cancelled', label: 'Đã hủy' },
]

export default function DeliveryListPage() {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [status, setStatus] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)

  const { activeBranchId } = useBranchStore()

  const params = {
    page,
    pageSize: PAGE_SIZE,
    status: status as 'Pending' | 'InProgress' | 'Completed' | 'Failed' | 'Cancelled' | undefined,
    branchId: activeBranchId ?? undefined,
  }

  const { data, isLoading } = useQuery({
    queryKey: ['delivery-orders', params],
    queryFn: () => deliveryApi.list(params),
  })

  const startMutation = useMutation({
    mutationFn: (id: string) => deliveryApi.start(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['delivery-orders'] })
      notifications.show({ color: 'green', message: 'Đã bắt đầu giao hàng' })
    },
    onError: () => notifications.show({ color: 'red', message: 'Thao tác thất bại' }),
  })

  const filtered = (data?.items ?? []).filter(
    (d) =>
      !search ||
      d.code.toLowerCase().includes(search.toLowerCase()) ||
      d.customerName.toLowerCase().includes(search.toLowerCase())
  )

  const columns: DataTableColumn<Row>[] = [
    { key: 'code', header: 'Mã phiếu', width: 130 },
    {
      key: 'deliveryDate',
      header: 'Ngày giao',
      width: 110,
      render: (row) => formatDate(row.deliveryDate as string),
    },
    { key: 'customerName', header: 'Khách hàng' },
    { key: 'salesOrderCode', header: 'Đơn bán' },
    { key: 'deliveryAddress', header: 'Địa chỉ giao', render: (row) => (row.deliveryAddress as string | undefined) ?? '—' },
    {
      key: 'status',
      header: 'Trạng thái',
      render: (row) => {
        const s = row.status as string
        const info = DeliveryStatusLabel[s as keyof typeof DeliveryStatusLabel]
        return info ? (
          <Badge color={info.color} variant="light">{info.label}</Badge>
        ) : <Badge variant="light">{s}</Badge>
      },
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      width: 120,
      render: (row) => {
        const s = row.status as string
        if (s !== 'Pending') return null
        return (
          <Button
            size="xs"
            variant="light"
            color="blue"
            leftSection={<IconTruckDelivery size={14} />}
            onClick={(e) => {
              e.stopPropagation()
              openConfirm({
                message: 'Bắt đầu giao hàng?',
                confirmColor: 'blue',
                onConfirm: () => startMutation.mutate(row.id as string),
              })
            }}
          >
            Bắt đầu
          </Button>
        )
      },
    },
  ]

  return (
    <Stack gap="lg">
      <PageHeader title="Giao hàng" subtitle="Danh sách phiếu giao hàng" />

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
        onRowClick={(row) => navigate(`/delivery/${row.id as string}`)}
      />
    </Stack>
  )
}
