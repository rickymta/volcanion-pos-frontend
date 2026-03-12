import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  Stack, Group, Button, Card, Text, Divider, SimpleGrid, Loader, Center, Title, Progress,
} from '@mantine/core'
import { DateInput } from '@mantine/dates'
import { IconTrendingUp, IconTrendingDown, IconCash } from '@tabler/icons-react'
import { PageHeader } from '@pos/ui'
import { reportsApi } from '@pos/api-client'
import { formatVND } from '@pos/utils'

function StatCard({ label, value, color, icon }: { label: string; value: number; color: string; icon: React.ReactNode }) {
  return (
    <Card withBorder padding="md">
      <Group justify="space-between" mb="xs">
        <Text size="sm" c="dimmed">{label}</Text>
        {icon}
      </Group>
      <Text fw={700} size="xl" c={color}>{formatVND(value)}</Text>
    </Card>
  )
}

export default function ProfitLossPage() {
  const now = new Date()
  const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const [fromDate, setFromDate] = useState<Date | null>(firstOfMonth)
  const [toDate, setToDate] = useState<Date | null>(now)
  const [params, setParams] = useState({
    fromDate: firstOfMonth.toISOString().slice(0, 10),
    toDate: now.toISOString().slice(0, 10),
  })

  const { data, isLoading } = useQuery({
    queryKey: ['report-profit-loss', params.fromDate, params.toDate],
    queryFn: () => reportsApi.profitLoss(params),
    enabled: !!(params.fromDate && params.toDate),
  })

  const handleApply = () => {
    if (fromDate && toDate) {
      setParams({
        fromDate: fromDate.toISOString().slice(0, 10),
        toDate: toDate.toISOString().slice(0, 10),
      })
    }
  }

  const grossMarginPct = data && data.totalRevenue > 0
    ? Math.round((data.grossProfit / data.totalRevenue) * 100)
    : 0

  const netMarginPct = data && data.totalRevenue > 0
    ? Math.round((data.netProfit / data.totalRevenue) * 100)
    : 0

  return (
    <Stack gap="md">
      <PageHeader title="Báo cáo lãi/lỗ" />

      {/* Date filter */}
      <Group px="md" gap="sm">
        <DateInput
          label="Từ ngày"
          value={fromDate}
          onChange={setFromDate}
          clearable
          valueFormat="DD/MM/YYYY"
          w={160}
        />
        <DateInput
          label="Đến ngày"
          value={toDate}
          onChange={setToDate}
          clearable
          valueFormat="DD/MM/YYYY"
          w={160}
        />
        <Button mt={24} onClick={handleApply} disabled={!fromDate || !toDate}>
          Xem báo cáo
        </Button>
      </Group>

      {isLoading && (
        <Center py="xl"><Loader /></Center>
      )}

      {data && !isLoading && (
        <Stack px="md" gap="md">
          {/* Summary cards */}
          <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }}>
            <StatCard
              label="Doanh thu"
              value={data.totalRevenue}
              color="green"
              icon={<IconTrendingUp size={20} color="var(--mantine-color-green-5)" />}
            />
            <StatCard
              label="Giá vốn hàng bán"
              value={data.totalCogs}
              color="orange"
              icon={<IconCash size={20} color="var(--mantine-color-orange-5)" />}
            />
            <StatCard
              label="Lợi nhuận gộp"
              value={data.grossProfit}
              color={data.grossProfit >= 0 ? 'green' : 'red'}
              icon={<IconTrendingUp size={20} color="var(--mantine-color-blue-5)" />}
            />
            <StatCard
              label="Chi phí"
              value={data.totalOperatingExpenses}
              color="red"
              icon={<IconTrendingDown size={20} color="var(--mantine-color-red-5)" />}
            />
            <StatCard
              label="Lợi nhuận thuần"
              value={data.netProfit}
              color={data.netProfit >= 0 ? 'green' : 'red'}
              icon={<IconCash size={20} color="var(--mantine-color-grape-5)" />}
            />
          </SimpleGrid>

          {/* Margin breakdown */}
          <Card withBorder padding="md">
            <Title order={5} mb="md">Biên lợi nhuận</Title>
            <Stack gap="sm">
              <Group justify="space-between">
                <Text size="sm">Biên lợi nhuận gộp</Text>
                <Text size="sm" fw={600} c="blue">{grossMarginPct}%</Text>
              </Group>
              <Progress value={grossMarginPct} color="blue" size="sm" />
              <Group justify="space-between">
                <Text size="sm">Biên lợi nhuận thuần</Text>
                <Text size="sm" fw={600} c={netMarginPct >= 0 ? 'green' : 'red'}>{netMarginPct}%</Text>
              </Group>
              <Progress value={Math.max(0, netMarginPct)} color={netMarginPct >= 0 ? 'green' : 'red'} size="sm" />
            </Stack>
          </Card>

          {/* Details table */}
          {data.rows.length > 0 && (
            <Card withBorder padding="md">
              <Title order={5} mb="md">Chi tiết theo tài khoản</Title>
              <Stack gap={0}>
                {/* Header */}
                <Group px="xs" py={6} style={{ borderBottom: '2px solid var(--mantine-color-dark-4)' }}>
                  <Text size="xs" c="dimmed" fw={600} style={{ flex: 1 }}>Loại tài khoản</Text>
                  <Text size="xs" c="dimmed" fw={600} w={120} ta="right">Phát sinh Nợ</Text>
                  <Text size="xs" c="dimmed" fw={600} w={120} ta="right">Phát sinh Có</Text>
                </Group>
                {data.rows.map((d, i) => (
                  <Group
                    key={i}
                    px="xs"
                    py={6}
                    style={{ borderBottom: '1px solid var(--mantine-color-dark-6)' }}
                  >
                    <Text size="sm" style={{ flex: 1 }}>{d.accountType}</Text>
                    <Text size="sm" c="blue" w={120} ta="right">{formatVND(d.totalDebit)}</Text>
                    <Text size="sm" c="green" w={120} ta="right">{formatVND(d.totalCredit)}</Text>
                  </Group>
                ))}
              </Stack>
            </Card>
          )}

          <Divider />
          <Group px="xs" justify="space-between">
            <Text size="xs" c="dimmed">
              Kỳ báo cáo: {data.fromDate} → {data.toDate}
            </Text>
          </Group>
        </Stack>
      )}
    </Stack>
  )
}
