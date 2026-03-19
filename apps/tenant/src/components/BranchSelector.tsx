import { useEffect } from 'react'
import { Select, Badge } from '@mantine/core'
import { IconBuildingStore } from '@tabler/icons-react'
import { useQuery } from '@tanstack/react-query'
import { branchesApi } from '@pos/api-client'
import { useAuth } from '@pos/auth'
import { useBranchStore } from '@/lib/useBranchStore'

/**
 * Hiển thị combobox chi nhánh ở header.
 *
 * - Admin / isAllBranches = true  → Select có thêm option "Tất cả chi nhánh" (value = null)
 * - 1 chi nhánh cụ thể            → Badge tĩnh (không cho đổi)
 * - Nhiều chi nhánh cụ thể        → Select chỉ gồm các chi nhánh được gán
 */
export function BranchSelector() {
  const { user } = useAuth()
  const { activeBranchId, setActiveBranch } = useBranchStore()

  const isAllBranches = user?.isAllBranches ?? false
  const assignedIds = user?.branchIds ?? []

  // Fetch all active branches (only when logged in)
  const { data } = useQuery({
    queryKey: ['branches', 'active-list'],
    queryFn: () => branchesApi.list({ pageSize: 100, status: 1 }),
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  })

  const allBranches = data?.items ?? []

  // Branches the user can actually access
  const accessibleBranches = isAllBranches
    ? allBranches
    : allBranches.filter((b) => assignedIds.includes(b.id))

  // When user only has 1 branch → auto-select it
  useEffect(() => {
    if (!isAllBranches && accessibleBranches.length === 1) {
      const only = accessibleBranches[0]
      if (only && activeBranchId !== only.id) {
        setActiveBranch(only.id)
      }
    }
  }, [isAllBranches, accessibleBranches, activeBranchId, setActiveBranch])

  // ── Single fixed branch ────────────────────────────────────────────────────
  if (!isAllBranches && accessibleBranches.length === 1) {
    return (
      <Badge
        variant="light"
        color="blue"
        radius="sm"
        leftSection={<IconBuildingStore size={12} />}
      >
        {accessibleBranches[0]?.name ?? '—'}
      </Badge>
    )
  }

  // ── No branch data yet ─────────────────────────────────────────────────────
  if (accessibleBranches.length === 0) return null

  // ── Select (admin or multi-branch user) ────────────────────────────────────
  const options = isAllBranches
    ? [
        { value: '', label: 'Tất cả chi nhánh' },
        ...accessibleBranches.map((b) => ({ value: b.id, label: b.name })),
      ]
    : accessibleBranches.map((b) => ({ value: b.id, label: b.name }))

  return (
    <Select
      data={options}
      value={activeBranchId ?? ''}
      onChange={(v) => setActiveBranch(v || null)}
      leftSection={<IconBuildingStore size={14} />}
      w={200}
      size="xs"
      variant="filled"
      allowDeselect={false}
      comboboxProps={{ withinPortal: true }}
    />
  )
}
