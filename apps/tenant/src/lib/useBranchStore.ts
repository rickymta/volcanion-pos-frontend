import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

// ─── Types ────────────────────────────────────────────────────────────────────

interface BranchStoreState {
  /**
   * ID of the currently active branch.
   * `null` means "Tất cả chi nhánh" — only valid when user.isAllBranches = true.
   */
  activeBranchId: string | null

  setActiveBranch: (id: string | null) => void
  clear: () => void
}

// ─── Store ────────────────────────────────────────────────────────────────────

export const useBranchStore = create<BranchStoreState>()(
  persist(
    (set) => ({
      activeBranchId: null,

      setActiveBranch: (id) => set({ activeBranchId: id }),

      clear: () => set({ activeBranchId: null }),
    }),
    {
      name: 'pos-branch',
      storage: createJSONStorage(() => localStorage),
    }
  )
)
