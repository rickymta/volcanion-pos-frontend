import { useState } from 'react'
import { TextInput, PasswordInput, Button, Stack, Title, Alert, Badge, Text } from '@mantine/core'
import { useNavigate, useLocation } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { authApi } from '@pos/api-client'
import { useAuthStore } from '@pos/auth'
import type { UserProfile } from '@pos/auth'
import { IconAlertCircle } from '@tabler/icons-react'
import { useTenantStore } from '@/lib/useTenantStore'

export default function LoginPage() {
  const { t } = useTranslation('auth')
  const navigate = useNavigate()
  const location = useLocation()
  const setAuth = useAuthStore((s) => s.setAuth)
  const tenant = useTenantStore((s) => s.tenant)

  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')

  const from = (location.state as { from?: { pathname: string } })?.from?.pathname ?? '/'

  const loginMutation = useMutation({
    mutationFn: async () => {
      const tenantId = tenant?.tenantId
      // Step 1: Get tokens
      const tokens = await authApi.login({ username, password, tenantId })
      const expiresIn = tokens.expiresAt
        ? Math.floor((new Date(tokens.expiresAt).getTime() - Date.now()) / 1000)
        : 3600
      // Step 2: Set tokens so interceptor sends Authorization header on next call
      useAuthStore.getState().setTokens({ accessToken: tokens.accessToken, refreshToken: tokens.refreshToken, expiresIn })
      // Step 3: Fetch user profile
      const dto = await authApi.me(tenantId)
      // Step 4: Decode JWT for roles & permissions
      let roles: string[] = []
      let permissions: string[] = []
      let branchId: string | undefined
      try {
        const payload = JSON.parse(atob(tokens.accessToken.split('.')[1] ?? '')) as {
          roles?: string[]; permissions?: string[]; branchId?: string
        }
        roles = payload.roles ?? []
        permissions = payload.permissions ?? []
        branchId = payload.branchId
      } catch { /* ignore */ }
      const user: UserProfile = {
        id: dto.id,
        email: dto.email ?? dto.username,
        fullName: dto.fullName,
        tenantId: dto.tenantId,
        branchId: branchId ?? dto.branchIds?.[0],
        roles,
        permissions,
        isActive: dto.status === 'Active',
      }
      return { user, tokens: { accessToken: tokens.accessToken, refreshToken: tokens.refreshToken, expiresIn } }
    },
    onSuccess: ({ user, tokens }) => {
      setAuth(user, tokens)
      navigate(from, { replace: true })
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    loginMutation.mutate()
  }

  return (
    <form onSubmit={handleSubmit}>
      <Stack gap="md">
        <Stack gap={4}>
          <Title order={3}>{t('login.title')}</Title>
          {tenant && (
            <Text size="sm" c="dimmed">
              <Badge variant="light" size="sm" mr={6}>{tenant.slug}</Badge>
              {tenant.name}
            </Text>
          )}
        </Stack>

        {loginMutation.isError && (
          <Alert icon={<IconAlertCircle size={16} />} color="red" variant="light">
            {(loginMutation.error as { message?: string })?.message ?? t('login.error')}
          </Alert>
        )}

        <TextInput
          label="Tên đăng nhập"
          placeholder="admin"
          value={username}
          onChange={(e) => setUsername(e.currentTarget.value)}
          required
          autoComplete="username"
        />

        <PasswordInput
          label={t('login.password')}
          placeholder="••••••••"
          value={password}
          onChange={(e) => setPassword(e.currentTarget.value)}
          required
          autoComplete="current-password"
        />

        <Button type="submit" fullWidth loading={loginMutation.isPending} mt="xs">
          {t('login.submit')}
        </Button>
      </Stack>
    </form>
  )
}
