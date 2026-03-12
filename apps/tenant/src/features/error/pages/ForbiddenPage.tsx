import { Stack, Title, Text, Button } from '@mantine/core'
import { useNavigate } from 'react-router-dom'
import { IconArrowLeft, IconLock } from '@tabler/icons-react'

export default function ForbiddenPage() {
  const navigate = useNavigate()
  return (
    <Stack align="center" justify="center" mih="60vh" gap="md">
      <IconLock size={64} color="var(--mantine-color-red-5)" />
      <Title order={1} size={72} c="red.5">403</Title>
      <Title order={3}>Không có quyền truy cập</Title>
      <Text c="dimmed" ta="center" maw={480}>
        Bạn không có quyền xem trang này. Vui lòng liên hệ quản trị viên nếu bạn nghĩ đây là lỗi.
      </Text>
      <Button leftSection={<IconArrowLeft size={16} />} onClick={() => navigate('/')}>
        Về trang chủ
      </Button>
    </Stack>
  )
}
