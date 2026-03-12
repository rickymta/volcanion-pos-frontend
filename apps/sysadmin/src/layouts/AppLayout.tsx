import {
  AppShell, Burger, Group, Text, NavLink, ScrollArea,
  Menu, ActionIcon, Avatar, useMantineColorScheme, Badge, Box, Button,
} from '@mantine/core'
import { useDisclosure } from '@mantine/hooks'
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom'
import {
  IconDashboard, IconBuilding, IconActivity, IconShieldCheck,
  IconSettings, IconLogout, IconBriefcase, IconSun, IconMoon, IconServer,
} from '@tabler/icons-react'
import { useTranslation } from 'react-i18next'
import { systemApi } from '@pos/sysadmin-client'

export function AppLayout() {
  const [opened, { toggle }] = useDisclosure()
  const location = useLocation()
  const navigate = useNavigate()
  const { colorScheme, toggleColorScheme } = useMantineColorScheme()
  const { t, i18n } = useTranslation('sysadmin')

  const navItems = [
    { label: t('nav_dashboard'), href: '/', icon: <IconDashboard size={16} /> },
    { label: 'Tenants', href: '/tenants', icon: <IconBuilding size={16} /> },
    { label: t('nav_health'), href: '/system/health', icon: <IconActivity size={16} /> },
    { label: t('nav_config'), href: '/system/config', icon: <IconSettings size={16} /> },
    { label: t('nav_jobs'), href: '/jobs', icon: <IconBriefcase size={16} /> },
    { label: t('nav_audit_logs'), href: '/audit-logs', icon: <IconShieldCheck size={16} /> },
  ]

  const handleLogout = () => {
    systemApi.logout()
    document.cookie = 'pos-sysadmin-token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT'
    navigate('/login')
  }

  return (
    <AppShell
      header={{ height: 60 }}
      navbar={{ width: 240, breakpoint: 'sm', collapsed: { mobile: !opened } }}
      padding="md"
    >
      <AppShell.Header>
        <Group h="100%" px="md" justify="space-between">
          <Group>
            <Burger opened={opened} onClick={toggle} hiddenFrom="sm" size="sm" />
            <Group gap={6}>
              <IconServer size={20} color="var(--mantine-color-red-6)" />
              <Text fw={700} size="lg" c="red">POS Sysadmin</Text>
              <Badge color="red" variant="filled" size="xs" radius="sm">SYSTEM</Badge>
            </Group>
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
            <Menu shadow="md" width={180}>
              <Menu.Target>
                <ActionIcon variant="subtle" size="lg">
                  <Avatar size="sm" color="red" radius="xl">SA</Avatar>
                </ActionIcon>
              </Menu.Target>
              <Menu.Dropdown>
                <Menu.Item leftSection={<IconLogout size={16} />} color="red" onClick={handleLogout}>
                  {t('logout')}
                </Menu.Item>
              </Menu.Dropdown>
            </Menu>
          </Group>
        </Group>
      </AppShell.Header>

      <AppShell.Navbar p="xs">
        <ScrollArea>
          <Box mb="xs" px={4} pt={4}>
            <Text size="xs" c="dimmed" fw={500} tt="uppercase">{t('nav_system')}</Text>
          </Box>
          {navItems.map((item) => (
            <NavLink
              key={item.href}
              component={Link}
              to={item.href}
              label={item.label}
              leftSection={item.icon}
              active={location.pathname === item.href}
              mb={2}
            />
          ))}
        </ScrollArea>
      </AppShell.Navbar>

      <AppShell.Main>
        <Outlet />
      </AppShell.Main>
    </AppShell>
  )
}
