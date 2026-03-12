import { AppShell, Group, Text, ActionIcon, Menu, Avatar, Tabs, useMantineColorScheme, Badge, Button } from '@mantine/core'
import { Outlet, useNavigate } from 'react-router-dom'
import { IconShoppingCart, IconHistory, IconLogout, IconReportMoney, IconSun, IconMoon, IconCashRegister } from '@tabler/icons-react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '@pos/auth'

export function PosLayout() {
  const navigate = useNavigate()
  const { user, clearAuth } = useAuth()
  const { colorScheme, toggleColorScheme } = useMantineColorScheme()
  const { t, i18n } = useTranslation('pos')

  const handleLogout = () => {
    clearAuth()
    navigate('/auth/login')
  }

  return (
    <AppShell header={{ height: 56 }} padding={0}>
      <AppShell.Header>
        <Group h="100%" px="md" justify="space-between">
          <Group gap="xs">
            <IconCashRegister size={20} color="var(--mantine-color-teal-6)" />
            <Text fw={700} size="lg" c="teal">POS Terminal</Text>
            <Badge color="teal" variant="filled" size="xs" radius="sm">CASHIER</Badge>
            <Tabs
              value={location.pathname === '/' ? 'pos' : location.pathname === '/shift' ? 'shift' : 'history'}
              onChange={(v) => navigate(v === 'pos' ? '/' : v === 'shift' ? '/shift' : '/history')}
            >
              <Tabs.List>
                <Tabs.Tab value="pos" leftSection={<IconShoppingCart size={14} />}>
                  {t('tab_pos')}
                </Tabs.Tab>
                <Tabs.Tab value="history" leftSection={<IconHistory size={14} />}>
                  {t('tab_history')}
                </Tabs.Tab>
                <Tabs.Tab value="shift" leftSection={<IconReportMoney size={14} />}>
                  {t('tab_shift')}
                </Tabs.Tab>
              </Tabs.List>
            </Tabs>
          </Group>

          <Group gap="xs">
            <Button
              variant="subtle"
              size="compact-sm"
              onClick={() => void i18n.changeLanguage(i18n.language === 'vi' ? 'en' : 'vi')}
              title="Đổi ngôn ngữ"
            >
              {i18n.language === 'vi' ? 'VI' : 'EN'}
            </Button>
            <ActionIcon variant="subtle" onClick={() => toggleColorScheme()} title="Đổi giao diện">
              {colorScheme === 'dark' ? <IconSun size={18} /> : <IconMoon size={18} />}
            </ActionIcon>
            <Menu shadow="md" width={160}>
            <Menu.Target>
              <ActionIcon variant="subtle" size="lg">
                <Avatar size="sm" color="teal" radius="xl">
                  {user?.fullName?.charAt(0) ?? 'U'}
                </Avatar>
              </ActionIcon>
            </Menu.Target>
            <Menu.Dropdown>
              <Menu.Label>{user?.fullName}</Menu.Label>
              <Menu.Divider />
              <Menu.Item leftSection={<IconLogout size={16} />} color="red" onClick={handleLogout}>
                {t('logout')}
              </Menu.Item>
            </Menu.Dropdown>
          </Menu>
          </Group>
        </Group>
      </AppShell.Header>

      <AppShell.Main h="calc(100vh - 56px)">
        <Outlet />
      </AppShell.Main>
    </AppShell>
  )
}
