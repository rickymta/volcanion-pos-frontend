import { Stack, Group, Badge, Text, Paper, Loader, Center, SimpleGrid } from '@mantine/core'
import { useQuery } from '@tanstack/react-query'
import { IconClock, IconCheck, IconX, IconRefresh, IconCalendar } from '@tabler/icons-react'
import { PageHeader } from '@pos/ui'
import { systemApi } from '@pos/sysadmin-client'
import type { BackgroundJobDto } from '@pos/sysadmin-client'
import { formatDateTime } from '@pos/utils'
import { useTranslation } from 'react-i18next'

function JobCard({ job }: { job: BackgroundJobDto }) {
  const { t } = useTranslation('sysadmin')
  const STATUS_CONFIG: Record<BackgroundJobDto['status'], { color: string; icon: React.ReactNode; label: string }> = {
    Succeeded: { color: 'green', icon: <IconCheck size={14} />, label: t('job_succeeded') },
    Failed: { color: 'red', icon: <IconX size={14} />, label: t('job_failed') },
    Processing: { color: 'blue', icon: <IconRefresh size={14} />, label: t('job_processing') },
    Enqueued: { color: 'yellow', icon: <IconClock size={14} />, label: t('job_enqueued') },
    Scheduled: { color: 'gray', icon: <IconCalendar size={14} />, label: t('job_scheduled') },
  }
  const s = STATUS_CONFIG[job.status] ?? { color: 'gray', icon: null, label: job.status }
  return (
    <Paper withBorder p="md" radius="md">
      <Stack gap="xs">
        <Group justify="space-between" wrap="nowrap">
          <Text fw={600} size="sm" lineClamp={1}>{job.name}</Text>
          <Badge color={s.color} variant="light" leftSection={s.icon} size="sm">
            {s.label}
          </Badge>
        </Group>

        {job.queue && (
          <Text size="xs" c="dimmed">{t('job_queue_label')} <Text span ff="monospace">{job.queue}</Text></Text>
        )}
        {job.schedule && (
          <Text size="xs" c="dimmed">
            <IconCalendar size={12} style={{ verticalAlign: 'middle' }} /> {t('job_schedule_label')}:{' '}
            <Text span ff="monospace">{job.schedule}</Text>
          </Text>
        )}

        <Group gap="xl">
          {job.lastRunAt && (
            <div>
              <Text size="xs" c="dimmed">{t('job_last_run_label')}</Text>
              <Text size="xs">{formatDateTime(job.lastRunAt)}</Text>
            </div>
          )}
          {job.nextRunAt && (
            <div>
              <Text size="xs" c="dimmed">{t('job_next_run')}</Text>
              <Text size="xs">{formatDateTime(job.nextRunAt)}</Text>
            </div>
          )}
        </Group>
      </Stack>
    </Paper>
  )
}

export default function BackgroundJobsPage() {
  const { t } = useTranslation('sysadmin')
  const STATUS_CONFIG: Record<BackgroundJobDto['status'], { color: string; label: string }> = {
    Succeeded: { color: 'green', label: t('job_succeeded') },
    Failed: { color: 'red', label: t('job_failed') },
    Processing: { color: 'blue', label: t('job_processing') },
    Enqueued: { color: 'yellow', label: t('job_enqueued') },
    Scheduled: { color: 'gray', label: t('job_scheduled') },
  }
  const { data: jobs, isLoading } = useQuery({
    queryKey: ['background-jobs'],
    queryFn: () => systemApi.listJobs(),
    refetchInterval: 10_000,
  })

  const counts = (jobs ?? []).reduce<Record<string, number>>((acc, j) => {
    acc[j.status] = (acc[j.status] ?? 0) + 1
    return acc
  }, {})

  return (
    <Stack gap="lg">
      <PageHeader
        title={t('background_jobs')}
        subtitle={t('jobs_subtitle')}
      />

      {(jobs ?? []).length > 0 && (
        <Group gap="sm">
          {Object.entries(STATUS_CONFIG).map(([status, cfg]) =>
            counts[status] ? (
              <Badge key={status} color={cfg.color} variant="light" size="lg">
                {cfg.label}: {counts[status]}
              </Badge>
            ) : null
          )}
        </Group>
      )}

      {isLoading ? (
        <Center h={200}><Loader /></Center>
      ) : (jobs ?? []).length === 0 ? (
        <Center h={200}><Text c="dimmed">{t('job_none')}</Text></Center>
      ) : (
        <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="md">
          {(jobs ?? []).map((job) => (
            <JobCard key={job.id} job={job} />
          ))}
        </SimpleGrid>
      )}
    </Stack>
  )
}
