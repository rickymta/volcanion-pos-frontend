import { Center, Stack, Text, type MantineColor } from '@mantine/core'
import { IconInbox } from '@tabler/icons-react'
import { type ComponentType } from 'react'
import { type IconProps } from '@tabler/icons-react'

interface EmptyStateProps {
  message?: string
  description?: string
  icon?: ComponentType<IconProps>
  color?: MantineColor
}

export function EmptyState({
  message = 'Không có dữ liệu',
  description,
  icon: IconComponent = IconInbox,
  color = 'dimmed',
}: EmptyStateProps) {
  return (
    <Center py="xl">
      <Stack align="center" gap="xs">
        <IconComponent size={48} color="var(--mantine-color-dimmed)" />
        <Text c={color} fw={500}>
          {message}
        </Text>
        {description && (
          <Text size="sm" c="dimmed" ta="center">
            {description}
          </Text>
        )}
      </Stack>
    </Center>
  )
}
