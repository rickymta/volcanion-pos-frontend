import axios, { type AxiosInstance, type InternalAxiosRequestConfig, type AxiosRequestConfig } from 'axios'

import { useAuthStore } from '@pos/auth'
import type { ApiError } from './types/common'

// ─── Response Envelope ────────────────────────────────────────────────────────

/**
 * Every API response is wrapped: { success, message, data: T, errors? }
 * The apiClient methods unwrap this automatically so callers get T directly.
 */
interface ApiEnvelope<T> {
  success: boolean
  message: string
  data: T
  errors?: string[] | null
}

// ─── Pending refresh queue ────────────────────────────────────────────────────

type RefreshSubscriber = (token: string) => void

let isRefreshing = false
let refreshSubscribers: RefreshSubscriber[] = []

function subscribeTokenRefresh(cb: RefreshSubscriber) {
  refreshSubscribers.push(cb)
}

function onRefreshed(token: string) {
  refreshSubscribers.forEach((cb) => cb(token))
  refreshSubscribers = []
}

// ─── Create Axios instance ────────────────────────────────────────────────────

export function createApiClient(baseURL: string): AxiosInstance {
  const client = axios.create({
    baseURL,
    headers: {
      'Content-Type': 'application/json',
    },
    timeout: 30_000,
  })

  // ─── Request interceptor ────────────────────────────────────────────────────
  client.interceptors.request.use((config: InternalAxiosRequestConfig) => {
    const { tokens, user } = useAuthStore.getState()

    if (tokens?.accessToken) {
      config.headers['Authorization'] = `Bearer ${tokens.accessToken}`
    }

    if (user?.tenantId) {
      config.headers['X-Tenant-Id'] = user.tenantId
    }

    return config
  })

  // ─── Response interceptor ───────────────────────────────────────────────────
  client.interceptors.response.use(
    (response) => response,
    async (error) => {
      const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean }

      // Auto refresh on 401
      if (error.response?.status === 401 && !originalRequest._retry) {
        const { tokens } = useAuthStore.getState()

        if (!tokens?.refreshToken) {
          useAuthStore.getState().clearAuth()
          return Promise.reject(normalizeError(error))
        }

        if (isRefreshing) {
          // Queue this request until refresh is done
          return new Promise<unknown>((resolve) => {
            subscribeTokenRefresh((newToken) => {
              originalRequest.headers['Authorization'] = `Bearer ${newToken}`
              resolve(client(originalRequest))
            })
          })
        }

        originalRequest._retry = true
        isRefreshing = true

        try {
          const response = await axios.post<ApiEnvelope<{ accessToken: string; refreshToken: string; expiresAt?: string }>>(
            `${baseURL}/auth/refresh`,
            { refreshToken: tokens.refreshToken }
          )

          const newTokens = response.data.data
          const expiresIn = newTokens.expiresAt
            ? Math.floor((new Date(newTokens.expiresAt).getTime() - Date.now()) / 1000)
            : 3600
          useAuthStore.getState().setTokens({ accessToken: newTokens.accessToken, refreshToken: newTokens.refreshToken, expiresIn })
          onRefreshed(newTokens.accessToken)

          originalRequest.headers['Authorization'] = `Bearer ${newTokens.accessToken}`
          return client(originalRequest)
        } catch {
          useAuthStore.getState().clearAuth()
          return Promise.reject(normalizeError(error))
        } finally {
          isRefreshing = false
        }
      }

      return Promise.reject(normalizeError(error))
    }
  )

  return client
}

// ─── Error normalization ──────────────────────────────────────────────────────

export function normalizeError(error: unknown): ApiError {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as Record<string, unknown> | undefined
    return {
      message: (data?.message as string) ?? error.message ?? 'Đã xảy ra lỗi',
      errors: data?.errors as Record<string, string[]> | undefined,
      statusCode: error.response?.status,
    }
  }
  return { message: 'Đã xảy ra lỗi không xác định' }
}

// ─── Default client instance ───────────────────────────────────────────────────

const BASE_URL =
  typeof window !== 'undefined'
    ? (import.meta as { env?: { VITE_API_BASE_URL?: string } }).env?.VITE_API_BASE_URL ?? 'https://localhost:44322/api/v1'
    : 'https://localhost:44322/api/v1'

const _rawClient: AxiosInstance = createApiClient(BASE_URL)

/**
 * Typed API client — all methods return `Promise<T>` (unwrapped from the ApiEnvelope).
 */
export const apiClient = {
  get: <T>(url: string, config?: AxiosRequestConfig) =>
    _rawClient.get<ApiEnvelope<T>>(url, config).then((r) => r.data.data),
  post: <T>(url: string, data?: unknown, config?: AxiosRequestConfig) =>
    _rawClient.post<ApiEnvelope<T>>(url, data, config).then((r) => r.data.data),
  put: <T>(url: string, data?: unknown, config?: AxiosRequestConfig) =>
    _rawClient.put<ApiEnvelope<T>>(url, data, config).then((r) => r.data.data),
  patch: <T>(url: string, data?: unknown, config?: AxiosRequestConfig) =>
    _rawClient.patch<ApiEnvelope<T>>(url, data, config).then((r) => r.data.data),
  delete: <T>(url: string, config?: AxiosRequestConfig) =>
    _rawClient.delete<ApiEnvelope<T>>(url, config).then((r) => r.data.data),
}
