import { useState } from 'react'
import {
  Stack, Group, Button, NumberInput, Select, ActionIcon,
  Table, Paper, Text, Textarea, Checkbox,
} from '@mantine/core'
import { DateInput } from '@mantine/dates'
import { notifications } from '@mantine/notifications'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { IconArrowLeft, IconPlus, IconTrash, IconDeviceFloppy } from '@tabler/icons-react'
import { PageHeader } from '@pos/ui'
import { salesReturnsApi, invoicesApi, productsApi } from '@pos/api-client'
import type { ProductDto } from '@pos/api-client'
import { formatVND } from '@pos/utils'

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

  const [invoiceId, setInvoiceId] = useState<string | null>(null)
  const [returnDate, setReturnDate] = useState<Date | null>(new Date())
  const [reason, setReason] = useState('')
  const [isRefunded, setIsRefunded] = useState(false)
  const [lines, setLines] = useState<LineItem[]>([makeEmptyLine()])

  // Load invoices (unpaid / partially paid for refund context)
  const { data: invoicesData } = useQuery({
    queryKey: ['invoices-all'],
    queryFn: () => invoicesApi.list({ pageSize: 500 }),
  })

  const [productSearch, setProductSearch] = useState('')
  const { data: productsData } = useQuery({
    queryKey: ['products-search', productSearch],
    queryFn: () => productsApi.list({ search: productSearch, pageSize: 50 }),
  })

  const productMap: Record<string, ProductDto> = {}
  ;(productsData?.items ?? []).forEach((p) => { productMap[p.id] = p as ProductDto })

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
              unitPrice: product?.sellingPrice ?? 0,
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
        lines: validLines.map((l) => ({
          productId: l.productId!,
          unitId: l.unitId,
          quantity: l.quantity,
          unitPrice: l.unitPrice,
        })),
      })
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
  const productOptions = (productsData?.items ?? []).map((p) => ({ value: p.id, label: p.name + ' (' + p.code + ')' }))

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
