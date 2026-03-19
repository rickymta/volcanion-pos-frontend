import { Stack, Group, Button, Badge, Text, Paper, Table, Divider, Loader, Center } from '@mantine/core'
import { notifications } from '@mantine/notifications'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate, useParams } from 'react-router-dom'
import { IconArrowLeft, IconCheck } from '@tabler/icons-react'
import { PageHeader, openConfirm } from '@pos/ui'
import { inventoryApi } from '@pos/api-client'
import { DocumentStatusLabel, formatDate } from '@pos/utils'

export default function StockTransferDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const qc = useQueryClient()

  const { data: transfer, isLoading } = useQuery({
    queryKey: ['stock-transfer', id],
    queryFn: () => inventoryApi.getTransfer(id!),
    enabled: !!id,
  })

  const confirmMutation = useMutation({
    mutationFn: () => inventoryApi.confirmTransfer(id!),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['stock-transfer', id] })
      void qc.invalidateQueries({ queryKey: ['stock-transfers'] })
      notifications.show({ color: 'green', message: 'Xác nhận phiếu chuyển kho thành công' })
    },
    onError: (e: Error) => notifications.show({ color: 'red', message: e.message || 'Xác nhận thất bại' }),
  })

  if (isLoading) {
    return (
      <Center h={200}>
        <Loader />
      </Center>
    )
  }

  if (!transfer) return null

  const statusInfo = DocumentStatusLabel[transfer.status as keyof typeof DocumentStatusLabel]
  const isDraft = transfer.status === 'Draft'

  return (
    <Stack gap="lg">
      <PageHeader
        title={`Phiếu chuyển kho ${transfer.code}`}
        subtitle={`Ngày ${formatDate(transfer.transferDate)}`}
        actions={
          <Group>
            <Button
              variant="subtle"
              leftSection={<IconArrowLeft size={16} />}
              onClick={() => navigate('/inventory/transfers')}
            >
              Quay lại
            </Button>
            {isDraft && (
              <Button
                color="blue"
                leftSection={<IconCheck size={16} />}
                loading={confirmMutation.isPending}
                onClick={() =>
                  openConfirm({
                    title: 'Xác nhận phiếu chuyển kho',
                    message: 'Xác nhận chuyển kho và cập nhật tồn kho?',
                    confirmLabel: 'Xác nhận',
                    confirmColor: 'blue',
                    onConfirm: () => confirmMutation.mutate(),
                  })
                }
              >
                Xác nhận
              </Button>
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
              <Badge variant="light">{transfer.status}</Badge>
            )}
          </div>
          <div>
            <Text size="xs" c="dimmed">Kho xuất</Text>
            <Text fw={500}>{transfer.fromWarehouseName}</Text>
          </div>
          <div>
            <Text size="xs" c="dimmed">Kho nhập</Text>
            <Text fw={500}>{transfer.toWarehouseName}</Text>
          </div>
          {transfer.note && (
            <div>
              <Text size="xs" c="dimmed">Ghi chú</Text>
              <Text>{transfer.note}</Text>
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
            {transfer.lines.map((line, i) => (
              <Table.Tr key={i}>
                <Table.Td c="dimmed">{i + 1}</Table.Td>
                <Table.Td fw={500}>{line.productName}</Table.Td>
                <Table.Td>{line.unitName}</Table.Td>
                <Table.Td ta="right">{line.quantity.toLocaleString()}</Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      </Paper>

      <Group justify="flex-end">
        <Paper withBorder p="md" w={280}>
          <Stack gap="xs">
            <Group justify="space-between">
              <Text size="sm" c="dimmed">Số dòng</Text>
              <Text size="sm">{transfer.lines.length} sản phẩm</Text>
            </Group>
            <Divider />
            <Group justify="space-between">
              <Text fw={700}>Tổng số lượng</Text>
              <Text fw={700} size="lg" c="blue">
                {transfer.lines.reduce((s, l) => s + l.quantity, 0).toLocaleString()}
              </Text>
            </Group>
          </Stack>
        </Paper>
      </Group>
    </Stack>
  )
}
