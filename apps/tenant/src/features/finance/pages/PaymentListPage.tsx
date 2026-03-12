import { useState } from 'react'
import { Stack, Group, Button, Select, Badge, TextInput } from '@mantine/core'
import { useQuery } from '@tanstack/react-query'
import { IconPlus, IconSearch } from '@tabler/icons-react'
import { useNavigate } from 'react-router-dom'
import { PageHeader, DataTable } from '@pos/ui'
import type { DataTableColumn } from '@pos/ui'
import { paymentsApi } from '@pos/api-client'
import type { PaymentDto, PaymentListParams } from '@pos/api-client'
import { PaymentMethodLabel, formatVND, formatDate } from '@pos/utils'

type Row = PaymentDto & Record<string, unknown>

const PAGE_SIZE = 20

export default function PaymentListPage() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [type, setType] = useState<string | null>(null)
  const [method, setMethod] = useState<string | null>(null)

  const params: PaymentListParams = {
    page,
    pageSize: PAGE_SIZE,
    paymentType: type as PaymentListParams['paymentType'] ?? undefined,
    paymentMethod: method as PaymentListParams['paymentMethod'] ?? undefined,
  }

  const { data, isLoading } = useQuery({
    queryKey: ['payments', params],
    queryFn: () => paymentsApi.list(params),
  })

  const filtered = (data?.items ?? []).filter(
    (p) =>
      !search ||
      p.partnerName.toLowerCase().includes(search.toLowerCase())
  )

  const columns: DataTableColumn<Row>[] = [
    { key: 'code', header: 'Mã phiếu', width: 130 },
    {
      key: 'paymentDate',
      header: 'Ngày',
      width: 110,
      render: (row) => formatDate(row.paymentDate as string),
    },
    { key: 'partnerName', header: 'Đối tác' },
    {
      key: 'paymentType',
      header: 'Loại',
      render: (row) => (
        <Badge color={row.paymentType === 'Receive' ? 'green' : 'red'} variant="light">
          {row.paymentType === 'Receive' ? 'Thu tiền' : 'Chi tiền'}
        </Badge>
      ),
    },
    {
      key: 'paymentMethod',
      header: 'Phương thức',
      render: (row) => PaymentMethodLabel[row.paymentMethod as keyof typeof PaymentMethodLabel] ?? (row.paymentMethod as string),
    },
    {
      key: 'amount',
      header: 'Số tiền',
      align: 'right',
      render: (row) => formatVND(row.amount as number),
    },
  ]

  return (
    <Stack gap="lg">
      <PageHeader
        title="Phiếu thu/chi"
        subtitle="Danh sách phiếu thu chi"
        actions={
          <Button leftSection={<IconPlus size={16} />} onClick={() => navigate('/finance/payments/new')}>
            Tạo phiếu
          </Button>
        }
      />

      <Group>
        <TextInput
          placeholder="Tìm mã phiếu, đối tác..."
          leftSection={<IconSearch size={16} />}
          value={search}
          onChange={(e) => setSearch(e.currentTarget.value)}
          w={250}
        />
        <Select
          placeholder="Tất cả loại"
          data={[
            { value: 'Receive', label: 'Thu tiền' },
            { value: 'Pay', label: 'Chi tiền' },
          ]}
          value={type}
          onChange={(v) => { setType(v); setPage(1) }}
          clearable
          w={160}
        />
        <Select
          placeholder="Phương thức"
          data={[
            { value: 'Cash', label: 'Tiền mặt' },
            { value: 'BankTransfer', label: 'Chuyển khoản' },
            { value: 'Card', label: 'Thẻ' },
          ]}
          value={method}
          onChange={(v) => { setMethod(v); setPage(1) }}
          clearable
          w={180}
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
      />
    </Stack>
  )
}
