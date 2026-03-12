import { useState } from 'react'
import { Stack, Group, Button, TextInput, ActionIcon, Tooltip, Badge } from '@mantine/core'
import { useForm } from '@mantine/form'
import { useDisclosure } from '@mantine/hooks'
import { notifications } from '@mantine/notifications'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { IconPlus, IconEdit, IconTrash, IconSearch } from '@tabler/icons-react'
import { PageHeader, DataTable, DrawerForm, openConfirm } from '@pos/ui'
import type { DataTableColumn } from '@pos/ui'
import { warehousesApi } from '@pos/api-client'
import type { WarehouseDto } from '@pos/api-client'

type Row = WarehouseDto & Record<string, unknown>

export default function WarehouseListPage() {
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [editing, setEditing] = useState<WarehouseDto | null>(null)
  const [opened, { open, close }] = useDisclosure(false)

  const form = useForm({
    initialValues: { name: '', code: '', address: '' },
    validate: {
      name: (v: string) => (v.trim() ? null : 'Tên kho không được trống'),
      code: (v: string) => (v.trim() ? null : 'Mã kho không được trống'),
    },
  })

  const { data: warehouses = [], isLoading } = useQuery({
    queryKey: ['warehouses'],
    queryFn: () => warehousesApi.list(),
  })

  const createMutation = useMutation({
    mutationFn: (values: { name: string; code: string; address?: string }) => warehousesApi.create(values),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['warehouses'] })
      notifications.show({ color: 'green', message: 'Tạo kho hàng thành công' })
      close()
    },
    onError: () => notifications.show({ color: 'red', message: 'Tạo kho hàng thất bại' }),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, values }: { id: string; values: { name?: string; address?: string } }) =>
      warehousesApi.update(id, values),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['warehouses'] })
      notifications.show({ color: 'green', message: 'Cập nhật thành công' })
      close()
    },
    onError: () => notifications.show({ color: 'red', message: 'Cập nhật thất bại' }),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => warehousesApi.delete(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['warehouses'] })
      notifications.show({ color: 'green', message: 'Xóa thành công' })
    },
    onError: () => notifications.show({ color: 'red', message: 'Xóa thất bại' }),
  })

  function handleOpen(warehouse?: WarehouseDto) {
    if (warehouse) {
      setEditing(warehouse)
      form.setValues({ name: warehouse.name, code: warehouse.code ?? '', address: warehouse.address ?? '' })
    } else {
      setEditing(null)
      form.reset()
    }
    open()
  }

  function handleSubmit(values: { name: string; code: string; address: string }) {
    const payload = { name: values.name, code: values.code, address: values.address || undefined }
    if (editing) {
      updateMutation.mutate({ id: editing.id, values: payload })
    } else {
      createMutation.mutate(payload)
    }
  }

  function handleDelete(warehouse: WarehouseDto) {
    openConfirm({
      message: `Xóa kho "${warehouse.name}"?`,
      onConfirm: () => deleteMutation.mutate(warehouse.id),
    })
  }

  const filtered = (warehouses as Row[]).filter(
    (w) =>
      w.name.toLowerCase().includes(search.toLowerCase()) ||
      (w.address as string | undefined ?? '').toLowerCase().includes(search.toLowerCase())
  )

  const columns: DataTableColumn<Row>[] = [
    { key: 'name', header: 'Tên kho' },
    {
      key: 'address',
      header: 'Địa chỉ',
      render: (row) => (row.address as string | undefined) ?? '—',
    },
    {
      key: 'branchName',
      header: 'Chi nhánh',
      render: (row) => (row.branchName as string | undefined) ?? '—',
    },
    {
      key: 'status',
      header: 'Trạng thái',
      render: (row) => (
        <Badge color={row.status === 'Active' ? 'green' : 'gray'} variant="light">
          {row.status === 'Active' ? 'Hoạt động' : 'Ngừng'}
        </Badge>
      ),
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      width: 80,
      render: (row) => (
        <Group gap={4} justify="flex-end" wrap="nowrap">
          <Tooltip label="Sửa">
            <ActionIcon variant="subtle" onClick={() => handleOpen(row as WarehouseDto)}>
              <IconEdit size={16} />
            </ActionIcon>
          </Tooltip>
          <Tooltip label="Xóa">
            <ActionIcon variant="subtle" color="red" onClick={() => handleDelete(row as WarehouseDto)}>
              <IconTrash size={16} />
            </ActionIcon>
          </Tooltip>
        </Group>
      ),
    },
  ]

  const isSaving = createMutation.isPending || updateMutation.isPending

  return (
    <Stack gap="lg">
      <PageHeader
        title="Kho hàng"
        subtitle="Quản lý danh sách kho"
        actions={
          <Button leftSection={<IconPlus size={16} />} onClick={() => handleOpen()}>
            Thêm kho
          </Button>
        }
      />

      <TextInput
        placeholder="Tìm kiếm kho..."
        leftSection={<IconSearch size={16} />}
        value={search}
        onChange={(e) => setSearch(e.currentTarget.value)}
        w={300}
      />

      <DataTable
        data={filtered}
        columns={columns}
        isLoading={isLoading}
        rowKey="id"
      />

      <DrawerForm
        opened={opened}
        onClose={close}
        title={editing ? 'Sửa kho hàng' : 'Thêm kho hàng'}
        onSubmit={() => { form.onSubmit(handleSubmit)() }}
        isSubmitting={isSaving}
      >
        <TextInput
          label="Tên kho"
          placeholder="Kho chính, Kho B..."
          required
          {...form.getInputProps('name')}
        />
        <TextInput
          label="Mã kho"
          placeholder="WH01"
          required
          {...form.getInputProps('code')}
        />
        <TextInput
          label="Địa chỉ"
          placeholder="Địa chỉ kho hàng..."
          {...form.getInputProps('address')}
        />
      </DrawerForm>
    </Stack>
  )
}
