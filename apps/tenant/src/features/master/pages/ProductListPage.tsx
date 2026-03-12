import { useState } from 'react'
import { Stack, Group, Button, TextInput, Select, Badge, ActionIcon, Tooltip, NumberFormatter } from '@mantine/core'
import { useQuery } from '@tanstack/react-query'
import { IconPlus, IconEdit, IconSearch } from '@tabler/icons-react'
import { useNavigate } from 'react-router-dom'
import { PageHeader, DataTable } from '@pos/ui'
import type { DataTableColumn } from '@pos/ui'
import { productsApi, categoriesApi } from '@pos/api-client'
import type { ProductDto } from '@pos/api-client'

type Row = ProductDto & Record<string, unknown>

const PAGE_SIZE = 20

export default function ProductListPage() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [categoryId, setCategoryId] = useState<string | null>(null)
  const [page, setPage] = useState(1)

  const { data: categoriesData } = useQuery({
    queryKey: ['categories'],
    queryFn: () => categoriesApi.list(),
  })

  const { data, isLoading } = useQuery({
    queryKey: ['products', page, search, categoryId],
    queryFn: () =>
      productsApi.list({
        page,
        pageSize: PAGE_SIZE,
        search: search || undefined,
        categoryId: categoryId ?? undefined,
      }),
  })

  // Flatten category tree for select
  const categoryOptions = (categoriesData ?? []).flatMap((c) => [
    { value: c.id, label: c.name },
    ...(c.children ?? []).map((ch) => ({ value: ch.id, label: `  ↳ ${ch.name}` })),
  ])

  const columns: DataTableColumn<Row>[] = [
    { key: 'code', header: 'Mã SP', width: 110 },
    { key: 'name', header: 'Tên sản phẩm' },
    {
      key: 'categoryName',
      header: 'Danh mục',
      render: (row) => (row.categoryName as string | undefined) ?? '—',
    },
    { key: 'baseUnitName', header: 'ĐVT' },
    {
      key: 'sellingPrice',
      header: 'Giá bán',
      align: 'right',
      render: (row) => (
        <NumberFormatter
          value={row.sellingPrice as number}
          thousandSeparator="."
          decimalSeparator=","
          suffix=" ₫"
        />
      ),
    },
    {
      key: 'vatRate',
      header: 'VAT',
      align: 'center',
      render: (row) => `${(row.vatRate as number) * 100}%`,
    },
    {
      key: 'status',
      header: 'Trạng thái',
      render: (row) => (
        <Badge color={row.status === 'Active' ? 'green' : 'gray'} variant="light">
          {row.status === 'Active' ? 'Hoạt động' : 'Ngừng'}
        </Badge>
      ),
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      width: 60,
      render: (row) => (
        <Tooltip label="Sửa">
          <ActionIcon variant="subtle" onClick={() => navigate(`/master/products/${row.id as string}/edit`)}>
            <IconEdit size={16} />
          </ActionIcon>
        </Tooltip>
      ),
    },
  ]

  return (
    <Stack gap="lg">
      <PageHeader
        title="Sản phẩm"
        subtitle="Quản lý danh mục sản phẩm"
        actions={
          <Button leftSection={<IconPlus size={16} />} onClick={() => navigate('/master/products/new')}>
            Thêm sản phẩm
          </Button>
        }
      />

      <Group>
        <TextInput
          placeholder="Tìm theo tên, mã, barcode..."
          leftSection={<IconSearch size={16} />}
          value={search}
          onChange={(e) => { setSearch(e.currentTarget.value); setPage(1) }}
          w={300}
        />
        <Select
          placeholder="Tất cả danh mục"
          data={categoryOptions}
          value={categoryId}
          onChange={(v) => { setCategoryId(v); setPage(1) }}
          clearable
          searchable
          w={220}
        />
      </Group>

      <DataTable
        data={(data?.items ?? []) as Row[]}
        columns={columns}
        isLoading={isLoading}
        total={data?.totalCount}
        page={page}
        pageSize={PAGE_SIZE}
        onPageChange={setPage}
        rowKey="id"
        onRowClick={(row) => navigate(`/master/products/${row.id as string}`)}
      />
    </Stack>
  )
}
