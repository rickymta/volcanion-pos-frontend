import {
  Grid, Stack, TextInput, ScrollArea, Card, Text, Group, Button, NumberInput,
  Divider, Title, ActionIcon, Select, Modal, Radio, Badge, ThemeIcon,
} from '@mantine/core'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { IconSearch, IconTrash, IconShoppingCart, IconCheck, IconPrinter } from '@tabler/icons-react'
import { productsApi, customersApi, salesOrdersApi, paymentsApi, categoriesApi, warehousesApi } from '@pos/api-client'
import type { PaymentMethod } from '@pos/api-client'
import { formatVND } from '@pos/utils'
import { notifications } from '@mantine/notifications'
import { useCartStore, lineNet, lineVat, lineTotal } from '@/stores/cartStore'
import { useTranslation } from 'react-i18next'

export default function PosTerminalPage() {
  const { t } = useTranslation('pos')
  const [search, setSearch] = useState('')
  const [categoryId, setCategoryId] = useState<string | null>(null)
  const [checkoutOpen, setCheckoutOpen] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('Cash')
  const [amountReceived, setAmountReceived] = useState(0)
  const [receiptData, setReceiptData] = useState<{ code: string; grandTotal: number; paymentMethod: PaymentMethod; amountPaid: number } | null>(null)
  const qc = useQueryClient()

  // Cart store
  const {
    cart, customerId, warehouseId,
    addToCart, removeFromCart, updateQty, updateDiscount,
    setCustomerId, setWarehouseId, clearCart,
  } = useCartStore()

  const { data: products } = useQuery({
    queryKey: ['pos-products', search, categoryId],
    queryFn: () => productsApi.list({ search: search || undefined, categoryId: categoryId ?? undefined, pageSize: 40 }),
  })

  const { data: categories } = useQuery({
    queryKey: ['pos-categories'],
    queryFn: () => categoriesApi.list(),
  })

  const { data: warehouses } = useQuery({
    queryKey: ['pos-warehouses'],
    queryFn: () => warehousesApi.list({ pageSize: 999 }).then((r) => r.items),
  })

  const { data: customers } = useQuery({
    queryKey: ['pos-customers'],
    queryFn: () => customersApi.list({ pageSize: 200 }),
  })

  const createOrder = useMutation({
    mutationFn: async () => {
      if (!customerId) throw new Error(t('must_select_customer'))
      const order = await salesOrdersApi.create({
        customerId,
        orderDate: new Date().toISOString().slice(0, 10),
        lines: cart.map((item) => ({
          productId: item.productId,
          unitId: item.unitId,
          quantity: item.quantity,
          unitPrice: item.price,
          discountAmount: item.discount,
          vatRate: item.vatRate,
        })),
      })
      await salesOrdersApi.confirm(order.id, warehouseId ? { warehouseId } : undefined)
      await paymentsApi.create({
        paymentDate: new Date().toISOString().slice(0, 10),
        paymentType: 'Receive',
        paymentMethod: paymentMethod,
        amount: total,
        partnerType: 'Customer',
        partnerId: customerId,
        referenceType: 'SalesOrder',
        referenceId: order.id,
        note: 'Thu tiền don ' + order.code,
      })
      return order
    },
    onSuccess: (order) => {
      setReceiptData({ code: order.code, grandTotal: order.grandTotal, paymentMethod, amountPaid: amountReceived })
      notifications.show({ title: t('success_title'), message: t('order_paid_msg', { code: order.code }), color: 'green' })
      clearCart()
      setCheckoutOpen(false)
      setAmountReceived(0)
      void qc.invalidateQueries({ queryKey: ['pos-orders'] })
    },
    onError: (e: Error) => {
      notifications.show({ title: t('error_title'), message: e.message, color: 'red' })
    },
  })

  const subtotal = cart.reduce((sum, i) => sum + lineNet(i), 0)
  const vatAmount = cart.reduce((sum, i) => sum + lineVat(i), 0)
  const total = subtotal + vatAmount
  const change = amountReceived - total

  return (
    <>
      <Grid h="100%" m={0} gutter={0}>
        {/* Left: Product Search */}
        <Grid.Col span={7} p="md" style={{ borderRight: '1px solid var(--mantine-color-dark-4)' }}>
          <Stack gap="md" h="100%">
            <Select
              placeholder={t('customer_placeholder')}
              searchable
              clearable
              data={(customers?.items ?? []).map((c) => ({ value: c.id, label: c.name }))}
              value={customerId}
              onChange={setCustomerId}
              size="md"
            />
            <TextInput
              placeholder={t('product_search_placeholder')}
              leftSection={<IconSearch size={16} />}
              value={search}
              onChange={(e) => setSearch(e.currentTarget.value)}
              size="md"
              autoFocus
            />
            {/* Category filter */}
            <ScrollArea scrollbarSize={4} offsetScrollbars type="hover">
              <Group gap="xs" wrap="nowrap" pb={4}>
                <Button
                  size="xs"
                  variant={categoryId === null ? 'filled' : 'default'}
                  onClick={() => setCategoryId(null)}
                >
                  {t('all_categories')}
                </Button>
                {(categories ?? []).map((cat) => (
                  <Button
                    key={cat.id}
                    size="xs"
                    variant={categoryId === cat.id ? 'filled' : 'default'}
                    onClick={() => setCategoryId(cat.id)}
                  >
                    {cat.name}
                  </Button>
                ))}
              </Group>
            </ScrollArea>
            <ScrollArea flex={1}>
              <Grid gutter="sm">
                {(products?.items ?? []).map((product) => (
                  <Grid.Col key={product.id} span={4}>
                    <Card
                      withBorder
                      padding="sm"
                      style={{ cursor: 'pointer' }}
                      onClick={() => addToCart(product as any)}
                    >
                      <Text size="sm" fw={600} lineClamp={2}>{product.name}</Text>
                      <Text size="xs" c="dimmed">{product.code}</Text>
                      <Text size="sm" c="green" fw={500} mt={4}>{formatVND(product.sellingPrice)}</Text>
                    </Card>
                  </Grid.Col>
                ))}
                {(products?.items ?? []).length === 0 && (
                  <Grid.Col span={12}>
                    <Text c="dimmed" ta="center" py="xl">{t('no_products')}</Text>
                  </Grid.Col>
                )}
              </Grid>
            </ScrollArea>
          </Stack>
        </Grid.Col>

        {/* Right: Cart */}
        <Grid.Col span={5} p="md">
          <Stack h="100%" gap="md">
            <Group justify="space-between">
              <Title order={4}>{t('cart')}</Title>
              <Group gap="xs">
                {cart.length > 0 && (
                  <Badge color="blue" circle>{cart.length}</Badge>
                )}
                <IconShoppingCart size={20} />
              </Group>
            </Group>

            <ScrollArea flex={1}>
              <Stack gap="xs">
                {cart.map((item) => (
                  <Card key={item.productId} withBorder padding="xs">
                    <Group justify="space-between" wrap="nowrap" mb={4}>
                      <Stack gap={0} flex={1}>
                        <Text size="sm" fw={500} lineClamp={1}>{item.productName}</Text>
                        <Text size="xs" c="dimmed">{formatVND(item.price)} / {item.unitName}</Text>
                      </Stack>
                      <ActionIcon color="red" variant="subtle" size="sm" onClick={() => removeFromCart(item.productId)}>
                        <IconTrash size={14} />
                      </ActionIcon>
                    </Group>
                    <Group gap="xs" wrap="nowrap">
                      <NumberInput
                        label="SL"
                        value={item.quantity}
                        onChange={(v) => updateQty(item.productId, Number(v))}
                        min={1}
                        w={70}
                        size="xs"
                      />
                      <NumberInput
                        label="CK%"
                        value={item.discount}
                        onChange={(v) => updateDiscount(item.productId, Number(v))}
                        min={0}
                        max={100}
                        w={70}
                        size="xs"
                        suffix="%"
                      />
                      <Stack gap={0} flex={1} align="flex-end">
                        {item.discount > 0 && (
                          <Text size="xs" c="dimmed" td="line-through">{formatVND(item.price * item.quantity)}</Text>
                        )}
                        <Text size="sm" fw={600} c="green">{formatVND(lineTotal(item))}</Text>
                      </Stack>
                    </Group>
                  </Card>
                ))}
                {cart.length === 0 && (
                  <Text c="dimmed" ta="center" py="xl">{t('cart_empty_msg')}</Text>
                )}
              </Stack>
            </ScrollArea>

            <Divider />
            <Stack gap={4}>
              {vatAmount > 0 && (
                <>
                  <Group justify="space-between">
                    <Text size="sm" c="dimmed">{t('vat_excl')}:</Text>
                    <Text size="sm">{formatVND(subtotal)}</Text>
                  </Group>
                  <Group justify="space-between">
                    <Text size="sm" c="dimmed">{t('vat_tax')}:</Text>
                    <Text size="sm">{formatVND(vatAmount)}</Text>
                  </Group>
                </>
              )}
              <Group justify="space-between">
                <Text fw={700} size="lg">{t('total_label')}:</Text>
                <Text fw={700} size="lg" c="green">{formatVND(total)}</Text>
              </Group>
            </Stack>
            <Button
              size="lg"
              disabled={cart.length === 0 || !customerId}
              fullWidth
              onClick={() => { setAmountReceived(total); setCheckoutOpen(true) }}
            >
              {t('checkout_btn')}
            </Button>
          </Stack>
        </Grid.Col>
      </Grid>

      {/* Checkout Modal */}
      <Modal opened={checkoutOpen} onClose={() => setCheckoutOpen(false)} title={t('checkout_modal_title')} size="md">
        <Stack gap="md">
          <Stack gap={4}>
            <Group justify="space-between">
              <Text fw={600}>{t('items_count')}:</Text>
              <Text>{cart.length} {t('lines_unit')}</Text>
            </Group>
            {vatAmount > 0 && (
              <>
                <Group justify="space-between">
                  <Text c="dimmed">{t('goods_amount')}:</Text>
                  <Text>{formatVND(subtotal)}</Text>
                </Group>
                <Group justify="space-between">
                  <Text c="dimmed">{t('vat_tax')}:</Text>
                  <Text>{formatVND(vatAmount)}</Text>
                </Group>
              </>
            )}
            <Group justify="space-between">
              <Text fw={600}>{t('total_amount')}:</Text>
              <Text fw={700} size="xl" c="green">{formatVND(total)}</Text>
            </Group>
          </Stack>

          <Divider />

          <Select
            label={t('warehouse_label')}
            placeholder={t('warehouse_placeholder')}
            data={(warehouses ?? []).map((w) => ({ value: w.id, label: w.name }))}
            value={warehouseId}
            onChange={setWarehouseId}
            clearable
          />

          <Radio.Group
            label={t('payment_method')}
            value={paymentMethod}
            onChange={(v) => setPaymentMethod(v as PaymentMethod)}
          >
            <Group mt="xs">
              <Radio value="Cash" label={t('payment_cash')} />
              <Radio value="Card" label={t('payment_card')} />
              <Radio value="BankTransfer" label={t('payment_transfer')} />
              <Radio value="VNPay" label="VNPay" />
              <Radio value="MoMo" label="MoMo" />
            </Group>
          </Radio.Group>

          {paymentMethod === 'Cash' && (
            <>
              <NumberInput
                label={t('cash_given_label')}
                value={amountReceived}
                onChange={(v) => setAmountReceived(Number(v))}
                min={0}
                thousandSeparator=","
              />
              <Group justify="space-between">
                <Text>{t('change_label')}:</Text>
                <Text fw={600} c={change >= 0 ? 'green' : 'red'}>{formatVND(Math.max(0, change))}</Text>
              </Group>
            </>
          )}

          <Group justify="flex-end" mt="md">
            <Button variant="default" onClick={() => setCheckoutOpen(false)}>{t('cancel')}</Button>
            <Button
              loading={createOrder.isPending}
              disabled={paymentMethod === 'Cash' && amountReceived < total}
              onClick={() => createOrder.mutate()}
            >
              {t('confirm_payment_btn')}
            </Button>
          </Group>
        </Stack>
      </Modal>
      {/* Receipt Modal */}
      <Modal opened={!!receiptData} onClose={() => setReceiptData(null)} title={t('receipt_modal_title')} size="sm">
        {receiptData && (
          <Stack gap="md" ta="center">
            <ThemeIcon color="green" size={56} radius="xl" mx="auto">
              <IconCheck size={28} />
            </ThemeIcon>
            <Text fw={700} size="lg">{t('receipt_order_label')} {receiptData.code}</Text>
            <Text fw={600} size="xl" c="green">{formatVND(receiptData.grandTotal)}</Text>
            <Stack gap={4} ta="left" px="md">
              <Group justify="space-between">
                <Text size="sm" c="dimmed">{t('receipt_method_label')}:</Text>
                <Text size="sm" fw={500}>{receiptData.paymentMethod}</Text>
              </Group>
              {receiptData.paymentMethod === 'Cash' && (
                <>
                  <Group justify="space-between">
                    <Text size="sm" c="dimmed">{t('receipt_cash_given')}:</Text>
                    <Text size="sm" fw={500}>{formatVND(receiptData.amountPaid)}</Text>
                  </Group>
                  <Group justify="space-between">
                    <Text size="sm" c="dimmed">{t('receipt_change')}:</Text>
                    <Text size="sm" fw={500} c="blue">{formatVND(Math.max(0, receiptData.amountPaid - receiptData.grandTotal))}</Text>
                  </Group>
                </>
              )}
            </Stack>
            <Group justify="center" mt="sm">
              <Button variant="default" onClick={() => setReceiptData(null)}>{t('no_print_btn')}</Button>
              <Button leftSection={<IconPrinter size={16} />} onClick={() => window.print()}>
                {t('print_btn')}
              </Button>
            </Group>
          </Stack>
        )}
      </Modal>
    </>
  )
}
