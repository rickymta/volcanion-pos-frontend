import { useState } from 'react'
import {
  Stack, Group, Paper, Text, Loader, Center, Button, NumberInput, ActionIcon, TextInput,
  Tabs, Table, Badge, Tooltip,
} from '@mantine/core'
import { useForm } from '@mantine/form'
import { notifications } from '@mantine/notifications'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  IconEdit, IconX, IconCheck, IconPlus, IconTrash, IconSettings, IconList, IconRefresh,
} from '@tabler/icons-react'
import { PageHeader } from '@pos/ui'
import { systemApi } from '@pos/sysadmin-client'
import type { SystemConfigDto } from '@pos/sysadmin-client'
import { useTranslation } from 'react-i18next'

const NULL_DATE = '0001-01-01T00:00:00'

function formatDateTime(iso: string): string {
  if (!iso || iso.startsWith('0001')) return '—'
  return new Date(iso).toLocaleString()
}

// ─── Settings tab ────────────────────────────────────────────────────────────

function SettingsTab() {
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
    lockoutMinutes: number | ''
    rateLimitPerMinute: number | ''
    corsAllowedOrigins: string[]
  }>({
    initialValues: {
      jwtExpiryMinutes: '',
      refreshTokenExpiryDays: '',
      maxLoginAttempts: '',
      lockoutMinutes: '',
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
      lockoutMinutes: data.lockoutMinutes ?? '',
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
      if (values.lockoutMinutes !== '') body.lockoutMinutes = values.lockoutMinutes as number
      if (values.rateLimitPerMinute !== '') body.rateLimitPerMinute = values.rateLimitPerMinute as number
      if (values.corsAllowedOrigins.length) body.corsAllowedOrigins = values.corsAllowedOrigins
      return systemApi.updateConfig(body)
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['system-config'] })
      void qc.invalidateQueries({ queryKey: ['system-config-entries'] })
      notifications.show({ color: 'green', message: t('save_config_success') })
      setEditing(false)
    },
    onError: () => notifications.show({ color: 'red', message: t('save_config_error') }),
  })

  if (isLoading) return <Center h={200}><Loader /></Center>

  const ConfigRow = ({ label, desc, val }: { label: string; desc: string; val: React.ReactNode }) => (
    <Group justify="space-between" wrap="nowrap">
      <div>
        <Text size="sm" fw={500}>{label}</Text>
        <Text size="xs" c="dimmed">{desc}</Text>
      </div>
      <Text fw={600} style={{ whiteSpace: 'nowrap' }}>{val}</Text>
    </Group>
  )

  return (
    <Paper withBorder p="xl" maw={640}>
      {!editing ? (
        <Stack gap="md">
          <Group justify="flex-end">
            <Button size="xs" leftSection={<IconEdit size={14} />} variant="default" onClick={startEdit}>
              {t('edit')}
            </Button>
          </Group>
          <ConfigRow
            label={t('jwt_expiry_label')}
            desc={t('jwt_expiry_desc')}
            val={data?.jwtExpiryMinutes != null ? `${data.jwtExpiryMinutes} ${t('minutes_unit')}` : '—'}
          />
          <ConfigRow
            label={t('refresh_expiry_label')}
            desc={t('refresh_expiry_desc')}
            val={data?.refreshTokenExpiryDays != null ? `${data.refreshTokenExpiryDays} ${t('days_unit')}` : '—'}
          />
          <ConfigRow
            label={t('max_attempts_label')}
            desc={t('max_attempts_desc')}
            val={data?.maxLoginAttempts ?? '—'}
          />
          <ConfigRow
            label={t('lockout_label')}
            desc={t('lockout_desc')}
            val={data?.lockoutMinutes != null ? `${data.lockoutMinutes} ${t('minutes_unit')}` : '—'}
          />
          <ConfigRow
            label={t('rate_limit_label')}
            desc={t('rate_limit_desc')}
            val={data?.rateLimitPerMinute != null ? `${data.rateLimitPerMinute} req/min` : '—'}
          />
          {(data?.corsAllowedOrigins ?? []).length > 0 && (
            <div>
              <Text size="sm" fw={500} mb={4}>{t('cors_origins_label')}</Text>
              <Stack gap={4}>
                {(data!.corsAllowedOrigins!).map((origin) => (
                  <Text key={origin} size="xs" ff="monospace" c="blue">{origin}</Text>
                ))}
              </Stack>
            </div>
          )}
        </Stack>
      ) : (
        <Stack gap="md">
          <NumberInput
            label={t('jwt_expiry_label')}
            description={t('jwt_expiry_desc')}
            placeholder="60" min={1} suffix=" min"
            {...form.getInputProps('jwtExpiryMinutes')}
          />
          <NumberInput
            label={t('refresh_expiry_label')}
            description={t('refresh_expiry_desc')}
            placeholder="7" min={1} suffix=" days"
            {...form.getInputProps('refreshTokenExpiryDays')}
          />
          <NumberInput
            label={t('max_attempts_label')}
            description={t('max_attempts_desc')}
            placeholder="5" min={1}
            {...form.getInputProps('maxLoginAttempts')}
          />
          <NumberInput
            label={t('lockout_label')}
            description={t('lockout_desc')}
            placeholder="15" min={1} suffix=" min"
            {...form.getInputProps('lockoutMinutes')}
          />
          <NumberInput
            label={t('rate_limit_label')}
            description={t('rate_limit_desc')}
            placeholder="200" min={1} suffix=" req/min"
            {...form.getInputProps('rateLimitPerMinute')}
          />
          <div>
            <Group justify="space-between" mb={4}>
              <Text size="sm" fw={500}>{t('cors_origins_label')}</Text>
              <Button
                size="xs" variant="light" leftSection={<IconPlus size={12} />}
                onClick={() => form.setFieldValue('corsAllowedOrigins', [...form.values.corsAllowedOrigins, ''])}
              >
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
                    color="red" variant="subtle" size="sm"
                    onClick={() => form.setFieldValue(
                      'corsAllowedOrigins',
                      form.values.corsAllowedOrigins.filter((_, i) => i !== idx),
                    )}
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
            <Button
              leftSection={<IconCheck size={14} />}
              loading={saveMutation.isPending}
              onClick={() => saveMutation.mutate(form.values)}
            >
              {t('save_config_btn')}
            </Button>
          </Group>
        </Stack>
      )}
    </Paper>
  )
}

// ─── Entries tab ─────────────────────────────────────────────────────────────

function EntriesTab() {
  const { t } = useTranslation('sysadmin')
  const qc = useQueryClient()

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['system-config-entries'],
    queryFn: () => systemApi.getConfigEntries(),
  })

  return (
    <Stack gap="md">
      <Group justify="flex-end">
        <Button
          size="xs"
          variant="default"
          leftSection={<IconRefresh size={14} />}
          loading={isFetching}
          onClick={() => void qc.invalidateQueries({ queryKey: ['system-config-entries'] })}
        >
          Làm mới
        </Button>
      </Group>
      {isLoading ? (
        <Center h={200}><Loader /></Center>
      ) : (
        <Paper withBorder style={{ overflow: 'hidden' }}>
          <Table striped highlightOnHover withColumnBorders>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>{t('config_entry_key')}</Table.Th>
                <Table.Th>{t('config_entry_value')}</Table.Th>
                <Table.Th>{t('config_entry_updated_at')}</Table.Th>
                <Table.Th>{t('config_entry_updated_by')}</Table.Th>
                <Table.Th style={{ width: 120 }}>Trạng thái</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {(data ?? []).map((entry) => {
                const isDefault =
                  entry.updatedAt === NULL_DATE || entry.updatedAt.startsWith('0001')
                return (
                  <Table.Tr key={entry.key}>
                    <Table.Td>
                      <Text ff="monospace" size="sm" fw={500}>{entry.key}</Text>
                      {entry.description && (
                        <Text size="xs" c="dimmed">{entry.description}</Text>
                      )}
                    </Table.Td>
                    <Table.Td>
                      <Text ff="monospace" size="sm" style={{ wordBreak: 'break-all', maxWidth: 300 }}>
                        {entry.value}
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      <Text size="xs" c={isDefault ? 'dimmed' : undefined}>
                        {formatDateTime(entry.updatedAt)}
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      <Text size="xs" c={isDefault ? 'dimmed' : undefined}>
                        {entry.updatedBy ?? '—'}
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      <Tooltip
                        label={
                          isDefault
                            ? 'Chưa chỉnh sửa — đang dùng giá trị mặc định'
                            : 'Đã được chỉnh sửa thủ công'
                        }
                      >
                        <Badge
                          size="sm"
                          variant={isDefault ? 'outline' : 'filled'}
                          color={isDefault ? 'gray' : 'blue'}
                        >
                          {isDefault ? t('config_entry_default') : t('config_entry_customized')}
                        </Badge>
                      </Tooltip>
                    </Table.Td>
                  </Table.Tr>
                )
              })}
              {(data ?? []).length === 0 && (
                <Table.Tr>
                  <Table.Td colSpan={5}>
                    <Center py="xl">
                      <Text c="dimmed" size="sm">Không có dữ liệu</Text>
                    </Center>
                  </Table.Td>
                </Table.Tr>
              )}
            </Table.Tbody>
          </Table>
        </Paper>
      )}
    </Stack>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function SystemConfigPage() {
  const { t } = useTranslation('sysadmin')

  return (
    <Stack gap="lg">
      <PageHeader
        title={t('system_config')}
        subtitle={t('config_subtitle')}
      />
      <Tabs defaultValue="settings" keepMounted={false}>
        <Tabs.List mb="md">
          <Tabs.Tab value="settings" leftSection={<IconSettings size={15} />}>
            {t('config_tab_settings')}
          </Tabs.Tab>
          <Tabs.Tab value="entries" leftSection={<IconList size={15} />}>
            {t('config_tab_entries')}
          </Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="settings">
          <SettingsTab />
        </Tabs.Panel>
        <Tabs.Panel value="entries">
          <EntriesTab />
        </Tabs.Panel>
      </Tabs>
    </Stack>
  )
}
