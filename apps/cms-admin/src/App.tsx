import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from '@/lib/auth'
import { AppLayout } from '@/components/layout/app-layout'
import { LoginPage } from '@/pages/login-page'
import { DashboardPage } from '@/pages/dashboard-page'
import { PostsListPage } from '@/pages/posts/posts-list-page'
import { PostCreatePage } from '@/pages/posts/post-create-page'
import { PostEditPage } from '@/pages/posts/post-edit-page'
import { CategoriesPage } from '@/pages/categories/categories-page'
import { TagsPage } from '@/pages/tags/tags-page'
import { MediaPage } from '@/pages/media/media-page'
import { PricingPage } from '@/pages/pricing/pricing-page'
import { TestimonialsPage } from '@/pages/testimonials/testimonials-page'
import { ContactsListPage } from '@/pages/contacts/contacts-list-page'
import { ContactDetailPage } from '@/pages/contacts/contact-detail-page'
import { PagesListPage } from '@/pages/pages/pages-list-page'
import { PageCreatePage } from '@/pages/pages/page-create-page'
import { PageEditPage } from '@/pages/pages/page-edit-page'
import { FaqPage } from '@/pages/faq/faq-page'
import { SettingsPage } from '@/pages/settings/settings-page'
import { UsersPage } from '@/pages/users/users-page'
import { RolesPage } from '@/pages/users/roles-page'

function RequireAuth({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/"
          element={
            <RequireAuth>
              <AppLayout />
            </RequireAuth>
          }
        >
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="posts" element={<PostsListPage />} />
          <Route path="posts/new" element={<PostCreatePage />} />
          <Route path="posts/:id/edit" element={<PostEditPage />} />
          <Route path="categories" element={<CategoriesPage />} />
          <Route path="tags" element={<TagsPage />} />
          <Route path="media" element={<MediaPage />} />
          <Route path="pricing" element={<PricingPage />} />
          <Route path="testimonials" element={<TestimonialsPage />} />
          <Route path="contacts" element={<ContactsListPage />} />
          <Route path="contacts/:id" element={<ContactDetailPage />} />
          <Route path="pages" element={<PagesListPage />} />
          <Route path="pages/new" element={<PageCreatePage />} />
          <Route path="pages/:id/edit" element={<PageEditPage />} />
          <Route path="faq" element={<FaqPage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="users" element={<UsersPage />} />
          <Route path="roles" element={<RolesPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
