import { useEffect, useState } from 'react'
import {
  Stack, Group, Button, TextInput, Select, NumberInput,
  Textarea, Title, Divider, Loader, Center, Tabs, Table, ActionIcon,
  Modal, Text,
} from '@mantine/core'
import { useForm } from '@mantine/form'
import { notifications } from '@mantine/notifications'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate, useParams } from 'react-router-dom'
import { IconArrowLeft, IconDeviceFloppy, IconPlus, IconEdit, IconTrash } from '@tabler/icons-react'
import { PageHeader, openConfirm } from '@pos/ui'
import { productsApi, categoriesApi, unitsApi } from '@pos/api-client'
import type { CreateProductRequest, UnitConversionDto } from '@pos/api-client'

const VAT_OPTIONS = [
  { value: '0', label: '0%' },
  { value: '0.05', label: '5%' },
  { value: '0.08', label: '8%' },
  { value: '0.1', label: '10%' },
]

// ─── Unit Conversions Panel ───────────────────────────────────────────────────

interface ConversionFormValues {
  fromUnitId: string
  toUnitId: string
  conversionRate: number
}

function UnitConversionsPanel({ productId, units }: { productId: string; units: { value: string; label: string }[] }) {
  const qc = useQueryClient()
  const [modalOpen, setModalOpen] = useState(false)
  const [editConvId, setEditConvId] = useState<string | null>(null)

  const convForm = useForm<ConversionFormValues>({
    initialValues: { fromUnitId: '', toUnitId: '', conversionRate: 1 },
    validate: {
      fromUnitId: (v) => (!v ? 'Chọn đơn vị nguồn' : null),
      toUnitId: (v) => (!v ? 'Chọn đơn vị đích' : null),
      conversionRate: (v) => (v > 0 ? null : 'Tỷ lệ phải > 0'),
    },
  })

  const { data: conversions = [], isLoading } = useQuery({
    queryKey: ['product-conversions', productId],
    queryFn: () => productsApi.listConversions(productId),
    enabled: !!productId,
  })

  const createConvMutation = useMutation({
    mutationFn: (v: ConversionFormValues) =>
      productsApi.createConversion(productId, v),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['product-conversions', productId] })
      notifications.show({ color: 'green', message: 'Thêm quy đổi thành công' })
      setModalOpen(false)
      convForm.reset()
    },
    onError: () => notifications.show({ color: 'red', message: 'Thêm quy đổi thất bại' }),
  })

  const updateConvMutation = useMutation({
    mutationFn: (v: ConversionFormValues) =>
      productsApi.updateConversion(productId, editConvId!, { conversionRate: v.conversionRate }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['product-conversions', productId] })
      notifications.show({ color: 'green', message: 'Cập nhật quy đổi thành công' })
      setModalOpen(false)
      convForm.reset()
    },
    onError: () => notifications.show({ color: 'red', message: 'Cập nhật quy đổi thất bại' }),
  })

  const deleteConvMutation = useMutation({
    mutationFn: (convId: string) => productsApi.deleteConversion(productId, convId),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['product-conversions', productId] })
      notifications.show({ color: 'green', message: 'Đã xóa quy đổi' })
    },
    onError: () => notifications.show({ color: 'red', message: 'Xóa quy đổi thất bại' }),
  })

  function openCreate() {
    setEditConvId(null)
    convForm.reset()
    setModalOpen(true)
  }

  function openEdit(conv: UnitConversionDto) {
    setEditConvId(conv.id)
    convForm.setValues({
      fromUnitId: conv.fromUnitId,
      toUnitId: conv.toUnitId,
      conversionRate: conv.conversionRate,
    })
    setModalOpen(true)
  }

  function handleDelete(conv: UnitConversionDto) {
    openConfirm({
      title: 'Xóa quy đổi',
      message: `Xóa quy đổi ${conv.fromUnitName} → ${conv.toUnitName}?`,
      onConfirm: () => deleteConvMutation.mutate(conv.id),
    })
  }

  function handleSubmit(v: ConversionFormValues) {
    if (editConvId) updateConvMutation.mutate(v)
    else createConvMutation.mutate(v)
  }

  if (isLoading) return <Center h={120}><Loader size="sm" /></Center>

  return (
    <>
      <Group justify="space-between" mb="md">
        <Text size="sm" c="dimmed">Định nghĩa tỷ lệ quy đổi giữa các đơn vị tính của sản phẩm này</Text>
        <Button size="xs" leftSection={<IconPlus size={14} />} onClick={openCreate}>
          Thêm quy đổi
        </Button>
      </Group>

      {conversions.length === 0 ? (
        <Center h={80}>
          <Text size="sm" c="dimmed">Chưa có quy đổi đơn vị nào</Text>
        </Center>
      ) : (
        <Table striped highlightOnHover withTableBorder>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Đơn vị nguồn</Table.Th>
              <Table.Th>Đơn vị đích</Table.Th>
              <Table.Th ta="right">Tỷ lệ</Table.Th>
              <Table.Th w={80}></Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {conversions.map((conv) => (
              <Table.Tr key={conv.id}>
                <Table.Td>{conv.fromUnitName}</Table.Td>
                <Table.Td>{conv.toUnitName}</Table.Td>
                <Table.Td ta="right" fw={500}>1 {conv.fromUnitName} = {conv.conversionRate} {conv.toUnitName}</Table.Td>
                <Table.Td>
                  <Group gap={4} justify="flex-end">
                    <ActionIcon size="sm" variant="subtle" onClick={() => openEdit(conv)}>
                      <IconEdit size={14} />
                    </ActionIcon>
                    <ActionIcon size="sm" color="red" variant="subtle" onClick={() => handleDelete(conv)}>
                      <IconTrash size={14} />
                    </ActionIcon>
                  </Group>
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      )}

      <Modal
        opened={modalOpen}
        onClose={() => { setModalOpen(false); convForm.reset() }}
        title={editConvId ? 'Sửa quy đổi đơn vị' : 'Thêm quy đổi đơn vị'}
        size="sm"
      >
        <Stack gap="sm">
          <Select
            label="Đơn vị nguồn"
            placeholder="Chọn đơn vị..."
            data={units}
            searchable
            required
            disabled={!!editConvId}
            {...convForm.getInputProps('fromUnitId')}
          />
          <Select
            label="Đơn vị đích"
            placeholder="Chọn đơn vị..."
            data={units}
            searchable
            required
            disabled={!!editConvId}
            {...convForm.getInputProps('toUnitId')}
          />
          <NumberInput
            label="Tỷ lệ quy đổi"
            description="1 đơn vị nguồn = ? đơn vị đích"
            placeholder="1"
            min={0.0001}
            decimalScale={4}
            required
            {...convForm.getInputProps('conversionRate')}
          />
          <Group justify="flex-end" mt="sm">
            <Button variant="default" onClick={() => setModalOpen(false)}>Hủy</Button>
            <Button
              loading={createConvMutation.isPending || updateConvMutation.isPending}
              onClick={() => convForm.onSubmit(handleSubmit)()}
            >
              {editConvId ? 'Cập nhật' : 'Thêm'}
            </Button>
          </Group>
        </Stack>
      </Modal>
    </>
  )
}

export default function ProductFormPage() {
  const { id } = useParams<{ id: string }>()
  const isEdit = !!id && id !== 'new'
  const navigate = useNavigate()
  const qc = useQueryClient()

  const form = useForm<CreateProductRequest & { vatRateStr: string; costingMethodStr: string }>({
    initialValues: {
      code: '',
      name: '',
      categoryId: '',
      baseUnitId: '',
      purchaseUnitId: '',
      salesUnitId: '',
      costPrice: 0,
      sellingPrice: 0,
      vatRate: 0.1,
      vatRateStr: '0.1',
      costingMethodStr: '1',
    },
    validate: {
      code: (v) => (v.trim() ? null : 'Mã sản phẩm không được trống'),
      name: (v) => (v.trim() ? null : 'Tên sản phẩm không được trống'),
      baseUnitId: (v) => (v ? null : 'Đơn vị tính không được trống'),
      sellingPrice: (v) => (v >= 0 ? null : 'Giá bán không hợp lệ'),
    },
  })

  const { data: product, isLoading: loadingProduct } = useQuery({
    queryKey: ['product', id],
    queryFn: () => productsApi.getById(id!),
    enabled: isEdit,
  })

  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: () => categoriesApi.list(),
  })

  const { data: units = [] } = useQuery({
    queryKey: ['units'],
    queryFn: () => unitsApi.list({ pageSize: 999 }).then((r) => r.items),
  })

  useEffect(() => {
    if (product) {
      form.setValues({
        code: product.code,
        name: product.name,
        categoryId: product.categoryId ?? '',
        baseUnitId: product.baseUnitId,
        purchaseUnitId: product.purchaseUnitId ?? '',
        salesUnitId: product.salesUnitId ?? '',
        costPrice: product.costPrice,
        sellingPrice: product.sellingPrice,
        vatRate: product.vatRate,
        vatRateStr: String(product.vatRate),
        costingMethodStr: String(product.costingMethod ?? 1),
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product])

  const createMutation = useMutation({
    mutationFn: (values: CreateProductRequest) => productsApi.create(values),
    onSuccess: (result) => {
      void qc.invalidateQueries({ queryKey: ['products'] })
      notifications.show({ color: 'green', message: 'Tạo sản phẩm thành công' })
      navigate(`/master/products/${result.id}`)
    },
    onError: () => notifications.show({ color: 'red', message: 'Tạo sản phẩm thất bại' }),
  })

  const updateMutation = useMutation({
    mutationFn: (values: CreateProductRequest) => productsApi.update(id!, values),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['products'] })
      void qc.invalidateQueries({ queryKey: ['product', id] })
      notifications.show({ color: 'green', message: 'Cập nhật thành công' })
    },
    onError: () => notifications.show({ color: 'red', message: 'Cập nhật thất bại' }),
  })

  function handleSubmit(values: CreateProductRequest & { vatRateStr: string }) {
    const { vatRateStr, costingMethodStr, ...rest } = values
    const body: CreateProductRequest = {
      ...rest,
      vatRate: parseFloat(vatRateStr),
      costingMethod: parseInt(costingMethodStr, 10),
      categoryId: rest.categoryId || undefined,
      purchaseUnitId: rest.purchaseUnitId || undefined,
      salesUnitId: rest.salesUnitId || undefined,
    }
    if (isEdit) {
      updateMutation.mutate(body)
    } else {
      createMutation.mutate(body)
    }
  }

  if (isEdit && loadingProduct) {
    return (
      <Center h={200}>
        <Loader />
      </Center>
    )
  }

  const unitOptions = units.map((u) => ({ value: u.id, label: `${u.name} (${u.symbol})` }))

  function flattenCategories(
    nodes: typeof categories,
    depth = 0
  ): { value: string; label: string }[] {
    return nodes.flatMap((c) => [
      { value: c.id, label: depth === 0 ? c.name : `${'  '.repeat(depth)}↳ ${c.name}` },
      ...flattenCategories(c.children ?? [], depth + 1),
    ])
  }
  const categoryOptions = flattenCategories(categories)

  const isSaving = createMutation.isPending || updateMutation.isPending

  return (
    <Stack gap="lg">
      <PageHeader
        title={isEdit ? 'Sửa sản phẩm' : 'Thêm sản phẩm'}
        subtitle={isEdit ? `Chỉnh sửa thông tin sản phẩm` : 'Tạo sản phẩm mới'}
        actions={
          <Group>
            <Button variant="default" leftSection={<IconArrowLeft size={16} />} onClick={() => navigate('/master/products')}>
              Quay lại
            </Button>
            <Button
              leftSection={<IconDeviceFloppy size={16} />}
              loading={isSaving}
              onClick={() => { form.onSubmit(handleSubmit)() }}
            >
              Lưu
            </Button>
          </Group>
        }
      />

      <Tabs defaultValue="info">
        <Tabs.List mb="md">
          <Tabs.Tab value="info">Thông tin sản phẩm</Tabs.Tab>
          {isEdit && <Tabs.Tab value="conversions">Quy đổi đơn vị</Tabs.Tab>}
        </Tabs.List>

        <Tabs.Panel value="info">
          <Stack gap="md" maw={800}>
            <Title order={5}>Thông tin cơ bản</Title>
            <Divider />
            <Group grow>
              <TextInput label="Mã sản phẩm" placeholder="SP001" required {...form.getInputProps('code')} />
              <TextInput label="Tên sản phẩm" placeholder="Coca Cola 330ml" required {...form.getInputProps('name')} />
            </Group>
            <Group grow>
              <Select
                label="Danh mục"
                placeholder="Chọn danh mục"
                data={categoryOptions}
                clearable
                searchable
                {...form.getInputProps('categoryId')}
              />
            </Group>

            <Title order={5} mt="md">Đơn vị & Giá</Title>
            <Divider />
            <Group grow>
              <Select
                label="Đơn vị cơ bản"
                placeholder="Chọn đơn vị"
                data={unitOptions}
                required
                searchable
                {...form.getInputProps('baseUnitId')}
              />
              <Select
                label="Đơn vị mua"
                placeholder="Mặc định = đơn vị cơ bản"
                data={unitOptions}
                clearable
                searchable
                {...form.getInputProps('purchaseUnitId')}
              />
              <Select
                label="Đơn vị bán"
                placeholder="Mặc định = đơn vị cơ bản"
                data={unitOptions}
                clearable
                searchable
                {...form.getInputProps('salesUnitId')}
              />
            </Group>
            <Group grow>
              <NumberInput
                label="Giá mua"
                placeholder="0"
                thousandSeparator="."
                decimalSeparator=","
                suffix=" ₫"
                min={0}
                {...form.getInputProps('costPrice')}
              />
              <NumberInput
                label="Giá bán"
                placeholder="0"
                thousandSeparator="."
                decimalSeparator=","
                suffix=" ₫"
                min={0}
                required
                {...form.getInputProps('sellingPrice')}
              />
            </Group>
            <Group grow>
              <Select
                label="Thuế VAT"
                data={VAT_OPTIONS}
                {...form.getInputProps('vatRateStr')}
              />
              <Select
                label="Phương pháp tính giá vốn"
                data={[
                  { value: '1', label: 'Bình quân gia quyền' },
                  { value: '0', label: 'Nhập trước xuất trước (FIFO)' },
                ]}
                {...form.getInputProps('costingMethodStr')}
              />
            </Group>

            <Title order={5} mt="md">Mô tả</Title>
            <Divider />
            <Textarea
              placeholder="Mô tả sản phẩm..."
              minRows={3}
              disabled
            />
          </Stack>
        </Tabs.Panel>

        {isEdit && id && (
          <Tabs.Panel value="conversions">
            <UnitConversionsPanel productId={id} units={unitOptions} />
          </Tabs.Panel>
        )}
      </Tabs>
    </Stack>
  )
}
