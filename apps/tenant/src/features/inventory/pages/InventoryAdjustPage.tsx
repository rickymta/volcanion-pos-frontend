import { Stack, Group, Button, NumberInput, TextInput, Select, Paper } from '@mantine/core'
import { useForm } from '@mantine/form'
import { notifications } from '@mantine/notifications'
import { useMutation, useQuery } from '@tanstack/react-query'
import { PageHeader } from '@pos/ui'
import { inventoryApi, warehousesApi, productsApi } from '@pos/api-client'

interface FormValues {
  warehouseId: string
  productId: string
  targetQuantity: number
  unitCost: number
  note: string
}

export default function InventoryAdjustPage() {
  const form = useForm<FormValues>({
    initialValues: { warehouseId: '', productId: '', targetQuantity: 0, unitCost: 0, note: '' },
    validate: {
      warehouseId: (v) => !v ? 'Chọn kho hàng' : null,
      productId: (v) => !v ? 'Chọn sản phẩm' : null,
      targetQuantity: (v) => v < 0 ? 'Số lượng phải >= 0' : null,
      unitCost: (v) => v < 0 ? 'Đơn giá vốn phải >= 0' : null,
    },
  })

  const { data: warehouses } = useQuery({
    queryKey: ['warehouses'],
    queryFn: () => warehousesApi.list(),
  })

  const { data: products } = useQuery({
    queryKey: ['products', { page: 1, pageSize: 200 }],
    queryFn: () => productsApi.list({ page: 1, pageSize: 200 }),
  })

  const adjustMutation = useMutation({
    mutationFn: (values: FormValues) =>
      inventoryApi.adjust({
        warehouseId: values.warehouseId,
        productId: values.productId,
        targetQuantity: values.targetQuantity,
        unitCost: values.unitCost,
        note: values.note || undefined,
      }),
    onSuccess: () => {
      notifications.show({ color: 'green', message: 'Điều chỉnh tồn kho thành công' })
      form.reset()
    },
    onError: () => notifications.show({ color: 'red', message: 'Thao tác thất bại' }),
  })

  const warehouseOptions = (warehouses ?? []).map((w) => ({ value: w.id, label: w.name }))
  const productOptions = (products?.items ?? []).map((p) => ({
    value: p.id,
    label: `${p.code} - ${p.name}`,
  }))

  return (
    <Stack gap="lg">
      <PageHeader title="Điều chỉnh tồn kho" subtitle="Nhập số lượng tồn thực tế để cập nhật" />

      <Paper p="xl" withBorder maw={560}>
        <form onSubmit={form.onSubmit((values) => adjustMutation.mutate(values))}>
          <Stack gap="md">
            <Select
              label="Kho hàng"
              placeholder="Chọn kho"
              data={warehouseOptions}
              {...form.getInputProps('warehouseId')}
              required
            />
            <Select
              label="Sản phẩm"
              placeholder="Chọn sản phẩm"
              data={productOptions}
              searchable
              {...form.getInputProps('productId')}
              required
            />
            <NumberInput
              label="Số lượng thực tế"
              description="Nhập số lượng tồn kho thực tế hiện tại"
              min={0}
              {...form.getInputProps('targetQuantity')}
              required
            />
            <NumberInput
              label="Đơn giá vốn"
              description="Đơn giá vốn để điều chỉnh"
              min={0}
              thousandSeparator=","
              suffix=" ₫"
              {...form.getInputProps('unitCost')}
              required
            />
            <TextInput
              label="Lý do điều chỉnh"
              placeholder="Nhập lý do..."
              {...form.getInputProps('note')}
            />
            <Group justify="flex-end">
              <Button type="submit" loading={adjustMutation.isPending}>
                Xác nhận điều chỉnh
              </Button>
            </Group>
          </Stack>
        </form>
      </Paper>
    </Stack>
  )
}
