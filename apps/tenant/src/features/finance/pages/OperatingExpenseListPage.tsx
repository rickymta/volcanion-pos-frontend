import { useState } from 'react'
import { Stack, Group, Button, Badge, Select } from '@mantine/core'
import { DateInput } from '@mantine/dates'
import { useQuery } from '@tanstack/react-query'
import { IconPlus } from '@tabler/icons-react'
import { useNavigate } from 'react-router-dom'
import { PageHeader, DataTable } from '@pos/ui'
import type { DataTableColumn } from '@pos/ui'
import { operatingExpensesApi } from '@pos/api-client'
import type { OperatingExpenseDto, OperatingExpenseListParams } from '@pos/api-client'
import {
  OperatingExpenseTypeLabel,
  OperatingExpenseStatusLabel,
  formatVND,
  formatDate,
} from '@pos/utils'

type Row = OperatingExpenseDto & Record<string, unknown>

const PAGE_SIZE = 20

export default function OperatingExpenseListPage() {
  const navigate = useNavigate()
  const [page, setPage] = useState(1)
  const [expenseType, setExpenseType] = useState<string | null>(null)
  const [status, setStatus] = useState<string | null>(null)
  const [fromDate, setFromDate] = useState<Date | null>(null)
  const [toDate, setToDate] = useState<Date | null>(null)

  const params: OperatingExpenseListParams = {
    page,
    pageSize: PAGE_SIZE,
    expenseType: expenseType as OperatingExpenseListParams['expenseType'] ?? undefined,
    status: status as OperatingExpenseListParams['status'] ?? undefined,
    fromDate: fromDate ? fromDate.toISOString().slice(0, 10) : undefined,
    toDate: toDate ? toDate.toISOString().slice(0, 10) : undefined,
  }

  const { data, isLoading } = useQuery({
    queryKey: ['operating-expenses', params],
    queryFn: () => operatingExpensesApi.list(params),
  })

  const handleReset = () => {
    setExpenseType(null)
    setStatus(null)
    setFromDate(null)
    setToDate(null)
    setPage(1)
  }

  const columns: DataTableColumn<Row>[] = [
    { key: 'code', header: 'Mã phiếu', width: 130 },
    {
      key: 'expenseDate',
      header: 'Ngày',
      width: 110,
      render: (row) => formatDate(row.expenseDate as string),
    },
    {
      key: 'expenseType',
      header: 'Loại chi phí',
      width: 160,
      render: (row) => {
        const type = row.expenseType as keyof typeof OperatingExpenseTypeLabel
        return OperatingExpenseTypeLabel[type] ?? (row.expenseType as string)
      },
    },
    { key: 'description', header: 'Mô tả' },
    {
      key: 'amount',
      header: 'Số tiền',
      align: 'right',
      render: (row) => formatVND(row.amount as number),
    },
    {
      key: 'status',
      header: 'Trạng thái',
      width: 130,
      render: (row) => {
        const s = row.status as keyof typeof OperatingExpenseStatusLabel
        const info = OperatingExpenseStatusLabel[s]
        return info ? (
          <Badge color={info.color} variant="light">{info.label}</Badge>
        ) : (
          <span>{row.status as string}</span>
        )
      },
    },
  ]

  return (
    <Stack gap="lg">
      <PageHeader
        title="Chi phí hoạt động"
        subtitle="Danh sách phiếu chi phí bán hàng và quản lý"
        actions={
          <Button leftSection={<IconPlus size={16} />} onClick={() => navigate('/finance/operating-expenses/new')}>
            Tạo phiếu
          </Button>
        }
      />

      <Group>
        <Select
          placeholder="Tất cả loại"
          data={[
            { value: 'SalesExpense', label: 'Chi phí bán hàng' },
            { value: 'AdminExpense', label: 'Chi phí quản lý' },
          ]}
          value={expenseType}
          onChange={(v) => { setExpenseType(v); setPage(1) }}
          clearable
          w={180}
        />
        <Select
          placeholder="Tất cả trạng thái"
          data={[
            { value: 'Draft', label: 'Nháp' },
            { value: 'Confirmed', label: 'Đã xác nhận' },
          ]}
          value={status}
          onChange={(v) => { setStatus(v); setPage(1) }}
          clearable
          w={160}
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
        <Button variant="default" size="sm" onClick={handleReset}>Đặt lại</Button>
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
        onRowClick={(row) => navigate(`/finance/operating-expenses/${row.id as string}`)}
      />
    </Stack>
  )
}
