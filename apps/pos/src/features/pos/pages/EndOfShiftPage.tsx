import { useMemo } from 'react'
import {
  Stack, Group, Text, Badge, Paper, Divider, SimpleGrid, Progress, Table, Center, Loader,
} from '@mantine/core'
import { useQuery } from '@tanstack/react-query'
import { IconCash, IconCreditCard, IconReceiptOff, IconShoppingBag } from '@tabler/icons-react'
import { salesOrdersApi, paymentsApi } from '@pos/api-client'
import { formatVND, formatDate } from '@pos/utils'
import { useTranslation } from 'react-i18next'

const TODAY = new Date().toISOString().substring(0, 10)

function StatCard({
  label,
  value,
  icon,
  color,
}: {
  label: string
  value: string | number
  icon?: React.ReactNode
  color?: string
}) {
  return (
    <Paper withBorder p="md" radius="md">
      <Group gap="sm" wrap="nowrap">
        {icon && (
          <Text size="xl" c={color ?? 'blue'}>
            {icon}
          </Text>
        )}
        <div>
          <Text size="xs" c="dimmed" tt="uppercase" fw={500}>{label}</Text>
          <Text size="lg" fw={700}>{value}</Text>
        </div>
      </Group>
    </Paper>
  )
}

export default function EndOfShiftPage() {
  const { t } = useTranslation('pos')
  const METHOD_LABELS: Record<string, string> = {
    Cash: t('method_cash'),
    BankTransfer: t('method_transfer'),
    Card: t('method_card'),
    VNPay: t('method_vnpay'),
    MoMo: t('method_momo'),
    Other: t('method_other'),
  }
  const { data: ordersData, isLoading: loadingOrders } = useQuery({
    queryKey: ['pos-shift-orders', TODAY],
    queryFn: () => salesOrdersApi.list({ fromDate: TODAY, toDate: TODAY, pageSize: 500 }),
  })

  const { data: paymentsData, isLoading: loadingPayments } = useQuery({
    queryKey: ['pos-shift-payments', TODAY],
    queryFn: () => paymentsApi.list({ fromDate: TODAY, toDate: TODAY, pageSize: 500, paymentType: 'Receive' }),
  })

  const orders = ordersData?.items ?? []
  const payments = paymentsData?.items ?? []

  const summary = useMemo(() => {
    const totalOrders = orders.length
    const totalRevenue = orders.reduce((s, o) => s + o.grandTotal, 0)
    const totalTax = orders.reduce((s, o) => s + o.vatAmount, 0)
    const totalDiscount = orders.reduce((s, o) => s + o.discountAmount, 0)

    // Payment method breakdown
    const byMethod: Record<string, number> = {}
    payments.forEach((p) => {
      byMethod[p.paymentMethod] = (byMethod[p.paymentMethod] ?? 0) + p.amount
    })

    // Top products (aggregate from order lines)
    const productMap: Record<string, { name: string; qty: number; total: number }> = {}
    orders.forEach((o) => {
      o.lines.forEach((line) => {
        const existing = productMap[line.productId]
        if (existing) {
          existing.qty += line.quantity
          existing.total += line.lineTotal
        } else {
          productMap[line.productId] = {
            name: line.productName,
            qty: line.quantity,
            total: line.lineTotal,
          }
        }
      })
    })
    const topProducts = Object.values(productMap)
      .sort((a, b) => b.total - a.total)
      .slice(0, 10)

    const totalPayments = payments.reduce((s, p) => s + p.amount, 0)

    return { totalOrders, totalRevenue, totalTax, totalDiscount, byMethod, topProducts, totalPayments }
  }, [orders, payments])

  if (loadingOrders || loadingPayments) {
    return <Center h={300}><Loader /></Center>
  }

  const maxMethodAmount = Math.max(...Object.values(summary.byMethod), 1)

  return (
    <Stack gap="lg" p="md">
      <Group justify="space-between">
        <div>
          <Text size="xl" fw={700}>{t('shift_report_title')}</Text>
          <Text size="sm" c="dimmed">{t('shift_date_prefix')}: {formatDate(TODAY)}</Text>
        </div>
        <Badge size="lg" color="blue" variant="light">{t('shift_day_badge')}</Badge>
      </Group>

      <SimpleGrid cols={{ base: 2, sm: 4 }} spacing="md">
        <StatCard
          label={t('shift_total_orders')}
          value={summary.totalOrders}
          icon={<IconShoppingBag size={24} />}
          color="blue"
        />
        <StatCard
          label={t('shift_revenue')}
          value={formatVND(summary.totalRevenue)}
          icon={<IconCash size={24} />}
          color="green"
        />
        <StatCard
          label={t('shift_discount')}
          value={formatVND(summary.totalDiscount)}
          icon={<IconReceiptOff size={24} />}
          color="orange"
        />
        <StatCard
          label={t('shift_paid')}
          value={formatVND(summary.totalPayments)}
          icon={<IconCreditCard size={24} />}
          color="violet"
        />
      </SimpleGrid>

      {/* Payment method breakdown */}
      {Object.keys(summary.byMethod).length > 0 && (
        <Paper withBorder p="md" radius="md">
          <Text fw={600} mb="sm">{t('payments_by_method')}</Text>
          <Stack gap="xs">
            {Object.entries(summary.byMethod)
              .sort(([, a], [, b]) => b - a)
              .map(([method, amount]) => (
                <div key={method}>
                  <Group justify="space-between" mb={4}>
                    <Text size="sm">{METHOD_LABELS[method] ?? method}</Text>
                    <Text size="sm" fw={600}>{formatVND(amount)}</Text>
                  </Group>
                  <Progress
                    value={(amount / maxMethodAmount) * 100}
                    size="sm"
                    color="posBlue"
                  />
                </div>
              ))}
          </Stack>
        </Paper>
      )}

      {/* Top products */}
      {summary.topProducts.length > 0 && (
        <Paper withBorder p="md" radius="md">
          <Text fw={600} mb="sm">{t('top_products')}</Text>
          <Table highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>{t('col_rank')}</Table.Th>
                <Table.Th>{t('col_product')}</Table.Th>
                <Table.Th ta="right">{t('col_qty_sold')}</Table.Th>
                <Table.Th ta="right">{t('col_revenue')}</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {summary.topProducts.map((p, i) => (
                <Table.Tr key={i}>
                  <Table.Td c="dimmed" w={32}>{i + 1}</Table.Td>
                  <Table.Td>{p.name}</Table.Td>
                  <Table.Td ta="right">{p.qty}</Table.Td>
                  <Table.Td ta="right" fw={500}>{formatVND(p.total)}</Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </Paper>
      )}

      {summary.totalOrders === 0 && (
        <Center h={150}>
          <Text c="dimmed">{t('no_orders_today')}</Text>
        </Center>
      )}

      <Divider />
      <Text size="xs" c="dimmed" ta="center">
        Thuế: {formatVND(summary.totalTax)} • {summary.totalOrders} đơn hàng
      </Text>
    </Stack>
  )
}
