import { useState } from 'react'
import {
  Stack, Group, TextInput, Select, Badge, Button, PasswordInput, SimpleGrid,
} from '@mantine/core'
import { useForm } from '@mantine/form'
import { notifications } from '@mantine/notifications'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { IconSearch, IconPlus, IconDatabase, IconEdit } from '@tabler/icons-react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { PageHeader, DataTable, DrawerForm, openConfirm } from '@pos/ui'
import type { DataTableColumn } from '@pos/ui'
import { tenantsApi } from '@pos/sysadmin-client'
import type { TenantDto, SubscriptionPlan } from '@pos/sysadmin-client'
import { formatDate } from '@pos/utils'

type Row = TenantDto & Record<string, unknown>

const PAGE_SIZE = 20

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

interface CreateFormValues {
  name: string
  slug: string
  adminEmail: string
  adminUsername: string
  adminPassword: string
  adminFullName: string
  taxCode: string
  address: string
  phone: string
  email: string
  subscriptionPlan: string
  subscriptionExpiry: string
  timeZone: string
  currency: string
}

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

export default function TenantsPage() {
  const navigate = useNavigate()
  const { t } = useTranslation('sysadmin')
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [createOpen, setCreateOpen] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)

  const createForm = useForm<CreateFormValues>({
    initialValues: {
      name: '', slug: '', adminEmail: '', adminUsername: '', adminPassword: '', adminFullName: '',
      taxCode: '', address: '', phone: '', email: '',
      subscriptionPlan: 'Pro', subscriptionExpiry: '', timeZone: 'Asia/Ho_Chi_Minh', currency: 'VND',
    },
    validate: {
      name: (v: string) => (!v ? 'Nhập tên' : null),
      slug: (v: string) => (!v ? 'Nhập slug' : null),
      adminEmail: (v: string) => (!v ? 'Nhập email' : null),
      adminUsername: (v: string) => (!v ? 'Nhập tên đăng nhập admin' : null),
      adminPassword: (v: string) => (!v ? 'Nhập mật khẩu' : null),
      adminFullName: (v: string) => (!v ? 'Nhập họ tên admin' : null),
    },
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

  const params = { page, pageSize: PAGE_SIZE, search: search || undefined }

  const { data, isLoading } = useQuery({
    queryKey: ['tenants', params],
    queryFn: () => tenantsApi.list(params),
  })

  const createMutation = useMutation({
    mutationFn: (values: CreateFormValues) => tenantsApi.create({
      ...values,
      subscriptionPlan: (values.subscriptionPlan || undefined) as SubscriptionPlan | undefined,
      subscriptionExpiry: values.subscriptionExpiry || undefined,
      taxCode: values.taxCode || undefined,
      address: values.address || undefined,
      phone: values.phone || undefined,
      email: values.email || undefined,
      timeZone: values.timeZone || undefined,
      currency: values.currency || undefined,
      adminUsername: values.adminUsername,
    }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['tenants'] })
      notifications.show({ color: 'green', message: t('create_success') })
      setCreateOpen(false)
      createForm.reset()
    },
    onError: () => notifications.show({ color: 'red', message: t('create_error') }),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, values }: { id: string; values: EditFormValues }) =>
      tenantsApi.update(id, {
        name: values.name || undefined,
        status: values.status as 'Active' | 'Inactive' | 'Suspended',
        taxCode: values.taxCode || undefined,
        address: values.address || undefined,
        phone: values.phone || undefined,
        email: values.email || undefined,
        subscriptionPlan: (values.subscriptionPlan || undefined) as 'Free' | 'Basic' | 'Pro' | 'Enterprise' | undefined,
        subscriptionExpiry: values.subscriptionExpiry || undefined,
        timeZone: values.timeZone || undefined,
        currency: values.currency || undefined,
        adminEmail: values.adminEmail || undefined,
        adminUsername: values.adminUsername || undefined,
        adminPassword: values.adminPassword || undefined,
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['tenants'] })
      void qc.invalidateQueries({ queryKey: ['tenant', editId] })
      notifications.show({ color: 'green', message: t('update_success') })
      setEditId(null)
      editForm.reset()
    },
    onError: () => notifications.show({ color: 'red', message: t('update_error') }),
  })

  const seedMutation = useMutation({
    mutationFn: (id: string) => tenantsApi.seed(id),
    onSuccess: () => notifications.show({ color: 'green', message: t('seed_success') }),
    onError: () => notifications.show({ color: 'red', message: t('seed_error') }),
  })

  const statusColor: Record<string, string> = { Active: 'green', Inactive: 'gray', Suspended: 'red' }
  const statusLabel: Record<string, string> = {
    Active: t('status_active'),
    Inactive: t('status_inactive'),
    Suspended: t('status_suspended'),
  }

  const STATUS_OPTIONS = [
    { value: 'Active', label: t('status_active') },
    { value: 'Inactive', label: t('status_inactive') },
    { value: 'Suspended', label: t('status_suspended') },
  ]

  const columns: DataTableColumn<Row>[] = [
    { key: 'name', header: t('tenant_table_name'), width: 200 },
    { key: 'slug', header: t('tenant_slug'), width: 150 },
    { key: 'adminEmail', header: t('tenant_table_email'), render: (row) => (row.adminEmail as string | undefined) ?? '—' },
    { key: 'userCount', header: t('tenant_table_users'), width: 80, align: 'right', render: (row) => String(row.userCount ?? 0) },
    { key: 'createdAt', header: t('tenant_created'), width: 110, render: (row) => formatDate(row.createdAt as string) },
    {
      key: 'status',
      header: t('tenant_status'),
      width: 140,
      render: (row) => {
        const s = row.status as string
        return <Badge color={statusColor[s] ?? 'gray'} variant="light">{statusLabel[s] ?? s}</Badge>
      },
    },
    {
      key: 'actions',
      header: '',
      width: 160,
      align: 'right',
      render: (row) => (
        <Group gap={4} justify="flex-end" wrap="nowrap">
          <Button
            size="xs"
            variant="light"
            color="blue"
            leftSection={<IconEdit size={13} />}
            onClick={(e) => {
              e.stopPropagation()
              editForm.setValues({
                name: row.name as string,
                status: row.status as string,
                taxCode: (row.taxCode as string | undefined) ?? '',
                address: '',
                phone: (row.phone as string | undefined) ?? '',
                email: (row.email as string | undefined) ?? '',
                subscriptionPlan: (row.subscriptionPlan as string | undefined) ?? '',
                subscriptionExpiry: '',
                timeZone: (row.timeZone as string | undefined) ?? '',
                currency: (row.currency as string | undefined) ?? '',
                adminEmail: '',
                adminUsername: '',
                adminPassword: '',
              })
              setEditId(row.id as string)
            }}
          >
            {t('edit')}
          </Button>
          <Button
            size="xs"
            variant="light"
            color="grape"
            leftSection={<IconDatabase size={13} />}
            onClick={(e) => {
              e.stopPropagation()
              openConfirm({
                message: t('seed_confirm_msg', { name: row.name as string }),
                confirmColor: 'grape',
                onConfirm: () => seedMutation.mutate(row.id as string),
              })
            }}
          >
            {t('seed_btn')}
          </Button>
        </Group>
      ),
    },
  ]

  return (
    <Stack gap="lg">
      <PageHeader
        title={t('tenant_list_title')}
        subtitle={t('tenant_list_subtitle')}
        actions={
          <Group>
            <TextInput
              placeholder={t('tenant_search')}
              leftSection={<IconSearch size={16} />}
              value={search}
              onChange={(e) => setSearch(e.currentTarget.value)}
              w={250}
            />
            <Button leftSection={<IconPlus size={16} />} onClick={() => setCreateOpen(true)}>
              {t('tenant_create_btn')}
            </Button>
          </Group>
        }
      />

      <DataTable
        data={(data?.items ?? []) as Row[]}
        columns={columns}
        isLoading={isLoading}
        total={data?.totalCount}
        page={page}
        pageSize={PAGE_SIZE}
        onPageChange={setPage}
        rowKey="id"
        onRowClick={(row) => navigate(`/tenants/${row.id as string}`)}
      />

      {/* Create Drawer */}
      <DrawerForm
        opened={createOpen}
        onClose={() => { setCreateOpen(false); createForm.reset() }}
        title={t('create_new_tenant')}
        onSubmit={() => { createForm.onSubmit((v: CreateFormValues) => createMutation.mutate(v))() }}
        isLoading={createMutation.isPending}
      >
        <Stack gap="sm">
          <TextInput label={t('tenant_name')} placeholder="Công ty ABC" {...createForm.getInputProps('name')} required />
          <TextInput label="Slug" placeholder="cong-ty-abc" description="Lowercase, chỉ a-z, 0-9, dấu gạch ngang" {...createForm.getInputProps('slug')} required />
          <SimpleGrid cols={2} spacing="sm">
            <TextInput label="Mã số thuế" placeholder="0123456789" {...createForm.getInputProps('taxCode')} />
            <TextInput label="Số điện thoại" placeholder="028 1234 5678" {...createForm.getInputProps('phone')} />
          </SimpleGrid>
          <TextInput label="Email liên hệ" placeholder="contact@company.vn" {...createForm.getInputProps('email')} />
          <TextInput label="Địa chỉ" placeholder="123 Nguyễn Huệ, Quận 1, TP.HCM" {...createForm.getInputProps('address')} />
          <SimpleGrid cols={2} spacing="sm">
            <Select label="Gói dịch vụ" data={SUBSCRIPTION_OPTIONS} {...createForm.getInputProps('subscriptionPlan')} />
          </SimpleGrid>
          <SimpleGrid cols={2} spacing="sm">
            <TextInput label="Hết hạn gói" placeholder="2027-12-31" description="ISO date: YYYY-MM-DD" {...createForm.getInputProps('subscriptionExpiry')} />
          </SimpleGrid>
          <SimpleGrid cols={2} spacing="sm">
            <Select label="Múi giờ" data={TIMEZONE_OPTIONS} {...createForm.getInputProps('timeZone')} />
            <Select label="Tiền tệ" data={CURRENCY_OPTIONS} {...createForm.getInputProps('currency')} />
          </SimpleGrid>
          <TextInput label={t('admin_email')} placeholder="admin@abc.com" {...createForm.getInputProps('adminEmail')} required />
          <TextInput label={t('admin_username')} placeholder="admin_abc" {...createForm.getInputProps('adminUsername')} required />
          <PasswordInput label={t('admin_password')} {...createForm.getInputProps('adminPassword')} required />
          <TextInput label={t('create_fullname')} placeholder="Nguyễn Văn A" {...createForm.getInputProps('adminFullName')} required />
        </Stack>
      </DrawerForm>

      {/* Edit Drawer */}
      <DrawerForm
        opened={!!editId}
        onClose={() => { setEditId(null); editForm.reset() }}
        title={t('edit_tenant')}
        onSubmit={() => { editForm.onSubmit((v: EditFormValues) => updateMutation.mutate({ id: editId!, values: v }))() }}
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
