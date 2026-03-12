import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

import type { AuthState, AuthTokens, UserProfile } from './types'

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      // Initial state
      user: null,
      tokens: null,
      isAuthenticated: false,
      isLoading: false,

      // Actions
      setAuth: (user: UserProfile, tokens: AuthTokens) =>
        set({ user, tokens, isAuthenticated: true, isLoading: false }),

      setUser: (user: UserProfile) => set({ user }),

      setTokens: (tokens: AuthTokens) => set({ tokens }),

      clearAuth: () =>
        set({ user: null, tokens: null, isAuthenticated: false, isLoading: false }),

      setLoading: (isLoading: boolean) => set({ isLoading }),
    }),
    {
      name: 'pos-auth',
      storage: createJSONStorage(() => localStorage),
      // Only persist these fields
      partialize: (state) => ({
        user: state.user,
        tokens: state.tokens,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
)

// ─── Selectors ────────────────────────────────────────────────────────────────

export const selectUser = (state: AuthState) => state.user
export const selectTokens = (state: AuthState) => state.tokens
export const selectIsAuthenticated = (state: AuthState) => state.isAuthenticated
export const selectPermissions = (state: AuthState) => state.user?.permissions ?? []
export const selectRoles = (state: AuthState) => state.user?.roles ?? []
export const selectTenantId = (state: AuthState) => state.user?.tenantId
export const selectBranchId = (state: AuthState) => state.user?.branchId
