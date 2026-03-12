import { Center, Paper, Stack, Title, Text, Group, ThemeIcon } from '@mantine/core'
import { IconCashRegister } from '@tabler/icons-react'
import { Outlet } from 'react-router-dom'

export function AuthLayout() {
  return (
    <Center mih="100vh" bg="dark.8">
      <Stack align="center" gap="lg" w="100%" maw={420} px="md">
        <Stack align="center" gap={4}>
          <Group gap={8}>
            <ThemeIcon color="teal" variant="filled" size="lg" radius="md">
              <IconCashRegister size={20} />
            </ThemeIcon>
            <Title order={2} c="teal">POS Terminal</Title>
          </Group>
          <Text c="dimmed" size="sm">Đăng nhập để bắt đầu bán hàng</Text>
        </Stack>
        <Paper withBorder shadow="sm" p="xl" w="100%" radius="md" bg="dark.7" style={{ borderColor: 'var(--mantine-color-teal-9)' }}>
          <Outlet />
        </Paper>
      </Stack>
    </Center>
  )
}
