import { create } from 'zustand'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface TenantInfo {
  slug: string
  tenantId: string
  name: string
}

type TenantStatus = 'idle' | 'loading' | 'resolved' | 'error'

interface TenantStoreState {
  tenant: TenantInfo | null
  status: TenantStatus
  error: string | null

  setTenant: (info: TenantInfo) => void
  setStatus: (status: TenantStatus, error?: string) => void
  clear: () => void
}

// ─── Store ────────────────────────────────────────────────────────────────────

export const useTenantStore = create<TenantStoreState>()((set) => ({
  tenant: null,
  status: 'idle',
  error: null,

  setTenant: (tenant) => set({ tenant, status: 'resolved', error: null }),

  setStatus: (status, error = null) => set({ status, error }),

  clear: () => set({ tenant: null, status: 'idle', error: null }),
}))
