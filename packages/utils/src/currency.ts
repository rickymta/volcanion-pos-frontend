/**
 * Format a number as Vietnamese Dong (VNĐ)
 * e.g. 1500000 → "1.500.000 ₫"
 */
export function formatVND(amount: number): string {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

/**
 * Format a number with thousand separators
 * e.g. 1500000 → "1.500.000"
 */
export function formatNumber(n: number, decimals = 0): string {
  return new Intl.NumberFormat('vi-VN', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(n)
}

/**
 * Parse a VND formatted string back to number
 */
export function parseVND(value: string): number {
  // Remove currency symbol and thousand separators (dots in vi-VN)
  const cleaned = value.replace(/[₫\s.]/g, '').replace(',', '.')
  return parseFloat(cleaned) || 0
}
