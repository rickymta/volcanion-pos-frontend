import { type ReactNode } from 'react'
import { Drawer, Stack, ScrollArea, Button, Group, LoadingOverlay } from '@mantine/core'

interface DrawerFormProps {
  opened: boolean
  onClose: () => void
  title: string
  children: ReactNode
  onSubmit?: () => void
  submitLabel?: string
  isLoading?: boolean
  isSubmitting?: boolean
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
}

export function DrawerForm({
  opened,
  onClose,
  title,
  children,
  onSubmit,
  submitLabel = 'Lưu',
  isLoading = false,
  isSubmitting = false,
  size = 'md',
}: DrawerFormProps) {
  return (
    <Drawer
      opened={opened}
      onClose={onClose}
      title={title}
      position="right"
      size={size}
      padding="lg"
    >
      <LoadingOverlay visible={isLoading} />
      <Stack h="calc(100vh - 120px)" style={{ display: 'flex', flexDirection: 'column' }}>
        <ScrollArea flex={1} pr="xs">
          <Stack gap="md">{children}</Stack>
        </ScrollArea>
        {onSubmit && (
          <Group justify="flex-end" pt="md" style={{ borderTop: '1px solid var(--mantine-color-default-border)' }}>
            <Button variant="default" onClick={onClose}>
              Hủy
            </Button>
            <Button onClick={onSubmit} loading={isSubmitting}>
              {submitLabel}
            </Button>
          </Group>
        )}
      </Stack>
    </Drawer>
  )
}
