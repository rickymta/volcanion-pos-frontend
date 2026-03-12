import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Stack, Group, Button, Badge, Collapse, Card, Text, Divider, Table } from '@mantine/core'
import { DateInput } from '@mantine/dates'
import { IconChevronDown, IconChevronRight } from '@tabler/icons-react'
import { PageHeader } from '@pos/ui'
import { journalApi } from '@pos/api-client'
import { formatDate, formatVND } from '@pos/utils'

const PAGE_SIZE = 20

export default function JournalEntryListPage() {
  const [page, setPage] = useState(1)
  const [fromDate, setFromDate] = useState<Date | null>(null)
  const [toDate, setToDate] = useState<Date | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['journal-entries', page, fromDate, toDate],
    queryFn: () =>
      journalApi.list({
        page,
        pageSize: PAGE_SIZE,
        fromDate: fromDate ? fromDate.toISOString().slice(0, 10) : undefined,
        toDate: toDate ? toDate.toISOString().slice(0, 10) : undefined,
      }),
  })

  const handleReset = () => {
    setFromDate(null)
    setToDate(null)
    setPage(1)
  }

  return (
    <Stack gap="md">
      <PageHeader title="Bút toán kế toán" />

      {/* Filters */}
      <Group px="md" gap="sm" wrap="wrap">
        <DateInput
          placeholder="Từ ngày"
          value={fromDate}
          onChange={(d) => { setFromDate(d); setPage(1) }}
          clearable
          valueFormat="DD/MM/YYYY"
          w={160}
        />
        <DateInput
          placeholder="Đến ngày"
          value={toDate}
          onChange={(d) => { setToDate(d); setPage(1) }}
          clearable
          valueFormat="DD/MM/YYYY"
          w={160}
        />
        <Button variant="default" size="sm" onClick={handleReset}>Đặt lại</Button>
      </Group>

      <Stack px="md" gap="xs">
        {(data?.items ?? []).map((entry) => (
          <Card key={entry.id} withBorder padding="xs">
            <Group justify="space-between" wrap="nowrap" style={{ cursor: 'pointer' }} onClick={() => setExpandedId(expandedId === entry.id ? null : entry.id)}>
              <Group gap="sm">
                {expandedId === entry.id ? <IconChevronDown size={14} /> : <IconChevronRight size={14} />}
                <Text size="sm" fw={600} c="blue">{entry.code}</Text>
                <Text size="sm" c="dimmed">{formatDate(entry.entryDate)}</Text>
              </Group>
              <Group gap="sm">
                <Text size="sm" lineClamp={1}>{entry.description}</Text>
                {entry.referenceType && (
                  <Badge size="xs" variant="outline">{entry.referenceType}</Badge>
                )}
                <Text size="sm" c="blue">
                  {formatVND(entry.lines.reduce((s, l) => s + l.debitAmount, 0))}
                </Text>
              </Group>
            </Group>

            <Collapse in={expandedId === entry.id}>
              <Divider my="xs" />
              <Table fz="xs">
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>TK</Table.Th>
                    <Table.Th>Tên tài khoản</Table.Th>
                    <Table.Th ta="right">Nợ</Table.Th>
                    <Table.Th ta="right">Có</Table.Th>
                    <Table.Th>Diễn giải</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {entry.lines.map((line) => (
                    <Table.Tr key={line.id}>
                      <Table.Td fw={600}>{line.accountCode}</Table.Td>
                      <Table.Td>{line.accountName}</Table.Td>
                      <Table.Td ta="right" c="blue">{line.debitAmount ? formatVND(line.debitAmount) : ''}</Table.Td>
                      <Table.Td ta="right" c="green">{line.creditAmount ? formatVND(line.creditAmount) : ''}</Table.Td>
                      <Table.Td c="dimmed">{line.description}</Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            </Collapse>
          </Card>
        ))}

        {!isLoading && (data?.items ?? []).length === 0 && (
          <Text c="dimmed" ta="center" py="xl">Không có bút toán nào</Text>
        )}
      </Stack>

      {(data?.totalCount ?? 0) > PAGE_SIZE && (
        <Group justify="center" pb="md">
          <Button variant="default" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>Trước</Button>
          <Text size="sm">Trang {page} / {Math.ceil((data?.totalCount ?? 0) / PAGE_SIZE)}</Text>
          <Button variant="default" disabled={page * PAGE_SIZE >= (data?.totalCount ?? 0)} onClick={() => setPage((p) => p + 1)}>Sau</Button>
        </Group>
      )}
    </Stack>
  )
}
