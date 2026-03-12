import { Stack, Group, Paper, Text, RingProgress, Badge, Loader, Center } from '@mantine/core'
import { useQuery } from '@tanstack/react-query'
import { PageHeader } from '@pos/ui'
import { tenantsApi, healthApi } from '@pos/sysadmin-client'
import { useTranslation } from 'react-i18next'

export default function DashboardPage() {
  const { t } = useTranslation('sysadmin')
  const { data: tenants, isLoading: tenantsLoading } = useQuery({
    queryKey: ['tenants'],
    queryFn: () => tenantsApi.list({ page: 1, pageSize: 100 }),
  })

  const { data: health } = useQuery({
    queryKey: ['health'],
    queryFn: () => healthApi.check(),
    refetchInterval: 30_000,
  })

  const total = tenants?.totalCount ?? 0
  const active = (tenants?.items ?? []).filter((t) => t.status === 'Active').length
  const inactive = total - active

  const healthColor = health?.status === 'Healthy' ? 'green' : health?.status === 'Degraded' ? 'yellow' : 'red'

  return (
    <Stack gap="lg">
      <PageHeader title={t('system_dashboard')} subtitle={t('dashboard_subtitle')} />

      {tenantsLoading ? (
        <Center h={200}>
          <Loader />
        </Center>
      ) : (
        <Group gap="md" wrap="wrap">
          <Paper withBorder p="xl" radius="md" miw={200}>
            <Text size="xs" c="dimmed" tt="uppercase" fw={600}>{t('total_tenants')}</Text>
            <Text fw={700} size="3rem" lh={1} mt="xs">{total}</Text>
          </Paper>
          <Paper withBorder p="xl" radius="md" miw={200}>
            <Text size="xs" c="dimmed" tt="uppercase" fw={600}>{t('active_tenants')}</Text>
            <Text fw={700} size="3rem" lh={1} mt="xs" c="green">{active}</Text>
          </Paper>
          <Paper withBorder p="xl" radius="md" miw={200}>
            <Text size="xs" c="dimmed" tt="uppercase" fw={600}>{t('inactive_tenants')}</Text>
            <Text fw={700} size="3rem" lh={1} mt="xs" c="gray">{inactive}</Text>
          </Paper>
          <Paper withBorder p="xl" radius="md" miw={200}>
            <Text size="xs" c="dimmed" tt="uppercase" fw={600}>{t('system_health')}</Text>
            <Group mt="xs" align="center">
              <RingProgress
                size={50}
                thickness={5}
                sections={[{ value: 100, color: healthColor }]}
              />
              <Badge color={healthColor} variant="light" size="lg">
                {health?.status ?? 'N/A'}
              </Badge>
            </Group>
          </Paper>
        </Group>
      )}
    </Stack>
  )
}
