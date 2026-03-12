import { Stack, Paper, Group, Text, Badge, Divider, Avatar } from '@mantine/core'
import { useQuery } from '@tanstack/react-query'
import { PageHeader } from '@pos/ui'
import { authApi } from '@pos/api-client'

export default function ProfilePage() {
  const { data: user, isLoading } = useQuery({
    queryKey: ['auth-me'],
    queryFn: () => authApi.me(),
  })

  return (
    <Stack gap="lg">
      <PageHeader title="Hồ sơ cá nhân" subtitle="Thông tin tài khoản của bạn" />

      <Paper withBorder p="md" radius="md" maw={600}>
        {isLoading ? (
          <Text c="dimmed">Đang tải...</Text>
        ) : user ? (
          <Stack gap="md">
            <Group>
              <Avatar size={64} radius="xl" color="blue">
                {user.fullName.charAt(0).toUpperCase()}
              </Avatar>
              <Stack gap={2}>
                <Text fw={700} size="lg">{user.fullName}</Text>
                <Text size="sm" c="dimmed">{user.email}</Text>
              </Stack>
            </Group>

            <Divider />

            <Group justify="space-between">
              <Text size="sm" c="dimmed" w={140}>Trạng thái</Text>
              <Badge color={user.status === 'Active' ? 'green' : 'red'} variant="light">
                {user.status === 'Active' ? 'Đang hoạt động' : 'Bị khóa'}
              </Badge>
            </Group>

            {user.branchIds && user.branchIds.length > 0 && (
              <Group justify="space-between">
                <Text size="sm" c="dimmed" w={140}>Chi nhánh</Text>
                <Text size="sm">{user.branchIds.join(', ')}</Text>
              </Group>
            )}

            <Group justify="space-between">
              <Text size="sm" c="dimmed" w={140}>Vai trò</Text>
              <Group gap="xs">
                {user.roleIds.length > 0 ? (
                  user.roleIds.map((r) => (
                    <Badge key={r} variant="outline" size="sm">{r}</Badge>
                  ))
                ) : (
                  <Text size="sm" c="dimmed">Chưa gán vai trò</Text>
                )}
              </Group>
            </Group>

          </Stack>
        ) : null}
      </Paper>
    </Stack>
  )
}
