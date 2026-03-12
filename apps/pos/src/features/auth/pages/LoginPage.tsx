import { useState } from 'react'
import { TextInput, PasswordInput, Button, Stack, Alert, Title, Combobox, InputBase, useCombobox, Text } from '@mantine/core'
import { useNavigate, useLocation } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { authApi } from '@pos/api-client'
import { useAuthStore } from '@pos/auth'
import type { UserProfile } from '@pos/auth'
import { IconAlertCircle } from '@tabler/icons-react'
import { useTranslation } from 'react-i18next'

type TenantOption = { value: string; label: string }

function parseTenantOptions(): TenantOption[] {
  try {
    const raw = (import.meta as { env?: { VITE_TENANT_OPTIONS?: string } }).env?.VITE_TENANT_OPTIONS
    if (!raw) return []
    return JSON.parse(raw) as TenantOption[]
  } catch {
    return []
  }
}

const TENANT_OPTIONS = parseTenantOptions()
const DEFAULT_TENANT_ID = (import.meta as { env?: { VITE_DEFAULT_TENANT_ID?: string } }).env?.VITE_DEFAULT_TENANT_ID ?? ''

export default function LoginPage() {
  const { t } = useTranslation('pos')
  const navigate = useNavigate()
  const location = useLocation()
  const setAuth = useAuthStore((s) => s.setAuth)

  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')

  const defaultLabel = TENANT_OPTIONS.find((o) => o.value === DEFAULT_TENANT_ID)?.label ?? DEFAULT_TENANT_ID
  const [tenantId, setTenantId] = useState(DEFAULT_TENANT_ID)
  const [tenantSearch, setTenantSearch] = useState(defaultLabel)

  const combobox = useCombobox({ onDropdownClose: () => combobox.resetSelectedOption() })

  const filteredOptions = TENANT_OPTIONS.filter(
    (o) =>
      o.label.toLowerCase().includes(tenantSearch.toLowerCase()) ||
      o.value.toLowerCase().includes(tenantSearch.toLowerCase())
  )

  const from = (location.state as { from?: { pathname: string } })?.from?.pathname ?? '/'

  const loginMutation = useMutation({
    mutationFn: async () => {
      // Step 1: Get tokens
      const tokens = await authApi.login({ username, password, tenantId: tenantId || undefined })
      const expiresIn = tokens.expiresAt
        ? Math.floor((new Date(tokens.expiresAt).getTime() - Date.now()) / 1000)
        : 3600
      // Step 2: Set tokens so interceptor sends Authorization header on next call
      useAuthStore.getState().setTokens({ accessToken: tokens.accessToken, refreshToken: tokens.refreshToken, expiresIn })
      // Step 3: Fetch user profile (pass tenantId explicitly so header is set even before user is in store)
      const dto = await authApi.me(tenantId || undefined)
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
        <Title order={3}>{t('login_title')}</Title>
        {loginMutation.isError && (
          <Alert icon={<IconAlertCircle size={16} />} color="red" variant="light">
            {(loginMutation.error as { message?: string })?.message ?? t('login_error')}
          </Alert>
        )}

        <Combobox
          store={combobox}
          onOptionSubmit={(val) => {
            const opt = TENANT_OPTIONS.find((o) => o.value === val)
            setTenantId(val)
            setTenantSearch(opt?.label ?? val)
            combobox.closeDropdown()
          }}
        >
          <Combobox.Target>
            <InputBase
              label={t('login_tenant')}
              placeholder={t('login_tenant_placeholder')}
              required
              value={tenantSearch}
              rightSection={<Combobox.Chevron />}
              rightSectionPointerEvents="none"
              onChange={(e) => {
                const v = e.currentTarget.value
                setTenantSearch(v)
                setTenantId(v)
                combobox.openDropdown()
                combobox.updateSelectedOptionIndex()
              }}
              onClick={() => combobox.openDropdown()}
              onFocus={() => combobox.openDropdown()}
              onBlur={() => combobox.closeDropdown()}
            />
          </Combobox.Target>

          <Combobox.Dropdown>
            <Combobox.Options>
              {filteredOptions.length > 0 ? (
                filteredOptions.map((o) => (
                  <Combobox.Option key={o.value} value={o.value}>
                    <Stack gap={2}>
                      <Text size="sm" fw={500}>{o.label}</Text>
                      <Text size="xs" c="dimmed">{o.value}</Text>
                    </Stack>
                  </Combobox.Option>
                ))
              ) : (
                <Combobox.Empty>{t('login_not_found')}</Combobox.Empty>
              )}
            </Combobox.Options>
          </Combobox.Dropdown>
        </Combobox>

        <TextInput
          label={t('login_username')}
          placeholder="admin"
          value={username}
          onChange={(e) => setUsername(e.currentTarget.value)}
          required
          autoComplete="username"
        />
        <PasswordInput
          label={t('login_password')}
          placeholder="••••••••"
          value={password}
          onChange={(e) => setPassword(e.currentTarget.value)}
          required
          autoComplete="current-password"
        />
        <Button type="submit" fullWidth loading={loginMutation.isPending} mt="xs">{t('login_submit')}</Button>
      </Stack>
    </form>
  )
}
