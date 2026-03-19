import { useState, useEffect, useMemo } from 'react'
import {
  Stack, Group, Button, NumberInput, Select, ActionIcon,
  Table, Paper, Text, Divider, Textarea, TextInput, Badge, Tooltip,
} from '@mantine/core'
import { DateInput } from '@mantine/dates'
import { notifications } from '@mantine/notifications'
import { useMutation, useQuery, useQueries, useQueryClient } from '@tanstack/react-query'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { IconArrowLeft, IconPlus, IconTrash, IconDeviceFloppy } from '@tabler/icons-react'
import { PageHeader } from '@pos/ui'
import { goodsReceiptsApi, purchaseOrdersApi, warehousesApi } from '@pos/api-client'
import type { ProductDto } from '@pos/api-client'
import { formatVND } from '@pos/utils'
import { ProductSelectCell } from '../../../components/ProductSelectCell'

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
  const [idempotencyKey] = useState(() => crypto.randomUUID())

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

  // Load PO Confirmed for dropdown
  const { data: confirmedPOs } = useQuery({
    queryKey: ['purchase-orders', { status: 'Confirmed' }],
    queryFn: () => purchaseOrdersApi.list({ status: 'Confirmed', pageSize: 50 }),
  })

  // Load GRs already confirmed for this PO (get IDs, then load detail for lines)
  const { data: existingGRsMeta } = useQuery({
    queryKey: ['goods-receipts-meta', { purchaseOrderId, status: 'Confirmed' }],
    queryFn: () => goodsReceiptsApi.list({ purchaseOrderId: purchaseOrderId!, status: 'Confirmed', pageSize: 50 }),
    enabled: !!purchaseOrderId,
  })

  // Load each GR detail in parallel to get lines (list API returns lines: [])
  const existingGRDetails = useQueries({
    queries: (existingGRsMeta?.items ?? []).map((gr) => ({
      queryKey: ['goods-receipt', gr.id],
      queryFn: () => goodsReceiptsApi.getById(gr.id),
    })),
  })

  // Map: productId → ordered qty from PO
  const poLineQtyMap = useMemo(() => {
    const map: Record<string, number> = {}
    ;(selectedPO?.lines ?? []).forEach((l) => {
      map[l.productId] = (map[l.productId] ?? 0) + l.quantity
    })
    return map
  }, [selectedPO])

  // Map: productId → already received qty in confirmed GRs
  const receivedQtyMap = useMemo(() => {
    const map: Record<string, number> = {}
    existingGRDetails.forEach((result) => {
      result.data?.lines.forEach((line) => {
        map[line.productId] = (map[line.productId] ?? 0) + line.quantity
      })
    })
    return map
  }, [existingGRDetails])

  const poOptions = (confirmedPOs?.items ?? []).map((po) => ({
    value: po.id,
    label: `${po.code} — ${po.supplierName}`,
  }))

  // Load warehouses (small reference data)
  const { data: warehousesData } = useQuery({
    queryKey: ['warehouses-all'],
    queryFn: () => warehousesApi.list({ pageSize: 50 }),
  })

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
      if (!purchaseOrderId) throw new Error('Vui lòng chọn đơn mua hàng')
      if (!warehouseId) throw new Error('Vui lòng chọn kho nhập')
      if (!receiptDate) throw new Error('Vui lòng chọn ngày nhập')
      const validLines = lines.filter((l) => l.productId)
      if (validLines.length === 0) throw new Error('Vui lòng thêm ít nhất 1 sản phẩm')

      return goodsReceiptsApi.create({
        purchaseOrderId,
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
      }, idempotencyKey)
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

  const warehouseOptions = (warehousesData?.items ?? []).map((w) => ({ value: w.id, label: w.name }))

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
              label="Đơn mua hàng"
              placeholder="Chọn đơn mua hàng để điền tự động..."
              required
              searchable
              clearable
              data={poOptions}
              value={purchaseOrderId}
              onChange={setPurchaseOrderId}
              description={selectedPO ? `Liên kết với đơn ${selectedPO.code} — ${selectedPO.supplierName}` : undefined}
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
                {selectedPO && (
                  <>
                    <Table.Th style={{ width: 80 }} ta="center">Theo PO</Table.Th>
                    <Table.Th style={{ width: 80 }} ta="center">Đã nhập</Table.Th>
                    <Table.Th style={{ width: 80 }} ta="center">Còn lại</Table.Th>
                  </>
                )}
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
                    <ProductSelectCell
                      value={line.productId}
                      onChange={(pid, product) => handleProductSelect(line.key, pid, product)}
                    />
                  </Table.Td>
                  {selectedPO && (() => {
                    const ordered = line.productId ? (poLineQtyMap[line.productId] ?? 0) : 0
                    const received = line.productId ? (receivedQtyMap[line.productId] ?? 0) : 0
                    const remaining = ordered - received
                    const isOver = line.quantity > remaining && remaining > 0
                    return (
                      <>
                        <Table.Td ta="center">
                          <Text size="xs" c={ordered > 0 ? undefined : 'dimmed'}>{ordered > 0 ? ordered : '—'}</Text>
                        </Table.Td>
                        <Table.Td ta="center">
                          <Text size="xs" c={received > 0 ? 'orange' : 'dimmed'}>{received > 0 ? received : '0'}</Text>
                        </Table.Td>
                        <Table.Td ta="center">
                          <Tooltip
                            label="Số lượng nhập vượt quá còn lại trong PO"
                            disabled={!isOver}
                          >
                            <Badge
                              size="sm"
                              color={remaining <= 0 ? 'red' : isOver ? 'orange' : 'green'}
                              variant="light"
                            >
                              {ordered > 0 ? remaining : '—'}
                            </Badge>
                          </Tooltip>
                        </Table.Td>
                      </>
                    )
                  })()}
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
