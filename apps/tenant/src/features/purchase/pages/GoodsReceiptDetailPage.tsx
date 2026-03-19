import { Stack, Group, Button, Badge, Text, Paper, Table, Divider, Loader, Center } from '@mantine/core'
import { notifications } from '@mantine/notifications'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate, useParams } from 'react-router-dom'
import { IconArrowLeft, IconCheck, IconX, IconArrowBack } from '@tabler/icons-react'
import { PageHeader, openConfirm } from '@pos/ui'
import { goodsReceiptsApi, purchaseReturnsApi } from '@pos/api-client'
import { DocumentStatusLabel, formatVND, formatDate } from '@pos/utils'

export default function GoodsReceiptDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const qc = useQueryClient()

  const { data: receipt, isLoading } = useQuery({
    queryKey: ['goods-receipt', id],
    queryFn: () => goodsReceiptsApi.getById(id!),
    enabled: !!id,
  })

  const confirmMutation = useMutation({
    mutationFn: () => goodsReceiptsApi.confirm(id!),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['goods-receipt', id] })
      void qc.invalidateQueries({ queryKey: ['goods-receipts'] })
      notifications.show({ color: 'green', message: 'Xác nhận phiếu nhập thành công' })
    },
    onError: () => notifications.show({ color: 'red', message: 'Xác nhận thất bại' }),
  })

  const cancelMutation = useMutation({
    mutationFn: () => goodsReceiptsApi.cancel(id!),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['goods-receipt', id] })
      void qc.invalidateQueries({ queryKey: ['goods-receipts'] })
      notifications.show({ color: 'green', message: 'Đã hủy phiếu nhập' })
    },
    onError: (e: Error) => notifications.show({ color: 'red', message: e.message || 'Hủy thất bại' }),
  })

  const { data: linkedReturns } = useQuery({
    queryKey: ['purchase-returns', { goodsReceiptId: id }],
    queryFn: () => purchaseReturnsApi.list({ goodsReceiptId: id }),
    enabled: !!id && !!receipt && receipt.status === 'Confirmed',
  })

  if (isLoading) {
    return (
      <Center h={200}>
        <Loader />
      </Center>
    )
  }

  if (!receipt) return null

  const statusInfo = DocumentStatusLabel[receipt.status as keyof typeof DocumentStatusLabel]
  const isDraft = receipt.status === 'Draft'

  return (
    <Stack gap="lg">
      <PageHeader
        title={`Phiếu nhập kho ${receipt.code}`}
        subtitle={`Ngày ${formatDate(receipt.receiptDate)}`}
        actions={
          <Group>
            <Button
              variant="subtle"
              leftSection={<IconArrowLeft size={16} />}
              onClick={() => navigate('/purchase/receipts')}
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
                      title: 'Xác nhận phiếu nhập',
                      message: 'Xác nhận nhập kho và cập nhật tồn?',
                      confirmLabel: 'Xác nhận',
                      confirmColor: 'blue',
                      onConfirm: () => confirmMutation.mutate(),
                    })
                  }
                >
                  Xác nhận nhập kho
                </Button>
                <Button
                  color="red"
                  variant="light"
                  leftSection={<IconX size={16} />}
                  loading={cancelMutation.isPending}
                  onClick={() =>
                    openConfirm({
                      title: 'Hủy phiếu nhập',
                      message: 'Bạn có chắc muốn hủy phiếu nhập này?',
                      confirmLabel: 'Hủy',
                      confirmColor: 'red',
                      onConfirm: () => cancelMutation.mutate(),
                    })
                  }
                >
                  Hủy
                </Button>
              </>
            )}
            {receipt.status === 'Confirmed' && (
              <Button
                color="orange"
                variant="light"
                leftSection={<IconArrowBack size={16} />}
                onClick={() => navigate(`/purchase/returns/new?grId=${id}`)}
              >
                Trả hàng NCC
              </Button>
            )}
          </Group>
        }
      />

      <Paper withBorder p="md">
        <Group gap="xl" wrap="wrap">
          <div>
            <Text size="xs" c="dimmed">Kho nhập</Text>
            <Text>{receipt.warehouseName}</Text>
          </div>
          <div>
            <Text size="xs" c="dimmed">Ngày nhập</Text>
            <Text>{formatDate(receipt.receiptDate)}</Text>
          </div>
          {receipt.purchaseOrderCode && (
            <div>
              <Text size="xs" c="dimmed">Đơn mua hàng</Text>
              <Text>{receipt.purchaseOrderCode}</Text>
            </div>
          )}
          <div>
            <Text size="xs" c="dimmed">Trạng thái</Text>
            {statusInfo ? (
              <Badge color={statusInfo.color} variant="light">{statusInfo.label}</Badge>
            ) : (
              <Badge variant="light">{receipt.status}</Badge>
            )}
          </div>
          {receipt.note && (
            <div>
              <Text size="xs" c="dimmed">Ghi chú</Text>
              <Text>{receipt.note}</Text>
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
              <Table.Th>Số lô</Table.Th>
              <Table.Th>HSD</Table.Th>
              <Table.Th ta="right">Thành tiền</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {receipt.lines.map((line, i) => (
              <Table.Tr key={line.id}>
                <Table.Td c="dimmed">{i + 1}</Table.Td>
                <Table.Td fw={500}>{line.productName}</Table.Td>
                <Table.Td>{line.unitName}</Table.Td>
                <Table.Td ta="right">{line.quantity.toLocaleString()}</Table.Td>
                <Table.Td ta="right">{formatVND(line.unitCost)}</Table.Td>
                <Table.Td>{line.batchNumber ?? '—'}</Table.Td>
                <Table.Td>{line.expiryDate ? formatDate(line.expiryDate) : '—'}</Table.Td>
                <Table.Td ta="right" fw={500}>{formatVND(line.quantity * line.unitCost)}</Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      </Paper>

      <Group justify="flex-end">
        <Paper withBorder p="md" w={260}>
          <Stack gap="xs">
            <Group justify="space-between">
              <Text size="sm" c="dimmed">Số dòng</Text>
              <Text size="sm">{receipt.lines.length} sản phẩm</Text>
            </Group>
            <Divider />
            <Group justify="space-between">
              <Text fw={700}>Tổng cộng</Text>
              <Text fw={700} size="lg" c="blue">{formatVND(receipt.lines.reduce((s, l) => s + l.quantity * l.unitCost, 0))}</Text>
            </Group>
          </Stack>
        </Paper>
      </Group>

      {(linkedReturns?.items.length ?? 0) > 0 && (
        <Paper withBorder>
          <Text fw={600} p="md" pb={0}>Phiếu trả hàng liên kết</Text>
          <Table striped>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Mã phiếu</Table.Th>
                <Table.Th>Ngày trả</Table.Th>
                <Table.Th>Nhà cung cấp</Table.Th>
                <Table.Th ta="right">Tiền hoàn trả</Table.Th>
                <Table.Th>Trạng thái</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {linkedReturns!.items.map((pr) => {
                const prStatus = DocumentStatusLabel[pr.status as keyof typeof DocumentStatusLabel]
                return (
                  <Table.Tr
                    key={pr.id}
                    style={{ cursor: 'pointer' }}
                    onClick={() => navigate(`/purchase/returns/${pr.id}`)}
                  >
                    <Table.Td fw={500}>{pr.code}</Table.Td>
                    <Table.Td>{formatDate(pr.returnDate)}</Table.Td>
                    <Table.Td>{pr.supplierName}</Table.Td>
                    <Table.Td ta="right">{formatVND(pr.totalReturnAmount)}</Table.Td>
                    <Table.Td>
                      {prStatus ? (
                        <Badge color={prStatus.color} variant="light" size="sm">{prStatus.label}</Badge>
                      ) : (
                        <Badge variant="light" size="sm">{pr.status}</Badge>
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
