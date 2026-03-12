import { useState } from 'react'
import { Stack, Group, Button, Badge, Text, Paper, SimpleGrid, Loader, Center, TextInput, Select, PasswordInput } from '@mantine/core'
import { useForm } from '@mantine/form'
import { notifications } from '@mantine/notifications'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useParams, useNavigate } from 'react-router-dom'
import { IconArrowLeft, IconDatabase, IconEdit } from '@tabler/icons-react'
import { PageHeader, openConfirm, DrawerForm } from '@pos/ui'
import { tenantsApi } from '@pos/sysadmin-client'
import type { SubscriptionPlan } from '@pos/sysadmin-client'
import { formatDate, formatDateTime } from '@pos/utils'
import { useTranslation } from 'react-i18next'

const SUBSCRIPTION_OPTIONS = [
  { value: 'Free', label: 'Free' },
  { value: 'Basic', label: 'Basic' },
  { value: 'Pro', label: 'Pro' },
  { value: 'Enterprise', label: 'Enterprise' },
]

const TIMEZONE_OPTIONS = [
  { value: 'Asia/Ho_Chi_Minh', label: 'Asia/Ho_Chi_Minh (GMT+7)' },
  { value: 'Asia/Bangkok', label: 'Asia/Bangkok (GMT+7)' },
  { value: 'Asia/Singapore', label: 'Asia/Singapore (GMT+8)' },
  { value: 'UTC', label: 'UTC' },
]

const CURRENCY_OPTIONS = [
  { value: 'VND', label: 'VND — Vietnamese Dong' },
  { value: 'USD', label: 'USD — US Dollar' },
  { value: 'EUR', label: 'EUR — Euro' },
]

interface EditFormValues {
  name: string
  status: string
  taxCode: string
  address: string
  phone: string
  email: string
  subscriptionPlan: string
  subscriptionExpiry: string
  timeZone: string
  currency: string
  adminEmail: string
  adminUsername: string
  adminPassword: string
}

const STATUS_COLOR: Record<string, string> = { Active: 'green', Inactive: 'gray', Suspended: 'red' }

export default function TenantDetailPage() {
  const { id = '' } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { t } = useTranslation('sysadmin')
  const qc = useQueryClient()
  const [editOpen, setEditOpen] = useState(false)

  const STATUS_LABEL: Record<string, string> = {
    Active: t('status_active'),
    Inactive: t('status_inactive'),
    Suspended: t('status_suspended'),
  }

  const STATUS_OPTIONS = [
    { value: 'Active', label: t('status_active') },
    { value: 'Inactive', label: t('status_inactive') },
    { value: 'Suspended', label: t('status_suspended') },
  ]

  const { data: tenant, isLoading } = useQuery({
    queryKey: ['tenant', id],
    queryFn: () => tenantsApi.getById(id),
    enabled: !!id,
  })

  const editForm = useForm<EditFormValues>({
    initialValues: {
      name: '', status: 'Active',
      taxCode: '', address: '', phone: '', email: '',
      subscriptionPlan: '', subscriptionExpiry: '', timeZone: '', currency: '',
      adminEmail: '', adminUsername: '', adminPassword: '',
    },
    validate: { name: (v: string) => (!v ? 'Nhập tên' : null) },
  })

  const updateMutation = useMutation({
    mutationFn: (values: EditFormValues) =>
      tenantsApi.update(id, {
        name: values.name || undefined,
        status: values.status as 'Active' | 'Inactive' | 'Suspended',
        taxCode: values.taxCode || undefined,
        address: values.address || undefined,
        phone: values.phone || undefined,
        email: values.email || undefined,
        subscriptionPlan: (values.subscriptionPlan || undefined) as SubscriptionPlan | undefined,
        subscriptionExpiry: values.subscriptionExpiry || undefined,
        timeZone: values.timeZone || undefined,
        currency: values.currency || undefined,
        adminEmail: values.adminEmail || undefined,
        adminUsername: values.adminUsername || undefined,
        adminPassword: values.adminPassword || undefined,
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['tenant', id] })
      void qc.invalidateQueries({ queryKey: ['tenants'] })
      notifications.show({ color: 'green', message: t('update_success') })
      setEditOpen(false)
      editForm.reset()
    },
    onError: () => notifications.show({ color: 'red', message: t('update_error') }),
  })

  const openEditDrawer = () => {
    if (!tenant) return
    editForm.setValues({
      name: tenant.name,
      status: tenant.status,
      taxCode: tenant.taxCode ?? '',
      address: tenant.address ?? '',
      phone: tenant.phone ?? '',
      email: tenant.email ?? '',
      subscriptionPlan: tenant.subscriptionPlan ?? '',
      subscriptionExpiry: tenant.subscriptionExpiry ?? '',
      timeZone: tenant.timeZone ?? '',
      currency: tenant.currency ?? '',
      adminEmail: '',
      adminUsername: '',
      adminPassword: '',
    })
    setEditOpen(true)
  }

  const seedMutation = useMutation({
    mutationFn: () => tenantsApi.seed(id),
    onSuccess: () => notifications.show({ color: 'green', message: t('seed_success') }),
    onError: () => notifications.show({ color: 'red', message: t('seed_error') }),
  })

  if (isLoading) return <Center h={300}><Loader /></Center>
  if (!tenant) return null

  return (
    <Stack gap="lg">
      <PageHeader
        title={tenant.name}
        subtitle={`Slug: ${tenant.slug}`}
        actions={
          <Group>
            <Button variant="subtle" leftSection={<IconArrowLeft size={16} />} onClick={() => navigate(-1)}>
              {t('back')}
            </Button>
            <Button
              variant="light"
              color="blue"
              leftSection={<IconEdit size={16} />}
              onClick={openEditDrawer}
            >
              {t('edit')}
            </Button>
            <Button
              color="grape"
              leftSection={<IconDatabase size={16} />}
              loading={seedMutation.isPending}
              onClick={() => openConfirm({
                title: t('seed_btn'),
                message: t('seed_confirm_msg', { name: tenant.name }),
                confirmLabel: t('seed_btn'),
                confirmColor: 'grape',
                onConfirm: () => seedMutation.mutate(),
              })}
            >
              {t('seed_btn')}
            </Button>
          </Group>
        }
      />

      <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="md">
        <Paper withBorder p="md">
          <Text size="xs" c="dimmed">{t('tenant_status')}</Text>
          <Badge color={STATUS_COLOR[tenant.status] ?? 'gray'} variant="light" size="lg" mt={4}>
            {STATUS_LABEL[tenant.status] ?? tenant.status}
          </Badge>
        </Paper>
        <Paper withBorder p="md">
          <Text size="xs" c="dimmed">{t('admin_email')}</Text>
          <Text fw={500} mt={4}>{tenant.adminEmail ?? '—'}</Text>
        </Paper>
        <Paper withBorder p="md">
          <Text size="xs" c="dimmed">Gói dịch vụ</Text>
          <Text fw={500} mt={4}>{tenant.subscriptionPlan ?? '—'}</Text>
        </Paper>
        <Paper withBorder p="md">
          <Text size="xs" c="dimmed">Hết hạn gói</Text>
          <Text fw={500} mt={4}>{tenant.subscriptionExpiry ? formatDate(tenant.subscriptionExpiry) : '—'}</Text>
        </Paper>
        <Paper withBorder p="md">
          <Text size="xs" c="dimmed">Mã số thuế</Text>
          <Text fw={500} mt={4}>{tenant.taxCode ?? '—'}</Text>
        </Paper>
        <Paper withBorder p="md">
          <Text size="xs" c="dimmed">Số điện thoại</Text>
          <Text fw={500} mt={4}>{tenant.phone ?? '—'}</Text>
        </Paper>
        <Paper withBorder p="md">
          <Text size="xs" c="dimmed">Email liên hệ</Text>
          <Text fw={500} mt={4}>{tenant.email ?? '—'}</Text>
        </Paper>
        <Paper withBorder p="md">
          <Text size="xs" c="dimmed">Múi giờ</Text>
          <Text fw={500} mt={4}>{tenant.timeZone ?? '—'}</Text>
        </Paper>
        <Paper withBorder p="md">
          <Text size="xs" c="dimmed">Tiền tệ</Text>
          <Text fw={500} mt={4}>{tenant.currency ?? '—'}</Text>
        </Paper>
        <Paper withBorder p="md">
          <Text size="xs" c="dimmed">{t('users_count')}</Text>
          <Text fw={700} size="xl" mt={4}>{tenant.userCount ?? 0}</Text>
        </Paper>
        <Paper withBorder p="md">
          <Text size="xs" c="dimmed">{t('orders_count')}</Text>
          <Text fw={700} size="xl" mt={4}>{tenant.orderCount}</Text>
        </Paper>
        <Paper withBorder p="md">
          <Text size="xs" c="dimmed">{t('products_count')}</Text>
          <Text fw={700} size="xl" mt={4}>{tenant.productCount}</Text>
        </Paper>
        <Paper withBorder p="md">
          <Text size="xs" c="dimmed">{t('last_activity')}</Text>
          <Text fw={500} mt={4}>{tenant.lastActivityAt ? formatDateTime(tenant.lastActivityAt) : '—'}</Text>
        </Paper>
        <Paper withBorder p="md">
          <Text size="xs" c="dimmed">{t('created_at')}</Text>
          <Text fw={500} mt={4}>{formatDate(tenant.createdAt)}</Text>
        </Paper>
      </SimpleGrid>
      {tenant.address && (
        <Paper withBorder p="md">
          <Text size="xs" c="dimmed">Địa chỉ</Text>
          <Text fw={500} mt={4}>{tenant.address}</Text>
        </Paper>
      )}

      {/* Edit Drawer */}
      <DrawerForm
        opened={editOpen}
        onClose={() => { setEditOpen(false); editForm.reset() }}
        title={t('edit_tenant')}
        onSubmit={() => { editForm.onSubmit((v: EditFormValues) => updateMutation.mutate(v))() }}
        isLoading={updateMutation.isPending}
      >
        <Stack gap="sm">
          <TextInput label={t('tenant_name')} {...editForm.getInputProps('name')} required />
          <Select label={t('tenant_status')} data={STATUS_OPTIONS} {...editForm.getInputProps('status')} />
          <SimpleGrid cols={2} spacing="sm">
            <TextInput label="Mã số thuế" placeholder="0123456789" {...editForm.getInputProps('taxCode')} />
            <TextInput label="Số điện thoại" placeholder="028 1234 5678" {...editForm.getInputProps('phone')} />
          </SimpleGrid>
          <TextInput label="Email liên hệ" placeholder="contact@company.vn" {...editForm.getInputProps('email')} />
          <TextInput label="Địa chỉ" placeholder="123 Nguyễn Huệ, Quận 1, TP.HCM" {...editForm.getInputProps('address')} />
          <SimpleGrid cols={2} spacing="sm">
            <Select label="Gói dịch vụ" data={SUBSCRIPTION_OPTIONS} clearable {...editForm.getInputProps('subscriptionPlan')} />
            <TextInput label="Hết hạn gói" placeholder="2027-12-31" description="ISO date: YYYY-MM-DD" {...editForm.getInputProps('subscriptionExpiry')} />
          </SimpleGrid>
          <SimpleGrid cols={2} spacing="sm">
            <Select label="Múi giờ" data={TIMEZONE_OPTIONS} clearable {...editForm.getInputProps('timeZone')} />
            <Select label="Tiền tệ" data={CURRENCY_OPTIONS} clearable {...editForm.getInputProps('currency')} />
          </SimpleGrid>
          <TextInput
            label={t('admin_email')}
            placeholder="Để trống nếu không đổi"
            description="Chỉ điền khi muốn thay đổi"
            {...editForm.getInputProps('adminEmail')}
          />
          <TextInput
            label={t('admin_username')}
            placeholder="Để trống nếu không đổi"
            description="Chỉ điền khi muốn thay đổi"
            {...editForm.getInputProps('adminUsername')}
          />
          <PasswordInput
            label={t('admin_password')}
            placeholder="Để trống nếu không đổi"
            description="Chỉ điền khi muốn thay đổi"
            {...editForm.getInputProps('adminPassword')}
          />
        </Stack>
      </DrawerForm>
    </Stack>
  )
}
