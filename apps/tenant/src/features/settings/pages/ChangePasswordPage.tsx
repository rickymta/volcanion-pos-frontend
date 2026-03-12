import { Stack, Paper, PasswordInput, Button, Group } from '@mantine/core'
import { useForm } from '@mantine/form'
import { notifications } from '@mantine/notifications'
import { useMutation } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { IconArrowLeft } from '@tabler/icons-react'
import { PageHeader } from '@pos/ui'
import { authApi } from '@pos/api-client'

export default function ChangePasswordPage() {
  const navigate = useNavigate()

  const form = useForm({
    initialValues: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    },
    validate: {
      currentPassword: (v) => (!v ? 'Vui lòng nhập mật khẩu hiện tại' : null),
      newPassword: (v) => (v.length < 6 ? 'Mật khẩu mới phải ít nhất 6 ký tự' : null),
      confirmPassword: (v, values) => (v !== values.newPassword ? 'Mật khẩu xác nhận không khớp' : null),
    },
  })

  const changeMutation = useMutation({
    mutationFn: (values: { currentPassword: string; newPassword: string }) =>
      authApi.changePassword(values),
    onSuccess: () => {
      notifications.show({ color: 'green', message: 'Đổi mật khẩu thành công' })
      form.reset()
      navigate('/settings/profile')
    },
    onError: () => notifications.show({ color: 'red', message: 'Đổi mật khẩu thất bại. Kiểm tra lại mật khẩu hiện tại.' }),
  })

  return (
    <Stack gap="lg">
      <PageHeader title="Đổi mật khẩu" subtitle="Cập nhật mật khẩu đăng nhập của bạn" />

      <Paper withBorder p="md" radius="md" maw={480}>
        <form onSubmit={form.onSubmit((v) => changeMutation.mutate({ currentPassword: v.currentPassword, newPassword: v.newPassword }))}>
          <Stack gap="md">
            <PasswordInput
              label="Mật khẩu hiện tại"
              placeholder="Nhập mật khẩu hiện tại"
              {...form.getInputProps('currentPassword')}
            />
            <PasswordInput
              label="Mật khẩu mới"
              placeholder="Ít nhất 6 ký tự"
              {...form.getInputProps('newPassword')}
            />
            <PasswordInput
              label="Xác nhận mật khẩu mới"
              placeholder="Nhập lại mật khẩu mới"
              {...form.getInputProps('confirmPassword')}
            />
            <Group justify="flex-end" mt="sm">
              <Button
                variant="default"
                leftSection={<IconArrowLeft size={16} />}
                onClick={() => navigate('/settings/profile')}
              >
                Hủy
              </Button>
              <Button type="submit" loading={changeMutation.isPending}>
                Đổi mật khẩu
              </Button>
            </Group>
          </Stack>
        </form>
      </Paper>
    </Stack>
  )
}
