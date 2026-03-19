import { useState, useMemo } from 'react'
import { Stack, Group, TextInput, Badge, Text, Select, Button } from '@mantine/core'
import { useDebouncedValue } from '@mantine/hooks'
import { DatePickerInput } from '@mantine/dates'
import { useQuery } from '@tanstack/react-query'
import { PageHeader, DataTable } from '@pos/ui'
import type { DataTableColumn } from '@pos/ui'
import { IconSearch, IconX } from '@tabler/icons-react'
import { auditLogsApi, tenantsApi } from '@pos/sysadmin-client'
import type { AuditLogDto } from '@pos/sysadmin-client'
import { formatDateTime } from '@pos/utils'
import { useTranslation } from 'react-i18next'

type Row = AuditLogDto & Record<string, unknown>

const PAGE_SIZE = 30

export default function AuditLogsPage() {
  const { t } = useTranslation('sysadmin')
  const [search, setSearch] = useState('')
  const [tenantId, setTenantId] = useState<string | null>(null)
  const [action, setAction] = useState('')
  const [fromDate, setFromDate] = useState<Date | null>(null)
  const [toDate, setToDate] = useState<Date | null>(null)
  const [page, setPage] = useState(1)

  const [tenantSearch, setTenantSearch] = useState('')
  const [debouncedTenantSearch] = useDebouncedValue(tenantSearch, 300)

  const { data: tenantsData } = useQuery({
    queryKey: ['tenants', debouncedTenantSearch],
    queryFn: () => tenantsApi.list({ search: debouncedTenantSearch || undefined, pageSize: 20 }),
  })
  const { data: selectedTenant } = useQuery({
    queryKey: ['tenant', tenantId],
    queryFn: () => tenantsApi.getById(tenantId!),
    enabled: !!tenantId,
    staleTime: Infinity,
  })
  const tenantOptions = useMemo(() => {
    const list = (tenantsData?.items ?? []).map((t) => ({ value: t.id, label: t.name }))
    if (tenantId && selectedTenant && !list.find((o) => o.value === tenantId)) {
      list.unshift({ value: selectedTenant.id, label: selectedTenant.name })
    }
    return list
  }, [tenantsData, tenantId, selectedTenant])

  const params = {
    page,
    pageSize: PAGE_SIZE,
    tenantId: tenantId ?? undefined,
    action: action || undefined,
    fromDate: fromDate ? fromDate.toISOString().substring(0, 10) : undefined,
    toDate: toDate ? toDate.toISOString().substring(0, 10) : undefined,
  }

  const { data, isLoading } = useQuery({
    queryKey: ['audit-logs', params],
    queryFn: () => auditLogsApi.list(params),
  })

  const filtered = (data?.items ?? []).filter((log) => {
    if (!search) return true
    const s = search.toLowerCase()
    return (
      log.action.toLowerCase().includes(s) ||
      log.resource.toLowerCase().includes(s) ||
      (log.userEmail ?? '').toLowerCase().includes(s) ||
      (log.tenantName ?? '').toLowerCase().includes(s)
    )
  })

  function resetFilters() {
    setSearch('')
    setTenantId(null)
    setAction('')
    setFromDate(null)
    setToDate(null)
    setPage(1)
  }

  const hasFilters = !!search || !!tenantId || !!action || !!fromDate || !!toDate

  const columns: DataTableColumn<Row>[] = [
    {
      key: 'timestamp',
      header: t('audit_timestamp'),
      width: 160,
      render: (row) => formatDateTime(row.timestamp as string),
    },
    { key: 'tenantName', header: t('audit_tenant'), width: 160, render: (row) => (row.tenantName as string | undefined) ?? '—' },
    { key: 'userEmail', header: t('audit_user'), render: (row) => (row.userEmail as string | undefined) ?? '—' },
    {
      key: 'action',
      header: t('audit_action'),
      width: 120,
      render: (row) => <Badge variant="light" size="sm">{row.action as string}</Badge>,
    },
    { key: 'resource', header: t('audit_resource') },
    { key: 'resourceId', header: 'ID', width: 120, render: (row) => (
      <Text size="xs" ff="monospace" c="dimmed" lineClamp={1}>
        {(row.resourceId as string | undefined) ?? '—'}
      </Text>
    )},
    { key: 'ipAddress', header: t('audit_ip'), width: 130, render: (row) => (row.ipAddress as string | undefined) ?? '—' },
  ]

  return (
    <Stack gap="lg">
      <PageHeader
        title={t('audit_logs')}
        subtitle={t('audit_subtitle')}
      />

      <Group gap="sm" wrap="wrap">
        <TextInput
          placeholder={t('audit_search_placeholder')}
          leftSection={<IconSearch size={16} />}
          value={search}
          onChange={(e) => { setSearch(e.currentTarget.value); setPage(1) }}
          w={220}
        />
        <Select
          placeholder={t('audit_all_tenants')}
          data={tenantOptions}
          value={tenantId}
          onChange={(v) => { setTenantId(v); setTenantSearch(''); setPage(1) }}
          searchValue={tenantSearch}
          onSearchChange={setTenantSearch}
          filter={({ options }) => options}
          clearable
          searchable
          nothingFoundMessage="Không tìm thấy"
          w={200}
        />
        <TextInput
          placeholder={t('audit_action_placeholder')}
          value={action}
          onChange={(e) => { setAction(e.currentTarget.value); setPage(1) }}
          w={190}
        />
        <DatePickerInput
          placeholder={t('audit_from_date')}
          value={fromDate}
          onChange={(d) => { setFromDate(d); setPage(1) }}
          clearable
          w={145}
        />
        <DatePickerInput
          placeholder={t('audit_to_date')}
          value={toDate}
          onChange={(d) => { setToDate(d); setPage(1) }}
          clearable
          w={145}
        />
        {hasFilters && (
          <Button variant="subtle" color="gray" leftSection={<IconX size={14} />} onClick={resetFilters}>
            {t('audit_clear_filters')}
          </Button>
        )}
      </Group>

      <DataTable
        data={(filtered as Row[])}
        columns={columns}
        isLoading={isLoading}
        total={data?.totalCount}
        page={page}
        pageSize={PAGE_SIZE}
        onPageChange={setPage}
        rowKey="id"
      />
    </Stack>
  )
}
