import { useState } from 'react'
import { Stack, Group, Button, Badge, Text, Paper, Table, Divider, Loader, Center, Select, Modal } from '@mantine/core'
import { notifications } from '@mantine/notifications'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate, useParams } from 'react-router-dom'
import { IconArrowLeft, IconCheck, IconX, IconEdit } from '@tabler/icons-react'
import { PageHeader, openConfirm } from '@pos/ui'
import { salesOrdersApi, warehousesApi, invoicesApi, deliveryApi } from '@pos/api-client'
import { DocumentStatusLabel, DeliveryStatusLabel, formatVND, formatDate } from '@pos/utils'

export default function SalesOrderDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const qc = useQueryClient()

  // Warehouse selection before confirm
  const [confirmModalOpen, setConfirmModalOpen] = useState(false)
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<string | null>(null)

  const { data: order, isLoading } = useQuery({
    queryKey: ['sales-order', id],
    queryFn: () => salesOrdersApi.getById(id!),
    enabled: !!id,
  })

  const { data: warehousesData } = useQuery({
    queryKey: ['warehouses-all'],
    queryFn: () => warehousesApi.list().then((r) => r.items),
  })

  const { data: relatedInvoices = [] } = useQuery({
    queryKey: ['invoices-for-order', id, order?.customerId],
    queryFn: async () => {
      const data = await invoicesApi.list({ customerId: order!.customerId, pageSize: 50 })
      return (data.items ?? []).filter((i) => i.salesOrderId === id)
    },
    enabled: !!order?.customerId,
  })

  const { data: relatedDeliveries = [] } = useQuery({
    queryKey: ['deliveries-for-order', id, order?.customerId],
    queryFn: async () => {
      const data = await deliveryApi.list({ customerId: order!.customerId, pageSize: 50 })
      return (data.items ?? []).filter((d) => d.salesOrderId === id)
    },
    enabled: !!order?.customerId,
  })

  const confirmMutation = useMutation({
    mutationFn: (warehouseId?: string) => salesOrdersApi.confirm(id!, warehouseId ? { warehouseId } : undefined),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['sales-order', id] })
      void qc.invalidateQueries({ queryKey: ['sales-orders'] })
      notifications.show({ color: 'green', message: 'Xác nhận đơn hàng thành công' })
      setConfirmModalOpen(false)
    },
    onError: () => notifications.show({ color: 'red', message: 'Xác nhận thất bại' }),
  })

  const cancelMutation = useMutation({
    mutationFn: () => salesOrdersApi.cancel(id!),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['sales-order', id] })
      void qc.invalidateQueries({ queryKey: ['sales-orders'] })
      notifications.show({ color: 'green', message: 'Đã hủy đơn hàng' })
    },
    onError: () => notifications.show({ color: 'red', message: 'Hủy thất bại' }),
  })

  function handleConfirm() {
    setSelectedWarehouseId(null)
    setConfirmModalOpen(true)
  }

  function doConfirm() {
    confirmMutation.mutate(selectedWarehouseId ?? undefined)
  }

  function handleCancel() {
    openConfirm({
      title: 'Hủy đơn hàng',
      message: 'Bạn có chắc muốn hủy đơn hàng này?',
      confirmLabel: 'Hủy đơn',
      confirmColor: 'red',
      onConfirm: () => cancelMutation.mutate(),
    })
  }

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

  const warehouseOptions = (warehousesData ?? []).map((w) => ({ value: w.id, label: w.name }))

  return (
    <Stack gap="lg">
      {/* Warehouse Confirm Modal */}
      <Modal
        opened={confirmModalOpen}
        onClose={() => setConfirmModalOpen(false)}
        title="Xác nhận đơn bán hàng"
        size="sm"
      >
        <Stack gap="md">
          <Text size="sm">Chọn kho xuất hàng để xác nhận đơn bán hàng <strong>{order?.code}</strong>.</Text>
          <Select
            label="Kho xuất hàng"
            placeholder="Chọn kho (tùy chọn)..."
            data={warehouseOptions}
            value={selectedWarehouseId}
            onChange={setSelectedWarehouseId}
            clearable
            description="Nếu không chọn, hệ thống sẽ dùng kho mặc định."
          />
          <Group justify="flex-end">
            <Button variant="default" onClick={() => setConfirmModalOpen(false)}>Hủy bỏ</Button>
            <Button
              color="blue"
              leftSection={<IconCheck size={16} />}
              loading={confirmMutation.isPending}
              onClick={doConfirm}
            >
              Xác nhận đơn hàng
            </Button>
          </Group>
        </Stack>
      </Modal>

      <PageHeader
        title={`Đơn bán hàng ${order.code}`}
        subtitle={`Ngày ${formatDate(order.orderDate)}`}
        actions={
          <Group>
            <Button variant="default" leftSection={<IconArrowLeft size={16} />} onClick={() => navigate('/sales/orders')}>
              Quay lại
            </Button>
            {isDraft && (
              <Button variant="default" leftSection={<IconEdit size={16} />} onClick={() => navigate(`/sales/orders/${id}/edit`)}>
                Sửa
              </Button>
            )}
            {isDraft && (
              <Button
                color="blue"
                leftSection={<IconCheck size={16} />}
                loading={confirmMutation.isPending}
                onClick={handleConfirm}
              >
                Xác nhận
              </Button>
            )}
            {(isDraft || order.status === 'Confirmed') && (
              <Button
                color="red"
                variant="outline"
                leftSection={<IconX size={16} />}
                loading={cancelMutation.isPending}
                onClick={handleCancel}
              >
                Hủy đơn
              </Button>
            )}
          </Group>
        }
      />

      <Paper withBorder p="md" radius="md">
        <Group justify="space-between" mb="md">
          <Text fw={600} size="lg">Thông tin đơn hàng</Text>
          {statusInfo && (
            <Badge color={statusInfo.color} size="lg" variant="light">
              {statusInfo.label}
            </Badge>
          )}
        </Group>
        <Divider mb="md" />
        <Group gap="xl">
          <Stack gap="xs">
            <Text size="sm" c="dimmed">Khách hàng</Text>
            <Text fw={500}>{order.customerName}</Text>
          </Stack>
          <Stack gap="xs">
            <Text size="sm" c="dimmed">Ngày đặt</Text>
            <Text fw={500}>{formatDate(order.orderDate)}</Text>
          </Stack>
        </Group>
        {order.note && (
          <>
            <Divider my="md" />
            <Text size="sm" c="dimmed">Ghi chú</Text>
            <Text mt="xs">{order.note}</Text>
          </>
        )}
      </Paper>

      <Paper withBorder p="md" radius="md">
        <Text fw={600} size="lg" mb="md">Danh sách sản phẩm</Text>
        <Table striped highlightOnHover>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>#</Table.Th>
              <Table.Th>Sản phẩm</Table.Th>
              <Table.Th>ĐVT</Table.Th>
              <Table.Th style={{ textAlign: 'right' }}>SL</Table.Th>
              <Table.Th style={{ textAlign: 'right' }}>Giá bán</Table.Th>
              <Table.Th style={{ textAlign: 'right' }}>Chiết khấu</Table.Th>
              <Table.Th style={{ textAlign: 'right' }}>VAT (%)</Table.Th>
              <Table.Th style={{ textAlign: 'right' }}>Thành tiền</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {order.lines.map((line, i) => (
              <Table.Tr key={line.id}>
                <Table.Td>{i + 1}</Table.Td>
                <Table.Td>
                  <Text size="sm" fw={500}>{line.productName}</Text>
                </Table.Td>
                <Table.Td>{line.unitName}</Table.Td>
                <Table.Td style={{ textAlign: 'right' }}>{line.quantity}</Table.Td>
                <Table.Td style={{ textAlign: 'right' }}>{formatVND(line.unitPrice)}</Table.Td>
                <Table.Td style={{ textAlign: 'right' }}>{formatVND(line.discountAmount)}</Table.Td>
                <Table.Td style={{ textAlign: 'right' }}>{line.vatRate * 100}%</Table.Td>
                <Table.Td style={{ textAlign: 'right' }}>{formatVND(line.lineTotal)}</Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      </Paper>

      <Paper withBorder p="md" radius="md" maw={360} ml="auto">
        <Stack gap="xs">
          <Group justify="space-between">
            <Text size="sm">Tạm tính:</Text>
            <Text size="sm">{formatVND(order.totalAmount)}</Text>
          </Group>
          <Group justify="space-between">
            <Text size="sm">Chiết khấu:</Text>
            <Text size="sm" c="red">-{formatVND(order.discountAmount)}</Text>
          </Group>
          <Group justify="space-between">
            <Text size="sm">Thuế VAT:</Text>
            <Text size="sm">{formatVND(order.vatAmount)}</Text>
          </Group>
          <Divider />
          <Group justify="space-between">
            <Text fw={700}>Tổng thanh toán:</Text>
            <Text fw={700} size="lg" c="blue">{formatVND(order.grandTotal)}</Text>
          </Group>
        </Stack>
      </Paper>

      {relatedInvoices.length > 0 && (
        <Paper withBorder p="md" radius="md">
          <Text fw={600} size="lg" mb="md">Hóa đơn liên quan</Text>
          <Table striped highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Mã hóa đơn</Table.Th>
                <Table.Th>Ngày</Table.Th>
                <Table.Th style={{ textAlign: 'right' }}>Tổng tiền</Table.Th>
                <Table.Th>Trạng thái</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {relatedInvoices.map((inv) => {
                const paid = inv.remainingAmount === 0
                return (
                  <Table.Tr
                    key={inv.id}
                    style={{ cursor: 'pointer' }}
                    onClick={() => navigate(`/sales/invoices/${inv.id}`)}
                  >
                    <Table.Td>
                      <Text size="sm" c="blue" style={{ textDecoration: 'underline' }}>{inv.code}</Text>
                    </Table.Td>
                    <Table.Td>{formatDate(inv.invoiceDate)}</Table.Td>
                    <Table.Td style={{ textAlign: 'right' }}>{formatVND(inv.grandTotal)}</Table.Td>
                    <Table.Td>
                      <Badge color={paid ? 'green' : 'yellow'} variant="light" size="sm">
                        {paid ? 'Đã thanh toán' : 'Chưa thanh toán'}
                      </Badge>
                    </Table.Td>
                  </Table.Tr>
                )
              })}
            </Table.Tbody>
          </Table>
        </Paper>
      )}

      {relatedDeliveries.length > 0 && (
        <Paper withBorder p="md" radius="md">
          <Text fw={600} size="lg" mb="md">Lệnh giao hàng liên quan</Text>
          <Table striped highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Mã lệnh giao</Table.Th>
                <Table.Th>Ngày giao</Table.Th>
                <Table.Th>Người nhận</Table.Th>
                <Table.Th>Trạng thái</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {relatedDeliveries.map((del) => {
                const statusInfo = DeliveryStatusLabel[del.status as keyof typeof DeliveryStatusLabel]
                return (
                  <Table.Tr
                    key={del.id}
                    style={{ cursor: 'pointer' }}
                    onClick={() => navigate(`/delivery/${del.id}`)}
                  >
                    <Table.Td>
                      <Text size="sm" c="blue" style={{ textDecoration: 'underline' }}>{del.code}</Text>
                    </Table.Td>
                    <Table.Td>{formatDate(del.deliveryDate)}</Table.Td>
                    <Table.Td>{del.receiverName ?? '—'}</Table.Td>
                    <Table.Td>
                      {statusInfo && (
                        <Badge color={statusInfo.color} variant="light" size="sm">{statusInfo.label}</Badge>
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
