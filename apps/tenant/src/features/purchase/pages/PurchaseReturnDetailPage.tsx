import { Stack, Group, Button, Badge, Text, Paper, Table, Divider, Loader, Center } from '@mantine/core'
import { notifications } from '@mantine/notifications'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate, useParams } from 'react-router-dom'
import { IconArrowLeft, IconCheck } from '@tabler/icons-react'
import { PageHeader, openConfirm } from '@pos/ui'
import { purchaseReturnsApi } from '@pos/api-client'
import { DocumentStatusLabel, formatVND, formatDate } from '@pos/utils'

export default function PurchaseReturnDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const qc = useQueryClient()

  const { data: purchaseReturn, isLoading } = useQuery({
    queryKey: ['purchase-return', id],
    queryFn: () => purchaseReturnsApi.getById(id!),
    enabled: !!id,
  })

  const confirmMutation = useMutation({
    mutationFn: () => purchaseReturnsApi.confirm(id!),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['purchase-return', id] })
      void qc.invalidateQueries({ queryKey: ['purchase-returns'] })
      notifications.show({ color: 'green', message: 'Xác nhận phiếu trả hàng thành công' })
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

  if (!purchaseReturn) return null

  const statusInfo = DocumentStatusLabel[purchaseReturn.status as keyof typeof DocumentStatusLabel]
  const isDraft = purchaseReturn.status === 'Draft'

  return (
    <Stack gap="lg">
      <PageHeader
        title={`Phiếu trả hàng ${purchaseReturn.code}`}
        subtitle={`Ngày ${formatDate(purchaseReturn.returnDate)}`}
        actions={
          <Group>
            <Button
              variant="subtle"
              leftSection={<IconArrowLeft size={16} />}
              onClick={() => navigate('/purchase/returns')}
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
                    title: 'Xác nhận phiếu trả hàng',
                    message: 'Xác nhận trả hàng và cập nhật tồn kho?',
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
              <Badge variant="light">{purchaseReturn.status}</Badge>
            )}
          </div>
          <div>
            <Text size="xs" c="dimmed">Nhà cung cấp</Text>
            <Text fw={500}>{purchaseReturn.supplierName}</Text>
          </div>
          <div>
            <Text size="xs" c="dimmed">Phiếu nhập gốc</Text>
            <Text
              fw={500}
              style={{ cursor: 'pointer', textDecoration: 'underline' }}
              onClick={() => navigate(`/purchase/receipts/${purchaseReturn.goodsReceiptId}`)}
            >
              {purchaseReturn.goodsReceiptCode}
            </Text>
          </div>
          <div>
            <Text size="xs" c="dimmed">Hoàn tiền</Text>
            <Badge color={purchaseReturn.isRefunded ? 'green' : 'gray'} variant="light">
              {purchaseReturn.isRefunded ? 'Đã hoàn tiền' : 'Chưa hoàn tiền'}
            </Badge>
          </div>
          {purchaseReturn.reason && (
            <div>
              <Text size="xs" c="dimmed">Lý do trả hàng</Text>
              <Text>{purchaseReturn.reason}</Text>
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
              <Table.Th ta="right">SL trả</Table.Th>
              <Table.Th ta="right">Đơn giá vốn</Table.Th>
              <Table.Th ta="right">Thành tiền</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {purchaseReturn.lines.map((line, i) => (
              <Table.Tr key={i}>
                <Table.Td c="dimmed">{i + 1}</Table.Td>
                <Table.Td fw={500}>{line.productName}</Table.Td>
                <Table.Td>{line.unitName}</Table.Td>
                <Table.Td ta="right">{line.quantity.toLocaleString()}</Table.Td>
                <Table.Td ta="right">{formatVND(line.unitCost)}</Table.Td>
                <Table.Td ta="right" fw={500}>{formatVND(line.returnAmount)}</Table.Td>
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
              <Text size="sm">{purchaseReturn.lines.length} sản phẩm</Text>
            </Group>
            <Divider />
            <Group justify="space-between">
              <Text fw={700}>Tổng tiền hoàn trả</Text>
              <Text fw={700} size="lg" c="blue">{formatVND(purchaseReturn.totalReturnAmount)}</Text>
            </Group>
          </Stack>
        </Paper>
      </Group>
    </Stack>
  )
}
