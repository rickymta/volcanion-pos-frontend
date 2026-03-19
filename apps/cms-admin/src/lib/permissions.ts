import { useAuthStore } from './auth'

// All permission codes defined in the system
export const PERMISSIONS = {
  // Posts
  POSTS_READ: 'posts.read',
  POSTS_WRITE: 'posts.write',
  POSTS_PUBLISH: 'posts.publish',
  POSTS_DELETE: 'posts.delete',
  // Categories
  CATEGORIES_WRITE: 'categories.write',
  // Tags
  TAGS_WRITE: 'tags.write',
  // Media
  MEDIA_UPLOAD: 'media.upload',
  MEDIA_DELETE: 'media.delete',
  // Pages
  PAGES_WRITE: 'pages.write',
  // FAQs
  FAQS_WRITE: 'faqs.write',
  // Contacts
  CONTACTS_READ: 'contacts.read',
  CONTACTS_UPDATE: 'contacts.update',
  // Testimonials
  TESTIMONIALS_WRITE: 'testimonials.write',
  // Pricing
  PRICING_WRITE: 'pricing.write',
  // Settings
  SETTINGS_WRITE: 'settings.write',
  // Users
  USERS_READ: 'users.read',
  USERS_WRITE: 'users.write',
  USERS_DELETE: 'users.delete',
} as const

export type PermissionCode = (typeof PERMISSIONS)[keyof typeof PERMISSIONS]

export function usePermission(code: PermissionCode): boolean {
  return useAuthStore((s) => s.hasPermission(code))
}

export function usePermissions(codes: PermissionCode[]): boolean {
  return useAuthStore((s) => codes.every((c) => s.hasPermission(c)))
}

export function useAnyPermission(codes: PermissionCode[]): boolean {
  return useAuthStore((s) => codes.some((c) => s.hasPermission(c)))
}
