import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Stack, Group, Button, Text, Loader, Center, Table } from '@mantine/core'
import { DateInput } from '@mantine/dates'
import { PageHeader } from '@pos/ui'
import { reportsApi } from '@pos/api-client'
import { formatVND } from '@pos/utils'


export default function AccountBalancesPage() {
  const now = new Date()
  const [asOf, setAsOf] = useState<Date | null>(now)
  const [asOfParam, setAsOfParam] = useState(now.toISOString().slice(0, 10))

  const { data, isLoading } = useQuery({
    queryKey: ['report-account-balances', asOfParam],
    queryFn: () => reportsApi.accountBalances({ asOf: asOfParam }),
    enabled: !!asOfParam,
  })

  const handleApply = () => {
    if (asOf) {
      setAsOfParam(asOf.toISOString().slice(0, 10))
    }
  }

  return (
    <Stack gap="md">
      <PageHeader title="Số dư tài khoản" />

      {/* Filters */}
      <Group px="md" gap="sm">
        <DateInput
          label="Tính đến ngày"
          value={asOf}
          onChange={setAsOf}
          clearable
          valueFormat="DD/MM/YYYY"
          w={160}
        />
        <Button mt={24} onClick={handleApply} disabled={!asOf}>
          Xem báo cáo
        </Button>
      </Group>

      {isLoading && (
        <Center py="xl"><Loader /></Center>
      )}

      {data && !isLoading && (
        <Stack px="md" gap="sm">
          <Text size="xs" c="dimmed">
            Tính đến ngày: {asOfParam} · {data.length} tài khoản
          </Text>
          <Table>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Mã TK</Table.Th>
                <Table.Th>Tên tài khoản</Table.Th>
                <Table.Th>Loại TK</Table.Th>
                <Table.Th ta="right">Số dư</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {data.map((row) => (
                <Table.Tr key={row.accountCode}>
                  <Table.Td fw={600}>{row.accountCode}</Table.Td>
                  <Table.Td>{row.accountName}</Table.Td>
                  <Table.Td>{row.accountType}</Table.Td>
                  <Table.Td ta="right" c={row.balance >= 0 ? 'blue' : 'red'}>{formatVND(row.balance)}</Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </Stack>
      )}

      {!isLoading && !data && (
        <Center py="xl">
          <Text c="dimmed">Chọn kỳ và nhấn "Xem báo cáo"</Text>
        </Center>
      )}
    </Stack>
  )
}
