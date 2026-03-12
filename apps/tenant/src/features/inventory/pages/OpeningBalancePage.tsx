import { useState } from 'react'
import {
  Stack, Group, Button, Select, Text, ActionIcon, NumberInput,
  Table, Badge, Alert,
} from '@mantine/core'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { IconPlus, IconTrash, IconAlertCircle } from '@tabler/icons-react'
import { notifications } from '@mantine/notifications'
import { PageHeader } from '@pos/ui'
import { inventoryApi, warehousesApi, productsApi } from '@pos/api-client'

interface BalanceLine {
  productId: string
  productName: string
  quantity: number
  unitCost: number
}

export default function OpeningBalancePage() {
  const qc = useQueryClient()
  const [warehouseId, setWarehouseId] = useState<string | null>(null)
  const [lines, setLines] = useState<BalanceLine[]>([])
  const [addProductId, setAddProductId] = useState<string | null>(null)

  const { data: warehouses } = useQuery({
    queryKey: ['warehouses'],
    queryFn: () => warehousesApi.list(),
  })

  const { data: products } = useQuery({
    queryKey: ['products-all'],
    queryFn: () => productsApi.list({ pageSize: 500 }),
  })

  const productOptions = (products?.items ?? []).map((p) => ({
    value: p.id,
    label: `${p.code} — ${p.name}`,
  }))

  function addLine() {
    if (!addProductId) return
    if (lines.find((l) => l.productId === addProductId)) {
      notifications.show({ color: 'yellow', message: 'Sản phẩm đã được thêm' })
      return
    }
    const product = (products?.items ?? []).find((p) => p.id === addProductId)
    if (!product) return
    setLines((prev) => [
      ...prev,
      { productId: product.id, productName: `${product.code} — ${product.name}`, quantity: 0, unitCost: product.costPrice ?? 0 },
    ])
    setAddProductId(null)
  }

  function removeLine(productId: string) {
    setLines((prev) => prev.filter((l) => l.productId !== productId))
  }

  function updateLine(productId: string, field: 'quantity' | 'unitCost', value: number) {
    setLines((prev) =>
      prev.map((l) => (l.productId === productId ? { ...l, [field]: value } : l)),
    )
  }

  const saveMutation = useMutation({
    mutationFn: () => {
      if (!warehouseId) throw new Error('Chọn kho nhập số dư')
      return Promise.all(
        lines.map((l) =>
          inventoryApi.setOpeningBalance({
            productId: l.productId,
            warehouseId: warehouseId!,
            quantity: l.quantity,
            unitCost: l.unitCost,
          })
        )
      )
    },
    onSuccess: () => {
      notifications.show({ color: 'green', message: 'Nhập số dư đầu kỳ thành công' })
      setLines([])
      void qc.invalidateQueries({ queryKey: ['inventory-balances'] })
    },
    onError: (e: Error) => notifications.show({ color: 'red', message: e.message }),
  })

  const warehouseOptions = (warehouses ?? []).map((w) => ({ value: w.id, label: w.name }))
  const totalValue = lines.reduce((s, l) => s + l.quantity * l.unitCost, 0)

  return (
    <Stack gap="md">
      <PageHeader
        title="Nhập số dư đầu kỳ"
        subtitle="Nhập tồn kho ban đầu cho từng kho"
      />

      <Stack px="md" gap="md">
        <Alert icon={<IconAlertCircle size={16} />} color="yellow" variant="light">
          Thao tác này sẽ ghi đè số dư tồn kho hiện tại của kho được chọn. Chỉ thực hiện khi bắt đầu sử dụng hệ thống.
        </Alert>

        <Select
          label="Kho nhập số dư"
          placeholder="Chọn kho..."
          data={warehouseOptions}
          value={warehouseId}
          onChange={setWarehouseId}
          required
          w={300}
        />

        {/* Add product row */}
        <Group gap="sm" align="flex-end">
          <Select
            label="Thêm sản phẩm"
            placeholder="Tìm sản phẩm..."
            searchable
            clearable
            data={productOptions}
            value={addProductId}
            onChange={setAddProductId}
            w={320}
          />
          <Button leftSection={<IconPlus size={16} />} onClick={addLine} disabled={!addProductId}>
            Thêm
          </Button>
        </Group>

        {lines.length > 0 && (
          <Table withColumnBorders>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Sản phẩm</Table.Th>
                <Table.Th ta="right" w={130}>Số lượng</Table.Th>
                <Table.Th ta="right" w={160}>Đơn giá vốn</Table.Th>
                <Table.Th ta="right" w={140}>Thành tiền</Table.Th>
                <Table.Th w={40}></Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {lines.map((line) => (
                <Table.Tr key={line.productId}>
                  <Table.Td>
                    <Text size="sm">{line.productName}</Text>
                  </Table.Td>
                  <Table.Td>
                    <NumberInput
                      value={line.quantity}
                      onChange={(v) => updateLine(line.productId, 'quantity', Number(v))}
                      min={0}
                      size="xs"
                      ta="right"
                    />
                  </Table.Td>
                  <Table.Td>
                    <NumberInput
                      value={line.unitCost}
                      onChange={(v) => updateLine(line.productId, 'unitCost', Number(v))}
                      min={0}
                      size="xs"
                      thousandSeparator=","
                      suffix=" ₫"
                    />
                  </Table.Td>
                  <Table.Td ta="right">
                    <Text size="sm" c="blue">
                      {(line.quantity * line.unitCost).toLocaleString('vi-VN')} ₫
                    </Text>
                  </Table.Td>
                  <Table.Td>
                    <ActionIcon color="red" variant="subtle" size="sm" onClick={() => removeLine(line.productId)}>
                      <IconTrash size={14} />
                    </ActionIcon>
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
            <Table.Tfoot>
              <Table.Tr>
                <Table.Td colSpan={3} ta="right" fw={600}>Tổng giá trị:</Table.Td>
                <Table.Td ta="right">
                  <Badge size="lg" color="green">{totalValue.toLocaleString('vi-VN')} ₫</Badge>
                </Table.Td>
                <Table.Td />
              </Table.Tr>
            </Table.Tfoot>
          </Table>
        )}

        {lines.length === 0 && (
          <Text c="dimmed" ta="center" py="xl">Chưa có sản phẩm. Thêm sản phẩm bên trên.</Text>
        )}

        <Group>
          <Button
            disabled={!warehouseId || lines.length === 0}
            loading={saveMutation.isPending}
            onClick={() => saveMutation.mutate()}
          >
            Lưu số dư đầu kỳ
          </Button>
          <Button variant="default" onClick={() => setLines([])}>Xóa tất cả</Button>
        </Group>
      </Stack>
    </Stack>
  )
}
