import { AppShell, Burger, Group, Text, NavLink, ScrollArea, Avatar, Menu, ActionIcon, useMantineColorScheme, Badge, Box, Button } from '@mantine/core'
import { useDisclosure } from '@mantine/hooks'
import { Outlet, useNavigate, useLocation, Link } from 'react-router-dom'
import {
  IconDashboard, IconPackage, IconUsers, IconTruck, IconBuildingWarehouse,
  IconCategory, IconRuler, IconShoppingCart, IconReceipt, IconArrowBack,
  IconShoppingBag, IconClipboardList, IconTransfer, IconAdjustments,
  IconCash, IconScale, IconTruckDelivery, IconSettings, IconLogout, IconChevronRight,
  IconSun, IconMoon, IconWallet, IconBuildingStore,
} from '@tabler/icons-react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '@pos/auth'

interface NavItem {
  label: string
  icon: React.ReactNode
  href?: string
  children?: { label: string; href: string; icon: React.ReactNode }[]
}

export function AppLayout() {
  const [opened, { toggle }] = useDisclosure()
  const { t, i18n } = useTranslation('common')
  const { user, clearAuth } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const { colorScheme, toggleColorScheme } = useMantineColorScheme()

  const navItems: NavItem[] = [
    { label: t('nav.dashboard'), icon: <IconDashboard size={16} />, href: '/' },
    {
      label: t('nav.master'),
      icon: <IconPackage size={16} />,
      children: [
        { label: t('nav.products'), href: '/master/products', icon: <IconPackage size={16} /> },
        { label: t('nav.customers'), href: '/master/customers', icon: <IconUsers size={16} /> },
        { label: t('nav.suppliers'), href: '/master/suppliers', icon: <IconTruck size={16} /> },
        { label: t('nav.branches'), href: '/master/branches', icon: <IconBuildingStore size={16} /> },
        { label: t('nav.warehouses'), href: '/master/warehouses', icon: <IconBuildingWarehouse size={16} /> },
        { label: t('nav.categories'), href: '/master/categories', icon: <IconCategory size={16} /> },
        { label: t('nav.units'), href: '/master/units', icon: <IconRuler size={16} /> },
      ],
    },
    {
      label: t('nav.sales'),
      icon: <IconShoppingCart size={16} />,
      children: [
        { label: t('nav.salesOrders'), href: '/sales/orders', icon: <IconShoppingCart size={16} /> },
        { label: t('nav.invoices'), href: '/sales/invoices', icon: <IconReceipt size={16} /> },
        { label: t('nav.salesReturns'), href: '/sales/returns', icon: <IconArrowBack size={16} /> },
      ],
    },
    {
      label: t('nav.purchase'),
      icon: <IconShoppingBag size={16} />,
      children: [
        { label: t('nav.purchaseOrders'), href: '/purchase/orders', icon: <IconShoppingBag size={16} /> },
        { label: t('nav.goodsReceipts'), href: '/purchase/receipts', icon: <IconClipboardList size={16} /> },
        { label: t('nav.purchaseReturns'), href: '/purchase/returns', icon: <IconArrowBack size={16} /> },
      ],
    },
    {
      label: t('nav.inventory'),
      icon: <IconBuildingWarehouse size={16} />,
      children: [
        { label: t('nav.balances'), href: '/inventory/balances', icon: <IconBuildingWarehouse size={16} /> },
        { label: t('nav.transfers'), href: '/inventory/transfers', icon: <IconTransfer size={16} /> },
        { label: t('nav.adjust'), href: '/inventory/adjust', icon: <IconAdjustments size={16} /> },
      ],
    },
    {
      label: t('nav.finance'),
      icon: <IconCash size={16} />,
      children: [
        { label: t('nav.payments'), href: '/finance/payments', icon: <IconCash size={16} /> },
        { label: t('nav.debt'), href: '/finance/debt', icon: <IconScale size={16} /> },
        { label: t('nav.operatingExpenses'), href: '/finance/operating-expenses', icon: <IconWallet size={16} /> },
      ],
    },
    { label: t('nav.delivery'), icon: <IconTruckDelivery size={16} />, href: '/delivery' },
    {
      label: t('nav.settings'),
      icon: <IconSettings size={16} />,
      children: [
        { label: t('nav.users'), href: '/settings/users', icon: <IconUsers size={16} /> },
      ],
    },
  ]

  const handleLogout = () => {
    clearAuth()
    navigate('/auth/login')
  }

  return (
    <AppShell
      header={{ height: 60 }}
      navbar={{ width: 260, breakpoint: 'sm', collapsed: { mobile: !opened } }}
      padding="md"
    >
      <AppShell.Header>
        <Group h="100%" px="md" justify="space-between">
          <Group>
            <Burger opened={opened} onClick={toggle} hiddenFrom="sm" size="sm" />
            <Group gap={6}>
              <IconBuildingStore size={20} color="var(--mantine-color-blue-6)" />
              <Text fw={700} size="lg" c="posBlue">POS Manager</Text>
              <Badge color="blue" variant="light" size="xs" radius="sm">STORE</Badge>
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
            <ActionIcon
              variant="subtle"
              onClick={() => toggleColorScheme()}
              title="Đổi giao diện sáng/tối"
            >
              {colorScheme === 'dark' ? <IconSun size={18} /> : <IconMoon size={18} />}
            </ActionIcon>
            <Menu shadow="md" width={200}>
            <Menu.Target>
              <ActionIcon variant="subtle" size="lg">
                <Avatar size="sm" color="posBlue" radius="xl">
                  {user?.fullName?.charAt(0) ?? 'U'}
                </Avatar>
              </ActionIcon>
            </Menu.Target>
            <Menu.Dropdown>
              <Menu.Label>{user?.fullName}</Menu.Label>
              <Menu.Label>{user?.email}</Menu.Label>
              <Menu.Divider />
              <Menu.Item leftSection={<IconLogout size={16} />} color="red" onClick={handleLogout}>
                Đăng xuất
              </Menu.Item>
            </Menu.Dropdown>
          </Menu>
          </Group>
        </Group>
      </AppShell.Header>

      <AppShell.Navbar p="xs">
        <ScrollArea>
          <Box mb="xs" px={4} pt={4}>
            <Text size="xs" c="dimmed" fw={500} tt="uppercase">Quản lý bán hàng</Text>
          </Box>
          {navItems.map((item) =>
            item.href ? (
              <NavLink
                key={item.href}
                component={Link}
                to={item.href}
                label={item.label}
                leftSection={item.icon}
                active={location.pathname === item.href}
                mb={2}
              />
            ) : (
              <NavLink
                key={item.label}
                label={item.label}
                leftSection={item.icon}
                rightSection={<IconChevronRight size={14} />}
                defaultOpened={item.children?.some((c) => location.pathname.startsWith(c.href))}
                mb={2}
              >
                {item.children?.map((child) => (
                  <NavLink
                    key={child.href}
                    component={Link}
                    to={child.href}
                    label={child.label}
                    leftSection={child.icon}
                    active={location.pathname === child.href}
                    mb={1}
                  />
                ))}
              </NavLink>
            )
          )}
        </ScrollArea>
      </AppShell.Navbar>

      <AppShell.Main>
        <Outlet />
      </AppShell.Main>
    </AppShell>
  )
}
