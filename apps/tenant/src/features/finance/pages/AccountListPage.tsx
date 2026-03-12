import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  Stack, Group, Text, Badge, ActionIcon, Collapse, Loader, Center, Title,
} from '@mantine/core'
import { IconChevronRight, IconChevronDown } from '@tabler/icons-react'
import { accountsApi } from '@pos/api-client'
import type { AccountDto } from '@pos/api-client'
import { PageHeader } from '@pos/ui'

const ACCOUNT_TYPE_COLORS: Record<string, string> = {
  Asset: 'blue',
  Liability: 'red',
  Equity: 'grape',
  Revenue: 'green',
  Expense: 'orange',
  CostOfGoods: 'yellow',
}

const ACCOUNT_TYPE_LABELS: Record<string, string> = {
  Asset: 'Tài sản',
  Liability: 'Nợ phải trả',
  Equity: 'Vốn chủ sở hữu',
  Revenue: 'Doanh thu',
  Expense: 'Chi phí',
  CostOfGoods: 'Giá vốn',
}

type AccountNode = AccountDto & { children: AccountNode[] }

function AccountRow({ account, depth = 0 }: { account: AccountNode; depth?: number }) {
  const [open, setOpen] = useState(depth < 1)
  const hasChildren = account.children.length > 0

  return (
    <>
      <Group
        px="md"
        py={6}
        style={{
          paddingLeft: `${16 + depth * 24}px`,
          borderBottom: '1px solid var(--mantine-color-dark-6)',
          cursor: hasChildren ? 'pointer' : 'default',
        }}
        onClick={() => hasChildren && setOpen((o) => !o)}
      >
        <ActionIcon
          size="xs"
          variant="transparent"
          style={{ visibility: hasChildren ? 'visible' : 'hidden' }}
        >
          {open ? <IconChevronDown size={14} /> : <IconChevronRight size={14} />}
        </ActionIcon>
        <Text size="sm" fw={hasChildren ? 600 : 400} style={{ flex: 1 }}>
          {account.code} — {account.name}
        </Text>
        <Badge size="xs" color={ACCOUNT_TYPE_COLORS[account.accountType] ?? 'gray'}>
          {ACCOUNT_TYPE_LABELS[account.accountType] ?? account.accountType}
        </Badge>
      </Group>
      {hasChildren && (
        <Collapse in={open}>
          {account.children.map((child) => (
            <AccountRow key={child.id} account={child} depth={depth + 1} />
          ))}
        </Collapse>
      )}
    </>
  )
}

// Build tree from flat list
function buildTree(items: AccountDto[]): AccountNode[] {
  const map = new Map<string, AccountNode>()
  items.forEach((i) => map.set(i.id, { ...i, children: [] }))
  const roots: AccountNode[] = []
  map.forEach((item) => {
    if (item.parentAccountId && map.has(item.parentAccountId)) {
      map.get(item.parentAccountId)!.children.push(item)
    } else {
      roots.push(item)
    }
  })
  return roots
}

export default function AccountListPage() {
  const { data: rawAccounts, isLoading } = useQuery({
    queryKey: ['accounts'],
    queryFn: () => accountsApi.list(),
  })

  const accounts = buildTree(rawAccounts?.items ?? [])

  return (
    <Stack gap={0} h="100%">
      <PageHeader title="Hệ thống tài khoản" />

      {/* Header row */}
      <Group px="md" py={8} style={{ borderBottom: '2px solid var(--mantine-color-dark-4)' }}>
        <Text size="xs" c="dimmed" style={{ flex: 1, paddingLeft: 40 }}>Mã — Tên tài khoản</Text>
        <Text size="xs" c="dimmed">Loại</Text>
      </Group>

      {isLoading && (
        <Center py="xl">
          <Loader />
        </Center>
      )}

      {!isLoading && accounts.length === 0 && (
        <Center py="xl">
          <Title order={5} c="dimmed">Chưa có tài khoản kế toán</Title>
        </Center>
      )}

      <Stack gap={0}>
        {accounts.map((account) => (
          <AccountRow key={account.id} account={account} />
        ))}
      </Stack>
    </Stack>
  )
}
