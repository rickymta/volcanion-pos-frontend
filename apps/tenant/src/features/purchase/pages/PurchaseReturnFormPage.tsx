import { useState, useEffect, useMemo } from 'react'
import {
  Stack, Group, Button, NumberInput, Select, ActionIcon,
  Table, Paper, Text, Textarea, Checkbox, Badge, Tooltip,
} from '@mantine/core'
import { DateInput } from '@mantine/dates'
import { notifications } from '@mantine/notifications'
import { useMutation, useQuery, useQueries, useQueryClient } from '@tanstack/react-query'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { IconArrowLeft, IconPlus, IconTrash, IconDeviceFloppy } from '@tabler/icons-react'
import { PageHeader } from '@pos/ui'
import { purchaseReturnsApi, goodsReceiptsApi, purchaseOrdersApi } from '@pos/api-client'
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
  unitCost: number
}

let lineKey = 0
const makeEmptyLine = (): LineItem => ({
  key: ++lineKey,
  productId: null,
  unitId: '',
  unitName: '',
  quantity: 1,
  unitCost: 0,
})

export default function PurchaseReturnFormPage() {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const { activeBranchId } = useBranchStore()
  const [searchParams] = useSearchParams()
  const grIdFromQuery = searchParams.get('grId')

  const [goodsReceiptId, setGoodsReceiptId] = useState<string | null>(grIdFromQuery)
  const [returnDate, setReturnDate] = useState<Date | null>(new Date())
  const [reason, setReason] = useState('')
  const [isRefunded, setIsRefunded] = useState(false)
  const [lines, setLines] = useState<LineItem[]>([makeEmptyLine()])
  const [idempotencyKey] = useState(() => crypto.randomUUID())

  const { data: goodsReceiptsData } = useQuery({
    queryKey: ['goods-receipts', { status: 'Confirmed' }],
    queryFn: () => goodsReceiptsApi.list({ status: 'Confirmed', pageSize: 50 }),
  })

  // Load selected GR detail to auto-fill lines
  const { data: selectedGR } = useQuery({
    queryKey: ['goods-receipt', goodsReceiptId],
    queryFn: () => goodsReceiptsApi.getById(goodsReceiptId!),
    enabled: !!goodsReceiptId,
  })

  useEffect(() => {
    if (selectedGR) {
      setLines(
        selectedGR.lines.map((l) => ({
          key: ++lineKey,
          productId: l.productId,
          unitId: l.unitId,
          unitName: l.unitName,
          quantity: l.quantity,
          unitCost: l.unitCost,
        }))
      )
    }
  }, [selectedGR])

  // Chain: GR → PO → supplierId
  const { data: linkedPO } = useQuery({
    queryKey: ['purchase-order', selectedGR?.purchaseOrderId],
    queryFn: () => purchaseOrdersApi.getById(selectedGR!.purchaseOrderId!),
    enabled: !!selectedGR?.purchaseOrderId,
  })

  // Load existing confirmed PRs for this GR (get IDs, then load detail for lines)
  const { data: existingPRsMeta } = useQuery({
    queryKey: ['purchase-returns-meta', { goodsReceiptId, status: 'Confirmed' }],
    queryFn: () => purchaseReturnsApi.list({ goodsReceiptId: goodsReceiptId!, status: 'Confirmed', pageSize: 50 }),
    enabled: !!goodsReceiptId,
  })

  // Load each PR detail in parallel to get lines (list API returns lines: [])
  const existingPRDetails = useQueries({
    queries: (existingPRsMeta?.items ?? []).map((pr) => ({
      queryKey: ['purchase-return', pr.id],
      queryFn: () => purchaseReturnsApi.getById(pr.id),
    })),
  })

  // Map: productId → received qty from GR
  const grLineQtyMap = useMemo(() => {
    const map: Record<string, number> = {}
    ;(selectedGR?.lines ?? []).forEach((l) => {
      map[l.productId] = (map[l.productId] ?? 0) + l.quantity
    })
    return map
  }, [selectedGR])

  // Map: productId → already returned qty in confirmed PRs
  const returnedQtyMap = useMemo(() => {
    const map: Record<string, number> = {}
    existingPRDetails.forEach((result) => {
      result.data?.lines.forEach((line) => {
        map[line.productId] = (map[line.productId] ?? 0) + line.quantity
      })
    })
    return map
  }, [existingPRDetails])

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
          ? { ...l, productId, unitId: product?.baseUnitId ?? '', unitName: (product as any)?.baseUnit ?? '', unitCost: product?.costPrice ?? 0 }
          : l
      )
    )
  }

  const addLine = () => setLines((prev) => [...prev, makeEmptyLine()])
  const removeLine = (key: number) => setLines((prev) => prev.filter((l) => l.key !== key))

  const totalAmount = lines.reduce((s, l) => s + l.quantity * l.unitCost, 0)

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!goodsReceiptId) throw new Error('Vui lòng chọn phiếu nhập hàng liên kết')
      if (!returnDate) throw new Error('Vui lòng chọn ngày trả hàng')
      const supplierId = linkedPO?.supplierId
      if (!supplierId) throw new Error('Không xác định được nhà cung cấp, vui lòng đợi tải xong')
      const validLines = lines.filter((l) => l.productId)
      if (validLines.length === 0) throw new Error('Vui lòng thêm ít nhất 1 sản phẩm')
      return purchaseReturnsApi.create({
        goodsReceiptId,
        supplierId,
        returnDate: returnDate.toISOString().slice(0, 10),
        reason: reason || undefined,
        isRefunded,
        branchId: activeBranchId ?? undefined,
        lines: validLines.map((l) => ({
          productId: l.productId!,
          unitId: l.unitId,
          quantity: l.quantity,
          unitCost: l.unitCost,
        })),
      }, idempotencyKey)
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['purchase-returns'] })
      notifications.show({ color: 'green', message: 'Tạo phiếu trả hàng mua thành công' })
      navigate('/purchase/returns')
    },
    onError: (e: Error) => notifications.show({ color: 'red', message: e.message }),
  })

  const goodsReceiptOptions = (goodsReceiptsData?.items ?? []).map((r) => ({ value: r.id, label: `${r.code} — ${r.purchaseOrderCode ?? ''} (${r.warehouseName})` }))

  return (
    <Stack gap="lg">
      <PageHeader
        title="Tạo phiếu trả hàng mua"
        subtitle="Ghi nhận hàng trả lại cho nhà cung cấp"
        actions={
          <Group>
            <Button variant="default" leftSection={<IconArrowLeft size={16} />} onClick={() => navigate('/purchase/returns')}>
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
              label="Phiếu nhập hàng liên kết"
              placeholder="Chọn phiếu nhập hàng..."
              required
              searchable
              clearable
              data={goodsReceiptOptions}
              value={goodsReceiptId}
              onChange={setGoodsReceiptId}
            />
            <DateInput
              label="Ngày trả hàng"
              required
              value={returnDate}
              onChange={setReturnDate}
              valueFormat="DD/MM/YYYY"
            />
          </Group>
          <Textarea
            label="Lý do trả hàng"
            placeholder="Mô tả lý do..."
            value={reason}
            onChange={(e) => setReason(e.currentTarget.value)}
            rows={2}
          />
          <Checkbox
            label="Hoàn tiền ngay cho nhà cung cấp"
            checked={isRefunded}
            onChange={(e) => setIsRefunded(e.currentTarget.checked)}
          />
        </Stack>
      </Paper>

      <Paper withBorder p="md">
        <Stack gap="md">
          <Group justify="space-between">
            <Text fw={600}>Hàng trả lại</Text>
            <Button size="xs" leftSection={<IconPlus size={14} />} onClick={addLine}>
              Thêm dòng
            </Button>
          </Group>

          <Table withTableBorder withColumnBorders>
            <Table.Thead>
              <Table.Tr>
                <Table.Th style={{ minWidth: 220 }}>Sản phẩm</Table.Th>
                {selectedGR && (
                  <>
                    <Table.Th style={{ width: 80 }} ta="center">Theo GR</Table.Th>
                    <Table.Th style={{ width: 80 }} ta="center">Đã trả</Table.Th>
                    <Table.Th style={{ width: 80 }} ta="center">Còn lại</Table.Th>
                  </>
                )}
                <Table.Th style={{ width: 100 }}>Số lượng</Table.Th>
                <Table.Th style={{ width: 140 }}>Đơn giá</Table.Th>
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
                  {selectedGR && (() => {
                    const received = line.productId ? (grLineQtyMap[line.productId] ?? 0) : 0
                    const returned = line.productId ? (returnedQtyMap[line.productId] ?? 0) : 0
                    const remaining = received - returned
                    const isOver = line.quantity > remaining && remaining > 0
                    return (
                      <>
                        <Table.Td ta="center">
                          <Text size="xs" c={received > 0 ? undefined : 'dimmed'}>{received > 0 ? received : '—'}</Text>
                        </Table.Td>
                        <Table.Td ta="center">
                          <Text size="xs" c={returned > 0 ? 'orange' : 'dimmed'}>{returned > 0 ? returned : '0'}</Text>
                        </Table.Td>
                        <Table.Td ta="center">
                          <Tooltip
                            label="Số lượng trả vượt quá số còn lại"
                            disabled={!isOver}
                          >
                            <Badge
                              size="sm"
                              color={remaining <= 0 ? 'red' : isOver ? 'orange' : 'green'}
                              variant="light"
                            >
                              {received > 0 ? remaining : '—'}
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

          <Group justify="flex-end">
            <Text fw={600}>
              Tổng tiền hoàn trả:{' '}
              <Text component="span" c="blue" fw={700}>{formatVND(totalAmount)}</Text>
            </Text>
          </Group>
        </Stack>
      </Paper>
    </Stack>
  )
}
