import { useEffect } from 'react'
import { Center, Loader, Alert, Text, Stack } from '@mantine/core'
import { IconAlertCircle } from '@tabler/icons-react'
import { authApi } from '@pos/api-client'
import { useTenantStore } from '@/lib/useTenantStore'
import { getSlugFromHostname } from '@/lib/tenantResolver'

interface Props {
  children: React.ReactNode
}

/**
 * Đọc slug từ subdomain, gọi API để resolve sang tenantId/name.
 * Chỉ render children khi tenant đã được xác định thành công.
 *
 * Dev: truy cập http://demo.localhost:3002
 *   hoặc set VITE_DEV_TENANT_SLUG=demo để dùng plain localhost:3002
 */
export function TenantBoundary({ children }: Props) {
  const { status, error, setTenant, setStatus } = useTenantStore()

  useEffect(() => {
    const slug = getSlugFromHostname()

    if (!slug) {
      setStatus(
        'error',
        'Không xác định được cửa hàng từ địa chỉ truy cập.\n' +
          'Vui lòng dùng subdomain (vd: demo.localhost:3002) ' +
          'hoặc set VITE_DEV_TENANT_SLUG trong file .env.local.'
      )
      return
    }

    setStatus('loading')

    authApi
      .resolveBySlug(slug)
      .then((info) => {
        if (info.status !== 'Active') {
          setStatus(
            'error',
            info.status === 'Suspended'
              ? `Cửa hàng "${slug}" hiện đang bị tạm khóa.`
              : `Cửa hàng "${slug}" không còn hoạt động.`
          )
          return
        }
        setTenant({ slug, tenantId: info.tenantId, name: info.name })
      })
      .catch(() =>
        setStatus('error', `Không tìm thấy cửa hàng "${slug}". Vui lòng kiểm tra lại địa chỉ truy cập.`)
      )
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (status === 'idle' || status === 'loading') {
    return (
      <Center h="100vh" bg="dark.8">
        <Loader size="md" color="teal" />
      </Center>
    )
  }

  if (status === 'error') {
    return (
      <Center h="100vh" p="xl" bg="dark.8">
        <Alert icon={<IconAlertCircle size={20} />} title="Không thể tải ứng dụng" color="red" maw={480}>
          <Stack gap={4}>
            {error?.split('\n').map((line, i) => (
              <Text key={i} size="sm">{line}</Text>
            ))}
          </Stack>
        </Alert>
      </Center>
    )
  }

  // status === 'resolved'
  return <>{children}</>
}
