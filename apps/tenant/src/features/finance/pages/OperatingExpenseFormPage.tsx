import { useState } from 'react'
import { Stack, Group, Button, NumberInput, Select, Paper, Textarea } from '@mantine/core'
import { DateInput } from '@mantine/dates'
import { notifications } from '@mantine/notifications'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { IconArrowLeft, IconDeviceFloppy } from '@tabler/icons-react'
import { PageHeader } from '@pos/ui'
import { operatingExpensesApi } from '@pos/api-client'

const EXPENSE_TYPE_OPTIONS = [
  { value: 'SalesExpense', label: 'Chi phí bán hàng (TK 641)' },
  { value: 'AdminExpense', label: 'Chi phí quản lý (TK 642)' },
]

const EXPENSE_ACCOUNT_OPTIONS = [
  { value: '641', label: '641 - Chi phí bán hàng' },
  { value: '642', label: '642 - Chi phí quản lý' },
]

const PAYMENT_ACCOUNT_OPTIONS = [
  { value: '111', label: '111 - Tiền mặt' },
  { value: '112', label: '112 - Tiền gửi ngân hàng' },
  { value: '331', label: '331 - Phải trả nhà cung cấp' },
]

export default function OperatingExpenseFormPage() {
  const navigate = useNavigate()
  const qc = useQueryClient()

  const [expenseType, setExpenseType] = useState<string | null>('SalesExpense')
  const [description, setDescription] = useState('')
  const [amount, setAmount] = useState<number>(0)
  const [expenseDate, setExpenseDate] = useState<Date | null>(new Date())
  const [expenseAccountCode, setExpenseAccountCode] = useState<string | null>('641')
  const [paymentAccountCode, setPaymentAccountCode] = useState<string | null>('111')
  const [idempotencyKey] = useState(() => crypto.randomUUID())

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!expenseType) throw new Error('Vui lòng chọn loại chi phí')
      if (!description.trim()) throw new Error('Vui lòng nhập mô tả')
      if (amount <= 0) throw new Error('Số tiền phải lớn hơn 0')
      if (!expenseDate) throw new Error('Vui lòng chọn ngày')
      if (!expenseAccountCode) throw new Error('Vui lòng chọn tài khoản chi phí')
      if (!paymentAccountCode) throw new Error('Vui lòng chọn tài khoản thanh toán')

      return operatingExpensesApi.create({
        expenseType: expenseType as 'SalesExpense' | 'AdminExpense',
        description,
        amount,
        expenseDate: expenseDate.toISOString(),
        expenseAccountCode,
        paymentAccountCode,
      }, idempotencyKey)
    },
    onSuccess: (data) => {
      void qc.invalidateQueries({ queryKey: ['operating-expenses'] })
      notifications.show({ color: 'green', message: 'Tạo phiếu chi phí thành công' })
      navigate(`/finance/operating-expenses/${data.id}`)
    },
    onError: (e: Error) => {
      notifications.show({ color: 'red', message: e.message })
    },
  })

  return (
    <Stack gap="lg">
      <PageHeader
        title="Tạo phiếu chi phí"
        subtitle="Ghi nhận chi phí bán hàng hoặc quản lý"
        actions={
          <Group>
            <Button
              variant="default"
              leftSection={<IconArrowLeft size={16} />}
              onClick={() => navigate('/finance/operating-expenses')}
            >
              Quay lại
            </Button>
            <Button
              leftSection={<IconDeviceFloppy size={16} />}
              loading={saveMutation.isPending}
              onClick={() => saveMutation.mutate()}
            >
              Lưu
            </Button>
          </Group>
        }
      />

      <Paper withBorder p="md">
        <Stack gap="md">
          <Group grow>
            <Select
              label="Loại chi phí"
              required
              data={EXPENSE_TYPE_OPTIONS}
              value={expenseType}
              onChange={(v) => {
                setExpenseType(v)
                // Auto-select matching account code
                if (v === 'SalesExpense') setExpenseAccountCode('641')
                else if (v === 'AdminExpense') setExpenseAccountCode('642')
              }}
            />
            <DateInput
              label="Ngày chi phí"
              required
              value={expenseDate}
              onChange={setExpenseDate}
              valueFormat="DD/MM/YYYY"
            />
          </Group>

          <Textarea
            label="Mô tả"
            required
            placeholder="Mô tả chi tiết khoản chi phí..."
            value={description}
            onChange={(e) => setDescription(e.currentTarget.value)}
            minRows={2}
          />

          <NumberInput
            label="Số tiền"
            required
            value={amount}
            onChange={(v) => setAmount(Number(v) || 0)}
            min={0}
            thousandSeparator=","
            suffix=" ₫"
          />

          <Group grow>
            <Select
              label="Tài khoản chi phí"
              required
              data={EXPENSE_ACCOUNT_OPTIONS}
              value={expenseAccountCode}
              onChange={setExpenseAccountCode}
            />
            <Select
              label="Tài khoản thanh toán"
              required
              data={PAYMENT_ACCOUNT_OPTIONS}
              value={paymentAccountCode}
              onChange={setPaymentAccountCode}
            />
          </Group>
        </Stack>
      </Paper>
    </Stack>
  )
}
