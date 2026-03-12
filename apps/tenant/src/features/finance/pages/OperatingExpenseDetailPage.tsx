import { useState } from 'react'
import {
  Stack, Group, Button, Badge, Text, Paper, Divider, Loader, Center,
  NumberInput, Textarea, Table,
} from '@mantine/core'
import { DateInput } from '@mantine/dates'
import { notifications } from '@mantine/notifications'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate, useParams } from 'react-router-dom'
import { IconArrowLeft, IconCheck, IconShare } from '@tabler/icons-react'
import { PageHeader } from '@pos/ui'
import { operatingExpensesApi } from '@pos/api-client'
import {
  OperatingExpenseTypeLabel,
  OperatingExpenseStatusLabel,
  formatVND,
  formatDate,
} from '@pos/utils'

export default function OperatingExpenseDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const qc = useQueryClient()

  // Allocate form state
  const [allocatedAmount, setAllocatedAmount] = useState<number>(0)
  const [allocationDate, setAllocationDate] = useState<Date | null>(new Date())
  const [allocationNote, setAllocationNote] = useState('')

  const { data: expense, isLoading } = useQuery({
    queryKey: ['operating-expense', id],
    queryFn: () => operatingExpensesApi.getById(id!),
    enabled: !!id,
  })

  const confirmMutation = useMutation({
    mutationFn: () => operatingExpensesApi.confirm(id!),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['operating-expense', id] })
      void qc.invalidateQueries({ queryKey: ['operating-expenses'] })
      notifications.show({ color: 'green', message: 'Xác nhận phiếu chi phí thành công' })
    },
    onError: (e: Error) => {
      notifications.show({ color: 'red', message: e.message || 'Có lỗi xảy ra' })
    },
  })

  const allocateMutation = useMutation({
    mutationFn: () => {
      if (!id) throw new Error('Không tìm thấy phiếu')
      if (allocatedAmount <= 0) throw new Error('Số tiền phân bổ phải lớn hơn 0')
      if (!allocationDate) throw new Error('Vui lòng chọn ngày phân bổ')
      return operatingExpensesApi.allocate({
        operatingExpenseId: id,
        allocatedAmount,
        allocationDate: allocationDate.toISOString(),
        note: allocationNote || undefined,
      })
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['operating-expense', id] })
      void qc.invalidateQueries({ queryKey: ['operating-expenses'] })
      setAllocatedAmount(0)
      setAllocationNote('')
      setAllocationDate(new Date())
      notifications.show({ color: 'green', message: 'Phân bổ chi phí thành công' })
    },
    onError: (e: Error) => {
      notifications.show({ color: 'red', message: e.message || 'Có lỗi xảy ra' })
    },
  })

  if (isLoading) {
    return (
      <Center h={200}>
        <Loader />
      </Center>
    )
  }

  if (!expense) return null

  const statusInfo = OperatingExpenseStatusLabel[expense.status]
  const typeLabel = OperatingExpenseTypeLabel[expense.expenseType] ?? expense.expenseType
  const isDraft = expense.status === 'Draft'

  return (
    <Stack gap="lg">
      <PageHeader
        title={`Phiếu chi phí ${expense.code}`}
        subtitle={`Ngày ${formatDate(expense.expenseDate)}`}
        actions={
          <Group>
            <Button
              variant="subtle"
              leftSection={<IconArrowLeft size={16} />}
              onClick={() => navigate('/finance/operating-expenses')}
            >
              Quay lại
            </Button>
            {isDraft && (
              <Button
                color="green"
                leftSection={<IconCheck size={16} />}
                loading={confirmMutation.isPending}
                onClick={() => confirmMutation.mutate()}
              >
                Xác nhận
              </Button>
            )}
          </Group>
        }
      />

      {/* Details */}
      <Paper withBorder p="md">
        <Group gap="xl" wrap="wrap">
          <div>
            <Text size="xs" c="dimmed">Loại chi phí</Text>
            <Text fw={500}>{typeLabel}</Text>
          </div>
          <div>
            <Text size="xs" c="dimmed">Số tiền</Text>
            <Text fw={600} c="blue">{formatVND(expense.amount)}</Text>
          </div>
          <div>
            <Text size="xs" c="dimmed">TK Chi phí</Text>
            <Text>{expense.expenseAccountCode}</Text>
          </div>
          <div>
            <Text size="xs" c="dimmed">TK Thanh toán</Text>
            <Text>{expense.paymentAccountCode}</Text>
          </div>
          <div>
            <Text size="xs" c="dimmed">Trạng thái</Text>
            {statusInfo ? (
              <Badge color={statusInfo.color} variant="light">{statusInfo.label}</Badge>
            ) : (
              <Text>{expense.status}</Text>
            )}
          </div>
        </Group>

        <Divider my="md" />
        <Text size="sm" c="dimmed" mb={4}>Mô tả</Text>
        <Text>{expense.description}</Text>
      </Paper>

      {/* Allocations */}
      <Paper withBorder p="md">
        <Text fw={600} mb="sm">Phân bổ chi phí</Text>

        {expense.allocations.length === 0 ? (
          <Text c="dimmed" size="sm">Chưa có phân bổ</Text>
        ) : (
          <Table striped highlightOnHover withTableBorder>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Ngày phân bổ</Table.Th>
                <Table.Th>Số tiền phân bổ</Table.Th>
                <Table.Th>Ghi chú</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {expense.allocations.map((alloc) => (
                <Table.Tr key={alloc.id}>
                  <Table.Td>{formatDate(alloc.allocationDate)}</Table.Td>
                  <Table.Td>{formatVND(alloc.allocatedAmount)}</Table.Td>
                  <Table.Td>{alloc.note ?? '-'}</Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        )}

        {/* Allocate form — only when Confirmed */}
        {!isDraft && (
          <>
            <Divider my="md" label="Thêm phân bổ" labelPosition="left" />
            <Stack gap="sm" maw={480}>
              <Group grow>
                <NumberInput
                  label="Số tiền phân bổ"
                  value={allocatedAmount}
                  onChange={(v) => setAllocatedAmount(Number(v) || 0)}
                  min={0}
                  thousandSeparator=","
                  suffix=" ₫"
                />
                <DateInput
                  label="Ngày phân bổ"
                  value={allocationDate}
                  onChange={setAllocationDate}
                  valueFormat="DD/MM/YYYY"
                />
              </Group>
              <Textarea
                label="Ghi chú"
                placeholder="Ghi chú phân bổ (tùy chọn)"
                value={allocationNote}
                onChange={(e) => setAllocationNote(e.currentTarget.value)}
                minRows={2}
              />
              <Button
                leftSection={<IconShare size={16} />}
                loading={allocateMutation.isPending}
                onClick={() => allocateMutation.mutate()}
                w="fit-content"
              >
                Phân bổ
              </Button>
            </Stack>
          </>
        )}
      </Paper>
    </Stack>
  )
}
