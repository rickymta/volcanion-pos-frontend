import { useState, useEffect, useMemo } from 'react'
import {
  Stack, Group, Button, NumberInput, Select, ActionIcon,
  Table, Paper, Text, Divider, Textarea,
} from '@mantine/core'
import { useDebouncedValue } from '@mantine/hooks'
import { DateInput } from '@mantine/dates'
import { notifications } from '@mantine/notifications'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate, useParams } from 'react-router-dom'
import { IconArrowLeft, IconPlus, IconTrash, IconDeviceFloppy } from '@tabler/icons-react'
import { PageHeader } from '@pos/ui'
import { salesOrdersApi, customersApi } from '@pos/api-client'
import type { ProductDto } from '@pos/api-client'
import { formatVND } from '@pos/utils'
import { ProductSelectCell } from '../../../components/ProductSelectCell'
import { useBranchStore } from '@/lib/useBranchStore'

interface LineItem {
  key: number
  productId: string | null
  unitId: string
  unitName: string
  quantity: number
  unitPrice: number
  discountAmount: number
  vatRate: number
}

let lineKey = 0
const makeEmptyLine = (): LineItem => ({
  key: ++lineKey,
  productId: null,
  unitId: '',
  unitName: '',
  quantity: 1,
  unitPrice: 0,
  discountAmount: 0,
  vatRate: 0,
})

export default function SalesOrderFormPage() {
  const { id } = useParams<{ id: string }>()
  const isEdit = !!id
  const navigate = useNavigate()
  const qc = useQueryClient()
  const { activeBranchId } = useBranchStore()

  const [customerId, setCustomerId] = useState<string | null>(null)
  const [customerSearch, setCustomerSearch] = useState('')
  const [debouncedCustomerSearch] = useDebouncedValue(customerSearch, 300)
  const [orderDate, setOrderDate] = useState<Date | null>(new Date())
  const [note, setNote] = useState('')
  const [lines, setLines] = useState<LineItem[]>([makeEmptyLine()])

  // Load existing order when editing
  const { data: existingOrder } = useQuery({
    queryKey: ['sales-order', id],
    queryFn: () => salesOrdersApi.getById(id!),
    enabled: isEdit,
  })

  useEffect(() => {
    if (existingOrder) {
      setCustomerId(existingOrder.customerId)
      setOrderDate(new Date(existingOrder.orderDate))
      setNote(existingOrder.note ?? '')
      setLines(
        existingOrder.lines.map((l) => ({
          key: ++lineKey,
          productId: l.productId,
          unitId: l.unitId,
          unitName: l.unitName,
          quantity: l.quantity,
          unitPrice: l.unitPrice,
          discountAmount: l.discountAmount,
          vatRate: l.vatRate,
        }))
      )
    }
  }, [existingOrder])

  // Customers — server-side debounced search
  const { data: customersData } = useQuery({
    queryKey: ['customers-search', debouncedCustomerSearch],
    queryFn: () => customersApi.list({ search: debouncedCustomerSearch || undefined, pageSize: 20 }),
  })
  // Keep selected customer label visible in edit mode
  const { data: selectedCustomer } = useQuery({
    queryKey: ['customer', customerId],
    queryFn: () => customersApi.getById(customerId!),
    enabled: !!customerId,
    staleTime: Infinity,
  })
  const customerOptions = useMemo(() => {
    const results = (customersData?.items ?? []).map((c) => ({ value: c.id, label: c.name }))
    if (customerId && selectedCustomer && !results.find((o) => o.value === customerId))
      results.unshift({ value: selectedCustomer.id, label: selectedCustomer.name })
    return results
  }, [customersData?.items, selectedCustomer, customerId])

  // Line operations
  const updateLine = <K extends keyof LineItem>(key: number, field: K, value: LineItem[K]) => {
    setLines((prev) => prev.map((l) => l.key === key ? { ...l, [field]: value } : l))
  }

  const handleProductSelect = (key: number, productId: string | null, product: ProductDto | null) => {
    if (!productId) {
      setLines((prev) => prev.map((l) => l.key === key ? { ...l, productId: null, unitId: '', unitName: '' } : l))
      return
    }
    setLines((prev) =>
      prev.map((l) =>
        l.key === key
          ? {
              ...l,
              productId,
              unitId: product?.baseUnitId ?? '',
              unitName: (product as any)?.baseUnit ?? '',
              unitPrice: product?.salePrice ?? 0,
            }
          : l
      )
    )
  }

  const addLine = () => setLines((prev) => [...prev, makeEmptyLine()])
  const removeLine = (key: number) => setLines((prev) => prev.filter((l) => l.key !== key))

  // Totals
  const lineTotal = (l: LineItem) => {
    const afterDiscount = l.quantity * l.unitPrice - l.discountAmount
    return afterDiscount + afterDiscount * (l.vatRate / 100)
  }

  const subtotal = lines.reduce((s, l) => s + l.quantity * l.unitPrice - l.discountAmount, 0)
  const totalTax = lines.reduce((s, l) => s + (l.quantity * l.unitPrice - l.discountAmount) * (l.vatRate / 100), 0)
  const grandTotal = subtotal + totalTax

  // Submit
  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!customerId) throw new Error('Vui lòng chọn khách hàng')
      if (!orderDate) throw new Error('Vui lòng chọn ngày đặt hàng')
      const validLines = lines.filter((l) => l.productId)
      if (validLines.length === 0) throw new Error('Vui lòng thêm ít nhất 1 sản phẩm')

      const body = {
        customerId,
        orderDate: orderDate.toISOString().slice(0, 10),
        note: note || undefined,
        branchId: activeBranchId ?? undefined,
        lines: validLines.map((l) => ({
          productId: l.productId!,
          unitId: l.unitId,
          quantity: l.quantity,
          unitPrice: l.unitPrice,
          discountAmount: l.discountAmount || undefined,
          vatRate: l.vatRate || undefined,
        })),
      }

      if (isEdit) {
        return salesOrdersApi.update(id!, body)
      }
      return salesOrdersApi.create(body)
    },
    onSuccess: (order) => {
      void qc.invalidateQueries({ queryKey: ['sales-orders'] })
      void qc.invalidateQueries({ queryKey: ['sales-order', id] })
      notifications.show({ color: 'green', message: isEdit ? 'Đã cập nhật đơn hàng' : 'Tạo đơn hàng thành công' })
      navigate(`/sales/orders/${order.id}`)
    },
    onError: (e: Error) => {
      notifications.show({ color: 'red', message: e.message })
    },
  })


  return (
    <Stack gap="lg">
      <PageHeader
        title={isEdit ? 'Sửa đơn bán hàng' : 'Tạo đơn bán hàng'}
        subtitle={isEdit ? `Chỉnh sửa đơn ${existingOrder?.code ?? ''}` : 'Nhập thông tin đơn bán hàng mới'}
        actions={
          <Group>
            <Button variant="default" leftSection={<IconArrowLeft size={16} />} onClick={() => navigate('/sales/orders')}>
              Quay lại
            </Button>
            <Button
              leftSection={<IconDeviceFloppy size={16} />}
              loading={saveMutation.isPending}
              onClick={() => saveMutation.mutate()}
            >
              Lưu
            </Button>
          </Group>
        }
      />

      <Paper withBorder p="md">
        <Stack gap="md">
          <Group grow>
            <Select
              label="Khách hàng"
              placeholder="Tìm khách hàng..."
              required
              searchable
              clearable
              data={customerOptions}
              value={customerId}
              onChange={setCustomerId}
              searchValue={customerSearch}
              onSearchChange={setCustomerSearch}
              filter={({ options }) => options}
              nothingFoundMessage="Không tìm thấy"
            />
            <DateInput
              label="Ngày đặt hàng"
              required
              value={orderDate}
              onChange={setOrderDate}
              valueFormat="DD/MM/YYYY"
            />
          </Group>
          <Textarea
            label="Ghi chú"
            placeholder="Ghi chú đơn hàng..."
            value={note}
            onChange={(e) => setNote(e.currentTarget.value)}
            rows={2}
          />
        </Stack>
      </Paper>

      <Paper withBorder p="md">
        <Stack gap="md">
          <Group justify="space-between">
            <Text fw={600}>Danh sách sản phẩm</Text>
            <Button size="xs" leftSection={<IconPlus size={14} />} onClick={addLine}>
              Thêm dòng
            </Button>
          </Group>

          <Table withTableBorder withColumnBorders>
            <Table.Thead>
              <Table.Tr>
                <Table.Th style={{ minWidth: 220 }}>Sản phẩm</Table.Th>
                <Table.Th style={{ width: 100 }}>Số lượng</Table.Th>
                <Table.Th style={{ width: 140 }}>Đơn giá</Table.Th>
                <Table.Th style={{ width: 100 }}>Chiết khấu</Table.Th>
                <Table.Th style={{ width: 100 }}>VAT (%)</Table.Th>
                <Table.Th style={{ width: 140 }}>Thành tiền</Table.Th>
                <Table.Th style={{ width: 48 }}></Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {lines.map((line) => (
                <Table.Tr key={line.key}>
                  <Table.Td>
                    <ProductSelectCell
                      value={line.productId}
                      onChange={(pid, product) => handleProductSelect(line.key, pid, product)}
                    />
                  </Table.Td>
                  <Table.Td>
                    <NumberInput
                      value={line.quantity}
                      onChange={(v) => updateLine(line.key, 'quantity', Number(v))}
                      min={1}
                      size="xs"
                    />
                  </Table.Td>
                  <Table.Td>
                    <NumberInput
                      value={line.unitPrice}
                      onChange={(v) => updateLine(line.key, 'unitPrice', Number(v))}
                      min={0}
                      thousandSeparator=","
                      size="xs"
                    />
                  </Table.Td>
                  <Table.Td>
                    <NumberInput
                      value={line.discountAmount}
                      onChange={(v) => updateLine(line.key, 'discountAmount', Number(v))}
                      min={0}
                      thousandSeparator=","
                      size="xs"
                    />
                  </Table.Td>
                  <Table.Td>
                    <NumberInput
                      value={line.vatRate}
                      onChange={(v) => updateLine(line.key, 'vatRate', Number(v))}
                      min={0}
                      max={100}
                      size="xs"
                    />
                  </Table.Td>
                  <Table.Td ta="right">
                    <Text size="sm">{formatVND(lineTotal(line))}</Text>
                  </Table.Td>
                  <Table.Td>
                    <ActionIcon color="red" variant="subtle" size="sm" onClick={() => removeLine(line.key)} disabled={lines.length <= 1}>
                      <IconTrash size={14} />
                    </ActionIcon>
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>

          <Divider />
          <Stack gap={4} align="flex-end">
            <Group>
              <Text size="sm" c="dimmed">Tổng trước thuế:</Text>
              <Text size="sm" w={140} ta="right">{formatVND(subtotal)}</Text>
            </Group>
            <Group>
              <Text size="sm" c="dimmed">Thuế VAT:</Text>
              <Text size="sm" w={140} ta="right">{formatVND(totalTax)}</Text>
            </Group>
            <Group>
              <Text fw={700}>Tổng cộng:</Text>
              <Text fw={700} c="green" w={140} ta="right">{formatVND(grandTotal)}</Text>
            </Group>
          </Stack>
        </Stack>
      </Paper>
    </Stack>
  )
}
