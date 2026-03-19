import { useState } from 'react'
import { Stack, Group, Button, TextInput, ActionIcon, Tooltip, Badge, Select, Switch } from '@mantine/core'
import { useForm } from '@mantine/form'
import { useDisclosure, useDebouncedValue } from '@mantine/hooks'
import { notifications } from '@mantine/notifications'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { IconPlus, IconEdit, IconTrash, IconSearch } from '@tabler/icons-react'
import { PageHeader, DataTable, DrawerForm, openConfirm } from '@pos/ui'
import type { DataTableColumn } from '@pos/ui'
import { warehousesApi, branchesApi } from '@pos/api-client'
import type { WarehouseDto, BranchDto } from '@pos/api-client'
import { useIsAdmin, useIsManager } from '@pos/auth'

type Row = WarehouseDto & Record<string, unknown>

interface FormValues {
  name: string
  code: string
  address: string
  branchId: string
  status: 'Active' | 'Inactive'
}

function flattenBranches(branches: BranchDto[]): { value: string; label: string }[] {
  return branches.flatMap((b) => [
    { value: b.id, label: `${b.name} (${b.code})` },
    ...flattenBranches(b.subBranches ?? []),
  ])
}

export default function WarehouseListPage() {
  const qc = useQueryClient()
  const canWrite = useIsManager()  // POST / PUT  Admin | Manager
  const canDelete = useIsAdmin()   // DELETE  Admin only
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [debouncedSearch] = useDebouncedValue(search, 300)
  const [editing, setEditing] = useState<WarehouseDto | null>(null)
  const [opened, { open, close }] = useDisclosure(false)

  const form = useForm<FormValues>({
    initialValues: { name: '', code: '', address: '', branchId: '', status: 'Active' },
    validate: {
      name: (v) => (v.trim() ? null : 'Tên kho không được trống'),
      code: (v) => (v.trim() ? null : 'Mã kho không được trống'),
    },
  })

  const { data: pagedWarehouses, isLoading } = useQuery({
    queryKey: ['warehouses', debouncedSearch, page],
    queryFn: () => warehousesApi.list({ keyword: debouncedSearch || undefined, page, pageSize: 20 }),
  })
  const warehouses = pagedWarehouses?.items ?? []

  const { data: branchTree = [] } = useQuery({
    queryKey: ['branches', 'tree'],
    queryFn: () => branchesApi.getTree(),
  })
  const branchOptions = [
    { value: '', label: '— Không gán chi nhánh —' },
    ...flattenBranches(branchTree),
  ]

  const createMutation = useMutation({
    mutationFn: (v: FormValues) =>
      warehousesApi.create({
        code: v.code,
        name: v.name,
        address: v.address || null,
        branchId: v.branchId || null,
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['warehouses'] })
      notifications.show({ color: 'green', message: 'Tạo kho hàng thành công' })
      close()
    },
    onError: (err: unknown) =>
      notifications.show({ color: 'red', message: (err as { message?: string }).message ?? 'Tạo kho hàng thất bại' }),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, v }: { id: string; v: FormValues }) =>
      warehousesApi.update(id, {
        name: v.name,
        address: v.address || null,
        status: v.status,
        branchId: v.branchId || null,
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['warehouses'] })
      notifications.show({ color: 'green', message: 'Cập nhật thành công' })
      close()
    },
    onError: (err: unknown) =>
      notifications.show({ color: 'red', message: (err as { message?: string }).message ?? 'Cập nhật thất bại' }),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => warehousesApi.delete(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['warehouses'] })
      notifications.show({ color: 'green', message: 'Xóa thành công' })
    },
    onError: (err: unknown) =>
      notifications.show({ color: 'red', message: (err as { message?: string }).message ?? 'Xóa thất bại' }),
  })

  function handleOpen(warehouse?: WarehouseDto) {
    if (warehouse) {
      setEditing(warehouse)
      form.setValues({
        name: warehouse.name,
        code: warehouse.code,
        address: warehouse.address ?? '',
        branchId: warehouse.branchId ?? '',
        status: warehouse.status,
      })
    } else {
      setEditing(null)
      form.reset()
    }
    open()
  }

  function handleSubmit(values: FormValues) {
    if (editing) {
      updateMutation.mutate({ id: editing.id, v: values })
    } else {
      createMutation.mutate(values)
    }
  }

  function handleDelete(warehouse: WarehouseDto) {
    openConfirm({
      message: `Xóa kho "${warehouse.name}"? Không thể xóa nếu còn tồn kho.`,
      onConfirm: () => deleteMutation.mutate(warehouse.id),
    })
  }

  const filtered = (warehouses as Row[])

  const columns: DataTableColumn<Row>[] = [
    {
      key: 'code',
      header: 'Mã kho',
      render: (row) => (
        <span style={{ fontFamily: 'monospace', color: 'var(--mantine-color-blue-4)' }}>
          {row.code as string}
        </span>
      ),
    },
    { key: 'name', header: 'Tên kho' },
    {
      key: 'address',
      header: 'Địa chỉ',
      render: (row) => (row.address as string | null | undefined) ?? '—',
    },
    {
      key: 'branchName',
      header: 'Chi nhánh',
      render: (row) => (row.branchName as string | null | undefined) ?? '—',
    },
    {
      key: 'status',
      header: 'Trạng thái',
      render: (row) => (
        <Badge color={(row.status as string) === 'Active' ? 'green' : 'gray'} variant="light">
          {(row.status as string) === 'Active' ? 'Hoạt động' : 'Ngừng'}
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
          {canWrite && (
            <Tooltip label="Sửa">
              <ActionIcon variant="subtle" onClick={() => handleOpen(row as WarehouseDto)}>
                <IconEdit size={16} />
              </ActionIcon>
            </Tooltip>
          )}
          {canDelete && (
            <Tooltip label="Xóa">
              <ActionIcon variant="subtle" color="red" onClick={() => handleDelete(row as WarehouseDto)}>
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
        title="Kho hàng"
        subtitle="Quản lý danh sách kho"
        actions={
          canWrite ? (
            <Button leftSection={<IconPlus size={16} />} onClick={() => handleOpen()}>
              Thêm kho
            </Button>
          ) : undefined
        }
      />

      <TextInput
        placeholder="Tìm theo tên, mã kho..."
        leftSection={<IconSearch size={16} />}
        value={search}
        onChange={(e) => { setSearch(e.currentTarget.value); setPage(1) }}
        w={300}
      />

      <DataTable
        data={filtered}
        columns={columns}
        isLoading={isLoading}
        total={pagedWarehouses?.totalCount}
        page={page}
        pageSize={20}
        onPageChange={setPage}
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
          disabled={!!editing}
          description={editing ? 'Mã kho không thể thay đổi sau khi tạo' : undefined}
          {...form.getInputProps('code')}
        />
        <TextInput
          label="Địa chỉ"
          placeholder="Địa chỉ kho hàng..."
          {...form.getInputProps('address')}
        />
        <Select
          label="Chi nhánh"
          data={branchOptions}
          value={form.values.branchId}
          onChange={(v) => form.setFieldValue('branchId', v ?? '')}
          clearable
        />
        {editing && (
          <Switch
            label="Hoạt động"
            checked={form.values.status === 'Active'}
            onChange={(e) => form.setFieldValue('status', e.currentTarget.checked ? 'Active' : 'Inactive')}
          />
        )}
      </DrawerForm>
    </Stack>
  )
}