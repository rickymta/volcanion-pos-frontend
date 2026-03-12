import { Stack, Group, Button, Badge, Text, Paper, Divider, Loader, Center, Progress } from '@mantine/core'
import { useQuery } from '@tanstack/react-query'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { IconArrowLeft, IconCurrencyDong } from '@tabler/icons-react'
import { PageHeader } from '@pos/ui'
import { invoicesApi } from '@pos/api-client'
import { formatVND, formatDate } from '@pos/utils'

export default function InvoiceDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const { data: invoice, isLoading } = useQuery({
    queryKey: ['invoice', id],
    queryFn: () => invoicesApi.getById(id!),
    enabled: !!id,
  })

  if (isLoading) {
    return (
      <Center h={200}>
        <Loader />
      </Center>
    )
  }

  if (!invoice) return null

  const paidPercent = invoice.grandTotal > 0
    ? Math.min(100, (invoice.paidAmount / invoice.grandTotal) * 100)
    : 0

  return (
    <Stack gap="lg">
      <PageHeader
        title={`Hóa đơn ${invoice.code}`}
        subtitle={`Ngày ${formatDate(invoice.invoiceDate)}`}
        actions={
          <Group>
            <Button
              variant="subtle"
              leftSection={<IconArrowLeft size={16} />}
              onClick={() => navigate('/sales/invoices')}
            >
              Quay lại
            </Button>
            {invoice.remainingAmount === 0 ? null : (
              <Button
                leftSection={<IconCurrencyDong size={16} />}
                component={Link}
                to={`/finance/payments/new?type=Receivable&partnerId=${invoice.customerId}&referenceId=${invoice.id}&referenceCode=${invoice.code}`}
              >
                Tạo phiếu thu
              </Button>
            )}
          </Group>
        }
      />

      {/* Invoice Summary */}
      <Paper withBorder p="md">
        <Group gap="xl" wrap="wrap">
          <div>
            <Text size="xs" c="dimmed">Khách hàng</Text>
            <Text fw={500}>{invoice.customerName}</Text>
          </div>
          <div>
            <Text size="xs" c="dimmed">Đơn bán hàng</Text>
            <Text
              fw={500}
              c="blue"
              style={{ cursor: 'pointer' }}
              onClick={() => navigate(`/sales/orders/${invoice.salesOrderId}`)}
            >
              #{invoice.salesOrderId.slice(-8)}
            </Text>
          </div>
          <div>
            <Text size="xs" c="dimmed">Ngày hóa đơn</Text>
            <Text>{formatDate(invoice.invoiceDate)}</Text>
          </div>
          <div>
            <Text size="xs" c="dimmed">Trạng thái</Text>
            <Badge color={invoice.remainingAmount === 0 ? 'green' : 'orange'} variant="light">
              {invoice.remainingAmount === 0 ? 'Đã thanh toán đủ' : 'Còn nợ'}
            </Badge>
          </div>
        </Group>
      </Paper>

      {/* Financial Summary */}
      <Paper withBorder p="md">
        <Stack gap="md">
          <Text fw={600}>Tình trạng thanh toán</Text>

          <Group grow>
            <Paper bg="var(--mantine-color-gray-0)" p="md" radius="md">
              <Text size="xs" c="dimmed" mb={4}>Tổng giá trị hóa đơn</Text>
              <Text fw={700} size="xl">{formatVND(invoice.grandTotal)}</Text>
            </Paper>
            <Paper bg="var(--mantine-color-green-0)" p="md" radius="md">
              <Text size="xs" c="dimmed" mb={4}>Đã thanh toán</Text>
              <Text fw={700} size="xl" c="green">{formatVND(invoice.paidAmount)}</Text>
            </Paper>
            <Paper bg={invoice.remainingAmount > 0 ? 'var(--mantine-color-red-0)' : 'var(--mantine-color-gray-0)'} p="md" radius="md">
              <Text size="xs" c="dimmed" mb={4}>Còn nợ</Text>
              <Text fw={700} size="xl" c={invoice.remainingAmount > 0 ? 'red' : 'dimmed'}>
                {formatVND(invoice.remainingAmount)}
              </Text>
            </Paper>
          </Group>

          <div>
            <Group justify="space-between" mb={4}>
              <Text size="sm" c="dimmed">Tiến độ thanh toán</Text>
              <Text size="sm" fw={500}>{paidPercent.toFixed(0)}%</Text>
            </Group>
            <Progress
              value={paidPercent}
              color={invoice.remainingAmount === 0 ? 'green' : 'blue'}
              size="lg"
              radius="sm"
            />
          </div>

          <Divider />

          <Group justify="space-between">
            <Text size="sm" c="dimmed">Tổng tiền hóa đơn</Text>
            <Text size="sm" fw={500}>{formatVND(invoice.grandTotal)}</Text>
          </Group>
          <Group justify="space-between">
            <Text size="sm" c="dimmed">Tổng đã thanh toán</Text>
            <Text size="sm" c="green">{formatVND(invoice.paidAmount)}</Text>
          </Group>
          <Group justify="space-between">
            <Text size="sm" c="dimmed">Số tiền còn lại</Text>
            <Text size="sm" fw={600} c={invoice.remainingAmount > 0 ? 'red' : 'dimmed'}>
              {formatVND(invoice.remainingAmount)}
            </Text>
          </Group>
        </Stack>
      </Paper>

      {/* Action hints */}
      {invoice.remainingAmount > 0 && (
        <Paper withBorder p="md" bg="var(--mantine-color-blue-0)">
          <Group>
            <IconCurrencyDong size={20} color="var(--mantine-color-blue-6)" />
            <div>
              <Text size="sm" fw={500}>Hóa đơn chưa thanh toán đủ</Text>
              <Text size="xs" c="dimmed">
                Còn thiếu {formatVND(invoice.remainingAmount)}. Nhấn "Tạo phiếu thu" để ghi nhận thanh toán.
              </Text>
            </div>
          </Group>
        </Paper>
      )}
    </Stack>
  )
}
