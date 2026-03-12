import { Stack, Title, Text, Button } from '@mantine/core'
import { useNavigate } from 'react-router-dom'
import { IconArrowLeft, IconMoodSad } from '@tabler/icons-react'

export default function NotFoundPage() {
  const navigate = useNavigate()
  return (
    <Stack align="center" justify="center" mih="60vh" gap="md">
      <IconMoodSad size={64} color="var(--mantine-color-dimmed)" />
      <Title order={1} size={72} c="dimmed">404</Title>
      <Title order={3}>Không tìm thấy trang</Title>
      <Text c="dimmed" ta="center" maw={480}>
        Trang bạn đang tìm kiếm không tồn tại hoặc đã bị di chuyển.
      </Text>
      <Button leftSection={<IconArrowLeft size={16} />} onClick={() => navigate('/')}>
        Về trang chủ
      </Button>
    </Stack>
  )
}
