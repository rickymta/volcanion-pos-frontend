import { Stack, Group, Button, Badge, Text, Paper, Table, Divider, Loader, Center } from '@mantine/core'
import { notifications } from '@mantine/notifications'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate, useParams } from 'react-router-dom'
import { IconArrowLeft, IconCheck, IconX, IconEdit, IconTruckDelivery } from '@tabler/icons-react'
import { PageHeader, openConfirm } from '@pos/ui'
import { purchaseOrdersApi, goodsReceiptsApi } from '@pos/api-client'
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
    onError: (e: Error) => notifications.show({ color: 'red', message: e.message || 'Hủy thất bại' }),
  })

  const { data: linkedReceipts } = useQuery({
    queryKey: ['goods-receipts', { purchaseOrderId: id }],
    queryFn: () => goodsReceiptsApi.list({ purchaseOrderId: id }),
    enabled: !!id && !!order && order.status !== 'Draft',
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
  const isConfirmed = order.status === 'Confirmed'

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
                  variant="light"
                  leftSection={<IconEdit size={16} />}
                  onClick={() => navigate(`/purchase/orders/${id}/edit`)}
                >
                  Sửa đơn
                </Button>
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
            {isConfirmed && (
              <>
                <Button
                  color="teal"
                  leftSection={<IconTruckDelivery size={16} />}
                  onClick={() => navigate(`/purchase/receipts/new?poId=${id}`)}
                >
                  Tạo phiếu nhập kho
                </Button>
                <Button
                  color="red"
                  variant="light"
                  leftSection={<IconX size={16} />}
                  loading={cancelMutation.isPending}
                  onClick={() =>
                    openConfirm({
                      title: 'Hủy đơn mua hàng',
                      message: 'Bạn có chắc muốn hủy đơn này? Lưu ý: không thể hủy nếu đã có phiếu nhập được xác nhận.',
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
            {order.discountAmount > 0 && (
              <Group justify="space-between">
                <Text size="sm" c="dimmed">Chiết khấu</Text>
                <Text size="sm" c="red">-{formatVND(order.discountAmount)}</Text>
              </Group>
            )}
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

      {(linkedReceipts?.items.length ?? 0) > 0 && (
        <Paper withBorder>
          <Text fw={600} p="md" pb={0}>Phiếu nhập kho liên kết</Text>
          <Table striped>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Mã phiếu</Table.Th>
                <Table.Th>Ngày nhập</Table.Th>
                <Table.Th>Kho nhập</Table.Th>
                <Table.Th>Trạng thái</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {linkedReceipts!.items.map((gr) => {
                const grStatus = DocumentStatusLabel[gr.status as keyof typeof DocumentStatusLabel]
                return (
                  <Table.Tr
                    key={gr.id}
                    style={{ cursor: 'pointer' }}
                    onClick={() => navigate(`/purchase/receipts/${gr.id}`)}
                  >
                    <Table.Td fw={500}>{gr.code}</Table.Td>
                    <Table.Td>{formatDate(gr.receiptDate)}</Table.Td>
                    <Table.Td>{gr.warehouseName}</Table.Td>
                    <Table.Td>
                      {grStatus ? (
                        <Badge color={grStatus.color} variant="light" size="sm">{grStatus.label}</Badge>
                      ) : (
                        <Badge variant="light" size="sm">{gr.status}</Badge>
                      )}
                    </Table.Td>
                  </Table.Tr>
                )
              })}
            </Table.Tbody>
          </Table>
        </Paper>
      )}
    </Stack>
  )
}
