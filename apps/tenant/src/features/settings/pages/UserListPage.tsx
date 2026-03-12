import { useState } from 'react'
import {
  Stack, Group, TextInput, Badge, Switch, MultiSelect, PasswordInput, Button, Select,
} from '@mantine/core'
import { useForm } from '@mantine/form'
import { notifications } from '@mantine/notifications'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { IconSearch, IconPlus } from '@tabler/icons-react'
import { PageHeader, DataTable, DrawerForm } from '@pos/ui'
import type { DataTableColumn } from '@pos/ui'
import { authApi, branchesApi } from '@pos/api-client'
import type { UserDto } from '@pos/api-client'

type Row = UserDto & Record<string, unknown>

const PAGE_SIZE = 20

interface FormValues {
  email: string
  fullName: string
  password: string
  roleIds: string[]
  branchId: string
  isActive: boolean
}

export default function UserListPage() {
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)

  const form = useForm<FormValues>({
    initialValues: { email: '', fullName: '', password: '', roleIds: [], branchId: '', isActive: true },
    validate: {
      email: (v) => (!v ? 'Nhập email' : null),
      fullName: (v) => (!v ? 'Nhập họ tên' : null),
      password: (v) => (!editId && !v ? 'Nhập mật khẩu' : null),
    },
  })

  const params = { page, pageSize: PAGE_SIZE, search: search || undefined }

  const { data, isLoading } = useQuery({
    queryKey: ['users', params],
    queryFn: () => authApi.listUsers(params),
  })

  const { data: roles } = useQuery({
    queryKey: ['roles'],
    queryFn: () => authApi.listRoles(),
  })

  const { data: branches } = useQuery({
    queryKey: ['branches'],
    queryFn: () => branchesApi.list(),
  })

  const roleOptions = (roles ?? []).map((r) => ({ value: r.id, label: r.name }))
  const branchOptions = (branches ?? []).map((b) => ({ value: b.id, label: b.name }))

  const createMutation = useMutation({
    mutationFn: (values: FormValues) =>
      authApi.createUser({
        username: values.email,
        email: values.email,
        fullName: values.fullName,
        password: values.password,
        roleId: values.roleIds[0] ?? '',
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['users'] })
      notifications.show({ color: 'green', message: 'Tạo người dùng thành công' })
      setDrawerOpen(false)
      form.reset()
    },
    onError: () => notifications.show({ color: 'red', message: 'Tạo người dùng thất bại' }),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, values }: { id: string; values: FormValues }) =>
      authApi.updateUser(id, {
        status: values.isActive ? 'Active' : 'Inactive',
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['users'] })
      notifications.show({ color: 'green', message: 'Cập nhật thành công' })
      setDrawerOpen(false)
      form.reset()
    },
    onError: () => notifications.show({ color: 'red', message: 'Cập nhật thất bại' }),
  })

  function handleSubmit(values: FormValues) {
    if (editId) {
      updateMutation.mutate({ id: editId, values })
    } else {
      createMutation.mutate(values)
    }
  }

  function openEdit(row: UserDto) {
    setEditId(row.id)
    const matchedRoleIds = (roles ?? [])
      .filter((r) => row.roleIds.includes(r.id))
      .map((r) => r.id)
    form.setValues({
      email: row.email ?? '',
      fullName: row.fullName,
      password: '',
      roleIds: matchedRoleIds,
      branchId: (row as UserDto & { branchId?: string }).branchId ?? '',
      isActive: row.status === 'Active',
    })
    setDrawerOpen(true)
  }

  function openCreate() {
    setEditId(null)
    form.reset()
    setDrawerOpen(true)
  }

  const columns: DataTableColumn<Row>[] = [
    { key: 'email', header: 'Email' },
    { key: 'fullName', header: 'Họ tên' },
    {
      key: 'branchIds',
      header: 'Chi nhánh',
      render: (row) => (row.branchIds as string[]).length > 0 ? (row.branchIds as string[])[0] : '—',
    },
    {
      key: 'roleIds',
      header: 'Vai trò',
      render: (row) => {
        const rs = row.roleIds as string[]
        return (
          <Group gap={4}>
            {rs.map((r) => (
              <Badge key={r} size="xs" variant="light">{r}</Badge>
            ))}
          </Group>
        )
      },
    },
    {
      key: 'status',
      header: 'Trạng thái',
      render: (row) => (
        <Badge color={(row.status as string) === 'Active' ? 'green' : 'gray'} variant="light">
          {(row.status as string) === 'Active' ? 'Hoạt động' : 'Vô hiệu'}
        </Badge>
      ),
    },
  ]

  return (
    <Stack gap="lg">
      <PageHeader
        title="Người dùng"
        subtitle="Quản lý tài khoản người dùng"
        actions={
          <Group>
            <TextInput
              placeholder="Tìm email, tên..."
              leftSection={<IconSearch size={16} />}
              value={search}
              onChange={(e) => setSearch(e.currentTarget.value)}
              w={250}
            />
            <Button leftSection={<IconPlus size={16} />} onClick={openCreate}>
              Thêm người dùng
            </Button>
          </Group>
        }
      />

      <DataTable
        data={(data ?? []) as Row[]}
        columns={columns}
        isLoading={isLoading}
        total={undefined}
        page={page}
        pageSize={PAGE_SIZE}
        onPageChange={setPage}
        rowKey="id"
        onRowClick={(row) => openEdit(row as unknown as UserDto)}
      />

      <DrawerForm
        opened={drawerOpen}
        onClose={() => { setDrawerOpen(false); form.reset() }}
        title={editId ? 'Sửa người dùng' : 'Thêm người dùng'}
        onSubmit={() => { form.onSubmit(handleSubmit)() }}
        isLoading={createMutation.isPending || updateMutation.isPending}
      >
        <Stack gap="sm">
          <TextInput
            label="Email"
            placeholder="nguoi.dung@example.com"
            {...form.getInputProps('email')}
            disabled={!!editId}
            required
          />
          <TextInput
            label="Họ tên"
            placeholder="Nguyễn Văn A"
            {...form.getInputProps('fullName')}
            required
          />
          {!editId && (
            <PasswordInput
              label="Mật khẩu"
              placeholder="Nhập mật khẩu..."
              {...form.getInputProps('password')}
              required
            />
          )}
          <Select
            label="Chi nhánh"
            placeholder="Chọn chi nhánh..."
            data={branchOptions}
            clearable
            {...form.getInputProps('branchId')}
          />
          <MultiSelect
            label="Vai trò"
            placeholder="Chọn vai trò..."
            data={roleOptions}
            {...form.getInputProps('roleIds')}
          />
          {!!editId && (
            <Switch
              label="Tài khoản hoạt động"
              checked={form.values.isActive}
              onChange={(e) => form.setFieldValue('isActive', e.currentTarget.checked)}
            />
          )}
        </Stack>
      </DrawerForm>
    </Stack>
  )
}
