import { useState, useEffect } from 'react'
import {
  Stack, Group, Button, NumberInput, Select, ActionIcon,
  Table, Paper, Text, Divider, Textarea, TextInput,
} from '@mantine/core'
import { DateInput } from '@mantine/dates'
import { notifications } from '@mantine/notifications'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { IconArrowLeft, IconPlus, IconTrash, IconDeviceFloppy } from '@tabler/icons-react'
import { PageHeader } from '@pos/ui'
import { goodsReceiptsApi, purchaseOrdersApi, warehousesApi, productsApi } from '@pos/api-client'
import type { ProductDto } from '@pos/api-client'
import { formatVND } from '@pos/utils'

interface LineItem {
  key: number
  productId: string | null
  unitId: string
  unitName: string
  quantity: number
  unitCost: number
  batchNumber: string
  expiryDate: Date | null
}

let lineKey = 0
const makeEmptyLine = (): LineItem => ({
  key: ++lineKey,
  productId: null,
  unitId: '',
  unitName: '',
  quantity: 1,
  unitCost: 0,
  batchNumber: '',
  expiryDate: null,
})

export default function GoodsReceiptFormPage() {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [searchParams] = useSearchParams()
  const poIdFromQuery = searchParams.get('poId')

  const [warehouseId, setWarehouseId] = useState<string | null>(null)
  const [purchaseOrderId, setPurchaseOrderId] = useState<string | null>(poIdFromQuery)
  const [receiptDate, setReceiptDate] = useState<Date | null>(new Date())
  const [note, setNote] = useState('')
  const [lines, setLines] = useState<LineItem[]>([makeEmptyLine()])

  // Load selected PO to auto-fill lines
  const { data: selectedPO } = useQuery({
    queryKey: ['purchase-order', purchaseOrderId],
    queryFn: () => purchaseOrdersApi.getById(purchaseOrderId!),
    enabled: !!purchaseOrderId,
  })

  useEffect(() => {
    if (selectedPO) {
      setLines(
        selectedPO.lines.map((l) => ({
          key: ++lineKey,
          productId: l.productId,
          unitId: l.unitId,
          unitName: l.unitName,
          quantity: l.quantity,
          unitCost: l.unitPrice,
          batchNumber: '',
          expiryDate: null,
        }))
      )
    }
  }, [selectedPO])

  // Load warehouses, products
  const { data: warehousesData } = useQuery({
    queryKey: ['warehouses-all'],
    queryFn: () => warehousesApi.list(),
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
              unitCost: product?.costPrice ?? 0,
            }
          : l
      )
    )
  }

  const addLine = () => setLines((prev) => [...prev, makeEmptyLine()])
  const removeLine = (key: number) => setLines((prev) => prev.filter((l) => l.key !== key))

  const totalAmount = lines.reduce((s, l) => s + l.quantity * l.unitCost, 0)

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!warehouseId) throw new Error('Vui lòng chọn kho nhập')
      if (!receiptDate) throw new Error('Vui lòng chọn ngày nhập')
      const validLines = lines.filter((l) => l.productId)
      if (validLines.length === 0) throw new Error('Vui lòng thêm ít nhất 1 sản phẩm')

      return goodsReceiptsApi.create({
        purchaseOrderId: purchaseOrderId ?? undefined,
        warehouseId,
        receiptDate: receiptDate.toISOString().slice(0, 10),
        note: note || undefined,
        lines: validLines.map((l) => ({
          productId: l.productId!,
          unitId: l.unitId,
          quantity: l.quantity,
          unitCost: l.unitCost,
          batchNumber: l.batchNumber || undefined,
          expiryDate: l.expiryDate ? l.expiryDate.toISOString().slice(0, 10) : undefined,
        })),
      })
    },
    onSuccess: (receipt) => {
      void qc.invalidateQueries({ queryKey: ['goods-receipts'] })
      notifications.show({ color: 'green', message: 'Tạo phiếu nhập hàng thành công' })
      navigate(`/purchase/receipts/${receipt.id}`)
    },
    onError: (e: Error) => {
      notifications.show({ color: 'red', message: e.message })
    },
  })

  const productOptions = (productsData?.items ?? []).map((p) => ({ value: p.id, label: p.name + ' (' + p.code + ')' }))
  const warehouseOptions = (warehousesData ?? []).map((w) => ({ value: w.id, label: w.name }))

  return (
    <Stack gap="lg">
      <PageHeader
        title="Tạo phiếu nhập hàng"
        subtitle="Nhập hàng vào kho, có thể liên kết đơn mua hàng"
        actions={
          <Group>
            <Button variant="default" leftSection={<IconArrowLeft size={16} />} onClick={() => navigate('/purchase/receipts')}>
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
              label="Kho nhập"
              placeholder="Chọn kho..."
              required
              data={warehouseOptions}
              value={warehouseId}
              onChange={setWarehouseId}
            />
            <DateInput
              label="Ngày nhập"
              required
              value={receiptDate}
              onChange={setReceiptDate}
              valueFormat="DD/MM/YYYY"
            />
          </Group>
          <Group grow>
            <Select
              label="Đơn mua hàng liên kết (tùy chọn)"
              placeholder="Chọn đơn mua hàng để điền tự động..."
              searchable
              clearable
              data={[]} // Would load PO list — kept minimal for simplicity
              value={purchaseOrderId}
              onChange={setPurchaseOrderId}
              description={selectedPO ? `Liên kết với đơn ${selectedPO.code}` : undefined}
            />
          </Group>
          <Textarea
            label="Ghi chú"
            placeholder="Ghi chú phiếu nhập..."
            value={note}
            onChange={(e) => setNote(e.currentTarget.value)}
            rows={2}
          />
        </Stack>
      </Paper>

      <Paper withBorder p="md">
        <Stack gap="md">
          <Group justify="space-between">
            <Text fw={600}>Danh sách sản phẩm nhập</Text>
            <Button size="xs" leftSection={<IconPlus size={14} />} onClick={addLine}>
              Thêm dòng
            </Button>
          </Group>

          <Table withTableBorder withColumnBorders>
            <Table.Thead>
              <Table.Tr>
                <Table.Th style={{ minWidth: 200 }}>Sản phẩm</Table.Th>
                <Table.Th style={{ width: 90 }}>Số lượng</Table.Th>
                <Table.Th style={{ width: 130 }}>Đơn giá vốn</Table.Th>
                <Table.Th style={{ width: 130 }}>Số lô</Table.Th>
                <Table.Th style={{ width: 130 }}>Hạn sử dụng</Table.Th>
                <Table.Th style={{ width: 130 }}>Thành tiền</Table.Th>
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
                      value={line.unitCost}
                      onChange={(v) => updateLine(line.key, 'unitCost', Number(v) || 0)}
                      min={0}
                      thousandSeparator=","
                      size="xs"
                    />
                  </Table.Td>
                  <Table.Td>
                    <TextInput
                      value={line.batchNumber}
                      onChange={(e) => updateLine(line.key, 'batchNumber', e.currentTarget.value)}
                      placeholder="Số lô..."
                      size="xs"
                    />
                  </Table.Td>
                  <Table.Td>
                    <DateInput
                      value={line.expiryDate}
                      onChange={(v) => updateLine(line.key, 'expiryDate', v)}
                      valueFormat="DD/MM/YYYY"
                      placeholder="HSD..."
                      clearable
                      size="xs"
                    />
                  </Table.Td>
                  <Table.Td ta="right">
                    <Text size="sm">{formatVND(line.quantity * line.unitCost)}</Text>
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
        <Paper withBorder p="md" w={260}>
          <Stack gap="xs">
            <Divider />
            <Group justify="space-between">
              <Text fw={700}>Tổng tiền nhập</Text>
              <Text fw={700} size="lg" c="blue">{formatVND(totalAmount)}</Text>
            </Group>
          </Stack>
        </Paper>
      </Group>
    </Stack>
  )
}
