import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import apiClient from '@/lib/api-client'
import { useAuthStore } from '@/lib/auth'
import { usePermission, PERMISSIONS } from '@/lib/permissions'
import type { AdminUserDto, RoleDto } from '@/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Plus, Pencil, Trash2, ShieldCheck, Loader2 } from 'lucide-react'
import { formatDate } from '@/lib/utils'

const ROLE_OPTIONS = ['Admin', 'Editor', 'Support'] as const
type RoleOption = (typeof ROLE_OPTIONS)[number]

const ROLE_COLORS: Record<string, string> = {
  Admin: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  Editor: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  Support: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
}

// ─── Create / Edit modal ─────────────────────────────────────────────────────

const createSchema = z.object({
  email: z.string().email('Email không hợp lệ'),
  fullName: z.string().min(1, 'Bắt buộc'),
  password: z.string().min(8, 'Tối thiểu 8 ký tự'),
  role: z.enum(ROLE_OPTIONS),
})
const editSchema = z.object({
  fullName: z.string().min(1, 'Bắt buộc'),
  role: z.enum(ROLE_OPTIONS),
  status: z.enum(['Active', 'Inactive']),
})
type CreateFormValues = z.infer<typeof createSchema>
type EditFormValues = z.infer<typeof editSchema>

function UserFormModal({ item, onClose }: { item?: AdminUserDto; onClose: () => void }) {
  const qc = useQueryClient()

  const createForm = useForm<CreateFormValues>({
    resolver: zodResolver(createSchema),
    defaultValues: { role: 'Editor' },
  })
  const editForm = useForm<EditFormValues>({
    resolver: zodResolver(editSchema),
    defaultValues: item
      ? { fullName: item.fullName, role: item.role as RoleOption, status: item.status }
      : undefined,
  })

  const mutation = useMutation({
    mutationFn: (d: CreateFormValues | EditFormValues) =>
      item
        ? apiClient.put(`/users/${item.id}`, d).then((r) => r.data)
        : apiClient.post('/users', d).then((r) => r.data),
    onSuccess: () => {
      toast.success(item ? 'Cập nhật thành công!' : 'Tạo người dùng thành công!')
      qc.invalidateQueries({ queryKey: ['cms-users'] })
      onClose()
    },
    onError: () => toast.error('Có lỗi xảy ra, vui lòng thử lại.'),
  })

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-background rounded-xl shadow-xl w-full max-w-md p-6 space-y-4">
        <h3 className="font-semibold text-lg">{item ? 'Chỉnh sửa người dùng' : 'Tạo người dùng mới'}</h3>

        {item ? (
          <form onSubmit={editForm.handleSubmit((d) => mutation.mutate(d))} className="space-y-3">
            <div className="space-y-1.5">
              <Label>Họ tên *</Label>
              <Input {...editForm.register('fullName')} />
              {editForm.formState.errors.fullName && (
                <p className="text-xs text-destructive">{editForm.formState.errors.fullName.message}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label>Role *</Label>
              <select className="w-full border rounded-md px-3 py-2 text-sm bg-background" {...editForm.register('role')}>
                {ROLE_OPTIONS.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>Trạng thái *</Label>
              <select className="w-full border rounded-md px-3 py-2 text-sm bg-background" {...editForm.register('status')}>
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>
            <div className="flex gap-2 pt-1">
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Lưu
              </Button>
              <Button type="button" variant="outline" onClick={onClose}>Hủy</Button>
            </div>
          </form>
        ) : (
          <form onSubmit={createForm.handleSubmit((d) => mutation.mutate(d))} className="space-y-3">
            <div className="space-y-1.5">
              <Label>Email *</Label>
              <Input type="email" {...createForm.register('email')} />
              {createForm.formState.errors.email && (
                <p className="text-xs text-destructive">{createForm.formState.errors.email.message}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label>Họ tên *</Label>
              <Input {...createForm.register('fullName')} />
              {createForm.formState.errors.fullName && (
                <p className="text-xs text-destructive">{createForm.formState.errors.fullName.message}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label>Mật khẩu *</Label>
              <Input type="password" placeholder="Tối thiểu 8 ký tự" {...createForm.register('password')} />
              {createForm.formState.errors.password && (
                <p className="text-xs text-destructive">{createForm.formState.errors.password.message}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label>Role *</Label>
              <select className="w-full border rounded-md px-3 py-2 text-sm bg-background" {...createForm.register('role')}>
                {ROLE_OPTIONS.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <div className="flex gap-2 pt-1">
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Tạo
              </Button>
              <Button type="button" variant="outline" onClick={onClose}>Hủy</Button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}

// ─── Assign Roles modal ───────────────────────────────────────────────────────

function AssignRolesModal({ user, onClose }: { user: AdminUserDto; onClose: () => void }) {
  const qc = useQueryClient()
  const { data: roles = [], isLoading } = useQuery({
    queryKey: ['cms-roles'],
    queryFn: () => apiClient.get<RoleDto[]>('/roles').then((r) => r.data),
  })
  const [selected, setSelected] = useState<string[]>(
    roles.filter((r) => user.roles.includes(r.name)).map((r) => r.id),
  )

  const mutation = useMutation({
    mutationFn: (roleIds: string[]) =>
      apiClient.put(`/users/${user.id}/roles`, { roleIds }).then((r) => r.data),
    onSuccess: () => {
      toast.success('Cập nhật vai trò thành công!')
      qc.invalidateQueries({ queryKey: ['cms-users'] })
      onClose()
    },
    onError: () => toast.error('Có lỗi xảy ra.'),
  })

  function toggle(id: string) {
    setSelected((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id])
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-background rounded-xl shadow-xl w-full max-w-sm p-6 space-y-4">
        <div>
          <h3 className="font-semibold text-lg">Gán vai trò</h3>
          <p className="text-sm text-muted-foreground">{user.fullName} — {user.email}</p>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-4"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
        ) : (
          <div className="space-y-2">
            {roles.map((role) => (
              <label key={role.id} className="flex items-start gap-3 rounded-lg border p-3 cursor-pointer hover:bg-muted/40">
                <input
                  type="checkbox"
                  className="mt-0.5"
                  checked={selected.includes(role.id)}
                  onChange={() => toggle(role.id)}
                />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm">{role.name}</p>
                  {role.description && <p className="text-xs text-muted-foreground">{role.description}</p>}
                  <div className="flex flex-wrap gap-1 mt-1">
                    {role.permissions.slice(0, 4).map((p) => (
                      <span key={p} className="text-[10px] bg-muted px-1.5 py-0.5 rounded font-mono">{p}</span>
                    ))}
                    {role.permissions.length > 4 && (
                      <span className="text-[10px] text-muted-foreground">+{role.permissions.length - 4} more</span>
                    )}
                  </div>
                </div>
              </label>
            ))}
          </div>
        )}

        <div className="flex gap-2 pt-1">
          <Button
            onClick={() => mutation.mutate(selected)}
            disabled={mutation.isPending || isLoading}
          >
            {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Lưu vai trò
          </Button>
          <Button type="button" variant="outline" onClick={onClose}>Hủy</Button>
        </div>
      </div>
    </div>
  )
}

// ─── Delete confirm ───────────────────────────────────────────────────────────

function DeleteConfirmModal({ user, onClose }: { user: AdminUserDto; onClose: () => void }) {
  const qc = useQueryClient()
  const mutation = useMutation({
    mutationFn: () => apiClient.delete(`/users/${user.id}`),
    onSuccess: () => {
      toast.success('Đã xoá người dùng.')
      qc.invalidateQueries({ queryKey: ['cms-users'] })
      onClose()
    },
    onError: () => toast.error('Không thể xoá người dùng này.'),
  })

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-background rounded-xl shadow-xl w-full max-w-sm p-6 space-y-4">
        <h3 className="font-semibold text-lg text-destructive">Xoá người dùng</h3>
        <p className="text-sm text-muted-foreground">
          Bạn có chắc muốn xoá <strong>{user.fullName}</strong> ({user.email})? Hành động này không thể hoàn tác.
        </p>
        <div className="flex gap-2">
          <Button
            variant="destructive"
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending}
          >
            {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Xoá
          </Button>
          <Button type="button" variant="outline" onClick={onClose}>Hủy</Button>
        </div>
      </div>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

type ModalState =
  | { type: 'create' }
  | { type: 'edit'; user: AdminUserDto }
  | { type: 'roles'; user: AdminUserDto }
  | { type: 'delete'; user: AdminUserDto }
  | null

export function UsersPage() {
  const [modal, setModal] = useState<ModalState>(null)
  const [search, setSearch] = useState('')
  const currentUserId = useAuthStore((s) => s.user?.id)
  const canWrite = usePermission(PERMISSIONS.USERS_WRITE)
  const canDelete = usePermission(PERMISSIONS.USERS_DELETE)

  const { data: users = [], isLoading } = useQuery({
    queryKey: ['cms-users'],
    queryFn: () => apiClient.get<AdminUserDto[]>('/users').then((r) => r.data),
  })

  const filtered = search
    ? users.filter(
        (u) =>
          u.fullName.toLowerCase().includes(search.toLowerCase()) ||
          u.email.toLowerCase().includes(search.toLowerCase()),
      )
    : users

  return (
    <div className="space-y-4">
      {modal?.type === 'create' && (
        <UserFormModal onClose={() => setModal(null)} />
      )}
      {modal?.type === 'edit' && (
        <UserFormModal item={modal.user} onClose={() => setModal(null)} />
      )}
      {modal?.type === 'roles' && (
        <AssignRolesModal user={modal.user} onClose={() => setModal(null)} />
      )}
      {modal?.type === 'delete' && (
        <DeleteConfirmModal user={modal.user} onClose={() => setModal(null)} />
      )}

      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Người dùng CMS</h1>
        {canWrite && (
          <Button onClick={() => setModal({ type: 'create' })}>
            <Plus className="h-4 w-4 mr-1" />Thêm người dùng
          </Button>
        )}
      </div>

      <Input
        placeholder="Tìm theo tên, email..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="max-w-sm"
      />

      <div className="rounded-lg border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="text-left px-4 py-3 font-medium">Họ tên</th>
              <th className="text-left px-4 py-3 font-medium">Email</th>
              <th className="text-left px-4 py-3 font-medium">Vai trò</th>
              <th className="text-left px-4 py-3 font-medium hidden md:table-cell">Quyền</th>
              <th className="text-left px-4 py-3 font-medium">Trạng thái</th>
              <th className="text-left px-4 py-3 font-medium hidden lg:table-cell">Đăng nhập cuối</th>
              <th className="w-24 px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y">
            {isLoading ? (
              <tr>
                <td colSpan={7} className="text-center py-8">
                  <Loader2 className="h-5 w-5 animate-spin mx-auto text-muted-foreground" />
                </td>
              </tr>
            ) : !filtered.length ? (
              <tr>
                <td colSpan={7} className="text-center py-8 text-muted-foreground">
                  Không có dữ liệu.
                </td>
              </tr>
            ) : (
              filtered.map((user) => (
                <tr key={user.id} className="hover:bg-muted/30">
                  <td className="px-4 py-3 font-medium">{user.fullName}</td>
                  <td className="px-4 py-3 text-muted-foreground">{user.email}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {(user.roles ?? [user.role]).map((r) => (
                        <span
                          key={r}
                          className={`text-xs font-medium px-2 py-0.5 rounded-full ${ROLE_COLORS[r] ?? 'bg-muted text-muted-foreground'}`}
                        >
                          {r}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <span className="text-xs text-muted-foreground">
                      {user.permissions?.length ?? 0} quyền
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`text-xs font-medium ${
                        user.status === 'Active' ? 'text-green-600' : 'text-muted-foreground'
                      }`}
                    >
                      {user.status === 'Active' ? 'Hoạt động' : 'Vô hiệu'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground hidden lg:table-cell">
                    {user.lastLoginAt ? formatDate(user.lastLoginAt) : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      {canWrite && (
                        <>
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Chỉnh sửa"
                            onClick={() => setModal({ type: 'edit', user })}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Gán vai trò"
                            onClick={() => setModal({ type: 'roles', user })}
                          >
                            <ShieldCheck className="h-3.5 w-3.5" />
                          </Button>
                        </>
                      )}
                      {canDelete && user.id !== currentUserId && (
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Xoá"
                          className="text-destructive hover:text-destructive"
                          onClick={() => setModal({ type: 'delete', user })}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-muted-foreground">
        {filtered.length} người dùng
        {search && ` khớp với "${search}"`}
      </p>
    </div>
  )
}
