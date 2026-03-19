import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  FileText,
  FolderOpen,
  Tag,
  Image,
  DollarSign,
  MessageSquare,
  Mail,
  BookOpen,
  HelpCircle,
  Settings,
  Users,
  ShieldCheck,
  LogOut,
  ChevronLeft,
  Menu,
} from 'lucide-react'
import { useState } from 'react'
import { useAuthStore } from '@/lib/auth'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const NAV = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/posts', icon: FileText, label: 'Bài viết' },
  { href: '/categories', icon: FolderOpen, label: 'Danh mục' },
  { href: '/tags', icon: Tag, label: 'Tags' },
  { href: '/media', icon: Image, label: 'Media' },
  { href: '/pages', icon: BookOpen, label: 'Trang tĩnh' },
  { href: '/faq', icon: HelpCircle, label: 'FAQ' },
  null, // separator
  { href: '/pricing', icon: DollarSign, label: 'Bảng giá' },
  { href: '/testimonials', icon: MessageSquare, label: 'Đánh giá' },
  { href: '/contacts', icon: Mail, label: 'Liên hệ' },
  null,
  { href: '/settings', icon: Settings, label: 'Cài đặt' },
  null,
  { href: '/users', icon: Users, label: 'Người dùng' },
  { href: '/roles', icon: ShieldCheck, label: 'Vai trò & Quyền' },
]

export function AppLayout() {
  const [collapsed, setCollapsed] = useState(false)
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()

  function handleLogout() {
    logout()
    navigate('/login')
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Sidebar */}
      <aside
        className={cn(
          'flex flex-col bg-sidebar text-sidebar-foreground border-r border-sidebar-border transition-all duration-200',
          collapsed ? 'w-16' : 'w-60',
        )}
      >
        {/* Logo row */}
        <div className="flex items-center h-14 px-3 border-b border-sidebar-border">
          {!collapsed && (
            <span className="font-bold text-lg flex-1 pl-1">
              <span className="text-sidebar-primary">POS</span> CMS
            </span>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-sidebar-foreground hover:bg-sidebar-accent"
            onClick={() => setCollapsed((c) => !c)}
          >
            {collapsed ? <Menu className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </Button>
        </div>

        {/* Nav items */}
        <nav className="flex-1 overflow-y-auto py-2 px-2 space-y-0.5">
          {NAV.map((item, i) => {
            if (!item) {
              return <div key={i} className="my-2 border-t border-sidebar-border" />
            }
            return (
              <NavLink
                key={item.href}
                to={item.href}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-3 rounded-md px-2 py-2 text-sm font-medium transition-colors',
                    'hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
                    isActive
                      ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                      : 'text-sidebar-foreground/70',
                    collapsed && 'justify-center px-2',
                  )
                }
                title={collapsed ? item.label : undefined}
              >
                <item.icon className="h-4 w-4 shrink-0" />
                {!collapsed && <span>{item.label}</span>}
              </NavLink>
            )
          })}
        </nav>

        {/* User row */}
        <div className="border-t border-sidebar-border p-2">
          <div className={cn('flex items-center gap-2 px-2 py-1.5', collapsed && 'justify-center')}>
            <div className="h-7 w-7 rounded-full bg-sidebar-primary flex items-center justify-center text-xs font-semibold text-sidebar-primary-foreground shrink-0">
              {user?.fullName?.[0]?.toUpperCase() ?? 'U'}
            </div>
            {!collapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium truncate">{user?.fullName}</p>
                <p className="text-xs text-sidebar-foreground/50 truncate">{user?.role}</p>
              </div>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-sidebar-foreground/50 hover:text-sidebar-foreground hover:bg-sidebar-accent shrink-0"
              onClick={handleLogout}
              title="Đăng xuất"
            >
              <LogOut className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex flex-col flex-1 overflow-hidden">
        {/* Top bar */}
        <header className="h-14 flex items-center border-b px-6 bg-background">
          <div className="flex-1" />
          <div className="text-sm text-muted-foreground">
            {user?.email}
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
