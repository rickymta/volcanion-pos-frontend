import { useState } from 'react'
import {
  Stack, Group, Button, NumberInput, Select, ActionIcon,
  Table, Paper, Text, Textarea, Alert,
} from '@mantine/core'
import { DateInput } from '@mantine/dates'
import { notifications } from '@mantine/notifications'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { IconArrowLeft, IconPlus, IconTrash, IconDeviceFloppy, IconAlertCircle } from '@tabler/icons-react'
import { PageHeader } from '@pos/ui'
import { inventoryApi, warehousesApi } from '@pos/api-client'
import type { ProductDto } from '@pos/api-client'
import { ProductSelectCell } from '../../../components/ProductSelectCell'
import { useBranchStore } from '@/lib/useBranchStore'

interface LineItem {
  key: number
  productId: string | null
  unitId: string
  unitName: string
  quantity: number
}

let lineKey = 0
const makeEmptyLine = (): LineItem => ({
  key: ++lineKey,
  productId: null,
  unitId: '',
  unitName: '',
  quantity: 1,
})

export default function StockTransferFormPage() {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const { activeBranchId } = useBranchStore()

  const [idempotencyKey] = useState(() => crypto.randomUUID())
  const [fromWarehouseId, setFromWarehouseId] = useState<string | null>(null)
  const [toWarehouseId, setToWarehouseId] = useState<string | null>(null)
  const [transferDate, setTransferDate] = useState<Date | null>(new Date())
  const [note, setNote] = useState('')
  const [lines, setLines] = useState<LineItem[]>([makeEmptyLine()])

  const { data: warehousesData } = useQuery({
    queryKey: ['warehouses-all'],
    queryFn: () => warehousesApi.list({ pageSize: 50 }),
  })

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
          ? { ...l, productId, unitId: product?.baseUnitId ?? '', unitName: (product as any)?.baseUnit ?? '' }
          : l
      )
    )
  }

  const addLine = () => setLines((prev) => [...prev, makeEmptyLine()])
  const removeLine = (key: number) => setLines((prev) => prev.filter((l) => l.key !== key))

  const sameWarehouse = fromWarehouseId && toWarehouseId && fromWarehouseId === toWarehouseId

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!fromWarehouseId) throw new Error('Vui lòng chọn kho xuất')
      if (!toWarehouseId) throw new Error('Vui lòng chọn kho nhập')
      if (fromWarehouseId === toWarehouseId) throw new Error('Kho xuất và kho nhập không được giống nhau')
      if (!transferDate) throw new Error('Vui lòng chọn ngày chuyển kho')
      const validLines = lines.filter((l) => l.productId)
      if (validLines.length === 0) throw new Error('Vui lòng thêm ít nhất 1 sản phẩm')
      return inventoryApi.createTransfer({
        fromWarehouseId,
        toWarehouseId,
        transferDate: transferDate.toISOString().slice(0, 10),
        note: note || undefined,
        branchId: activeBranchId ?? undefined,
        lines: validLines.map((l) => ({
          productId: l.productId!,
          unitId: l.unitId,
          quantity: l.quantity,
        })),
      }, idempotencyKey)
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['stock-transfers'] })
      notifications.show({ color: 'green', message: 'Tạo phiếu chuyển kho thành công' })
      navigate('/inventory/transfers')
    },
    onError: (e: Error) => notifications.show({ color: 'red', message: e.message }),
  })

  const warehouseOptions = (warehousesData?.items ?? []).map((w) => ({ value: w.id, label: w.name }))

  return (
    <Stack gap="lg">
      <PageHeader
        title="Tạo phiếu chuyển kho"
        subtitle="Chuyển hàng hóa giữa các kho"
        actions={
          <Group>
            <Button variant="default" leftSection={<IconArrowLeft size={16} />} onClick={() => navigate('/inventory/transfers')}>
              Quay lại
            </Button>
            <Button
              leftSection={<IconDeviceFloppy size={16} />}
              loading={saveMutation.isPending}
              disabled={!!sameWarehouse}
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
              label="Kho xuất (nguồn)"
              placeholder="Chọn kho xuất..."
              required
              data={warehouseOptions}
              value={fromWarehouseId}
              onChange={setFromWarehouseId}
            />
            <Select
              label="Kho nhập (đích)"
              placeholder="Chọn kho nhập..."
              required
              data={warehouseOptions}
              value={toWarehouseId}
              onChange={setToWarehouseId}
            />
            <DateInput
              label="Ngày chuyển kho"
              required
              value={transferDate}
              onChange={setTransferDate}
              valueFormat="DD/MM/YYYY"
            />
          </Group>

          {sameWarehouse && (
            <Alert color="red" icon={<IconAlertCircle size={16} />}>
              Kho xuất và kho nhập không được trùng nhau.
            </Alert>
          )}

          <Textarea
            label="Ghi chú"
            placeholder="Lý do chuyển kho, ghi chú..."
            value={note}
            onChange={(e) => setNote(e.currentTarget.value)}
            rows={2}
          />
        </Stack>
      </Paper>

      <Paper withBorder p="md">
        <Stack gap="md">
          <Group justify="space-between">
            <Text fw={600}>Danh sách sản phẩm chuyển</Text>
            <Button size="xs" leftSection={<IconPlus size={14} />} onClick={addLine}>
              Thêm dòng
            </Button>
          </Group>

          <Table withTableBorder withColumnBorders>
            <Table.Thead>
              <Table.Tr>
                <Table.Th style={{ minWidth: 240 }}>Sản phẩm</Table.Th>
                <Table.Th style={{ width: 120 }}>Đơn vị</Table.Th>
                <Table.Th style={{ width: 120 }}>Số lượng</Table.Th>
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
                    <Text size="sm" c="dimmed">{line.unitName || '—'}</Text>
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

          <Text size="sm" c="dimmed">
            Tổng {lines.filter((l) => l.productId).length} sản phẩm —{' '}
            {lines.filter((l) => l.productId).reduce((s, l) => s + l.quantity, 0).toLocaleString()} đơn vị
          </Text>
        </Stack>
      </Paper>
    </Stack>
  )
}
