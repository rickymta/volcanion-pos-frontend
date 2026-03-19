import { type ReactNode } from 'react'
import {
  Table,
  Pagination,
  Group,
  Text,
  Skeleton,
  Stack,
} from '@mantine/core'

import { EmptyState } from '../EmptyState'

export interface DataTableColumn<T> {
  key: keyof T | string
  header: ReactNode
  render?: (row: T, index: number) => ReactNode
  width?: number | string
  align?: 'left' | 'center' | 'right'
}

interface DataTableProps<T extends Record<string, unknown>> {
  data: T[]
  columns: DataTableColumn<T>[]
  isLoading?: boolean
  /** Total record count (for pagination) */
  total?: number
  page?: number
  pageSize?: number
  onPageChange?: (page: number) => void
  emptyMessage?: string
  rowKey?: keyof T | ((row: T) => string)
  /** Callback when a row is clicked */
  onRowClick?: (row: T) => void
}

export function DataTable<T extends Record<string, unknown>>({
  data,
  columns,
  isLoading = false,
  total,
  page = 1,
  pageSize = 20,
  onPageChange,
  emptyMessage = 'Không có dữ liệu',
  rowKey,
  onRowClick,
}: DataTableProps<T>) {
  const totalPages = total ? Math.ceil(total / pageSize) : undefined

  if (isLoading) {
    return (
      <Stack gap="xs">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} height={44} radius="sm" />
        ))}
      </Stack>
    )
  }

  if (!data.length) {
    return <EmptyState message={emptyMessage} />
  }

  const getKey = (row: T, index: number): string => {
    if (!rowKey) return String(index)
    if (typeof rowKey === 'function') return rowKey(row)
    return String(row[rowKey])
  }

  return (
    <Stack gap="md">
      <Table striped highlightOnHover withTableBorder>
        <Table.Thead>
          <Table.Tr>
            {columns.map((col, i) => (
              <Table.Th
                key={i}
                style={{
                  width: col.width,
                  textAlign: col.align ?? 'left',
                }}
              >
                {col.header}
              </Table.Th>
            ))}
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {data.map((row, rowIndex) => (
            <Table.Tr
              key={getKey(row, rowIndex)}
              style={onRowClick ? { cursor: 'pointer' } : undefined}
              onClick={() => onRowClick?.(row)}
            >
              {columns.map((col, colIndex) => (
                <Table.Td
                  key={colIndex}
                  style={{ textAlign: col.align ?? 'left' }}
                >
                  {col.render
                    ? col.render(row, rowIndex)
                    : String(row[col.key as keyof T] ?? '')}
                </Table.Td>
              ))}
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>

      {total !== undefined && total > 0 && (
        <Group justify="space-between" align="center">
          <Text size="sm" c="dimmed">
            Tổng: {total} kết quả
          </Text>
          {totalPages && totalPages > 1 && (
            <Pagination
              total={totalPages}
              value={page}
              onChange={onPageChange}
              size="sm"
            />
          )}
        </Group>
      )}
    </Stack>
  )
}
