import { useState } from 'react'
import { Stack, Group, Button, TextInput, ActionIcon, Tooltip, Text, Textarea } from '@mantine/core'
import { useForm } from '@mantine/form'
import { useDisclosure } from '@mantine/hooks'
import { notifications } from '@mantine/notifications'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { IconPlus, IconEdit, IconTrash, IconSearch } from '@tabler/icons-react'
import { PageHeader, DataTable, DrawerForm, openConfirm } from '@pos/ui'
import type { DataTableColumn } from '@pos/ui'
import { categoriesApi } from '@pos/api-client'
import type { CategoryDto } from '@pos/api-client'
import { Select } from '@mantine/core'
import { useIsAdmin, useIsManager } from '@pos/auth'

// ─── Flatten tree to flat list, preserving original data + depth metadata ─────

interface FlatCategory extends CategoryDto {
  _displayName: string
  _depth: number
}

function flattenCategories(cats: CategoryDto[], depth = 0): FlatCategory[] {
  const result: FlatCategory[] = []
  for (const cat of cats) {
    result.push({
      ...cat,
      _displayName: depth > 0 ? `${'\u00A0'.repeat(depth * 4)}↳ ${cat.name}` : cat.name,
      _depth: depth,
    })
    if (cat.children?.length) {
      result.push(...flattenCategories(cat.children, depth + 1))
    }
  }
  return result
}

/** Recursively find a category by id in the original tree */
function findById(cats: CategoryDto[], id: string): CategoryDto | undefined {
  for (const cat of cats) {
    if (cat.id === id) return cat
    const found = findById(cat.children ?? [], id)
    if (found) return found
  }
  return undefined
}

type FormValues = {
  code: string
  name: string
  description: string
  parentCategoryId: string | null
}

export default function CategoryListPage() {
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [editing, setEditing] = useState<CategoryDto | null>(null)
  const [opened, { open, close }] = useDisclosure(false)

  // Role guards — mirrors backend policies:
  //   POST / PUT → [Authorize(Policy = "RequireManager")]  = Admin | Manager
  //   DELETE     → [Authorize(Policy = "RequireAdmin")]    = Admin only
  const canWrite  = useIsManager()   // create + edit
  const canDelete = useIsAdmin()     // delete only

  const form = useForm<FormValues>({
    initialValues: { code: '', name: '', description: '', parentCategoryId: null },
    validate: {
      code: (v) => (v.trim() ? null : 'Mã danh mục không được trống'),
      name: (v) => (v.trim() ? null : 'Tên danh mục không được trống'),
    },
  })

  const { data: categories = [], isLoading } = useQuery({
    queryKey: ['categories'],
    queryFn: () => categoriesApi.list(),
  })

  const createMutation = useMutation({
    mutationFn: (values: FormValues) =>
      categoriesApi.create({
        code: values.code,
        name: values.name,
        description: values.description || null,
        parentCategoryId: values.parentCategoryId || null,
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['categories'] })
      notifications.show({ color: 'green', message: 'Tạo danh mục thành công' })
      close()
    },
    onError: (err: unknown) => notifications.show({
      color: 'red',
      title: 'Tạo danh mục thất bại',
      message: (err as { message?: string })?.message ?? 'Đã xảy ra lỗi',
    }),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, values }: { id: string; values: FormValues }) =>
      categoriesApi.update(id, {
        code: values.code,
        name: values.name,
        description: values.description || null,
        parentCategoryId: values.parentCategoryId || null,
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['categories'] })
      notifications.show({ color: 'green', message: 'Cập nhật thành công' })
      close()
    },
    onError: (err: unknown) => notifications.show({
      color: 'red',
      title: 'Cập nhật thất bại',
      message: (err as { message?: string })?.message ?? 'Đã xảy ra lỗi',
    }),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => categoriesApi.delete(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['categories'] })
      notifications.show({ color: 'green', message: 'Xóa thành công' })
    },
    onError: (err: unknown) => notifications.show({
      color: 'red',
      title: 'Xóa thất bại',
      message: (err as { message?: string })?.message ?? 'Đã xảy ra lỗi',
    }),
  })

  function handleOpen(id?: string) {
    if (id) {
      // Find original (unmodified) category from tree to avoid indented display name
      const original = findById(categories, id)
      if (!original) return
      setEditing(original)
      form.setValues({
        code: original.code,
        name: original.name,
        description: original.description ?? '',
        parentCategoryId: original.parentCategoryId ?? null,
      })
    } else {
      setEditing(null)
      form.reset()
    }
    open()
  }

  function handleSubmit(values: FormValues) {
    if (editing) {
      updateMutation.mutate({ id: editing.id, values })
    } else {
      createMutation.mutate(values)
    }
  }

  function handleDelete(cat: FlatCategory) {
    openConfirm({
      message: `Xóa danh mục "${cat.name}"?`,
      onConfirm: () => deleteMutation.mutate(cat.id),
    })
  }

  const flat = flattenCategories(categories)
  const filtered = flat.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.code.toLowerCase().includes(search.toLowerCase())
  )

  // Parent select: top-level + second-level only (depth 0 and 1); exclude self + descendants when editing
  const editingId = editing?.id
  const parentOptions = flat
    .filter((c) => c._depth <= 1 && c.id !== editingId)
    .map((c) => ({ value: c.id, label: `${'\u00A0'.repeat(c._depth * 4)}${c._depth > 0 ? '↳ ' : ''}${c.name}` }))

  const columns: DataTableColumn<FlatCategory>[] = [
    {
      key: 'name',
      header: 'Tên danh mục',
      render: (row) => <Text size="sm">{row._displayName}</Text>,
    },
    {
      key: 'code',
      header: 'Mã',
      render: (row) => (
        <Text size="sm" ff="monospace" c="blue">{row.code}</Text>
      ),
    },
    {
      key: 'description',
      header: 'Mô tả',
      render: (row) => (
        <Text size="sm" c="dimmed" lineClamp={1}>{row.description ?? '—'}</Text>
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
              <ActionIcon variant="subtle" onClick={() => handleOpen(row.id)}>
                <IconEdit size={16} />
              </ActionIcon>
            </Tooltip>
          )}
          {canDelete && (
            <Tooltip label="Xóa">
              <ActionIcon variant="subtle" color="red" onClick={() => handleDelete(row)}>
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
        title="Danh mục hàng hóa"
        subtitle="Quản lý danh mục sản phẩm"
        actions={
          canWrite ? (
            <Button leftSection={<IconPlus size={16} />} onClick={() => handleOpen()}>
              Thêm danh mục
            </Button>
          ) : undefined
        }
      />

      <TextInput
        placeholder="Tìm tên hoặc mã danh mục..."
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
          label="Mã danh mục"
          placeholder="FOOD, BVRG, FOOD-FRESH..."
          required
          {...form.getInputProps('code')}
        />
        <TextInput
          label="Tên danh mục"
          placeholder="Thực phẩm, Đồ uống..."
          required
          {...form.getInputProps('name')}
        />
        <Textarea
          label="Mô tả"
          placeholder="Mô tả thêm về danh mục (tuỳ chọn)"
          rows={3}
          {...form.getInputProps('description')}
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
