/**
 * Đọc tenant slug từ subdomain của hostname hiện tại.
 *
 * Các trường hợp được hỗ trợ:
 *  - Production:    tenant-a.pos.vn          → "tenant-a"
 *  - Dev (*.localhost): tenant-a.localhost:3000 → "tenant-a"
 *                       (Chrome 79+, Firefox 78+ hỗ trợ natively)
 *  - Dev fallback:  VITE_DEV_TENANT_SLUG     → khi chạy plain localhost:3000
 */

const DEV_TENANT_SLUG =
  (import.meta as { env?: { VITE_DEV_TENANT_SLUG?: string } }).env?.VITE_DEV_TENANT_SLUG ?? ''

/**
 * Trả về tenant slug từ subdomain.
 * Nếu không xác định được (plain localhost, IP…), trả về VITE_DEV_TENANT_SLUG.
 */
export function getSlugFromHostname(): string {
  if (typeof window === 'undefined') return DEV_TENANT_SLUG

  const { hostname } = window.location
  const parts = hostname.split('.')

  // "tenant-a.localhost"  → ["tenant-a", "localhost"]     2 parts ✓
  // "tenant-a.pos.vn"    → ["tenant-a", "pos", "vn"]      3 parts ✓
  // "www.pos.vn"          → skip (www is not a tenant)
  // "localhost"           → 1 part → use env fallback
  // "192.168.x.x"         → 4 parts of digits → use env fallback
  if (parts.length >= 2 && parts[0] !== 'www' && !/^\d+$/.test(parts[0])) {
    return parts[0]
  }

  return DEV_TENANT_SLUG
}
