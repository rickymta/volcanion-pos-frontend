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
import { salesReturnsApi, invoicesApi } from '@pos/api-client'
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
}

let lineKey = 0
const makeEmptyLine = (): LineItem => ({
  key: ++lineKey,
  productId: null,
  unitId: '',
  unitName: '',
  quantity: 1,
  unitPrice: 0,
})

export default function SalesReturnFormPage() {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const { activeBranchId } = useBranchStore()
  const [searchParams] = useSearchParams()
  const invIdFromQuery = searchParams.get('invId')

  const [invoiceId, setInvoiceId] = useState<string | null>(invIdFromQuery)
  const [returnDate, setReturnDate] = useState<Date | null>(new Date())
  const [reason, setReason] = useState('')
  const [isRefunded, setIsRefunded] = useState(false)
  const [lines, setLines] = useState<LineItem[]>([makeEmptyLine()])
  const [idempotencyKey] = useState(() => crypto.randomUUID())

  // Load selected invoice detail to auto-fill lines
  const { data: selectedInvoice } = useQuery({
    queryKey: ['invoice', invoiceId],
    queryFn: () => invoicesApi.getById(invoiceId!),
    enabled: !!invoiceId,
  })

  useEffect(() => {
    if (selectedInvoice) {
      setLines(
        selectedInvoice.lines.map((l) => ({
          key: ++lineKey,
          productId: l.productId,
          unitId: l.unitId,
          unitName: l.unitName,
          quantity: l.quantity,
          unitPrice: l.unitPrice,
        }))
      )
    }
  }, [selectedInvoice])

  // Load existing confirmed SalesReturns for this invoice (for comparison columns)
  const { data: existingSRsMeta } = useQuery({
    queryKey: ['sales-returns-meta', { invoiceId, status: 'Confirmed' }],
    queryFn: () => salesReturnsApi.list({ invoiceId: invoiceId!, status: 'Confirmed', pageSize: 50 }),
    enabled: !!invoiceId,
  })

  // Load each SR detail in parallel to get lines (list API returns lines: [])
  const existingSRDetails = useQueries({
    queries: (existingSRsMeta?.items ?? []).map((sr) => ({
      queryKey: ['sales-return', sr.id],
      queryFn: () => salesReturnsApi.getById(sr.id),
    })),
  })

  // Map: productId → sold qty from invoice
  const invoiceLineQtyMap = useMemo(() => {
    const map: Record<string, number> = {}
    ;(selectedInvoice?.lines ?? []).forEach((l) => {
      map[l.productId] = (map[l.productId] ?? 0) + l.quantity
    })
    return map
  }, [selectedInvoice])

  // Map: productId → already returned qty in confirmed SRs
  const returnedQtyMap = useMemo(() => {
    const map: Record<string, number> = {}
    existingSRDetails.forEach((result) => {
      result.data?.lines.forEach((line) => {
        map[line.productId] = (map[line.productId] ?? 0) + line.quantity
      })
    })
    return map
  }, [existingSRDetails])

  // Load invoices for dropdown (first 50 confirmed invoices; user typically navigates here from invoice detail)
  const { data: invoicesData } = useQuery({
    queryKey: ['invoices-for-return'],
    queryFn: () => invoicesApi.list({ pageSize: 50 }),
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

  const totalAmount = lines.reduce((s, l) => s + l.quantity * l.unitPrice, 0)

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!invoiceId) throw new Error('Vui lòng chọn hóa đơn liên kết')
      if (!returnDate) throw new Error('Vui lòng chọn ngày trả hàng')
      const validLines = lines.filter((l) => l.productId)
      if (validLines.length === 0) throw new Error('Vui lòng thêm ít nhất 1 sản phẩm')

      return salesReturnsApi.create({
        invoiceId,
        returnDate: returnDate.toISOString().slice(0, 10),
        reason: reason || undefined,
        isRefunded,
        branchId: activeBranchId ?? undefined,
        lines: validLines.map((l) => ({
          productId: l.productId!,
          unitId: l.unitId,
          quantity: l.quantity,
          unitPrice: l.unitPrice,
        })),
      }, idempotencyKey)
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['sales-returns'] })
      notifications.show({ color: 'green', message: 'Tạo phiếu trả hàng thành công' })
      navigate('/sales/returns')
    },
    onError: (e: Error) => {
      notifications.show({ color: 'red', message: e.message })
    },
  })

  const invoiceOptions = (invoicesData?.items ?? []).map((inv) => ({
    value: inv.id,
    label: `${inv.code} — ${inv.customerName}`,
  }))

  return (
    <Stack gap="lg">
      <PageHeader
        title="Tạo phiếu trả hàng bán"
        subtitle="Ghi nhận hàng trả lại từ khách hàng"
        actions={
          <Group>
            <Button variant="default" leftSection={<IconArrowLeft size={16} />} onClick={() => navigate('/sales/returns')}>
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
              label="Hóa đơn liên kết"
              placeholder="Chọn hóa đơn..."
              required
              searchable
              clearable
              data={invoiceOptions}
              value={invoiceId}
              onChange={setInvoiceId}
              description={selectedInvoice ? `Liên kết: ${selectedInvoice.code} — ${selectedInvoice.customerName}` : undefined}
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
            label="Hoàn tiền ngay cho khách hàng"
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
                {selectedInvoice && (
                  <>
                    <Table.Th style={{ width: 80 }} ta="center">Theo HĐ</Table.Th>
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
                  {selectedInvoice && (() => {
                    const sold = line.productId ? (invoiceLineQtyMap[line.productId] ?? 0) : 0
                    const returned = line.productId ? (returnedQtyMap[line.productId] ?? 0) : 0
                    const remaining = sold - returned
                    const isOver = line.quantity > remaining && remaining > 0
                    return (
                      <>
                        <Table.Td ta="center">
                          <Text size="xs" c={sold > 0 ? undefined : 'dimmed'}>{sold > 0 ? sold : '—'}</Text>
                        </Table.Td>
                        <Table.Td ta="center">
                          <Text size="xs" c={returned > 0 ? 'orange' : 'dimmed'}>{returned > 0 ? returned : '0'}</Text>
                        </Table.Td>
                        <Table.Td ta="center">
                          <Tooltip label="Số lượng trả vượt quá số còn lại" disabled={!isOver}>
                            <Badge
                              size="sm"
                              color={remaining <= 0 ? 'red' : isOver ? 'orange' : 'green'}
                              variant="light"
                            >
                              {sold > 0 ? remaining : '—'}
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
                      value={line.unitPrice}
                      onChange={(v) => updateLine(line.key, 'unitPrice', Number(v) || 0)}
                      min={0}
                      thousandSeparator=","
                      size="xs"
                    />
                  </Table.Td>
                  <Table.Td ta="right">
                    <Text size="sm">{formatVND(line.quantity * line.unitPrice)}</Text>
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
            <Text fw={600}>Tổng tiền trả: <Text component="span" c="blue" fw={700}>{formatVND(totalAmount)}</Text></Text>
          </Group>
        </Stack>
      </Paper>
    </Stack>
  )
}
