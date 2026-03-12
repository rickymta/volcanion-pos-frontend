import { useState } from 'react'
import { Stack, Group, Button, TextInput, ActionIcon, Tooltip, Badge } from '@mantine/core'
import { useForm } from '@mantine/form'
import { useDisclosure } from '@mantine/hooks'
import { notifications } from '@mantine/notifications'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { IconPlus, IconEdit, IconTrash, IconSearch } from '@tabler/icons-react'
import { PageHeader, DataTable, DrawerForm, openConfirm } from '@pos/ui'
import type { DataTableColumn } from '@pos/ui'
import { unitsApi } from '@pos/api-client'
import type { UnitDto } from '@pos/api-client'

type Row = UnitDto & Record<string, unknown>

export default function UnitListPage() {
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [editing, setEditing] = useState<UnitDto | null>(null)
  const [opened, { open, close }] = useDisclosure(false)

  const form = useForm({
    initialValues: { name: '', code: '' },
    validate: {
      name: (v: string) => (v.trim() ? null : 'Tên không được trống'),
      code: (v: string) => (v.trim() ? null : 'Mã không được trống'),
    },
  })

  const { data: units = [], isLoading } = useQuery({
    queryKey: ['units'],
    queryFn: () => unitsApi.list(),
  })

  const createMutation = useMutation({
    mutationFn: (values: { name: string; code: string }) => unitsApi.create(values),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['units'] })
      notifications.show({ color: 'green', message: 'Tạo đơn vị thành công' })
      close()
    },
    onError: () => notifications.show({ color: 'red', message: 'Tạo đơn vị thất bại' }),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, values }: { id: string; values: { name?: string; code?: string } }) =>
      unitsApi.update(id, values),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['units'] })
      notifications.show({ color: 'green', message: 'Cập nhật thành công' })
      close()
    },
    onError: () => notifications.show({ color: 'red', message: 'Cập nhật thất bại' }),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => unitsApi.delete(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['units'] })
      notifications.show({ color: 'green', message: 'Xóa thành công' })
    },
    onError: () => notifications.show({ color: 'red', message: 'Xóa thất bại' }),
  })

  function handleOpen(unit?: UnitDto) {
    if (unit) {
      setEditing(unit)
      form.setValues({ name: unit.name, code: unit.code })
    } else {
      setEditing(null)
      form.reset()
    }
    open()
  }

  function handleSubmit(values: { name: string; code: string }) {
    if (editing) {
      updateMutation.mutate({ id: editing.id, values })
    } else {
      createMutation.mutate(values)
    }
  }

  function handleDelete(unit: UnitDto) {
    openConfirm({
      message: `Xóa đơn vị "${unit.name}"?`,
      onConfirm: () => deleteMutation.mutate(unit.id),
    })
  }

  const filtered = (units as Row[]).filter(
    (u) =>
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      (u.code as string ?? '').toLowerCase().includes(search.toLowerCase())
  )

  const columns: DataTableColumn<Row>[] = [
    { key: 'name', header: 'Tên đơn vị' },
    { key: 'code', header: 'Mã' },
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
            <ActionIcon variant="subtle" onClick={() => handleOpen(row as UnitDto)}>
              <IconEdit size={16} />
            </ActionIcon>
          </Tooltip>
          <Tooltip label="Xóa">
            <ActionIcon variant="subtle" color="red" onClick={() => handleDelete(row as UnitDto)}>
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
        title="Đơn vị tính"
        subtitle="Quản lý đơn vị đo lường"
        actions={
          <Button leftSection={<IconPlus size={16} />} onClick={() => handleOpen()}>
            Thêm đơn vị
          </Button>
        }
      />

      <TextInput
        placeholder="Tìm kiếm..."
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
        title={editing ? 'Sửa đơn vị' : 'Thêm đơn vị'}
        onSubmit={() => { form.onSubmit(handleSubmit)() }}
        isSubmitting={isSaving}
      >
        <TextInput
          label="Tên đơn vị"
          placeholder="Cái, Hộp, Kg..."
          required
          {...form.getInputProps('name')}
        />
        <TextInput
          label="Mã đơn vị"
          placeholder="pcs, box, kg..."
          required
          {...form.getInputProps('code')}
        />
      </DrawerForm>
    </Stack>
  )
}
