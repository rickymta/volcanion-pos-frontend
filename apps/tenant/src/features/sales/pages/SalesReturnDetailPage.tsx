import { Stack, Group, Button, Badge, Text, Paper, Table, Divider, Loader, Center } from '@mantine/core'
import { notifications } from '@mantine/notifications'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate, useParams } from 'react-router-dom'
import { IconArrowLeft, IconCheck } from '@tabler/icons-react'
import { PageHeader, openConfirm } from '@pos/ui'
import { salesReturnsApi } from '@pos/api-client'
import { DocumentStatusLabel, formatVND, formatDate } from '@pos/utils'

export default function SalesReturnDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const qc = useQueryClient()

  const { data: salesReturn, isLoading } = useQuery({
    queryKey: ['sales-return', id],
    queryFn: () => salesReturnsApi.getById(id!),
    enabled: !!id,
  })

  const confirmMutation = useMutation({
    mutationFn: () => salesReturnsApi.confirm(id!),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['sales-return', id] })
      void qc.invalidateQueries({ queryKey: ['sales-returns'] })
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

  if (!salesReturn) return null

  const statusInfo = DocumentStatusLabel[salesReturn.status as keyof typeof DocumentStatusLabel]
  const isDraft = salesReturn.status === 'Draft'

  return (
    <Stack gap="lg">
      <PageHeader
        title={`Phiếu trả hàng bán ${salesReturn.code}`}
        subtitle={`Ngày ${formatDate(salesReturn.returnDate)}`}
        actions={
          <Group>
            <Button
              variant="subtle"
              leftSection={<IconArrowLeft size={16} />}
              onClick={() => navigate('/sales/returns')}
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
              <Badge variant="light">{salesReturn.status}</Badge>
            )}
          </div>
          <div>
            <Text size="xs" c="dimmed">Khách hàng</Text>
            <Text fw={500}>{salesReturn.customerName}</Text>
          </div>
          <div>
            <Text size="xs" c="dimmed">Hóa đơn gốc</Text>
            <Text
              fw={500}
              style={{ cursor: 'pointer', textDecoration: 'underline' }}
              onClick={() => navigate(`/sales/invoices/${salesReturn.invoiceId}`)}
            >
              {salesReturn.invoiceCode}
            </Text>
          </div>
          <div>
            <Text size="xs" c="dimmed">Hoàn tiền</Text>
            <Badge color={salesReturn.isRefunded ? 'green' : 'gray'} variant="light">
              {salesReturn.isRefunded ? 'Đã hoàn tiền' : 'Chưa hoàn tiền'}
            </Badge>
          </div>
          {salesReturn.reason && (
            <div>
              <Text size="xs" c="dimmed">Lý do trả hàng</Text>
              <Text>{salesReturn.reason}</Text>
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
              <Table.Th ta="right">Đơn giá</Table.Th>
              <Table.Th ta="right">Thành tiền</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {salesReturn.lines.map((line, i) => (
              <Table.Tr key={i}>
                <Table.Td c="dimmed">{i + 1}</Table.Td>
                <Table.Td fw={500}>{line.productName}</Table.Td>
                <Table.Td>{line.unitName}</Table.Td>
                <Table.Td ta="right">{line.quantity.toLocaleString()}</Table.Td>
                <Table.Td ta="right">{formatVND(line.unitPrice)}</Table.Td>
                <Table.Td ta="right" fw={500}>{formatVND(line.refundAmount)}</Table.Td>
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
              <Text size="sm">{salesReturn.lines.length} sản phẩm</Text>
            </Group>
            <Divider />
            <Group justify="space-between">
              <Text fw={700}>Tổng tiền hoàn trả</Text>
              <Text fw={700} size="lg" c="blue">{formatVND(salesReturn.totalRefundAmount)}</Text>
            </Group>
          </Stack>
        </Paper>
      </Group>
    </Stack>
  )
}
