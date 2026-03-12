import { useState } from 'react'
import {
  Stack, Group, Paper, Text, Loader, Center, Button, NumberInput, ActionIcon, TextInput,
} from '@mantine/core'
import { useForm } from '@mantine/form'
import { notifications } from '@mantine/notifications'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { IconEdit, IconX, IconCheck, IconPlus, IconTrash } from '@tabler/icons-react'
import { PageHeader } from '@pos/ui'
import { systemApi } from '@pos/sysadmin-client'
import type { SystemConfigDto } from '@pos/sysadmin-client'
import { useTranslation } from 'react-i18next'

export default function SystemConfigPage() {
  const { t } = useTranslation('sysadmin')
  const qc = useQueryClient()
  const [editing, setEditing] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['system-config'],
    queryFn: () => systemApi.getConfig(),
  })

  const form = useForm<{
    jwtExpiryMinutes: number | ''
    refreshTokenExpiryDays: number | ''
    maxLoginAttempts: number | ''
    rateLimitPerMinute: number | ''
    corsAllowedOrigins: string[]
  }>({
    initialValues: {
      jwtExpiryMinutes: '',
      refreshTokenExpiryDays: '',
      maxLoginAttempts: '',
      rateLimitPerMinute: '',
      corsAllowedOrigins: [],
    },
  })

  function startEdit() {
    if (!data) return
    form.setValues({
      jwtExpiryMinutes: data.jwtExpiryMinutes ?? '',
      refreshTokenExpiryDays: data.refreshTokenExpiryDays ?? '',
      maxLoginAttempts: data.maxLoginAttempts ?? '',
      rateLimitPerMinute: data.rateLimitPerMinute ?? '',
      corsAllowedOrigins: data.corsAllowedOrigins ?? [],
    })
    setEditing(true)
  }

  const saveMutation = useMutation({
    mutationFn: (values: typeof form.values) => {
      const body: Partial<SystemConfigDto> = {}
      if (values.jwtExpiryMinutes !== '') body.jwtExpiryMinutes = values.jwtExpiryMinutes as number
      if (values.refreshTokenExpiryDays !== '') body.refreshTokenExpiryDays = values.refreshTokenExpiryDays as number
      if (values.maxLoginAttempts !== '') body.maxLoginAttempts = values.maxLoginAttempts as number
      if (values.rateLimitPerMinute !== '') body.rateLimitPerMinute = values.rateLimitPerMinute as number
      if (values.corsAllowedOrigins.length) body.corsAllowedOrigins = values.corsAllowedOrigins
      return systemApi.updateConfig(body)
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['system-config'] })
      notifications.show({ color: 'green', message: t('save_config_success') })
      setEditing(false)
    },
    onError: () => notifications.show({ color: 'red', message: t('save_config_error') }),
  })

  return (
    <Stack gap="lg">
      <PageHeader
        title={t('system_config')}
        subtitle={t('config_subtitle')}
        actions={
          !editing && !isLoading ? (
            <Button leftSection={<IconEdit size={16} />} onClick={startEdit} variant="default">
              {t('edit')}
            </Button>
          ) : undefined
        }
      />

      {isLoading ? (
        <Center h={200}><Loader /></Center>
      ) : !editing ? (
        <Paper withBorder p="xl" maw={600}>
          <Stack gap="md">
            <Group justify="space-between">
              <div>
                <Text size="sm" fw={500}>{t('jwt_expiry_label')}</Text>
                <Text size="xs" c="dimmed">{t('jwt_expiry_desc')}</Text>
              </div>
              <Text fw={600}>{data?.jwtExpiryMinutes ?? '—'} {data?.jwtExpiryMinutes !== undefined ? t('minutes_unit') : ''}</Text>
            </Group>
            <Group justify="space-between">
              <div>
                <Text size="sm" fw={500}>{t('refresh_expiry_label')}</Text>
                <Text size="xs" c="dimmed">{t('refresh_expiry_desc')}</Text>
              </div>
              <Text fw={600}>{data?.refreshTokenExpiryDays ?? '—'} {data?.refreshTokenExpiryDays !== undefined ? t('days_unit') : ''}</Text>
            </Group>
            <Group justify="space-between">
              <div>
                <Text size="sm" fw={500}>{t('max_attempts_label')}</Text>
                <Text size="xs" c="dimmed">{t('max_attempts_desc')}</Text>
              </div>
              <Text fw={600}>{data?.maxLoginAttempts ?? '—'}</Text>
            </Group>
            <Group justify="space-between">
              <div>
                <Text size="sm" fw={500}>{t('rate_limit_label')}</Text>
                <Text size="xs" c="dimmed">{t('rate_limit_desc')}</Text>
              </div>
              <Text fw={600}>{data?.rateLimitPerMinute !== undefined ? `${data.rateLimitPerMinute} req/min` : '—'}</Text>
            </Group>
            {(data?.corsAllowedOrigins ?? []).length > 0 && (
              <div>
                <Text size="sm" fw={500} mb={4}>{t('cors_origins_label')}</Text>
                <Stack gap={4}>
                  {(data?.corsAllowedOrigins ?? []).map((origin) => (
                    <Text key={origin} size="xs" ff="monospace" c="blue">{origin}</Text>
                  ))}
                </Stack>
              </div>
            )}
          </Stack>
        </Paper>
      ) : (
        <Paper withBorder p="xl" maw={600}>
          <Stack gap="md">
            <NumberInput label={t('jwt_expiry_label')} placeholder="60" min={1} {...form.getInputProps('jwtExpiryMinutes')} />
            <NumberInput label={t('refresh_expiry_label')} placeholder="30" min={1} {...form.getInputProps('refreshTokenExpiryDays')} />
            <NumberInput label={t('max_attempts_label')} placeholder="5" min={1} {...form.getInputProps('maxLoginAttempts')} />
            <NumberInput label={t('rate_limit_label')} placeholder="100" min={1} {...form.getInputProps('rateLimitPerMinute')} />
            <div>
              <Group justify="space-between" mb={4}>
                <Text size="sm" fw={500}>{t('cors_origins_label')}</Text>
                <Button size="xs" variant="light" leftSection={<IconPlus size={12} />}
                  onClick={() => form.setFieldValue('corsAllowedOrigins', [...form.values.corsAllowedOrigins, ''])}>
                  {t('add_origin')}
                </Button>
              </Group>
              <Stack gap={4}>
                {form.values.corsAllowedOrigins.map((origin, idx) => (
                  <Group key={idx} gap="xs">
                    <TextInput
                      placeholder="https://example.com"
                      value={origin}
                      onChange={(e) => {
                        const next = [...form.values.corsAllowedOrigins]
                        next[idx] = e.currentTarget.value
                        form.setFieldValue('corsAllowedOrigins', next)
                      }}
                      style={{ flex: 1 }}
                      size="xs"
                      ff="monospace"
                    />
                    <ActionIcon
                      color="red"
                      variant="subtle"
                      size="sm"
                      onClick={() => {
                        form.setFieldValue(
                          'corsAllowedOrigins',
                          form.values.corsAllowedOrigins.filter((_, i) => i !== idx)
                        )
                      }}
                    >
                      <IconTrash size={14} />
                    </ActionIcon>
                  </Group>
                ))}
              </Stack>
            </div>

            <Group justify="flex-end" gap="sm">
              <Button variant="default" leftSection={<IconX size={14} />} onClick={() => setEditing(false)}>
                {t('cancel')}
              </Button>
              <Button leftSection={<IconCheck size={14} />} loading={saveMutation.isPending}
                onClick={() => saveMutation.mutate(form.values)}>
                {t('save_config_btn')}
              </Button>
            </Group>
          </Stack>
        </Paper>
      )}
    </Stack>
  )
}
