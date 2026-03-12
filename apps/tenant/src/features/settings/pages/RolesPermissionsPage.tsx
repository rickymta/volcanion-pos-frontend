import { useState, useEffect } from 'react'
import {
  Stack, Group, Text, Badge, Button, Checkbox, TextInput, Divider,
  Card, Grid, Loader, Center, ActionIcon, Modal,
} from '@mantine/core'
import { useForm } from '@mantine/form'
import { notifications } from '@mantine/notifications'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { IconPlus, IconEdit, IconTrash } from '@tabler/icons-react'
import { authApi } from '@pos/api-client'
import type { RoleDto, PermissionDto } from '@pos/api-client'
import { PageHeader } from '@pos/ui'
import { openConfirm } from '@pos/ui'

// Group permissions by resource
function groupByResource(permissions: PermissionDto[]): Record<string, PermissionDto[]> {
  const result: Record<string, PermissionDto[]> = {}
  for (const p of permissions) {
    const list = result[p.resource]
    if (list) list.push(p)
    else result[p.resource] = [p]
  }
  return result
}

export default function RolesPermissionsPage() {
  const qc = useQueryClient()
  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null)
  const [checkedPermIds, setCheckedPermIds] = useState<Set<string>>(new Set())
  const [roleModalOpen, setRoleModalOpen] = useState(false)
  const [editRoleId, setEditRoleId] = useState<string | null>(null)

  const roleForm = useForm({
    initialValues: { name: '', description: '' },
    validate: { name: (v) => (!v ? 'Nhập tên vai trò' : null) },
  })

  const { data: roles, isLoading: loadingRoles } = useQuery({
    queryKey: ['roles'],
    queryFn: () => authApi.listRoles(),
  })

  const { data: allPermissions, isLoading: loadingPerms } = useQuery({
    queryKey: ['permissions'],
    queryFn: () => authApi.listPermissions(),
  })

  const selectedRole = (roles ?? []).find((r) => r.id === selectedRoleId)

  // Sync checkbox state when role changes
  useEffect(() => {
    if (selectedRole) {
      setCheckedPermIds(new Set(selectedRole.permissions.map((p) => p.id)))
    } else {
      setCheckedPermIds(new Set())
    }
  }, [selectedRoleId, roles])

  const assignMutation = useMutation({
    mutationFn: () =>
      authApi.assignPermissions(selectedRoleId!, { permissionIds: Array.from(checkedPermIds) }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['roles'] })
      notifications.show({ color: 'green', message: 'Lưu phân quyền thành công' })
    },
    onError: () => notifications.show({ color: 'red', message: 'Lưu phân quyền thất bại' }),
  })

  const createRoleMutation = useMutation({
    mutationFn: (v: { name: string; description: string }) =>
      authApi.createRole({ name: v.name, description: v.description || undefined }),
    onSuccess: (role) => {
      void qc.invalidateQueries({ queryKey: ['roles'] })
      notifications.show({ color: 'green', message: `Tạo vai trò "${role.name}" thành công` })
      setRoleModalOpen(false)
      roleForm.reset()
    },
    onError: () => notifications.show({ color: 'red', message: 'Tạo vai trò thất bại' }),
  })

  const updateRoleMutation = useMutation({
    mutationFn: (v: { name: string; description: string }) =>
      authApi.updateRole(editRoleId!, { name: v.name, description: v.description || undefined }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['roles'] })
      notifications.show({ color: 'green', message: 'Cập nhật vai trò thành công' })
      setRoleModalOpen(false)
      roleForm.reset()
    },
    onError: () => notifications.show({ color: 'red', message: 'Cập nhật thất bại' }),
  })

  const deleteRoleMutation = useMutation({
    mutationFn: (id: string) => authApi.deleteRole(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['roles'] })
      if (selectedRoleId === editRoleId) setSelectedRoleId(null)
      notifications.show({ color: 'green', message: 'Đã xóa vai trò' })
    },
    onError: () => notifications.show({ color: 'red', message: 'Xóa thất bại' }),
  })

  function openCreateRole() {
    setEditRoleId(null)
    roleForm.reset()
    setRoleModalOpen(true)
  }

  function openEditRole(role: RoleDto) {
    setEditRoleId(role.id)
    roleForm.setValues({ name: role.name, description: role.description ?? '' })
    setRoleModalOpen(true)
  }

  function handleDeleteRole(role: RoleDto) {
    openConfirm({
      title: 'Xóa vai trò',
      message: `Bạn có chắc muốn xóa vai trò "${role.name}"?`,
      onConfirm: () => deleteRoleMutation.mutate(role.id),
    })
  }

  function handleRoleSubmit(v: { name: string; description: string }) {
    if (editRoleId) updateRoleMutation.mutate(v)
    else createRoleMutation.mutate(v)
  }

  function togglePermission(permId: string) {
    setCheckedPermIds((prev) => {
      const next = new Set(prev)
      if (next.has(permId)) next.delete(permId)
      else next.add(permId)
      return next
    })
  }

  function toggleResource(perms: PermissionDto[], check: boolean) {
    setCheckedPermIds((prev) => {
      const next = new Set(prev)
      perms.forEach((p) => (check ? next.add(p.id) : next.delete(p.id)))
      return next
    })
  }

  const grouped = groupByResource(allPermissions ?? [])
  const hasChanges = selectedRole
    ? JSON.stringify([...checkedPermIds].sort()) !==
      JSON.stringify(selectedRole.permissions.map((p) => p.id).sort())
    : false

  if (loadingRoles || loadingPerms) {
    return <Center py="xl"><Loader /></Center>
  }

  return (
    <>
      <PageHeader
        title="Vai trò & Phân quyền"
        subtitle="Quản lý vai trò và quyền truy cập"
        actions={
          <Button leftSection={<IconPlus size={16} />} onClick={openCreateRole}>
            Thêm vai trò
          </Button>
        }
      />

      <Grid px="md" py="md" gutter="md" style={{ flex: 1 }}>
        {/* Left: Role list */}
        <Grid.Col span={3}>
          <Stack gap="xs">
            <Text size="sm" fw={600} c="dimmed">DANH SÁCH VAI TRÒ</Text>
            {(roles ?? []).length === 0 && (
              <Text size="sm" c="dimmed">Chưa có vai trò</Text>
            )}
            {(roles ?? []).map((role) => (
              <Card
                key={role.id}
                withBorder
                padding="sm"
                style={{
                  cursor: 'pointer',
                  borderColor: selectedRoleId === role.id
                    ? 'var(--mantine-color-blue-5)'
                    : undefined,
                }}
                onClick={() => setSelectedRoleId(role.id)}
              >
                <Group justify="space-between" wrap="nowrap">
                  <Stack gap={2} flex={1}>
                    <Text size="sm" fw={600}>{role.name}</Text>
                    {role.description && (
                      <Text size="xs" c="dimmed" lineClamp={1}>{role.description}</Text>
                    )}
                    <Badge size="xs" variant="light" color="blue">
                      {role.permissions.length} quyền
                    </Badge>
                  </Stack>
                  <Stack gap={2}>
                    <ActionIcon size="xs" variant="subtle" onClick={(e) => { e.stopPropagation(); openEditRole(role) }}>
                      <IconEdit size={12} />
                    </ActionIcon>
                    <ActionIcon size="xs" color="red" variant="subtle" onClick={(e) => { e.stopPropagation(); handleDeleteRole(role) }}>
                      <IconTrash size={12} />
                    </ActionIcon>
                  </Stack>
                </Group>
              </Card>
            ))}
          </Stack>
        </Grid.Col>

        {/* Right: Permission matrix */}
        <Grid.Col span={9}>
          {!selectedRoleId ? (
            <Center h={200}>
              <Text c="dimmed">Chọn một vai trò để xem và chỉnh sửa quyền</Text>
            </Center>
          ) : (
            <Stack gap="sm">
              <Group justify="space-between">
                <Text fw={600}>Quyền của vai trò: <Text span c="blue">{selectedRole?.name}</Text></Text>
                <Group gap="sm">
                  {hasChanges && (
                    <Text size="xs" c="orange">Có thay đổi chưa lưu</Text>
                  )}
                  <Button
                    size="sm"
                    onClick={() => assignMutation.mutate()}
                    loading={assignMutation.isPending}
                    disabled={!hasChanges}
                  >
                    Lưu phân quyền
                  </Button>
                  <Button
                    size="sm"
                    variant="default"
                    onClick={() => setCheckedPermIds(new Set(selectedRole?.permissions.map((p) => p.id) ?? []))}
                    disabled={!hasChanges}
                  >
                    Đặt lại
                  </Button>
                </Group>
              </Group>

              <Divider />

              {Object.entries(grouped).map(([resource, perms]) => {
                const allChecked = perms.every((p) => checkedPermIds.has(p.id))
                const someChecked = perms.some((p) => checkedPermIds.has(p.id))
                return (
                  <Card key={resource} withBorder padding="sm">
                    <Group mb="xs">
                      <Checkbox
                        checked={allChecked}
                        indeterminate={someChecked && !allChecked}
                        onChange={(e) => toggleResource(perms, e.currentTarget.checked)}
                        fw={600}
                      />
                      <Text size="sm" fw={600}>{resource}</Text>
                      <Badge size="xs" variant="light">{perms.filter((p) => checkedPermIds.has(p.id)).length}/{perms.length}</Badge>
                    </Group>
                    <Group gap="sm" pl="lg">
                      {perms.map((perm) => (
                        <Checkbox
                          key={perm.id}
                          label={perm.action}
                          checked={checkedPermIds.has(perm.id)}
                          onChange={() => togglePermission(perm.id)}
                          size="sm"
                        />
                      ))}
                    </Group>
                  </Card>
                )
              })}

              {Object.keys(grouped).length === 0 && (
                <Text c="dimmed" ta="center" py="xl">Chưa có quyền nào được định nghĩa</Text>
              )}
            </Stack>
          )}
        </Grid.Col>
      </Grid>

      {/* Role create/edit modal */}
      <Modal
        opened={roleModalOpen}
        onClose={() => { setRoleModalOpen(false); roleForm.reset() }}
        title={editRoleId ? 'Sửa vai trò' : 'Thêm vai trò'}
        size="sm"
      >
        <Stack gap="sm">
          <TextInput
            label="Tên vai trò"
            placeholder="VD: Quản lý kho"
            {...roleForm.getInputProps('name')}
            required
          />
          <TextInput
            label="Mô tả"
            placeholder="Mô tả ngắn về vai trò này"
            {...roleForm.getInputProps('description')}
          />
          <Group justify="flex-end">
            <Button variant="default" onClick={() => setRoleModalOpen(false)}>Hủy</Button>
            <Button
              loading={createRoleMutation.isPending || updateRoleMutation.isPending}
              onClick={() => { roleForm.onSubmit(handleRoleSubmit)() }}
            >
              {editRoleId ? 'Cập nhật' : 'Tạo vai trò'}
            </Button>
          </Group>
        </Stack>
      </Modal>
    </>
  )
}
