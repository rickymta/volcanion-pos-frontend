import { useState } from 'react'
import { Stack, Group, Button, TextInput, ActionIcon, Tooltip, Badge, Switch } from '@mantine/core'
import { useForm } from '@mantine/form'
import { useDisclosure } from '@mantine/hooks'
import { notifications } from '@mantine/notifications'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { IconPlus, IconEdit, IconTrash, IconSearch } from '@tabler/icons-react'
import { PageHeader, DataTable, DrawerForm, openConfirm } from '@pos/ui'
import type { DataTableColumn } from '@pos/ui'
import { unitsApi } from '@pos/api-client'
import type { UnitDto, CreateUnitRequest } from '@pos/api-client'
import { useIsAdmin, useIsManager } from '@pos/auth'

type Row = UnitDto & Record<string, unknown>

export default function UnitListPage() {
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [editing, setEditing] = useState<UnitDto | null>(null)
  const [opened, { open, close }] = useDisclosure(false)
  const isManager = useIsManager()
  const isAdmin = useIsAdmin()

  const form = useForm<CreateUnitRequest>({
    initialValues: { name: '', symbol: '', isBaseUnit: true },
    validate: {
      name: (v) => (v.trim() ? null : 'Tên không được trống'),
      symbol: (v) => (v.trim() ? null : 'Ký hiệu không được trống'),
    },
  })

  const { data: units = [], isLoading } = useQuery({
    queryKey: ['units'],
    queryFn: () => unitsApi.list({ pageSize: 999 }).then((r) => r.items),
  })

  const createMutation = useMutation({
    mutationFn: (values: CreateUnitRequest) => unitsApi.create(values),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['units'] })
      notifications.show({ color: 'green', message: 'Tạo đơn vị thành công' })
      close()
    },
    onError: () => notifications.show({ color: 'red', message: 'Tạo đơn vị thất bại' }),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, values }: { id: string; values: CreateUnitRequest }) =>
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
      form.setValues({ name: unit.name, symbol: unit.symbol, isBaseUnit: unit.isBaseUnit })
    } else {
      setEditing(null)
      form.reset()
    }
    open()
  }

  function handleSubmit(values: CreateUnitRequest) {
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
      (u.symbol as string).toLowerCase().includes(search.toLowerCase())
  )

  const columns: DataTableColumn<Row>[] = [
    { key: 'name', header: 'Tên đơn vị' },
    { key: 'symbol', header: 'Ký hiệu' },
    {
      key: 'isBaseUnit',
      header: 'Loại',
      render: (row) => (
        <Badge color={row.isBaseUnit ? 'blue' : 'grape'} variant="light">
          {row.isBaseUnit ? 'Đơn vị cơ bản' : 'Đơn vị gộp'}
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
          {isManager && (
            <Tooltip label="Sửa">
              <ActionIcon variant="subtle" onClick={() => handleOpen(row as UnitDto)}>
                <IconEdit size={16} />
              </ActionIcon>
            </Tooltip>
          )}
          {isAdmin && (
            <Tooltip label="Xóa">
              <ActionIcon variant="subtle" color="red" onClick={() => handleDelete(row as UnitDto)}>
                <IconTrash size={16} />
              </ActionIcon>
            </Tooltip>
          )}
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
          isManager && (
            <Button leftSection={<IconPlus size={16} />} onClick={() => handleOpen()}>
              Thêm đơn vị
            </Button>
          )
        }
      />

      <TextInput
        placeholder="Tìm theo tên hoặc ký hiệu..."
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
          label="Ký hiệu"
          placeholder="cái, hộp, kg..."
          required
          {...form.getInputProps('symbol')}
        />
        <Switch
          label="Đơn vị cơ bản"
          description="Đơn vị dùng để tính tồn kho và giá vốn"
          checked={form.values.isBaseUnit}
          onChange={(e) => form.setFieldValue('isBaseUnit', e.currentTarget.checked)}
          mt="xs"
        />
      </DrawerForm>
    </Stack>
  )
}
