import { useState, useEffect } from 'react'
import {
  Stack, Group, Button, NumberInput, Select, Paper, Textarea,
} from '@mantine/core'
import { DateInput } from '@mantine/dates'
import { notifications } from '@mantine/notifications'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { IconArrowLeft, IconDeviceFloppy } from '@tabler/icons-react'
import { PageHeader } from '@pos/ui'
import { paymentsApi, customersApi, suppliersApi } from '@pos/api-client'
import { formatVND } from '@pos/utils'

const TYPE_OPTIONS = [
  { value: 'Receive', label: 'Thu tiền (từ khách hàng)' },
  { value: 'Pay', label: 'Chi tiền (cho nhà cung cấp)' },
]

const METHOD_OPTIONS = [
  { value: 'Cash', label: 'Tiền mặt' },
  { value: 'BankTransfer', label: 'Chuyển khoản' },
]

export default function PaymentFormPage() {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [searchParams] = useSearchParams()

  // Pre-fill from URL params (e.g. from InvoiceDetailPage)
  const typeFromQuery = searchParams.get('type') as 'Receive' | 'Pay' | null
  const partnerIdFromQuery = searchParams.get('partnerId')
  const referenceIdFromQuery = searchParams.get('referenceId')
  const referenceCodeFromQuery = searchParams.get('referenceCode')

  const [paymentDate, setPaymentDate] = useState<Date | null>(new Date())
  const [type, setType] = useState<string | null>(typeFromQuery ?? 'Receive')
  const [method, setMethod] = useState<string | null>('Cash')
  const [amount, setAmount] = useState<number>(0)
  const [partnerType, setPartnerType] = useState<string | null>(typeFromQuery === 'Pay' ? 'Supplier' : 'Customer')
  const [partnerId, setPartnerId] = useState<string | null>(partnerIdFromQuery)
  const [referenceId, setReferenceId] = useState<string>(referenceIdFromQuery ?? '')
  const [note, setNote] = useState('')

  // Sync partnerType when type changes
  useEffect(() => {
    if (type === 'Receive') setPartnerType('Customer')
    else if (type === 'Pay') setPartnerType('Supplier')
  }, [type])

  // Load customers & suppliers
  const { data: customersData } = useQuery({
    queryKey: ['customers-all'],
    queryFn: () => customersApi.list({ pageSize: 500 }),
    enabled: partnerType === 'Customer',
  })

  const { data: suppliersData } = useQuery({
    queryKey: ['suppliers-all'],
    queryFn: () => suppliersApi.list({ pageSize: 500 }),
    enabled: partnerType === 'Supplier',
  })

  const partnerOptions = partnerType === 'Customer'
    ? (customersData?.items ?? []).map((c) => ({ value: c.id, label: c.name }))
    : (suppliersData?.items ?? []).map((s) => ({ value: s.id, label: s.name }))

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!paymentDate) throw new Error('Vui lòng chọn ngày thanh toán')
      if (!type) throw new Error('Vui lòng chọn loại phiếu')
      if (!method) throw new Error('Vui lòng chọn phương thức thanh toán')
      if (!partnerId) throw new Error('Vui lòng chọn đối tác')
      if (amount <= 0) throw new Error('Số tiền phải lớn hơn 0')

      return paymentsApi.create({
        paymentDate: paymentDate.toISOString().slice(0, 10),
        paymentType: type as 'Receive' | 'Pay' | 'Refund',
        paymentMethod: method as 'Cash' | 'BankTransfer',
        amount,
        partnerType: partnerType as 'Customer' | 'Supplier',
        partnerId,
        referenceType: 'Manual',
        referenceId: referenceId || undefined,
        note: note || undefined,
      })
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['payments'] })
      notifications.show({ color: 'green', message: 'Tạo phiếu thu/chi thành công' })
      navigate('/finance/payments')
    },
    onError: (e: Error) => {
      notifications.show({ color: 'red', message: e.message })
    },
  })

  const isReceivable = type === 'Receive'

  return (
    <Stack gap="lg">
      <PageHeader
        title={isReceivable ? 'Tạo phiếu thu' : 'Tạo phiếu chi'}
        subtitle={isReceivable ? 'Ghi nhận tiền thu từ khách hàng' : 'Ghi nhận tiền chi cho nhà cung cấp'}
        actions={
          <Group>
            <Button variant="default" leftSection={<IconArrowLeft size={16} />} onClick={() => navigate('/finance/payments')}>
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
              label="Loại phiếu"
              required
              data={TYPE_OPTIONS}
              value={type}
              onChange={setType}
            />
            <Select
              label="Phương thức thanh toán"
              required
              data={METHOD_OPTIONS}
              value={method}
              onChange={setMethod}
            />
            <DateInput
              label="Ngày thanh toán"
              required
              value={paymentDate}
              onChange={setPaymentDate}
              valueFormat="DD/MM/YYYY"
            />
          </Group>

          <Group grow>
            <Select
              label={isReceivable ? 'Khách hàng' : 'Nhà cung cấp'}
              placeholder={isReceivable ? 'Chọn khách hàng...' : 'Chọn nhà cung cấp...'}
              required
              searchable
              clearable
              data={partnerOptions}
              value={partnerId}
              onChange={setPartnerId}
            />
            <NumberInput
              label="Số tiền"
              required
              value={amount}
              onChange={(v) => setAmount(Number(v) || 0)}
              min={0}
              thousandSeparator=","
              suffix=" đ"
              decimalScale={0}
            />
          </Group>

          {referenceIdFromQuery && (
            <Group grow>
              <Select
                label="Chứng từ liên kết"
                data={referenceIdFromQuery ? [{ value: referenceIdFromQuery, label: referenceCodeFromQuery ?? referenceIdFromQuery }] : []}
                value={referenceId}
                onChange={(v) => setReferenceId(v ?? '')}
                clearable
                description="Hóa đơn hoặc đơn hàng liên kết"
              />
            </Group>
          )}

          <Textarea
            label="Ghi chú"
            placeholder="Nội dung thanh toán..."
            value={note}
            onChange={(e) => setNote(e.currentTarget.value)}
            rows={2}
          />
        </Stack>
      </Paper>

      {amount > 0 && (
        <Paper withBorder p="md" bg={isReceivable ? 'var(--mantine-color-green-0)' : 'var(--mantine-color-red-0)'}>
          <Group justify="space-between">
            <span>{isReceivable ? '💰 Thu tiền' : '💸 Chi tiền'}</span>
            <span style={{ fontWeight: 700, fontSize: '1.25rem', color: isReceivable ? 'var(--mantine-color-green-7)' : 'var(--mantine-color-red-7)' }}>
              {formatVND(amount)}
            </span>
          </Group>
        </Paper>
      )}
    </Stack>
  )
}
