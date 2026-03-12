import { useState } from 'react'
import {
  Stack, Group, Button, Badge, Text, Paper, Table, Loader, Center, Modal, TextInput,
} from '@mantine/core'
import { useForm } from '@mantine/form'
import { notifications } from '@mantine/notifications'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate, useParams } from 'react-router-dom'
import { IconArrowLeft, IconTruckDelivery, IconCheck, IconX } from '@tabler/icons-react'
import { PageHeader, openConfirm } from '@pos/ui'
import { deliveryApi } from '@pos/api-client'
import { DeliveryStatusLabel, formatDate } from '@pos/utils'

export default function DeliveryDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [completeModalOpen, setCompleteModalOpen] = useState(false)
  const [failModalOpen, setFailModalOpen] = useState(false)

  const completeForm = useForm({ initialValues: { receiverName: '' } })
  const failForm = useForm({ initialValues: { reason: '' } })

  const { data: delivery, isLoading } = useQuery({
    queryKey: ['delivery', id],
    queryFn: () => deliveryApi.getById(id!),
    enabled: !!id,
  })

  const startMutation = useMutation({
    mutationFn: () => deliveryApi.start(id!),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['delivery', id] })
      void qc.invalidateQueries({ queryKey: ['delivery-orders'] })
      notifications.show({ color: 'green', message: 'Đã bắt đầu giao hàng' })
    },
    onError: () => notifications.show({ color: 'red', message: 'Thao tác thất bại' }),
  })

  const completeMutation = useMutation({
    mutationFn: (values: { receiverName: string }) =>
      deliveryApi.complete(id!, { receiverName: values.receiverName }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['delivery', id] })
      void qc.invalidateQueries({ queryKey: ['delivery-orders'] })
      notifications.show({ color: 'green', message: 'Giao hàng thành công' })
      setCompleteModalOpen(false)
      completeForm.reset()
    },
    onError: () => notifications.show({ color: 'red', message: 'Thao tác thất bại' }),
  })

  const failMutation = useMutation({
    mutationFn: (values: { reason: string }) =>
      deliveryApi.fail(id!, { reason: values.reason }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['delivery', id] })
      void qc.invalidateQueries({ queryKey: ['delivery-orders'] })
      notifications.show({ color: 'orange', message: 'Đã ghi nhận giao hàng thất bại' })
      setFailModalOpen(false)
      failForm.reset()
    },
    onError: () => notifications.show({ color: 'red', message: 'Thao tác thất bại' }),
  })

  const cancelMutation = useMutation({
    mutationFn: () => deliveryApi.cancel(id!),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['delivery', id] })
      void qc.invalidateQueries({ queryKey: ['delivery-orders'] })
      notifications.show({ color: 'green', message: 'Đã hủy phiếu giao hàng' })
    },
    onError: () => notifications.show({ color: 'red', message: 'Thao tác thất bại' }),
  })

  if (isLoading) {
    return (
      <Center h={200}>
        <Loader />
      </Center>
    )
  }

  if (!delivery) return null

  const statusInfo = DeliveryStatusLabel[delivery.status as keyof typeof DeliveryStatusLabel]
  const isPending = delivery.status === 'Pending'
  const isInProgress = delivery.status === 'InProgress'

  return (
    <Stack gap="lg">
      <PageHeader
        title={`Phiếu giao hàng ${delivery.code}`}
        subtitle={`Ngày giao ${formatDate(delivery.deliveryDate)}`}
        actions={
          <Group>
            <Button
              variant="subtle"
              leftSection={<IconArrowLeft size={16} />}
              onClick={() => navigate('/delivery')}
            >
              Quay lại
            </Button>
            {isPending && (
              <>
                <Button
                  color="blue"
                  leftSection={<IconTruckDelivery size={16} />}
                  loading={startMutation.isPending}
                  onClick={() =>
                    openConfirm({
                      message: 'Bắt đầu giao hàng?',
                      confirmColor: 'blue',
                      onConfirm: () => startMutation.mutate(),
                    })
                  }
                >
                  Bắt đầu giao
                </Button>
                <Button
                  color="red"
                  variant="outline"
                  leftSection={<IconX size={16} />}
                  loading={cancelMutation.isPending}
                  onClick={() =>
                    openConfirm({
                      title: 'Hủy giao hàng',
                      message: 'Bạn có chắc muốn hủy phiếu giao hàng này?',
                      confirmLabel: 'Hủy phiếu',
                      confirmColor: 'red',
                      onConfirm: () => cancelMutation.mutate(),
                    })
                  }
                >
                  Hủy
                </Button>
              </>
            )}
            {isInProgress && (
              <>
                <Button
                  color="green"
                  leftSection={<IconCheck size={16} />}
                  onClick={() => setCompleteModalOpen(true)}
                >
                  Hoàn thành
                </Button>
                <Button
                  color="red"
                  variant="light"
                  leftSection={<IconX size={16} />}
                  onClick={() => setFailModalOpen(true)}
                >
                  Giao thất bại
                </Button>
              </>
            )}
          </Group>
        }
      />

      <Paper withBorder p="md">
        <Group gap="xl" wrap="wrap">
          <div>
            <Text size="xs" c="dimmed">Khách hàng</Text>
            <Text fw={500}>{delivery.customerName}</Text>
          </div>
          <div>
            <Text size="xs" c="dimmed">Đơn bán hàng</Text>
            <Text>{delivery.salesOrderCode}</Text>
          </div>
          <div>
            <Text size="xs" c="dimmed">Ngày giao</Text>
            <Text>{formatDate(delivery.deliveryDate)}</Text>
          </div>
          {delivery.deliveryAddress && (
            <div>
              <Text size="xs" c="dimmed">Địa chỉ giao</Text>
              <Text>{delivery.deliveryAddress}</Text>
            </div>
          )}
          {delivery.receiverName && (
            <div>
              <Text size="xs" c="dimmed">Người nhận</Text>
              <Text>{delivery.receiverName}</Text>
            </div>
          )}
          <div>
            <Text size="xs" c="dimmed">Trạng thái</Text>
            {statusInfo ? (
              <Badge color={statusInfo.color} variant="light">{statusInfo.label}</Badge>
            ) : (
              <Badge variant="light">{delivery.status}</Badge>
            )}
          </div>
          {delivery.failReason && (
            <div>
              <Text size="xs" c="dimmed">Lý do thất bại</Text>
              <Text c="red">{delivery.failReason}</Text>
            </div>
          )}
          {delivery.note && (
            <div>
              <Text size="xs" c="dimmed">Ghi chú</Text>
              <Text>{delivery.note}</Text>
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
              <Table.Th ta="right">Số lượng</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {delivery.lines.map((line, i) => (
              <Table.Tr key={`${line.productId}-${i}`}>
                <Table.Td c="dimmed">{i + 1}</Table.Td>
                <Table.Td fw={500}>{line.productName}</Table.Td>
                <Table.Td>{line.unitName}</Table.Td>
                <Table.Td ta="right">{line.quantity.toLocaleString()}</Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      </Paper>

      {/* Complete Modal */}
      <Modal
        opened={completeModalOpen}
        onClose={() => { setCompleteModalOpen(false); completeForm.reset() }}
        title="Xác nhận giao hàng thành công"
        centered
      >
        <form onSubmit={completeForm.onSubmit((values) => completeMutation.mutate(values))}>
          <Stack gap="md">
            <TextInput
              label="Tên người nhận hàng"
              placeholder="Nhập tên người nhận..."
              {...completeForm.getInputProps('receiverName')}
              required
            />
            <Group justify="flex-end">
              <Button variant="subtle" onClick={() => setCompleteModalOpen(false)}>Hủy</Button>
              <Button type="submit" color="green" loading={completeMutation.isPending}>
                Xác nhận hoàn thành
              </Button>
            </Group>
          </Stack>
        </form>
      </Modal>

      {/* Fail Modal */}
      <Modal
        opened={failModalOpen}
        onClose={() => { setFailModalOpen(false); failForm.reset() }}
        title="Ghi nhận giao hàng thất bại"
        centered
      >
        <form onSubmit={failForm.onSubmit((values) => failMutation.mutate(values))}>
          <Stack gap="md">
            <TextInput
              label="Lý do thất bại"
              placeholder="Nhập lý do giao hàng thất bại..."
              {...failForm.getInputProps('reason')}
              required
            />
            <Group justify="flex-end">
              <Button variant="subtle" onClick={() => setFailModalOpen(false)}>Hủy</Button>
              <Button type="submit" color="red" loading={failMutation.isPending}>
                Xác nhận thất bại
              </Button>
            </Group>
          </Stack>
        </form>
      </Modal>
    </Stack>
  )
}
