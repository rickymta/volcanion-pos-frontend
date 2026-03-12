import { useState } from 'react'
import { Stack, Tabs, Select, Paper, Text, Group, Table } from '@mantine/core'
import { useQuery } from '@tanstack/react-query'
import { PageHeader } from '@pos/ui'
import { debtApi, customersApi, suppliersApi } from '@pos/api-client'
import { formatVND, formatDate } from '@pos/utils'

export default function DebtPage() {
  const [customerId, setCustomerId] = useState<string | null>(null)
  const [supplierId, setSupplierId] = useState<string | null>(null)

  const { data: customers } = useQuery({
    queryKey: ['customers-all'],
    queryFn: () => customersApi.list({ page: 1, pageSize: 200 }),
  })

  const { data: suppliers } = useQuery({
    queryKey: ['suppliers-all'],
    queryFn: () => suppliersApi.list({ page: 1, pageSize: 200 }),
  })

  const { data: customerSummary } = useQuery({
    queryKey: ['debt-customer-summary', customerId],
    queryFn: () => debtApi.getCustomerBalance(customerId!),
    enabled: !!customerId,
  })

  const { data: customerLedger } = useQuery({
    queryKey: ['debt-customer-ledger', customerId],
    queryFn: () => debtApi.listCustomerLedger(customerId!),
    enabled: !!customerId,
  })

  const { data: supplierSummary } = useQuery({
    queryKey: ['debt-supplier-summary', supplierId],
    queryFn: () => debtApi.getSupplierBalance(supplierId!),
    enabled: !!supplierId,
  })

  const { data: supplierLedger } = useQuery({
    queryKey: ['debt-supplier-ledger', supplierId],
    queryFn: () => debtApi.listSupplierLedger(supplierId!),
    enabled: !!supplierId,
  })

  const customerOptions = (customers?.items ?? []).map((c) => ({ value: c.id, label: c.name }))
  const supplierOptions = (suppliers?.items ?? []).map((s) => ({ value: s.id, label: s.name }))

  return (
    <Stack gap="lg">
      <PageHeader title="Công nợ" subtitle="Theo dõi công nợ khách hàng và nhà cung cấp" />

      <Tabs defaultValue="customer">
        <Tabs.List>
          <Tabs.Tab value="customer">Công nợ khách hàng</Tabs.Tab>
          <Tabs.Tab value="supplier">Công nợ nhà cung cấp</Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="customer" pt="md">
          <Stack gap="md">
            <Select
              placeholder="Chọn khách hàng..."
              data={customerOptions}
              value={customerId}
              onChange={setCustomerId}
              searchable
              clearable
              w={300}
            />
            {customerSummary !== undefined && (
              <Paper p="md" withBorder>
                <Group gap="xl">
                  <div>
                    <Text size="xs" c="dimmed">Số dư công nợ</Text>
                    <Text fw={700} c={customerSummary > 0 ? 'orange' : 'green'}>
                      {formatVND(customerSummary)}
                    </Text>
                  </div>
                </Group>
              </Paper>
            )}
            {customerLedger && (
              <Table striped withTableBorder fz="sm">
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Ngày</Table.Th>
                    <Table.Th>Tham chiếu</Table.Th>
                    <Table.Th ta="right">Phát sinh nợ</Table.Th>
                    <Table.Th ta="right">Phát sinh có</Table.Th>
                    <Table.Th ta="right">Số dư</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {(customerLedger.items ?? []).map((entry) => (
                    <Table.Tr key={entry.id}>
                      <Table.Td>{formatDate(entry.transactionDate)}</Table.Td>
                      <Table.Td>{entry.referenceId ?? '—'}</Table.Td>
                      <Table.Td ta="right" c={entry.debitAmount > 0 ? 'red' : undefined}>
                        {entry.debitAmount > 0 ? formatVND(entry.debitAmount) : '—'}
                      </Table.Td>
                      <Table.Td ta="right" c={entry.creditAmount > 0 ? 'green' : undefined}>
                        {entry.creditAmount > 0 ? formatVND(entry.creditAmount) : '—'}
                      </Table.Td>
                      <Table.Td ta="right" fw={500}>{formatVND(entry.balanceAfter)}</Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            )}
          </Stack>
        </Tabs.Panel>

        <Tabs.Panel value="supplier" pt="md">
          <Stack gap="md">
            <Select
              placeholder="Chọn nhà cung cấp..."
              data={supplierOptions}
              value={supplierId}
              onChange={setSupplierId}
              searchable
              clearable
              w={300}
            />
            {supplierSummary !== undefined && (
              <Paper p="md" withBorder>
                <Group gap="xl">
                  <div>
                    <Text size="xs" c="dimmed">Số dư công nợ</Text>
                    <Text fw={700} c={supplierSummary > 0 ? 'orange' : 'green'}>
                      {formatVND(supplierSummary)}
                    </Text>
                  </div>
                </Group>
              </Paper>
            )}
            {supplierLedger && (
              <Table striped withTableBorder fz="sm">
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Ngày</Table.Th>
                    <Table.Th>Tham chiếu</Table.Th>
                    <Table.Th ta="right">Phát sinh nợ</Table.Th>
                    <Table.Th ta="right">Phát sinh có</Table.Th>
                    <Table.Th ta="right">Số dư</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {(supplierLedger.items ?? []).map((entry) => (
                    <Table.Tr key={entry.id}>
                      <Table.Td>{formatDate(entry.transactionDate)}</Table.Td>
                      <Table.Td>{entry.referenceId ?? '—'}</Table.Td>
                      <Table.Td ta="right" c={entry.debitAmount > 0 ? 'red' : undefined}>
                        {entry.debitAmount > 0 ? formatVND(entry.debitAmount) : '—'}
                      </Table.Td>
                      <Table.Td ta="right" c={entry.creditAmount > 0 ? 'green' : undefined}>
                        {entry.creditAmount > 0 ? formatVND(entry.creditAmount) : '—'}
                      </Table.Td>
                      <Table.Td ta="right" fw={500}>{formatVND(entry.balanceAfter)}</Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            )}
          </Stack>
        </Tabs.Panel>
      </Tabs>
    </Stack>
  )
}
