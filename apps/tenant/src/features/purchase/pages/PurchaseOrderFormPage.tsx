import { useState, useEffect } from 'react'
import {
  Stack, Group, Button, NumberInput, Select, ActionIcon,
  Table, Paper, Text, Divider, Textarea,
} from '@mantine/core'
import { DateInput } from '@mantine/dates'
import { notifications } from '@mantine/notifications'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate, useParams } from 'react-router-dom'
import { IconArrowLeft, IconPlus, IconTrash, IconDeviceFloppy } from '@tabler/icons-react'
import { PageHeader } from '@pos/ui'
import { purchaseOrdersApi, suppliersApi, productsApi } from '@pos/api-client'
import type { ProductDto } from '@pos/api-client'
import { formatVND } from '@pos/utils'

interface LineItem {
  key: number
  productId: string | null
  unitId: string
  unitName: string
  quantity: number
  unitPrice: number
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
  vatRate: 0,
})

export default function PurchaseOrderFormPage() {
  const { id } = useParams<{ id: string }>()
  const isEdit = !!id
  const navigate = useNavigate()
  const qc = useQueryClient()

  const [supplierId, setSupplierId] = useState<string | null>(null)
  const [orderDate, setOrderDate] = useState<Date | null>(new Date())
  const [note, setNote] = useState('')
  const [lines, setLines] = useState<LineItem[]>([makeEmptyLine()])

  // Load existing order when editing
  const { data: existingOrder } = useQuery({
    queryKey: ['purchase-order', id],
    queryFn: () => purchaseOrdersApi.getById(id!),
    enabled: isEdit,
  })

  useEffect(() => {
    if (existingOrder) {
      setSupplierId(existingOrder.supplierId)
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
          vatRate: l.vatRate,
        }))
      )
    }
  }, [existingOrder])

  // Load suppliers & products
  const { data: suppliersData } = useQuery({
    queryKey: ['suppliers-all'],
    queryFn: () => suppliersApi.list({ pageSize: 500 }),
  })

  const [productSearch, setProductSearch] = useState('')
  const { data: productsData } = useQuery({
    queryKey: ['products-search', productSearch],
    queryFn: () => productsApi.list({ search: productSearch, pageSize: 50 }),
  })

  const productMap: Record<string, ProductDto> = {}
  ;(productsData?.items ?? []).forEach((p) => { productMap[p.id] = p as ProductDto })

  // Line operations
  const updateLine = <K extends keyof LineItem>(key: number, field: K, value: LineItem[K]) => {
    setLines((prev) => prev.map((l) => l.key === key ? { ...l, [field]: value } : l))
  }

  const handleProductSelect = (key: number, productId: string | null) => {
    if (!productId) {
      setLines((prev) => prev.map((l) => l.key === key ? { ...l, productId: null, unitId: '', unitName: '' } : l))
      return
    }
    const product = productMap[productId]
    setLines((prev) =>
      prev.map((l) =>
        l.key === key
          ? {
              ...l,
              productId,
              unitId: product?.baseUnitId ?? '',
              unitName: (product as any)?.baseUnit ?? '',
              unitPrice: product?.costPrice ?? 0,
            }
          : l
      )
    )
  }

  const addLine = () => setLines((prev) => [...prev, makeEmptyLine()])
  const removeLine = (key: number) => setLines((prev) => prev.filter((l) => l.key !== key))

  // Totals
  const lineTotal = (l: LineItem) => {
    const base = l.quantity * l.unitPrice
    return base * (1 + l.vatRate / 100)
  }

  const subtotal = lines.reduce((s, l) => s + l.quantity * l.unitPrice, 0)
  const totalTax = lines.reduce((s, l) => s + l.quantity * l.unitPrice * (l.vatRate / 100), 0)
  const grandTotal = subtotal + totalTax

  // Submit
  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!supplierId) throw new Error('Vui lòng chọn nhà cung cấp')
      if (!orderDate) throw new Error('Vui lòng chọn ngày đặt hàng')
      const validLines = lines.filter((l) => l.productId)
      if (validLines.length === 0) throw new Error('Vui lòng thêm ít nhất 1 sản phẩm')

      const body = {
        supplierId,
        orderDate: orderDate.toISOString().slice(0, 10),
        note: note || undefined,
        lines: validLines.map((l) => ({
          productId: l.productId!,
          unitId: l.unitId,
          quantity: l.quantity,
          unitPrice: l.unitPrice,
          vatRate: l.vatRate || undefined,
        })),
      }

      if (isEdit) {
        return purchaseOrdersApi.update(id!, body)
      }
      return purchaseOrdersApi.create(body)
    },
    onSuccess: (order) => {
      void qc.invalidateQueries({ queryKey: ['purchase-orders'] })
      void qc.invalidateQueries({ queryKey: ['purchase-order', id] })
      notifications.show({ color: 'green', message: isEdit ? 'Đã cập nhật đơn mua hàng' : 'Tạo đơn mua hàng thành công' })
      navigate(`/purchase/orders/${order.id}`)
    },
    onError: (e: Error) => {
      notifications.show({ color: 'red', message: e.message })
    },
  })

  const productOptions = (productsData?.items ?? []).map((p) => ({ value: p.id, label: p.name + ' (' + p.code + ')' }))
  const supplierOptions = (suppliersData?.items ?? []).map((s) => ({ value: s.id, label: s.name }))

  return (
    <Stack gap="lg">
      <PageHeader
        title={isEdit ? 'Sửa đơn mua hàng' : 'Tạo đơn mua hàng'}
        subtitle={isEdit ? `Chỉnh sửa đơn ${existingOrder?.code ?? ''}` : 'Nhập thông tin đơn mua hàng mới'}
        actions={
          <Group>
            <Button variant="default" leftSection={<IconArrowLeft size={16} />} onClick={() => navigate('/purchase/orders')}>
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
              label="Nhà cung cấp"
              placeholder="Chọn nhà cung cấp..."
              required
              searchable
              clearable
              data={supplierOptions}
              value={supplierId}
              onChange={setSupplierId}
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
                <Table.Th style={{ width: 140 }}>Đơn giá mua</Table.Th>
                <Table.Th style={{ width: 100 }}>VAT (%)</Table.Th>
                <Table.Th style={{ width: 140 }}>Thành tiền</Table.Th>
                <Table.Th style={{ width: 48 }}></Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {lines.map((line) => (
                <Table.Tr key={line.key}>
                  <Table.Td>
                    <Select
                      placeholder="Chọn sản phẩm..."
                      searchable
                      data={productOptions}
                      value={line.productId}
                      onChange={(v) => handleProductSelect(line.key, v)}
                      onSearchChange={setProductSearch}
                      size="xs"
                    />
                  </Table.Td>
                  <Table.Td>
                    <NumberInput
                      value={line.quantity}
                      onChange={(v) => updateLine(line.key, 'quantity', Number(v) || 1)}
                      min={1}
                      size="xs"
                    />
                  </Table.Td>
                  <Table.Td>
                    <NumberInput
                      value={line.unitPrice}
                      onChange={(v) => updateLine(line.key, 'unitPrice', Number(v) || 0)}
                      min={0}
                      thousandSeparator=","
                      size="xs"
                    />
                  </Table.Td>
                  <Table.Td>
                    <NumberInput
                      value={line.vatRate}
                      onChange={(v) => updateLine(line.key, 'vatRate', Number(v) || 0)}
                      min={0}
                      max={100}
                      size="xs"
                    />
                  </Table.Td>
                  <Table.Td ta="right">
                    <Text size="sm">{formatVND(lineTotal(line))}</Text>
                  </Table.Td>
                  <Table.Td>
                    <ActionIcon
                      color="red"
                      variant="subtle"
                      size="sm"
                      disabled={lines.length === 1}
                      onClick={() => removeLine(line.key)}
                    >
                      <IconTrash size={14} />
                    </ActionIcon>
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </Stack>
      </Paper>

      <Group justify="flex-end">
        <Paper withBorder p="md" w={280}>
          <Stack gap="xs">
            <Group justify="space-between">
              <Text size="sm" c="dimmed">Tạm tính</Text>
              <Text size="sm">{formatVND(subtotal)}</Text>
            </Group>
            <Group justify="space-between">
              <Text size="sm" c="dimmed">Thuế VAT</Text>
              <Text size="sm">{formatVND(totalTax)}</Text>
            </Group>
            <Divider />
            <Group justify="space-between">
              <Text fw={700}>Tổng cộng</Text>
              <Text fw={700} size="lg" c="blue">{formatVND(grandTotal)}</Text>
            </Group>
          </Stack>
        </Paper>
      </Group>
    </Stack>
  )
}
