import { useState } from 'react'
import { Stack, Badge, Group, TextInput, Select, Table, Pagination, Text, Center, Loader } from '@mantine/core'
import { PageHeader } from '@pos/ui'
import { useQuery } from '@tanstack/react-query'
import { salesOrdersApi } from '@pos/api-client'
import type { SalesOrderDto, DocumentStatus } from '@pos/api-client'
import { formatVND } from '@pos/utils'
import { IconSearch } from '@tabler/icons-react'
import { useTranslation } from 'react-i18next'

const PAGE_SIZE = 20

const STATUS_COLOR: Record<string, string> = {
  Draft: 'gray',
  Confirmed: 'blue',
  Cancelled: 'red',
  Completed: 'green',
}

export default function OrderHistoryPage() {
  const { t } = useTranslation('pos')
  const STATUS_LABEL: Record<string, string> = {
    Draft: t('status_draft'),
    Confirmed: t('status_confirmed'),
    Cancelled: t('status_cancelled'),
    Completed: t('status_completed'),
  }
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<string>('')

  const { data, isFetching } = useQuery({
    queryKey: ['pos-orders', page, search, status],
    queryFn: () =>
      salesOrdersApi.list({
        page,
        pageSize: PAGE_SIZE,
        search: search || undefined,
        status: (status || undefined) as DocumentStatus | undefined,
      }),
  })

  const rows = (data?.items ?? []).map((order: SalesOrderDto) => (
    <Table.Tr key={order.id}>
      <Table.Td>{order.code}</Table.Td>
      <Table.Td>{order.orderDate.slice(0, 10)}</Table.Td>
      <Table.Td>{order.customerName}</Table.Td>
      <Table.Td ta="right">{formatVND(order.grandTotal)}</Table.Td>
      <Table.Td>
        <Badge color={STATUS_COLOR[order.status] ?? 'gray'}>
          {STATUS_LABEL[order.status] ?? order.status}
        </Badge>
      </Table.Td>
    </Table.Tr>
  ))

  return (
    <Stack gap="lg" p="md">
      <PageHeader title={t('history_title')} subtitle={t('history_subtitle')} />

      <Group>
        <TextInput
          placeholder={t('history_search')}
          leftSection={<IconSearch size={16} />}
          value={search}
          onChange={(e) => { setSearch(e.currentTarget.value); setPage(1) }}
          style={{ flex: 1 }}
        />
        <Select
          placeholder={t('history_status_placeholder')}
          clearable
          data={[
            { value: 'Draft', label: t('status_draft') },
            { value: 'Confirmed', label: t('status_confirmed') },
            { value: 'Cancelled', label: t('status_cancelled') },
            { value: 'Completed', label: t('status_completed') },
          ]}
          value={status}
          onChange={(v) => { setStatus(v ?? ''); setPage(1) }}
          w={180}
        />
      </Group>

      {isFetching ? (
        <Center py="xl"><Loader /></Center>
      ) : (
        <Table striped highlightOnHover withTableBorder withColumnBorders>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>{t('order_code')}</Table.Th>
              <Table.Th>{t('order_date')}</Table.Th>
              <Table.Th>{t('customer_col')}</Table.Th>
              <Table.Th ta="right">{t('amount_col')}</Table.Th>
              <Table.Th>{t('history_status_placeholder')}</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {rows.length > 0 ? rows : (
              <Table.Tr>
                <Table.Td colSpan={5}>
                  <Text ta="center" c="dimmed" py="md">{t('history_no_orders')}</Text>
                </Table.Td>
              </Table.Tr>
            )}
          </Table.Tbody>
        </Table>
      )}

      {(data?.totalPages ?? 0) > 1 && (
        <Group justify="center">
          <Pagination total={data?.totalPages ?? 1} value={page} onChange={setPage} />
        </Group>
      )}
    </Stack>
  )
}
