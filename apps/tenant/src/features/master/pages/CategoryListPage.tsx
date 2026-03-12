import { useState } from 'react'
import { Stack, Group, Button, TextInput, ActionIcon, Tooltip, Badge, Select, Text } from '@mantine/core'
import { useForm } from '@mantine/form'
import { useDisclosure } from '@mantine/hooks'
import { notifications } from '@mantine/notifications'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { IconPlus, IconEdit, IconTrash, IconSearch } from '@tabler/icons-react'
import { PageHeader, DataTable, DrawerForm, openConfirm } from '@pos/ui'
import type { DataTableColumn } from '@pos/ui'
import { categoriesApi } from '@pos/api-client'
import type { CategoryDto } from '@pos/api-client'

type Row = CategoryDto & Record<string, unknown>

// Flatten tree to flat list for display
function flattenCategories(cats: CategoryDto[], depth = 0): CategoryDto[] {
  const result: CategoryDto[] = []
  for (const cat of cats) {
    result.push({ ...cat, name: depth > 0 ? `${'\u00A0'.repeat(depth * 4)}↳ ${cat.name}` : cat.name })
    if (cat.children?.length) {
      result.push(...flattenCategories(cat.children, depth + 1))
    }
  }
  return result
}

export default function CategoryListPage() {
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [editing, setEditing] = useState<CategoryDto | null>(null)
  const [opened, { open, close }] = useDisclosure(false)

  const form = useForm({
    initialValues: { name: '', code: '', parentCategoryId: '' as string | null },
    validate: {
      name: (v: string) => (v.trim() ? null : 'Tên danh mục không được trống'),
      code: (v: string) => (v.trim() ? null : 'Mã danh mục không được trống'),
    },
  })

  const { data: categories = [], isLoading } = useQuery({
    queryKey: ['categories'],
    queryFn: () => categoriesApi.list(),
  })

  const createMutation = useMutation({
    mutationFn: (values: { code: string; name: string; parentCategoryId?: string }) => categoriesApi.create(values),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['categories'] })
      notifications.show({ color: 'green', message: 'Tạo danh mục thành công' })
      close()
    },
    onError: () => notifications.show({ color: 'red', message: 'Tạo danh mục thất bại' }),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, values }: { id: string; values: { code?: string; name?: string; parentCategoryId?: string } }) =>
      categoriesApi.update(id, values),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['categories'] })
      notifications.show({ color: 'green', message: 'Cập nhật thành công' })
      close()
    },
    onError: () => notifications.show({ color: 'red', message: 'Cập nhật thất bại' }),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => categoriesApi.delete(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['categories'] })
      notifications.show({ color: 'green', message: 'Xóa thành công' })
    },
    onError: () => notifications.show({ color: 'red', message: 'Xóa thất bại' }),
  })

  function handleOpen(category?: CategoryDto) {
    if (category) {
      setEditing(category)
      form.setValues({ name: category.name, code: category.code ?? '', parentCategoryId: category.parentCategoryId ?? null })
    } else {
      setEditing(null)
      form.reset()
    }
    open()
  }

  function handleSubmit(values: { name: string; code: string; parentCategoryId: string | null }) {
    const payload = { name: values.name, code: values.code, parentCategoryId: values.parentCategoryId ?? undefined }
    if (editing) {
      updateMutation.mutate({ id: editing.id, values: payload })
    } else {
      createMutation.mutate(payload)
    }
  }

  function handleDelete(category: CategoryDto) {
    openConfirm({
      message: `Xóa danh mục "${category.name}"?`,
      onConfirm: () => deleteMutation.mutate(category.id),
    })
  }

  const flat = flattenCategories(categories)
  const filtered = (flat as Row[]).filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase())
  )

  // For parent select: only top-level categories (no parent)
  const parentOptions = categories
    .filter((c) => !c.parentCategoryId && (!editing || c.id !== editing.id))
    .map((c) => ({ value: c.id, label: c.name }))

  const columns: DataTableColumn<Row>[] = [
    {
      key: 'name',
      header: 'Tên danh mục',
      render: (row) => <Text size="sm">{row.name as string}</Text>,
    },
    {
      key: 'parentName',
      header: 'Danh mục cha',
      render: (row) => (row.parentName as string | undefined) ?? '—',
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
            <ActionIcon variant="subtle" onClick={() => handleOpen(row as CategoryDto)}>
              <IconEdit size={16} />
            </ActionIcon>
          </Tooltip>
          <Tooltip label="Xóa">
            <ActionIcon variant="subtle" color="red" onClick={() => handleDelete(row as CategoryDto)}>
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
        title="Danh mục hàng hóa"
        subtitle="Quản lý danh mục sản phẩm"
        actions={
          <Button leftSection={<IconPlus size={16} />} onClick={() => handleOpen()}>
            Thêm danh mục
          </Button>
        }
      />

      <TextInput
        placeholder="Tìm kiếm danh mục..."
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
        title={editing ? 'Sửa danh mục' : 'Thêm danh mục'}
        onSubmit={() => { form.onSubmit(handleSubmit)() }}
        isSubmitting={isSaving}
      >
        <TextInput
          label="Tên danh mục"
          placeholder="Đồ uống, Thực phẩm..."
          required
          {...form.getInputProps('name')}
        />
        <TextInput
          label="Mã danh mục"
          placeholder="DM001"
          required
          {...form.getInputProps('code')}
        />
        <Select
          label="Danh mục cha"
          placeholder="Chọn danh mục cha (tuỳ chọn)"
          data={parentOptions}
          clearable
          searchable
          {...form.getInputProps('parentCategoryId')}
        />
      </DrawerForm>
    </Stack>
  )
}
