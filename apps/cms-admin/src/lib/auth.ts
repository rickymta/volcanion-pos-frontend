import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { CmsUserDto, LoginDto, TokensDto } from '@/types'
import axios from 'axios'

interface AuthStore {
  user: CmsUserDto | null
  accessToken: string | null
  refreshToken: string | null
  isAuthenticated: boolean

  login: (data: LoginDto) => Promise<void>
  logout: () => void
  setTokens: (accessToken: string, refreshToken: string) => void
  fetchMe: () => Promise<void>
  hasPermission: (code: string) => boolean
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,

      login: async (data: LoginDto) => {
        const res = await axios.post<TokensDto>('/api/v1/admin/auth/login', data)
        const { accessToken, refreshToken, user } = res.data
        set({ accessToken, refreshToken, isAuthenticated: true, user })
      },

      logout: () => {
        const token = get().refreshToken
        if (token) {
          axios
            .post('/api/v1/admin/auth/logout', { refreshToken: token })
            .catch(() => void 0)
        }
        set({ user: null, accessToken: null, refreshToken: null, isAuthenticated: false })
      },

      setTokens: (accessToken: string, refreshToken: string) => {
        set({ accessToken, refreshToken, isAuthenticated: true })
      },

      fetchMe: async () => {
        const token = get().accessToken
        if (!token) return
        try {
          const { apiClient } = await import('./api-client')
          const res = await apiClient.get<CmsUserDto>('/auth/me')
          set({ user: res.data })
        } catch {
          set({ user: null })
        }
      },

      hasPermission: (code: string) => {
        const user = get().user
        return user?.permissions?.includes(code) ?? false
      },
    }),
    {
      name: 'cms-admin-auth',
      partialize: (state: AuthStore) => ({
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        isAuthenticated: state.isAuthenticated,
        user: state.user,
      }),
    },
  ),
)
