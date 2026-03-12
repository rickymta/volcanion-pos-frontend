/**
 * Đọc tenant slug từ subdomain của hostname hiện tại.
 *
 * Các trường hợp được hỗ trợ:
 *  - Production:    demo.pos.vn              → "demo"
 *  - Dev (*.localhost): demo.localhost:3002  → "demo"
 *  - Dev fallback:  VITE_DEV_TENANT_SLUG     → khi chạy plain localhost:3002
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

  // "demo.localhost"  → ["demo", "localhost"]     2 parts ✓
  // "demo.pos.vn"    → ["demo", "pos", "vn"]      3 parts ✓
  // "www.pos.vn"      → skip (www is not a tenant)
  // "localhost"       → 1 part → use env fallback
  if (parts.length >= 2 && parts[0] !== 'www' && !/^\d+$/.test(parts[0])) {
    return parts[0]
  }

  return DEV_TENANT_SLUG
}
