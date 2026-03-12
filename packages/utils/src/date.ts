import dayjs from 'dayjs'
import 'dayjs/locale/vi'
import customParseFormat from 'dayjs/plugin/customParseFormat'
import relativeTime from 'dayjs/plugin/relativeTime'
import utc from 'dayjs/plugin/utc'

dayjs.extend(utc)
dayjs.extend(customParseFormat)
dayjs.extend(relativeTime)
dayjs.locale('vi')

/** "08/03/2026" */
export function formatDate(d: string | Date | null | undefined): string {
  if (!d) return ''
  return dayjs(d).format('DD/MM/YYYY')
}

/** "08/03/2026 14:30" */
export function formatDateTime(d: string | Date | null | undefined): string {
  if (!d) return ''
  return dayjs(d).format('DD/MM/YYYY HH:mm')
}

/** "08/03/2026 14:30:55" */
export function formatDateTimeSecond(d: string | Date | null | undefined): string {
  if (!d) return ''
  return dayjs(d).format('DD/MM/YYYY HH:mm:ss')
}

/** "3 giờ trước", "2 ngày trước" */
export function fromNow(d: string | Date | null | undefined): string {
  if (!d) return ''
  return dayjs(d).fromNow()
}

/** ISO string to dayjs — useful for form default values */
export function toDateValue(d: string | null | undefined): Date | null {
  if (!d) return null
  return dayjs(d).toDate()
}

/** Format for API request (ISO 8601) */
export function toISOString(d: Date | null | undefined): string | undefined {
  if (!d) return undefined
  return dayjs(d).toISOString()
}

/** Start of day ISO string */
export function startOfDay(d: Date): string {
  return dayjs(d).startOf('day').toISOString()
}

/** End of day ISO string */
export function endOfDay(d: Date): string {
  return dayjs(d).endOf('day').toISOString()
}

export { dayjs }
