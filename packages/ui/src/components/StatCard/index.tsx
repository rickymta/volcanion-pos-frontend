import { Paper, Text, Group, ThemeIcon, type MantineColor } from '@mantine/core'
import { type IconProps } from '@tabler/icons-react'
import { type ComponentType } from 'react'

import { formatVND, formatNumber } from '@pos/utils'

interface StatCardProps {
  title: string
  value: number
  /** Format type */
  format?: 'number' | 'currency' | 'raw'
  /** Optional icon */
  icon?: ComponentType<IconProps>
  /** Icon color */
  color?: MantineColor
  /** Optional trend text, e.g. "+12% so với hôm qua" */
  trend?: string
  trendColor?: MantineColor
}

export function StatCard({
  title,
  value,
  format = 'number',
  icon: IconComponent,
  color = 'blue',
  trend,
  trendColor = 'green',
}: StatCardProps) {
  const formatted =
    format === 'currency'
      ? formatVND(value)
      : format === 'number'
        ? formatNumber(value)
        : String(value)

  return (
    <Paper withBorder p="md" radius="md">
      <Group justify="space-between" align="flex-start">
        <div>
          <Text size="xs" c="dimmed" tt="uppercase" fw={700} mb={4}>
            {title}
          </Text>
          <Text fw={700} size="xl">
            {formatted}
          </Text>
          {trend && (
            <Text size="xs" c={trendColor} mt={4}>
              {trend}
            </Text>
          )}
        </div>
        {IconComponent && (
          <ThemeIcon variant="light" color={color} size="xl" radius="md">
            <IconComponent size={24} />
          </ThemeIcon>
        )}
      </Group>
    </Paper>
  )
}
