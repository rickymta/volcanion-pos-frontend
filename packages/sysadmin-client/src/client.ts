import axios, { type AxiosInstance, type InternalAxiosRequestConfig, type AxiosRequestConfig } from 'axios'

import type { ApiError } from './types/system'

// ─── Super-admin token storage ────────────────────────────────────────────────
const SYSADMIN_TOKEN_KEY = 'pos-sysadmin-token'
const SYSADMIN_REFRESH_TOKEN_KEY = 'pos-sysadmin-refresh-token'

export const sysadminAuth = {
  getToken: (): string | null => {
    if (typeof window === 'undefined') return null
    return localStorage.getItem(SYSADMIN_TOKEN_KEY)
  },
  setToken: (token: string): void => {
    if (typeof window !== 'undefined') localStorage.setItem(SYSADMIN_TOKEN_KEY, token)
  },
  getRefreshToken: (): string | null => {
    if (typeof window === 'undefined') return null
    return localStorage.getItem(SYSADMIN_REFRESH_TOKEN_KEY)
  },
  setRefreshToken: (token: string): void => {
    if (typeof window !== 'undefined') localStorage.setItem(SYSADMIN_REFRESH_TOKEN_KEY, token)
  },
  clear: (): void => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(SYSADMIN_TOKEN_KEY)
      localStorage.removeItem(SYSADMIN_REFRESH_TOKEN_KEY)
    }
  },
  /** @deprecated Use clear() instead */
  removeToken: (): void => {
    if (typeof window !== 'undefined') localStorage.removeItem(SYSADMIN_TOKEN_KEY)
  },
}

// ─── Refresh queue — shared across all instances of the default client ────────
let _isRefreshing = false
let _refreshQueue: Array<(token: string) => void> = []

function _flushQueue(token: string): void {
  _refreshQueue.forEach((cb) => cb(token))
  _refreshQueue = []
}

// ─── Create sysadmin Axios instance ──────────────────────────────────────────

export function createSysadminClient(baseURL: string): AxiosInstance {
  const client = axios.create({
    baseURL,
    headers: { 'Content-Type': 'application/json' },
    timeout: 30_000,
  })

  // Request: attach super-admin JWT (no X-Tenant-Id)
  client.interceptors.request.use((config: InternalAxiosRequestConfig) => {
    const token = sysadminAuth.getToken()
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`
    }
    return config
  })

  // Response: handle 401 with automatic token refresh
  client.interceptors.response.use(
    (res) => res,
    async (error) => {
      type RetryConfig = InternalAxiosRequestConfig & { _retry?: boolean }
      const originalRequest = error.config as RetryConfig

      if (error.response?.status === 401 && !originalRequest._retry) {
        const refreshToken = sysadminAuth.getRefreshToken()

        if (!refreshToken) {
          sysadminAuth.clear()
          return Promise.reject(normalizeSysError(error))
        }

        // If a refresh is already in flight, queue this request
        if (_isRefreshing) {
          return new Promise<import('axios').AxiosResponse>((resolve) => {
            _refreshQueue.push((newToken) => {
              originalRequest.headers['Authorization'] = `Bearer ${newToken}`
              resolve(client(originalRequest))
            })
          })
        }

        originalRequest._retry = true
        _isRefreshing = true

        try {
          // Use a raw axios call to avoid going through this interceptor again
          const { data } = await axios.post<{ accessToken: string; refreshToken?: string }>(
            `${baseURL}/auth/refresh`,
            { refreshToken },
            { headers: { 'Content-Type': 'application/json' } }
          )
          sysadminAuth.setToken(data.accessToken)
          if (data.refreshToken) sysadminAuth.setRefreshToken(data.refreshToken)
          _flushQueue(data.accessToken)
          originalRequest.headers['Authorization'] = `Bearer ${data.accessToken}`
          return client(originalRequest)
        } catch {
          sysadminAuth.clear()
          _refreshQueue = []
          return Promise.reject(normalizeSysError(error))
        } finally {
          _isRefreshing = false
        }
      }

      return Promise.reject(normalizeSysError(error))
    }
  )

  return client
}

export function normalizeSysError(error: unknown): ApiError {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as Record<string, unknown> | undefined
    return {
      message: (data?.message as string) ?? error.message ?? 'System error',
      statusCode: error.response?.status,
    }
  }
  return { message: 'Unknown system error' }
}

// ─── Default sysadmin client ──────────────────────────────────────────────────

const SYSADMIN_BASE_URL = (import.meta as { env?: { VITE_API_BASE_URL?: string } }).env?.VITE_API_BASE_URL ?? ''

/** API origin without path prefix, e.g. `https://localhost:5101` */
export const API_ORIGIN = SYSADMIN_BASE_URL.replace(/\/super\/v1\/?$/, '')

const _rawSysClient: AxiosInstance = createSysadminClient(SYSADMIN_BASE_URL)

/**
 * Typed sysadmin API client — all methods return `Promise<T>` (data unwrapped from AxiosResponse).
 */
export const sysadminClient = {
  get: <T>(url: string, config?: AxiosRequestConfig) =>
    _rawSysClient.get<T>(url, config).then((r) => r.data),
  post: <T>(url: string, data?: unknown, config?: AxiosRequestConfig) =>
    _rawSysClient.post<T>(url, data, config).then((r) => r.data),
  put: <T>(url: string, data?: unknown, config?: AxiosRequestConfig) =>
    _rawSysClient.put<T>(url, data, config).then((r) => r.data),
  patch: <T>(url: string, data?: unknown, config?: AxiosRequestConfig) =>
    _rawSysClient.patch<T>(url, data, config).then((r) => r.data),
  delete: <T>(url: string, config?: AxiosRequestConfig) =>
    _rawSysClient.delete<T>(url, config).then((r) => r.data),
}
