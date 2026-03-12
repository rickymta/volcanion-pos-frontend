import { type ReactNode } from 'react'
import { Badge } from '@mantine/core'

import type { DocumentStatus, DeliveryStatus } from '@pos/utils'
import { DocumentStatusLabel, DeliveryStatusLabel } from '@pos/utils'

interface StatusBadgeProps {
  status: DocumentStatus | DeliveryStatus | string
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const docLabel = DocumentStatusLabel[status as DocumentStatus]
  const deliveryLabel = DeliveryStatusLabel[status as DeliveryStatus]
  const resolved = docLabel ?? deliveryLabel

  if (!resolved) {
    return <Badge variant="light">{status}</Badge>
  }

  return (
    <Badge color={resolved.color} variant="light">
      {resolved.label}
    </Badge>
  )
}

// Generic color badge
interface ColorBadgeProps {
  label: string
  color: string
  children?: ReactNode
}

export function ColorBadge({ label, color }: ColorBadgeProps) {
  return (
    <Badge color={color} variant="light">
      {label}
    </Badge>
  )
}
