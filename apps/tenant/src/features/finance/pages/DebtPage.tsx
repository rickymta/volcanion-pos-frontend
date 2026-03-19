import { useState, useMemo } from 'react'
import { Stack, Tabs, Select, Paper, Text, Group, Table } from '@mantine/core'
import { useDebouncedValue } from '@mantine/hooks'
import { useQuery } from '@tanstack/react-query'
import { PageHeader } from '@pos/ui'
import { debtApi, customersApi, suppliersApi } from '@pos/api-client'
import { formatVND, formatDate } from '@pos/utils'

export default function DebtPage() {
  const [customerId, setCustomerId] = useState<string | null>(null)
  const [customerSearch, setCustomerSearch] = useState('')
  const [debouncedCustomerSearch] = useDebouncedValue(customerSearch, 300)
  const [supplierId, setSupplierId] = useState<string | null>(null)
  const [supplierSearch, setSupplierSearch] = useState('')
  const [debouncedSupplierSearch] = useDebouncedValue(supplierSearch, 300)

  const { data: customers } = useQuery({
    queryKey: ['customers-search', debouncedCustomerSearch],
    queryFn: () => customersApi.list({ search: debouncedCustomerSearch || undefined, pageSize: 20 }),
  })
  const { data: selectedCustomerData } = useQuery({
    queryKey: ['customer', customerId],
    queryFn: () => customersApi.getById(customerId!),
    enabled: !!customerId,
    staleTime: Infinity,
  })
  const customerOptions = useMemo(() => {
    const results = (customers?.items ?? []).map((c) => ({ value: c.id, label: c.name }))
    if (customerId && selectedCustomerData && !results.find((o) => o.value === customerId))
      results.unshift({ value: selectedCustomerData.id, label: selectedCustomerData.name })
    return results
  }, [customers?.items, selectedCustomerData, customerId])

  const { data: suppliers } = useQuery({
    queryKey: ['suppliers-search', debouncedSupplierSearch],
    queryFn: () => suppliersApi.list({ search: debouncedSupplierSearch || undefined, pageSize: 20 }),
  })
  const { data: selectedSupplierData } = useQuery({
    queryKey: ['supplier', supplierId],
    queryFn: () => suppliersApi.getById(supplierId!),
    enabled: !!supplierId,
    staleTime: Infinity,
  })
  const supplierOptions = useMemo(() => {
    const results = (suppliers?.items ?? []).map((s) => ({ value: s.id, label: s.name }))
    if (supplierId && selectedSupplierData && !results.find((o) => o.value === supplierId))
      results.unshift({ value: selectedSupplierData.id, label: selectedSupplierData.name })
    return results
  }, [suppliers?.items, selectedSupplierData, supplierId])

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
              placeholder="Tìm khách hàng..."
              data={customerOptions}
              value={customerId}
              onChange={setCustomerId}
              searchable
              clearable
              searchValue={customerSearch}
              onSearchChange={setCustomerSearch}
              filter={({ options }) => options}
              nothingFoundMessage="Không tìm thấy"
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
              placeholder="Tìm nhà cung cấp..."
              data={supplierOptions}
              value={supplierId}
              onChange={setSupplierId}
              searchable
              clearable
              searchValue={supplierSearch}
              onSearchChange={setSupplierSearch}
              filter={({ options }) => options}
              nothingFoundMessage="Không tìm thấy"
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
