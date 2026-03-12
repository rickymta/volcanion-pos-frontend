import { type ReactNode } from 'react'
import { Group, Title, Text, Breadcrumbs, Anchor } from '@mantine/core'

interface BreadcrumbItem {
  label: string
  href?: string
}

interface PageHeaderProps {
  title: string
  subtitle?: string
  breadcrumbs?: BreadcrumbItem[]
  actions?: ReactNode
}

export function PageHeader({ title, subtitle, breadcrumbs, actions }: PageHeaderProps) {
  return (
    <div>
      {breadcrumbs && breadcrumbs.length > 0 && (
        <Breadcrumbs mb="xs">
          {breadcrumbs.map((item, i) =>
            item.href ? (
              <Anchor key={i} href={item.href} size="sm">
                {item.label}
              </Anchor>
            ) : (
              <Text key={i} size="sm" c="dimmed">
                {item.label}
              </Text>
            )
          )}
        </Breadcrumbs>
      )}
      <Group justify="space-between" align="flex-end">
        <div>
          <Title order={3} fw={700}>
            {title}
          </Title>
          {subtitle && (
            <Text size="sm" c="dimmed" mt={2}>
              {subtitle}
            </Text>
          )}
        </div>
        {actions && <Group gap="sm">{actions}</Group>}
      </Group>
    </div>
  )
}
