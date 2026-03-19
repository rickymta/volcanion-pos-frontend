import { useQuery } from '@tanstack/react-query'
import apiClient from '@/lib/api-client'
import type { RoleDto, PermissionDto } from '@/types'
import { Loader2, ShieldCheck } from 'lucide-react'

const GROUP_LABELS: Record<string, string> = {
  Posts: 'Bài viết',
  Categories: 'Danh mục',
  Tags: 'Tags',
  Media: 'Media',
  Pages: 'Trang tĩnh',
  FAQs: 'FAQ',
  Contacts: 'Liên hệ',
  Testimonials: 'Đánh giá',
  Pricing: 'Bảng giá',
  Settings: 'Cài đặt',
  Users: 'Người dùng',
}

const ROLE_COLORS: Record<string, string> = {
  Admin: 'border-red-200 dark:border-red-900',
  Editor: 'border-blue-200 dark:border-blue-900',
  Support: 'border-green-200 dark:border-green-900',
}

const ROLE_BADGE: Record<string, string> = {
  Admin: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  Editor: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  Support: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
}

export function RolesPage() {
  const { data: roles = [], isLoading: rolesLoading } = useQuery({
    queryKey: ['cms-roles'],
    queryFn: () => apiClient.get<RoleDto[]>('/roles').then((r) => r.data),
  })

  const { data: permissions = [], isLoading: permsLoading } = useQuery({
    queryKey: ['cms-permissions'],
    queryFn: () => apiClient.get<PermissionDto[]>('/permissions').then((r) => r.data),
  })

  const isLoading = rolesLoading || permsLoading

  // Group permissions by group field
  const permsByGroup = permissions.reduce<Record<string, PermissionDto[]>>((acc, p) => {
    if (!acc[p.group]) acc[p.group] = []
    ;(acc[p.group] as PermissionDto[]).push(p)
    return acc
  }, {})

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Vai trò & Phân quyền</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Xem cấu hình vai trò và quyền hạn trong hệ thống CMS.
        </p>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
          {/* Roles cards */}
          <section>
            <h2 className="text-lg font-semibold mb-3">Vai trò hệ thống</h2>
            <div className="grid gap-4 md:grid-cols-3">
              {roles.map((role) => (
                <div
                  key={role.id}
                  className={`rounded-xl border-2 p-5 space-y-3 ${ROLE_COLORS[role.name] ?? 'border-border'}`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="h-4 w-4 text-muted-foreground" />
                      <span
                        className={`text-sm font-semibold px-2 py-0.5 rounded-full ${
                          ROLE_BADGE[role.name] ?? 'bg-muted text-muted-foreground'
                        }`}
                      >
                        {role.name}
                      </span>
                    </div>
                    {role.isSystem && (
                      <span className="text-[10px] text-muted-foreground border rounded px-1.5 py-0.5">
                        System
                      </span>
                    )}
                  </div>

                  {role.description && (
                    <p className="text-xs text-muted-foreground">{role.description}</p>
                  )}

                  <div>
                    <p className="text-xs text-muted-foreground mb-1.5">
                      {role.permissions.length} quyền được gán:
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {role.permissions.map((p) => (
                        <span
                          key={p}
                          className="text-[10px] bg-muted px-1.5 py-0.5 rounded font-mono"
                        >
                          {p}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Permissions reference table */}
          <section>
            <h2 className="text-lg font-semibold mb-3">
              Tất cả quyền trong hệ thống
              <span className="ml-2 text-sm font-normal text-muted-foreground">
                ({permissions.length} quyền)
              </span>
            </h2>
            <div className="rounded-lg border overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium">Nhóm</th>
                    <th className="text-left px-4 py-3 font-medium">Code</th>
                    <th className="text-left px-4 py-3 font-medium">Tên</th>
                    <th className="text-left px-4 py-3 font-medium">Vai trò có quyền</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {Object.entries(permsByGroup).map(([group, perms]) =>
                    perms.map((perm, idx) => {
                      const rolesWithPerm = roles
                        .filter((r) => r.permissions.includes(perm.code))
                        .map((r) => r.name)
                      return (
                        <tr key={perm.id} className="hover:bg-muted/30">
                          <td className="px-4 py-2.5 text-muted-foreground">
                            {idx === 0 ? (GROUP_LABELS[group] ?? group) : ''}
                          </td>
                          <td className="px-4 py-2.5">
                            <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{perm.code}</code>
                          </td>
                          <td className="px-4 py-2.5 text-muted-foreground">{perm.name}</td>
                          <td className="px-4 py-2.5">
                            <div className="flex flex-wrap gap-1">
                              {rolesWithPerm.map((r) => (
                                <span
                                  key={r}
                                  className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${
                                    ROLE_BADGE[r] ?? 'bg-muted text-muted-foreground'
                                  }`}
                                >
                                  {r}
                                </span>
                              ))}
                            </div>
                          </td>
                        </tr>
                      )
                    }),
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </div>
  )
}
