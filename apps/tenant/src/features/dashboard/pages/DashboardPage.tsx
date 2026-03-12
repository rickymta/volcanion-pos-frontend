import { SimpleGrid, Stack } from '@mantine/core'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { PageHeader, StatCard } from '@pos/ui'
import { IconShoppingCart, IconPackage, IconCash, IconTruck } from '@tabler/icons-react'
import { salesOrdersApi, productsApi, deliveryApi, paymentsApi } from '@pos/api-client'

const today = new Date().toISOString().slice(0, 10)

export default function DashboardPage() {
  const { t } = useTranslation('common')

  const { data: ordersToday } = useQuery({
    queryKey: ['dashboard-orders-today', today],
    queryFn: () => salesOrdersApi.list({ fromDate: today, toDate: today, pageSize: 1 }),
  })

  const { data: revenueToday } = useQuery({
    queryKey: ['dashboard-revenue-today', today],
    queryFn: () => paymentsApi.list({ fromDate: today, toDate: today, paymentType: 'Receive', pageSize: 100 }),
  })

  const { data: productsData } = useQuery({
    queryKey: ['dashboard-products'],
    queryFn: () => productsApi.list({ pageSize: 1 }),
  })

  const { data: deliveriesInTransit } = useQuery({
    queryKey: ['dashboard-deliveries-transit'],
    queryFn: () => deliveryApi.list({ status: 'InProgress', pageSize: 1 }),
  })

  const totalRevenue = (revenueToday?.items ?? []).reduce((sum, p) => sum + p.amount, 0)

  return (
    <Stack gap="lg">
      <PageHeader title={t('nav.dashboard')} subtitle="Tổng quan hoạt động kinh doanh" />

      <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} spacing="md">
        <StatCard
          title="Đơn hàng hôm nay"
          value={ordersToday?.totalCount ?? 0}
          format="number"
          icon={IconShoppingCart}
          color="blue"
        />
        <StatCard
          title="Doanh thu hôm nay"
          value={totalRevenue}
          format="currency"
          icon={IconCash}
          color="green"
        />
        <StatCard
          title="Sản phẩm"
          value={productsData?.totalCount ?? 0}
          format="number"
          icon={IconPackage}
          color="orange"
        />
        <StatCard
          title="Đang giao hàng"
          value={deliveriesInTransit?.totalCount ?? 0}
          format="number"
          icon={IconTruck}
          color="violet"
        />
      </SimpleGrid>
    </Stack>
  )
}
