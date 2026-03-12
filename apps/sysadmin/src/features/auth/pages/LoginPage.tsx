import { useState } from 'react'
import { TextInput, PasswordInput, Button, Stack, Title, Alert } from '@mantine/core'
import { useNavigate, useLocation } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { systemApi, sysadminAuth } from '@pos/sysadmin-client'
import { IconAlertCircle } from '@tabler/icons-react'
import { useTranslation } from 'react-i18next'

export default function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { t } = useTranslation('sysadmin')
  const from = (location.state as { from?: { pathname: string } })?.from?.pathname ?? '/'

  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')

  const loginMutation = useMutation({
    mutationFn: () => systemApi.login({ username, password }),
    onSuccess: (data) => {
      // Token stored in localStorage by systemApi; also set cookie for legacy compat
      if (typeof document !== 'undefined') {
        document.cookie = `pos-sysadmin-token=${data.accessToken}; path=/; max-age=86400; SameSite=Strict`
      }
      navigate(from, { replace: true })
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    loginMutation.mutate()
  }

  // Auto-redirect if already logged in
  if (sysadminAuth.getToken()) {
    navigate('/', { replace: true })
    return null
  }

  return (
    <form onSubmit={handleSubmit}>
      <Stack gap="md">
        <Title order={3}>{t('login_title')}</Title>

        {loginMutation.isError && (
          <Alert icon={<IconAlertCircle size={16} />} color="red" variant="light">
            {(loginMutation.error as { message?: string })?.message ?? t('login_error')}
          </Alert>
        )}

        <TextInput
          label={t('login_username')}
          placeholder="superadmin"
          value={username}
          onChange={(e) => setUsername(e.currentTarget.value)}
          required
          autoComplete="username"
        />

        <PasswordInput
          label={t('admin_password')}
          placeholder="••••••••"
          value={password}
          onChange={(e) => setPassword(e.currentTarget.value)}
          required
          autoComplete="current-password"
        />

        <Button type="submit" fullWidth loading={loginMutation.isPending} mt="xs">
          {t('login_submit')}
        </Button>
      </Stack>
    </form>
  )
}
