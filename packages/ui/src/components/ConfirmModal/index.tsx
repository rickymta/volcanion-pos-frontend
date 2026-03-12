import { Text } from '@mantine/core'
import { modals } from '@mantine/modals'
import { type ReactNode } from 'react'

interface ConfirmOptions {
  title?: string
  message: ReactNode
  confirmLabel?: string
  cancelLabel?: string
  confirmColor?: string
  onConfirm: () => void | Promise<void>
}

/**
 * Open a confirm modal using Mantine's modals manager.
 * Usage: openConfirm({ message: 'Are you sure?', onConfirm: handleDelete })
 */
export function openConfirm({
  title = 'Xác nhận',
  message,
  confirmLabel = 'Xác nhận',
  cancelLabel = 'Hủy',
  confirmColor = 'red',
  onConfirm,
}: ConfirmOptions) {
  modals.openConfirmModal({
    title,
    centered: true,
    children: (
      <Text size="sm">{message}</Text>
    ),
    labels: { confirm: confirmLabel, cancel: cancelLabel },
    confirmProps: { color: confirmColor },
    onConfirm,
  })
}
