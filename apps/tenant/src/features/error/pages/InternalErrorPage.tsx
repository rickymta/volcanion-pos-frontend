import { Stack, Title, Text, Button, Group } from '@mantine/core'
import { useNavigate } from 'react-router-dom'
import { IconArrowLeft, IconRefresh, IconAlertTriangle } from '@tabler/icons-react'

export default function InternalErrorPage() {
  const navigate = useNavigate()
  return (
    <Stack align="center" justify="center" mih="60vh" gap="md">
      <IconAlertTriangle size={64} color="var(--mantine-color-orange-5)" />
      <Title order={1} size={72} c="orange.5">500</Title>
      <Title order={3}>Lỗi máy chủ</Title>
      <Text c="dimmed" ta="center" maw={480}>
        Đã xảy ra lỗi không mong muốn. Vui lòng thử lại sau hoặc liên hệ bộ phận hỗ trợ.
      </Text>
      <Group>
        <Button variant="default" leftSection={<IconRefresh size={16} />} onClick={() => window.location.reload()}>
          Thử lại
        </Button>
        <Button leftSection={<IconArrowLeft size={16} />} onClick={() => navigate('/')}>
          Về trang chủ
        </Button>
      </Group>
    </Stack>
  )
}
