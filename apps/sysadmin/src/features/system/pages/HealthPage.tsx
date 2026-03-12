import { Stack, Group, Badge, Paper, Text, Loader, Center, ThemeIcon, SimpleGrid } from '@mantine/core'
import { useQuery } from '@tanstack/react-query'
import { IconCircleCheck, IconCircleX, IconAlertCircle, IconRefresh } from '@tabler/icons-react'
import { PageHeader } from '@pos/ui'
import { healthApi } from '@pos/sysadmin-client'
import type { HealthCheckEntry } from '@pos/sysadmin-client'
import { useTranslation } from 'react-i18next'

function StatusIcon({ status }: { status: string }) {
  if (status === 'Healthy') return <ThemeIcon color="green" variant="light" size="lg"><IconCircleCheck size={20} /></ThemeIcon>
  if (status === 'Degraded') return <ThemeIcon color="yellow" variant="light" size="lg"><IconAlertCircle size={20} /></ThemeIcon>
  return <ThemeIcon color="red" variant="light" size="lg"><IconCircleX size={20} /></ThemeIcon>
}

export default function SystemHealthPage() {
  const { t } = useTranslation('sysadmin')
  const { data: health, isLoading, refetch } = useQuery({
    queryKey: ['health'],
    queryFn: () => healthApi.check(),
    refetchInterval: 30_000,
  })

  const { data: version } = useQuery({
    queryKey: ['version'],
    queryFn: () => healthApi.version(),
  })

  const overallColor = health?.status === 'Healthy' ? 'green' : health?.status === 'Degraded' ? 'yellow' : 'red'

  return (
    <Stack gap="lg">
      <PageHeader
        title={t('system_health')}
        subtitle={t('health_subtitle')}
        actions={
          <Group gap="sm">
            {health && (
              <Badge color={overallColor} size="lg" variant="filled">
                {health.status}
              </Badge>
            )}
            <IconRefresh
              size={20}
              style={{ cursor: 'pointer', opacity: 0.7 }}
              onClick={() => void refetch()}
            />
          </Group>
        }
      />

      {isLoading ? (
        <Center h={200}>
          <Loader />
        </Center>
      ) : (
        <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="md">
          {(health?.entries ?? []).map((entry: HealthCheckEntry) => (
            <Paper key={entry.name} withBorder p="md">
              <Group gap="sm" wrap="nowrap">
                <StatusIcon status={entry.status} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <Text fw={600} size="sm">{entry.name}</Text>
                  {entry.description && (
                    <Text size="xs" c="dimmed" lineClamp={2}>{entry.description}</Text>
                  )}
                  {entry.duration && (
                    <Text size="xs" c="dimmed">{entry.duration}</Text>
                  )}
                </div>
              </Group>
            </Paper>
          ))}
        </SimpleGrid>
      )}

      {version && (
        <Paper withBorder p="md">
          <Group gap="xl">
            <div>
              <Text size="xs" c="dimmed">{t('version')}</Text>
              <Text fw={500}>{version.version}</Text>
            </div>
            <div>
              <Text size="xs" c="dimmed">{t('environment')}</Text>
              <Text fw={500}>{version.environment}</Text>
            </div>
            {version.dotnetVersion && (
              <div>
                <Text size="xs" c="dimmed">.NET</Text>
                <Text fw={500}>{version.dotnetVersion}</Text>
              </div>
            )}
            {version.buildDate && (
              <div>
                <Text size="xs" c="dimmed">{t('build_date')}</Text>
                <Text fw={500}>{version.buildDate}</Text>
              </div>
            )}
            {version.commitHash && (
              <div>
                <Text size="xs" c="dimmed">{t('commit')}</Text>
                <Text fw={500} ff="monospace" size="xs">{version.commitHash.slice(0, 8)}</Text>
              </div>
            )}
          </Group>
        </Paper>
      )}
    </Stack>
  )
}
