import { useState } from 'react'
import {
  Stack, Group, TextInput, Badge, ActionIcon, Collapse, Text, Button, Select, Switch,
} from '@mantine/core'
import { useForm } from '@mantine/form'
import { notifications } from '@mantine/notifications'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { IconPlus, IconChevronRight, IconChevronDown, IconEdit, IconTrash } from '@tabler/icons-react'
import { branchesApi } from '@pos/api-client'
import type { BranchDto } from '@pos/api-client'
import { PageHeader, DrawerForm } from '@pos/ui'
import { openConfirm } from '@pos/ui'
import { useIsAdmin } from '@pos/auth'

interface FormValues {
  code: string
  name: string
  address: string
  phone: string
  parentBranchId: string
  status: number
}

/** Flatten a branch tree into a flat array (for parent select options) */
function flattenTree(branches: BranchDto[]): BranchDto[] {
  return branches.flatMap((b) => [b, ...flattenTree(b.subBranches ?? [])])
}

function BranchRow({
  branch,
  depth,
  canAdmin,
  onEdit,
  onDelete,
}: {
  branch: BranchDto
  depth: number
  canAdmin: boolean
  onEdit: (b: BranchDto) => void
  onDelete: (b: BranchDto) => void
}) {
  const [open, setOpen] = useState(true)
  const hasChildren = (branch.subBranches ?? []).length > 0

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
          <Text size="xs" c="blue" ff="monospace">{branch.code}</Text>
          {branch.address && <Text size="xs" c="dimmed">— {branch.address}</Text>}
          {branch.phone && <Text size="xs" c="dimmed">📞 {branch.phone}</Text>}
          {branch.status === 0 && <Badge size="xs" color="gray">Ngừng</Badge>}
        </Group>
        {canAdmin && (
          <Group gap="xs">
            <ActionIcon size="sm" variant="subtle" onClick={() => onEdit(branch)}>
              <IconEdit size={14} />
            </ActionIcon>
            <ActionIcon size="sm" color="red" variant="subtle" onClick={() => onDelete(branch)}>
              <IconTrash size={14} />
            </ActionIcon>
          </Group>
        )}
      </Group>
      {hasChildren && (
        <Collapse in={open}>
          {(branch.subBranches ?? []).map((child) => (
            <BranchRow key={child.id} branch={child} depth={depth + 1} canAdmin={canAdmin} onEdit={onEdit} onDelete={onDelete} />
          ))}
        </Collapse>
      )}
    </>
  )
}

export default function BranchListPage() {
  const qc = useQueryClient()
  const canAdmin = useIsAdmin()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)

  const form = useForm<FormValues>({
    initialValues: { code: '', name: '', address: '', phone: '', parentBranchId: '', status: 1 },
    validate: {
      name: (v) => (!v.trim() ? 'Nhập tên chi nhánh' : null),
      code: (v) => (!v.trim() ? 'Nhập mã chi nhánh' : null),
    },
  })

  // Use the tree endpoint — no client-side tree building needed
  const { data: tree = [], isLoading } = useQuery({
    queryKey: ['branches', 'tree'],
    queryFn: () => branchesApi.getTree(),
  })

  const flatBranches = flattenTree(tree)
  const parentOptions = [
    { value: '', label: '— Không có (gốc) —' },
    ...flatBranches.map((b) => ({ value: b.id, label: `${b.name} (${b.code})` })),
  ]

  const createMutation = useMutation({
    mutationFn: (v: FormValues) =>
      branchesApi.create({
        code: v.code,
        name: v.name,
        address: v.address || null,
        phone: v.phone || null,
        parentBranchId: v.parentBranchId || null,
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['branches'] })
      notifications.show({ color: 'green', message: 'Tạo chi nhánh thành công' })
      setDrawerOpen(false)
      form.reset()
    },
    onError: (err: unknown) =>
      notifications.show({ color: 'red', message: (err as { message?: string }).message ?? 'Tạo chi nhánh thất bại' }),
  })

  const updateMutation = useMutation({
    mutationFn: (v: FormValues) =>
      branchesApi.update(editId!, {
        code: v.code,
        name: v.name,
        address: v.address || null,
        phone: v.phone || null,
        parentBranchId: v.parentBranchId || null,
        status: v.status,
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['branches'] })
      notifications.show({ color: 'green', message: 'Cập nhật thành công' })
      setDrawerOpen(false)
      form.reset()
    },
    onError: (err: unknown) =>
      notifications.show({ color: 'red', message: (err as { message?: string }).message ?? 'Cập nhật thất bại' }),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => branchesApi.delete(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['branches'] })
      notifications.show({ color: 'green', message: 'Đã xóa chi nhánh' })
    },
    onError: (err: unknown) =>
      notifications.show({ color: 'red', message: (err as { message?: string }).message ?? 'Xóa thất bại' }),
  })

  function openCreate() {
    setEditId(null)
    form.reset()
    setDrawerOpen(true)
  }

  function openEdit(b: BranchDto) {
    setEditId(b.id)
    form.setValues({
      code: b.code,
      name: b.name,
      address: b.address ?? '',
      phone: b.phone ?? '',
      parentBranchId: b.parentBranchId ?? '',
      status: b.status,
    })
    setDrawerOpen(true)
  }

  function handleDelete(b: BranchDto) {
    openConfirm({
      title: 'Xóa chi nhánh',
      message: `Xóa "${b.name}"? Không thể xóa nếu còn chi nhánh con hoặc kho liên kết.`,
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
          canAdmin ? (
            <Button leftSection={<IconPlus size={16} />} onClick={openCreate}>
              Thêm chi nhánh
            </Button>
          ) : undefined
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
        {canAdmin && <Text size="xs" c="dimmed" fw={600}>Thao tác</Text>}
      </Group>

      {!isLoading && tree.length === 0 && (
        <Text c="dimmed" ta="center" py="xl">Chưa có chi nhánh</Text>
      )}

      {tree.map((b) => (
        <BranchRow key={b.id} branch={b} depth={0} canAdmin={canAdmin} onEdit={openEdit} onDelete={handleDelete} />
      ))}

      <DrawerForm
        opened={drawerOpen}
        onClose={() => { setDrawerOpen(false); form.reset() }}
        title={editId ? 'Sửa chi nhánh' : 'Thêm chi nhánh'}
        onSubmit={() => { form.onSubmit(handleSubmit)() }}
        isLoading={createMutation.isPending || updateMutation.isPending}
      >
        <Stack gap="sm">
          <TextInput label="Tên chi nhánh" placeholder="Chi nhánh Hà Nội" required {...form.getInputProps('name')} />
          <TextInput label="Mã chi nhánh" placeholder="HN01" required {...form.getInputProps('code')} />
          <TextInput label="Địa chỉ" placeholder="123 Đường ABC..." {...form.getInputProps('address')} />
          <TextInput label="Điện thoại" placeholder="0901 234 567" {...form.getInputProps('phone')} />
          <Select
            label="Chi nhánh cha"
            data={parentOptions}
            value={form.values.parentBranchId}
            onChange={(v) => form.setFieldValue('parentBranchId', v ?? '')}
          />
          {editId && (
            <Switch
              label="Hoạt động"
              checked={form.values.status === 1}
              onChange={(e) => form.setFieldValue('status', e.currentTarget.checked ? 1 : 0)}
            />
          )}
        </Stack>
      </DrawerForm>
    </Stack>
  )
}
