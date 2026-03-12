import { Stack, Group, Button, Badge, Text, Paper, Table, Divider, Loader, Center } from '@mantine/core'
import { notifications } from '@mantine/notifications'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate, useParams } from 'react-router-dom'
import { IconArrowLeft, IconCheck, IconX } from '@tabler/icons-react'
import { PageHeader, openConfirm } from '@pos/ui'
import { purchaseOrdersApi } from '@pos/api-client'
import { DocumentStatusLabel, formatVND, formatDate } from '@pos/utils'

export default function PurchaseOrderDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const qc = useQueryClient()

  const { data: order, isLoading } = useQuery({
    queryKey: ['purchase-order', id],
    queryFn: () => purchaseOrdersApi.getById(id!),
    enabled: !!id,
  })

  const confirmMutation = useMutation({
    mutationFn: () => purchaseOrdersApi.confirm(id!),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['purchase-order', id] })
      void qc.invalidateQueries({ queryKey: ['purchase-orders'] })
      notifications.show({ color: 'green', message: 'Xác nhận đơn mua hàng thành công' })
    },
    onError: () => notifications.show({ color: 'red', message: 'Xác nhận thất bại' }),
  })

  const cancelMutation = useMutation({
    mutationFn: () => purchaseOrdersApi.cancel(id!),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['purchase-order', id] })
      void qc.invalidateQueries({ queryKey: ['purchase-orders'] })
      notifications.show({ color: 'green', message: 'Đã hủy đơn mua hàng' })
    },
    onError: () => notifications.show({ color: 'red', message: 'Hủy thất bại' }),
  })

  if (isLoading) {
    return (
      <Center h={200}>
        <Loader />
      </Center>
    )
  }

  if (!order) return null

  const statusInfo = DocumentStatusLabel[order.status as keyof typeof DocumentStatusLabel]
  const isDraft = order.status === 'Draft'

  return (
    <Stack gap="lg">
      <PageHeader
        title={`Đơn mua hàng ${order.code}`}
        subtitle={`Ngày ${formatDate(order.orderDate)}`}
        actions={
          <Group>
            <Button
              variant="subtle"
              leftSection={<IconArrowLeft size={16} />}
              onClick={() => navigate('/purchase/orders')}
            >
              Quay lại
            </Button>
            {isDraft && (
              <>
                <Button
                  color="blue"
                  leftSection={<IconCheck size={16} />}
                  loading={confirmMutation.isPending}
                  onClick={() =>
                    openConfirm({
                      title: 'Xác nhận đơn mua hàng',
                      message: 'Xác nhận đơn mua hàng này?',
                      confirmLabel: 'Xác nhận',
                      confirmColor: 'blue',
                      onConfirm: () => confirmMutation.mutate(),
                    })
                  }
                >
                  Xác nhận
                </Button>
                <Button
                  color="red"
                  variant="light"
                  leftSection={<IconX size={16} />}
                  loading={cancelMutation.isPending}
                  onClick={() =>
                    openConfirm({
                      title: 'Hủy đơn mua hàng',
                      message: 'Bạn có chắc muốn hủy đơn mua hàng này?',
                      confirmLabel: 'Hủy đơn',
                      confirmColor: 'red',
                      onConfirm: () => cancelMutation.mutate(),
                    })
                  }
                >
                  Hủy
                </Button>
              </>
            )}
          </Group>
        }
      />

      <Paper withBorder p="md">
        <Group gap="xl" wrap="wrap">
          <div>
            <Text size="xs" c="dimmed">Trạng thái</Text>
            {statusInfo ? (
              <Badge color={statusInfo.color} variant="light">{statusInfo.label}</Badge>
            ) : (
              <Badge variant="light">{order.status}</Badge>
            )}
          </div>
          <div>
            <Text size="xs" c="dimmed">Nhà cung cấp</Text>
            <Text fw={500}>{order.supplierName}</Text>
          </div>
          <div>
            <Text size="xs" c="dimmed">Ngày đặt</Text>
            <Text>{formatDate(order.orderDate)}</Text>
          </div>
          {order.note && (
            <div>
              <Text size="xs" c="dimmed">Ghi chú</Text>
              <Text>{order.note}</Text>
            </div>
          )}
        </Group>
      </Paper>

      <Paper withBorder>
        <Table striped>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>#</Table.Th>
              <Table.Th>Sản phẩm</Table.Th>
              <Table.Th>Đơn vị</Table.Th>
              <Table.Th ta="right">SL</Table.Th>
              <Table.Th ta="right">Đơn giá</Table.Th>
              <Table.Th ta="right">VAT %</Table.Th>
              <Table.Th ta="right">Thành tiền</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {order.lines.map((line, i) => (
              <Table.Tr key={line.id}>
                <Table.Td c="dimmed">{i + 1}</Table.Td>
                <Table.Td fw={500}>{line.productName}</Table.Td>
                <Table.Td>{line.unitName}</Table.Td>
                <Table.Td ta="right">{line.quantity.toLocaleString()}</Table.Td>
                <Table.Td ta="right">{formatVND(line.unitPrice)}</Table.Td>
                <Table.Td ta="right">{line.vatRate > 0 ? `${line.vatRate}%` : '—'}</Table.Td>
                <Table.Td ta="right" fw={500}>{formatVND(line.lineTotal)}</Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      </Paper>

      <Group justify="flex-end">
        <Paper withBorder p="md" w={280}>
          <Stack gap="xs">
            <Group justify="space-between">
              <Text size="sm" c="dimmed">Tạm tính</Text>
              <Text size="sm">{formatVND(order.totalAmount)}</Text>
            </Group>
            <Group justify="space-between">
              <Text size="sm" c="dimmed">Thuế VAT</Text>
              <Text size="sm">{formatVND(order.vatAmount)}</Text>
            </Group>
            <Divider />
            <Group justify="space-between">
              <Text fw={700}>Tổng cộng</Text>
              <Text fw={700} size="lg" c="blue">{formatVND(order.grandTotal)}</Text>
            </Group>
          </Stack>
        </Paper>
      </Group>
    </Stack>
  )
}
