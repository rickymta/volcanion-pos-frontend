import { Center, Paper, Stack, Title, Text, Group, ThemeIcon } from '@mantine/core'
import { IconBuildingStore } from '@tabler/icons-react'
import { Outlet } from 'react-router-dom'

export function AuthLayout() {
  return (
    <Center mih="100vh" bg="gray.0">
      <Stack align="center" gap="lg" w="100%" maw={420} px="md">
        <Stack align="center" gap={4}>
          <Group gap={8}>
            <ThemeIcon color="blue" variant="light" size="lg" radius="md">
              <IconBuildingStore size={20} />
            </ThemeIcon>
            <Title order={2} c="posBlue">POS Manager</Title>
          </Group>
          <Text c="dimmed" size="sm">Hệ thống quản lý bán hàng</Text>
        </Stack>
        <Paper withBorder shadow="sm" p="xl" w="100%" radius="md">
          <Outlet />
        </Paper>
      </Stack>
    </Center>
  )
}
