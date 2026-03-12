import { useState } from 'react'
import {
  Stack, Group, TextInput, Badge, ActionIcon, Collapse, Text, Button,
} from '@mantine/core'
import { useForm } from '@mantine/form'
import { notifications } from '@mantine/notifications'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { IconPlus, IconChevronRight, IconChevronDown, IconEdit, IconTrash } from '@tabler/icons-react'
import { branchesApi } from '@pos/api-client'
import type { BranchDto } from '@pos/api-client'
import { PageHeader, DrawerForm } from '@pos/ui'
import { openConfirm } from '@pos/ui'

interface FormValues {
  name: string
  address: string
  phone: string
  code: string
  parentBranchId: string
}

// Build tree from flat list (API may return flat)
function buildTree(items: BranchDto[]): BranchDto[] {
  if (items.every((i) => !i.parentBranchId)) return items.map((i) => ({ ...i, children: [] }))
  if (items.some((i) => i.children && i.children.length > 0)) return items
  const map = new Map<string, BranchDto>()
  items.forEach((i) => map.set(i.id, { ...i, children: [] }))
  const roots: BranchDto[] = []
  map.forEach((item) => {
    if (item.parentBranchId && map.has(item.parentBranchId)) {
      map.get(item.parentBranchId)!.children!.push(item)
    } else {
      roots.push(item)
    }
  })
  return roots
}

function BranchRow({
  branch,
  depth,
  onEdit,
  onDelete,
}: {
  branch: BranchDto
  depth: number
  onEdit: (b: BranchDto) => void
  onDelete: (b: BranchDto) => void
}) {
  const [open, setOpen] = useState(true)
  const hasChildren = (branch.children ?? []).length > 0

  return (
    <>
      <Group
        px="md"
        py={8}
        style={{
          paddingLeft: `${16 + depth * 28}px`,
          borderBottom: '1px solid var(--mantine-color-dark-6)',
        }}
        justify="space-between"
        wrap="nowrap"
      >
        <Group gap="xs" flex={1} wrap="nowrap">
          <ActionIcon
            size="xs"
            variant="transparent"
            style={{ visibility: hasChildren ? 'visible' : 'hidden' }}
            onClick={() => setOpen((o) => !o)}
          >
            {open ? <IconChevronDown size={14} /> : <IconChevronRight size={14} />}
          </ActionIcon>
          <Text size="sm" fw={hasChildren ? 600 : 400}>{branch.name}</Text>
          {branch.address && <Text size="xs" c="dimmed">— {branch.address}</Text>}
          {branch.phone && <Text size="xs" c="dimmed">📞 {branch.phone}</Text>}
          {branch.status === 'Inactive' && <Badge size="xs" color="gray">Ngừng</Badge>}
        </Group>
        <Group gap="xs">
          <ActionIcon size="sm" variant="subtle" onClick={() => onEdit(branch)}>
            <IconEdit size={14} />
          </ActionIcon>
          <ActionIcon size="sm" color="red" variant="subtle" onClick={() => onDelete(branch)}>
            <IconTrash size={14} />
          </ActionIcon>
        </Group>
      </Group>
      {hasChildren && (
        <Collapse in={open}>
          {(branch.children ?? []).map((child) => (
            <BranchRow key={child.id} branch={child} depth={depth + 1} onEdit={onEdit} onDelete={onDelete} />
          ))}
        </Collapse>
      )}
    </>
  )
}

export default function BranchListPage() {
  const qc = useQueryClient()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)

  const form = useForm<FormValues>({
    initialValues: { name: '', address: '', phone: '', code: '', parentBranchId: '' },
    validate: { name: (v) => (!v ? 'Nhập tên chi nhánh' : null), code: (v) => (!v ? 'Nhập mã chi nhánh' : null) },
  })

  const { data: rawBranches, isLoading } = useQuery({
    queryKey: ['branches'],
    queryFn: () => branchesApi.list(),
  })

  const branches = buildTree(rawBranches ?? [])
  const flatBranches = rawBranches ?? []

  const parentOptions = [
    { value: '', label: '— Không có (gốc) —' },
    ...flatBranches.map((b) => ({ value: b.id, label: b.name })),
  ]

  const createMutation = useMutation({
    mutationFn: (v: FormValues) =>
      branchesApi.create({ name: v.name, code: v.code, address: v.address || undefined, phone: v.phone || undefined, parentBranchId: v.parentBranchId || undefined }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['branches'] })
      notifications.show({ color: 'green', message: 'Tạo chi nhánh thành công' })
      setDrawerOpen(false)
      form.reset()
    },
    onError: () => notifications.show({ color: 'red', message: 'Tạo chi nhánh thất bại' }),
  })

  const updateMutation = useMutation({
    mutationFn: (v: FormValues) =>
      branchesApi.update(editId!, { name: v.name, address: v.address || undefined, phone: v.phone || undefined }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['branches'] })
      notifications.show({ color: 'green', message: 'Cập nhật thành công' })
      setDrawerOpen(false)
      form.reset()
    },
    onError: () => notifications.show({ color: 'red', message: 'Cập nhật thất bại' }),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => branchesApi.delete(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['branches'] })
      notifications.show({ color: 'green', message: 'Đã xóa chi nhánh' })
    },
    onError: () => notifications.show({ color: 'red', message: 'Xóa thất bại' }),
  })

  function openCreate() {
    setEditId(null)
    form.reset()
    setDrawerOpen(true)
  }

  function openEdit(b: BranchDto) {
    setEditId(b.id)
    form.setValues({ name: b.name, address: b.address ?? '', phone: b.phone ?? '', code: b.code ?? '', parentBranchId: b.parentBranchId ?? '' })
    setDrawerOpen(true)
  }

  function handleDelete(b: BranchDto) {
    openConfirm({
      title: 'Xóa chi nhánh',
      message: `Bạn có chắc muốn xóa "${b.name}"?`,
      onConfirm: () => deleteMutation.mutate(b.id),
    })
  }

  function handleSubmit(values: FormValues) {
    if (editId) updateMutation.mutate(values)
    else createMutation.mutate(values)
  }

  return (
    <Stack gap={0} h="100%">
      <PageHeader
        title="Chi nhánh"
        subtitle="Quản lý hệ thống chi nhánh"
        actions={
          <Button leftSection={<IconPlus size={16} />} onClick={openCreate}>
            Thêm chi nhánh
          </Button>
        }
      />

      {/* Header row */}
      <Group
        px="md"
        py={8}
        style={{ borderBottom: '2px solid var(--mantine-color-dark-4)' }}
        justify="space-between"
      >
        <Text size="xs" c="dimmed" fw={600}>Tên chi nhánh</Text>
        <Text size="xs" c="dimmed" fw={600}>Thao tác</Text>
      </Group>

      {!isLoading && branches.length === 0 && (
        <Text c="dimmed" ta="center" py="xl">Chưa có chi nhánh</Text>
      )}

      {branches.map((b) => (
        <BranchRow key={b.id} branch={b} depth={0} onEdit={openEdit} onDelete={handleDelete} />
      ))}

      <DrawerForm
        opened={drawerOpen}
        onClose={() => { setDrawerOpen(false); form.reset() }}
        title={editId ? 'Sửa chi nhánh' : 'Thêm chi nhánh'}
        onSubmit={() => { form.onSubmit(handleSubmit)() }}
        isLoading={createMutation.isPending || updateMutation.isPending}
      >
        <Stack gap="sm">
          <TextInput
            label="Tên chi nhánh"
            placeholder="Chi nhánh Hà Nội"
            {...form.getInputProps('name')}
            required
          />
          <TextInput
            label="Mã chi nhánh"
            placeholder="HN01"
            {...form.getInputProps('code')}
            required
          />
          <TextInput
            label="Địa chỉ"
            placeholder="123 Đường ABC, Quận 1, TP.HCM"
            {...form.getInputProps('address')}
          />
          <TextInput
            label="Điện thoại"
            placeholder="0901 234 567"
            {...form.getInputProps('phone')}
          />
          {!editId && (
            <select
              style={{
                width: '100%',
                padding: '8px',
                borderRadius: 4,
                border: '1px solid var(--mantine-color-dark-4)',
                background: 'var(--mantine-color-dark-6)',
                color: 'var(--mantine-color-white)',
                fontSize: 14,
              }}
              value={form.values.parentBranchId}
              onChange={(e) => form.setFieldValue('parentBranchId', e.target.value)}
            >
              {parentOptions.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          )}
        </Stack>
      </DrawerForm>
    </Stack>
  )
}
