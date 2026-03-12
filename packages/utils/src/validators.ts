import { z } from 'zod'

/** Vietnamese phone number (10 digits starting with 0) */
export const vietnamesePhoneSchema = z
  .string()
  .regex(/^(0[3|5|7|8|9])[0-9]{8}$/, 'Số điện thoại không hợp lệ (VD: 0912345678)')

/** Vietnamese tax code (10 or 13 digits) */
export const taxCodeSchema = z
  .string()
  .regex(/^[0-9]{10}(-[0-9]{3})?$/, 'Mã số thuế không hợp lệ (10 hoặc 13 chữ số)')

/** Required string (non-empty) */
export const requiredString = (message = 'Trường này là bắt buộc') =>
  z.string().min(1, message)

/** Positive integer (qty, unit conversion) */
export const positiveInt = (message = 'Phải là số nguyên dương') =>
  z.number().int(message).positive(message)

/** Positive number (price, amount) */
export const positiveNumber = (message = 'Phải là số dương') =>
  z.number().positive(message)

/** Non-negative number (0 is allowed) */
export const nonNegativeNumber = (message = 'Không được âm') =>
  z.number().min(0, message)

/** UUID string */
export const uuidSchema = z.string().uuid('ID không hợp lệ')

/** Optional UUID */
export const optionalUuid = z.string().uuid().optional().nullable()

/** Email */
export const emailSchema = z.string().email('Email không hợp lệ')

/** Password — min 6 chars */
export const passwordSchema = z
  .string()
  .min(6, 'Mật khẩu phải có ít nhất 6 ký tự')
