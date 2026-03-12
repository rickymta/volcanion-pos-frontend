import { useState } from 'react'
import { Stack, Group, Button, TextInput, ActionIcon, Tooltip, Badge } from '@mantine/core'
import { useForm } from '@mantine/form'
import { useDisclosure } from '@mantine/hooks'
import { notifications } from '@mantine/notifications'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { IconPlus, IconEdit, IconTrash, IconSearch } from '@tabler/icons-react'
import { PageHeader, DataTable, DrawerForm, openConfirm } from '@pos/ui'
import type { DataTableColumn } from '@pos/ui'
import { customersApi } from '@pos/api-client'
import type { CustomerDto, CreateCustomerRequest } from '@pos/api-client'

type Row = CustomerDto & Record<string, unknown>

const PAGE_SIZE = 20

export default function CustomerListPage() {
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [editing, setEditing] = useState<CustomerDto | null>(null)
  const [opened, { open, close }] = useDisclosure(false)

  const form = useForm<CreateCustomerRequest>({
    initialValues: {
      code: '',
      name: '',
      phone: '',
      email: '',
      address: '',
      taxCode: '',
    },
    validate: {
      code: (v) => (v.trim() ? null : 'Mã khách hàng không được trống'),
      name: (v) => (v.trim() ? null : 'Tên không được trống'),
    },
  })

  const { data, isLoading } = useQuery({
    queryKey: ['customers', page, search],
    queryFn: () => customersApi.list({ page, pageSize: PAGE_SIZE, search: search || undefined }),
  })

  const createMutation = useMutation({
    mutationFn: (values: CreateCustomerRequest) => customersApi.create(values),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['customers'] })
      notifications.show({ color: 'green', message: 'Tạo khách hàng thành công' })
      close()
    },
    onError: () => notifications.show({ color: 'red', message: 'Tạo khách hàng thất bại' }),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, values }: { id: string; values: Partial<CreateCustomerRequest> }) =>
      customersApi.update(id, values),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['customers'] })
      notifications.show({ color: 'green', message: 'Cập nhật thành công' })
      close()
    },
    onError: () => notifications.show({ color: 'red', message: 'Cập nhật thất bại' }),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => customersApi.delete(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['customers'] })
      notifications.show({ color: 'green', message: 'Xóa thành công' })
    },
    onError: () => notifications.show({ color: 'red', message: 'Xóa thất bại' }),
  })

  function handleOpen(customer?: CustomerDto) {
    if (customer) {
      setEditing(customer)
      form.setValues({
        code: customer.code,
        name: customer.name,
        phone: customer.phone ?? '',
        email: customer.email ?? '',
        address: customer.address ?? '',
        taxCode: customer.taxCode ?? '',
      })
    } else {
      setEditing(null)
      form.reset()
    }
    open()
  }

  function handleSubmit(values: CreateCustomerRequest) {
    const clean = Object.fromEntries(
      Object.entries(values).map(([k, v]) => [k, v === '' ? undefined : v])
    ) as CreateCustomerRequest
    if (editing) {
      updateMutation.mutate({ id: editing.id, values: clean })
    } else {
      createMutation.mutate(clean)
    }
  }

  function handleDelete(customer: CustomerDto) {
    openConfirm({
      message: `Xóa khách hàng "${customer.name}"?`,
      onConfirm: () => deleteMutation.mutate(customer.id),
    })
  }

  const columns: DataTableColumn<Row>[] = [
    { key: 'code', header: 'Mã KH', width: 120 },
    { key: 'name', header: 'Tên khách hàng' },
    {
      key: 'phone',
      header: 'Điện thoại',
      render: (row) => (row.phone as string | undefined) ?? '—',
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
            <ActionIcon variant="subtle" onClick={() => handleOpen(row as CustomerDto)}>
              <IconEdit size={16} />
            </ActionIcon>
          </Tooltip>
          <Tooltip label="Xóa">
            <ActionIcon variant="subtle" color="red" onClick={() => handleDelete(row as CustomerDto)}>
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
        title="Khách hàng"
        subtitle="Quản lý danh sách khách hàng"
        actions={
          <Button leftSection={<IconPlus size={16} />} onClick={() => handleOpen()}>
            Thêm khách hàng
          </Button>
        }
      />

      <TextInput
        placeholder="Tìm theo tên, mã, điện thoại..."
        leftSection={<IconSearch size={16} />}
        value={search}
        onChange={(e) => { setSearch(e.currentTarget.value); setPage(1) }}
        w={350}
      />

      <DataTable
        data={(data?.items ?? []) as Row[]}
        columns={columns}
        isLoading={isLoading}
        total={data?.totalCount}
        page={page}
        pageSize={PAGE_SIZE}
        onPageChange={setPage}
        rowKey="id"
      />

      <DrawerForm
        opened={opened}
        onClose={close}
        title={editing ? 'Sửa khách hàng' : 'Thêm khách hàng'}
        onSubmit={() => { form.onSubmit(handleSubmit)() }}
        isSubmitting={isSaving}
        size="lg"
      >
        <Group grow>
          <TextInput label="Mã KH" placeholder="KH001" required {...form.getInputProps('code')} />
          <TextInput label="Tên khách hàng" placeholder="Nguyễn Văn A" required {...form.getInputProps('name')} />
        </Group>
        <Group grow>
          <TextInput label="Điện thoại" placeholder="0901234567" {...form.getInputProps('phone')} />
          <TextInput label="Email" placeholder="email@example.com" {...form.getInputProps('email')} />
        </Group>
        <TextInput label="Địa chỉ" placeholder="Địa chỉ khách hàng" {...form.getInputProps('address')} />
        <Group grow>
          <TextInput label="Mã số thuế" placeholder="0123456789" {...form.getInputProps('taxCode')} />
        </Group>
      </DrawerForm>
    </Stack>
  )
}
