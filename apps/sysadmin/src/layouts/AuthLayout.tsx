import { Center, Paper, Stack, Title, Text, Group, ThemeIcon } from '@mantine/core'
import { IconServer } from '@tabler/icons-react'
import { Outlet } from 'react-router-dom'

export function AuthLayout() {
  return (
    <Center mih="100vh" bg="dark.8">
      <Stack align="center" gap="lg" w="100%" maw={420} px="md">
        <Stack align="center" gap={4}>
          <Group gap={8}>
            <ThemeIcon color="red" variant="filled" size="lg" radius="md">
              <IconServer size={20} />
            </ThemeIcon>
            <Title order={2} c="red">POS Sysadmin</Title>
          </Group>
          <Text c="dimmed" size="sm">Hệ thống quản trị hệ thống</Text>
        </Stack>
        <Paper
          withBorder
          shadow="sm"
          p="xl"
          w="100%"
          radius="md"
          bg="dark.7"
          style={{ borderColor: 'var(--mantine-color-red-9)' }}
        >
          <Outlet />
        </Paper>
      </Stack>
    </Center>
  )
}
